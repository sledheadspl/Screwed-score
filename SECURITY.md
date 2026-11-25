# Security Policy

Screwed Score (screwedscore.com) is run by REMbyDesign. People upload bills, invoices and contracts to it, so we take reports about its security seriously, and we're grateful to anyone who helps keep it safe.

**Report a vulnerability to [security@rembydesign.com](mailto:security@rembydesign.com).** Please don't open a public GitHub issue, post about it publicly, or tell anyone else until we've fixed it.

_Last updated: November 25, 2026_

## What's in scope

- `https://www.screwedscore.com` and `https://screwedscore.com`, including every page and every `/api/` route.
- Shared result pages (`/r/...`), uploads and analysis, the Pro subscription, checkout and the paid downloads (Academy courses, Quick-Fix guides, creator kits).
- The ClipPilot license checkout and license-check endpoints on the same site.
- The code in this repository.

Only the live production site is supported. Old branches, preview builds and the retired Netlify deployment are out of scope unless the problem also affects production.

## What we most want to hear about

- Seeing, changing or deleting another person's uploaded document, analysis or result.
- Getting paid content without paying: Pro access, Academy courses, Quick-Fix guides or creator kits.
- Forging or reusing a Pro access token, or someone else's purchase.
- Getting around rate limits in a way that runs up our AI costs.
- Cross-site scripting, especially on shared result pages.
- Server-side request forgery, injection or remote code execution.
- Leaked secrets, API keys or credentials.

## Out of scope

- **Services we use.** Stripe, Supabase, Anthropic, Resend, Google, Cloudflare and Hostinger each have their own disclosure programs. Report problems in their products to them. Do tell us if our *setup* of one of them is wrong.
- **Other websites on the same server or network.** Screwed Score shares hosting with other projects. Testing them is not covered by this policy.
- Denial-of-service, load or stress testing of any kind. The server is shared, so this can hurt people other than us.
- Social engineering, phishing, or physical attacks against anyone.
- Reports from automated scanners with no demonstrated impact.
- Missing security headers, cookie flags or best-practice settings with no working exploit.
- Clickjacking on pages with no sensitive action, self-XSS, logout CSRF, and missing email records (SPF, DKIM, DMARC).
- Software version disclosure, and anything that needs an already compromised device or browser.

## Rules for testing

- Use your own documents, your own sessions and your own purchases.
- **Don't upload documents that contain anyone else's personal information.**
- If you get access to someone else's data, stop there. Look at only as much as you need to show the problem, don't keep or share it, and tell us in your report.
- Don't change or delete data that isn't yours.
- Don't use automated tools at a volume that affects the site for anyone else.
- **Payments:** don't make real purchases you plan to dispute or charge back. If you find a payment flaw, describe it and send a proof of concept instead of exploiting it. If you do make a real test purchase, tell us and we'll refund it.
- Give us a reasonable chance to fix the problem before you disclose it publicly. See "What to expect" below.

## How to report

Email **security@rembydesign.com** with:

- what the problem is and where (the URL or API route);
- the steps to reproduce it, or a proof of concept;
- what an attacker could do with it;
- how you'd like to be credited, if at all.

Screenshots and request/response captures help. Please don't include anyone else's personal data in your report.

## What to expect

| Step | Our target |
|---|---|
| We confirm we received your report | Within 3 business days |
| We tell you whether it's valid and how serious it is | Within 10 business days |
| Fix for a critical issue | Within 7 days of confirming it |
| Fix for a high-severity issue | Within 30 days |
| Fix for a medium or low issue | Within 90 days |

We'll keep you updated, tell you when it's fixed, and agree with you on when it's fine to publish. Screwed Score is run by a small team, so if something takes longer we'll tell you why.

**No cash bounty.** We don't offer cash rewards at the moment. With your permission, we'll gladly credit you by name or handle once the fix is live.

## Safe harbor

If you follow this policy in good faith, we will:

- consider your research authorized, and won't pursue or support legal action against you for it;
- work with you to understand and fix the problem quickly;
- credit you if you want, once it's fixed.

This covers testing of Screwed Score only. It does not cover the third-party services and other websites listed under "Out of scope". If you're unsure whether something is allowed, email us before you test.

## How we protect the site

These are the main protections now in place:

- **Encrypted connections.** HTTPS everywhere, with HSTS, a Content-Security-Policy, and anti-framing headers.
- **Private documents.** Uploaded documents are kept in private storage, and database keys that can read them never reach the browser.
- **Signed Pro access.** Pro access uses tokens signed on the server, which the browser can't forge.
- **Checked downloads.** Paid files are only handed over after the server confirms the payment with Stripe.
- **Rate limits.** Uploads, AI analysis, and the Pro and Fight Back Kit checkouts are rate-limited by IP address.
- **Secrets stay out of the code.** API keys and other secrets live in server-only configuration, and incoming payment webhooks are signature-checked.

For how we handle personal data, see our [Privacy Policy](https://www.screwedscore.com/privacy).
