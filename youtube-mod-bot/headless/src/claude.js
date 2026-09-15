// Anthropic call over plain fetch — Node 20 has it built in, so the bot keeps
// exactly one runtime dependency (masterchat).

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const TIMEOUT_MS = 20_000

export async function askClaude ({ apiKey, model, systemPrompt, question, author, maxReplyChars }) {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: abort.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 150,
        system: systemPrompt,
        messages: [{
          role: 'user',
          // Fenced and labelled so the model treats it as a quoted question
          // rather than as part of its own instructions.
          content: `A viewer named "${author}" asked in live chat:\n<question>\n${question}\n</question>`,
        }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = (data.content ?? [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) throw new Error('Empty response from Claude')
    return text.slice(0, maxReplyChars)
  } finally {
    clearTimeout(timer)
  }
}
