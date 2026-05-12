import os
import re
import json
import anthropic
import streamlit as st
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
TOKEN_FILE = "token.json"

# ── Profanity patterns (ported from mod bot triggers.ts) ──────────────────
# Word-boundary matching so short roots don’t fire on unrelated words.
PROFANITY_PATTERNS = [
    re.compile(r'\bfuck', re.IGNORECASE),
    re.compile(r'\bshit', re.IGNORECASE),
    re.compile(r'\bbitch', re.IGNORECASE),
    re.compile(r'\bcunt', re.IGNORECASE),
    re.compile(r'\bpussy', re.IGNORECASE),
    re.compile(r'\bcock\b', re.IGNORECASE),
    re.compile(r'\bdick\b', re.IGNORECASE),
    re.compile(r'\bass\b', re.IGNORECASE),
    re.compile(r'\basshole', re.IGNORECASE),
    re.compile(r'\bjackass', re.IGNORECASE),
    re.compile(r'\bbastard', re.IGNORECASE),
    re.compile(r'\bwhore', re.IGNORECASE),
    re.compile(r'\bslut', re.IGNORECASE),
    re.compile(r'\bpiss', re.IGNORECASE),
    re.compile(r'\bdamn\b', re.IGNORECASE),
    re.compile(r'\bfaggot', re.IGNORECASE),
    re.compile(r'\bfag\b', re.IGNORECASE),
    re.compile(r'\bretard', re.IGNORECASE),
    re.compile(r'\bnigger', re.IGNORECASE),
    re.compile(r'\bnigga', re.IGNORECASE),
    re.compile(r'\bgay\b', re.IGNORECASE),
    re.compile(r'\bscam', re.IGNORECASE),
    re.compile(r'\bscalper', re.IGNORECASE),
]

# ── Strike tracking (ported from mod bot matcher.ts) ────────────────────
# Maps comment author channel ID → {count, severity}
_strike_records: dict[str, dict] = {}
STRIKE_RESET_S = 30 * 60  # reset after 30 min of good behavior

# ── AI classification prompt (ported from mod bot classify.ts) ────────────
_CLASSIFY_SYSTEM = """\
You moderate YouTube comments for a Pokémon card pack opening stream/shop (poke-bank.com).

Classify each comment and return ONLY one token.

── NEGATIVITY LEVELS ──
NEG_LOW    - mild negativity: vague complaining, saying something is bad, being a downer
NEG_MEDIUM - arguing, directed put-downs, sustained negativity toward the stream or shop
NEG_HIGH   - bullying, harassment, personal attacks on the creator or other viewers, threats

Return "none" for neutral, off-topic, or harmless comments.

Return exactly one token. No punctuation, no explanation.\
"""

# Pre-filter hints — only run AI on comments that look actionable
_ACTION_HINTS = [
    "scam", "fake", "lie", "wrong", "bad", "hate", "stupid", "dumb",
    "worst", "overpr", "rip off", "ripoff", "shut up", "stfu", "idiot",
    "boring", "waste", "pathetic", "stop", "you're", "youre", "fraud",
    "terrible", "garbage", "trash", "awful", "horrible",
]


# ── Core moderation logic ───────────────────────────────────────────

def _is_profanity(text: str) -> bool:
    return any(p.search(text) for p in PROFANITY_PATTERNS)


def _classify_with_ai(text: str) -> dict | None:
    lower = text.lower()
    if not any(hint in lower for hint in _ACTION_HINTS):
        return None

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=15,
        system=_CLASSIFY_SYSTEM,
        messages=[{"role": "user", "content": text}],
    )
    raw = response.content[0].text.strip().upper() if response.content else "NONE"

    if raw == "NEG_LOW":    return {"type": "negative", "severity": "low"}
    if raw == "NEG_MEDIUM": return {"type": "negative", "severity": "medium"}
    if raw == "NEG_HIGH":   return {"type": "negative", "severity": "high"}
    return None


def _get_strike(author_id: str, severity: str) -> int:
    """Increment and return the current strike count for this author."""
    import time
    record = _strike_records.get(author_id)
    now = time.time()

    if not record or (now - record.get("last_strike", 0) > STRIKE_RESET_S):
        _strike_records[author_id] = {"count": 1, "severity": severity, "last_strike": now}
        return 1

    rank = {"low": 0, "medium": 1, "high": 2}
    record["severity"] = severity if rank[severity] > rank[record["severity"]] else record["severity"]
    record["last_strike"] = now
    record["count"] += 1
    return record["count"]


def moderate_comment(text: str, author_id: str = "") -> dict:
    """
    Returns:
      {"action": "delete"|"flag"|"none", "reason": str|None,
       "severity": "low"|"medium"|"high"|None, "strike": int|None}
    """
    if _is_profanity(text):
        return {"action": "delete", "reason": "profanity", "severity": "high", "strike": None}

    result = _classify_with_ai(text)
    if result:
        severity = result["severity"]
        strike = _get_strike(author_id, severity) if author_id else 1

        # Delete on high severity or after 3 strikes; flag otherwise
        if severity == "high" or strike >= 3:
            action = "delete"
        else:
            action = "flag"

        return {"action": action, "reason": "negativity", "severity": severity, "strike": strike}

    return {"action": "none", "reason": None, "severity": None, "strike": None}


# ── YouTube API helpers ─────────────────────────────────────────────

def authenticate_youtube():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(
            "client_secret.json", SCOPES
        )
        creds = flow.run_local_server(port=8080, access_type="offline", prompt="consent")

        token_data = json.loads(creds.to_json())
        if "refresh_token" not in token_data:
            st.error("Refresh token missing — delete token.json and re-authenticate.")
            return None

        with open(TOKEN_FILE, "w") as f:
            json.dump(token_data, f, indent=4)

    return build("youtube", "v3", credentials=creds)


def fetch_comments(youtube, video_id: str) -> list[tuple[str, str, str]]:
    """Returns list of (comment_id, author_channel_id, text)."""
    comments = []
    try:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            textFormat="plainText",
            maxResults=100,
        )
        response = request.execute()
        for item in response.get("items", []):
            snippet = item["snippet"]["topLevelComment"]["snippet"]
            comment_id = item["snippet"]["topLevelComment"]["id"]
            author_id = snippet.get("authorChannelId", {}).get("value", "")
            text = snippet["textDisplay"]
            comments.append((comment_id, author_id, text))
    except HttpError as e:
        st.error(f"Error fetching comments: {e}")
    return comments


def delete_comment(youtube, comment_id: str):
    try:
        youtube.comments().setModerationStatus(
            id=comment_id,
            moderationStatus="rejected",
        ).execute()
        return True
    except HttpError as e:
        st.error(f"Failed to delete comment {comment_id}: {e}")
        return False


# ── Streamlit UI ────────────────────────────────────────────────────

SEVERITY_BADGE = {
    "low":    "🟡 Low",
    "medium": "🟠 Medium",
    "high":   "🔴 High",
}

st.title("YouTube AI Comment Moderator")
st.caption("Powered by Claude AI + mod bot moderation logic")

st.write("**Authenticating YouTube API...**")
youtube = authenticate_youtube()

if youtube:
    st.success("YouTube API authenticated.")

    video_id = st.text_input("YouTube Video ID", "")

    col1, col2 = st.columns(2)
    fetch_btn = col1.button("Fetch Comments")
    moderate_btn = col2.button("Detect & Remove Abusive Comments")

    if fetch_btn:
        if not video_id:
            st.warning("Enter a video ID first.")
        else:
            comments = fetch_comments(youtube, video_id)
            st.write(f"**Fetched {len(comments)} comments.**")
            for _, _, text in comments:
                st.write(f"- {text}")

    if moderate_btn:
        if not video_id:
            st.warning("Enter a video ID first.")
        else:
            comments = fetch_comments(youtube, video_id)
            st.write(f"**Scanning {len(comments)} comments...**")
            deleted = flagged = clean = 0

            for comment_id, author_id, text in comments:
                result = moderate_comment(text, author_id)

                if result["action"] == "delete":
                    badge = SEVERITY_BADGE.get(result["severity"] or "high", "")
                    reason = result["reason"] or ""
                    strike_info = f" (strike {result['strike']}/3)" if result["strike"] else ""
                    st.error(
                        f"**DELETED** {badge} — {reason}{strike_info}\n\n> {text}"
                    )
                    delete_comment(youtube, comment_id)
                    deleted += 1

                elif result["action"] == "flag":
                    badge = SEVERITY_BADGE.get(result["severity"] or "low", "")
                    strike_info = f" (strike {result['strike']}/3)" if result["strike"] else ""
                    st.warning(
                        f"**FLAGGED** {badge} — negativity{strike_info}\n\n> {text}"
                    )
                    flagged += 1

                else:
                    clean += 1

            st.divider()
            st.write(
                f"**Done.** {deleted} deleted · {flagged} flagged · {clean} clean"
            )
