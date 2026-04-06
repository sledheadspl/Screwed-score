import { Resend } from 'resend'

// Lazily initialized so missing key only throws at send-time, not build-time
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

// ── Product registry ──────────────────────────────────────────────────────────
// Set each PRODUCT_LINK_* env var in Netlify to your actual download URL
// (Google Drive share link, Dropbox, S3 signed URL, Gumroad, etc.)
export const PRODUCT_CATALOG: Record<string, {
  name: string
  tagline: string
  deliveryEnvKey: string
  accentColor: string
}> = {
  'creator-os': {
    name: 'Creator OS Bundle',
    tagline: 'Your complete operating system for digital creators.',
    deliveryEnvKey: 'PRODUCT_LINK_CREATOR_OS',
    accentColor: '#00E5FF',
  },
  'content-pipeline': {
    name: 'Content Pipeline Pro',
    tagline: 'End-to-end content automation — built in Make/Zapier.',
    deliveryEnvKey: 'PRODUCT_LINK_CONTENT_PIPELINE',
    accentColor: '#00E5FF',
  },
  'brand-deal': {
    name: 'Brand Deal Negotiation Pack',
    tagline: '12 proven email scripts and contract templates.',
    deliveryEnvKey: 'PRODUCT_LINK_BRAND_DEAL',
    accentColor: '#00E5FF',
  },
  'revenue-dashboard': {
    name: 'Revenue Dashboard Kit',
    tagline: 'Your custom Google Sheets + Notion income dashboard.',
    deliveryEnvKey: 'PRODUCT_LINK_REVENUE_DASHBOARD',
    accentColor: '#30d158',
  },
  'social-assets': {
    name: 'Social Media Asset Pack',
    tagline: '200+ premium Canva templates across every platform.',
    deliveryEnvKey: 'PRODUCT_LINK_SOCIAL_ASSETS',
    accentColor: '#00E5FF',
  },
  'launch-sequence': {
    name: 'Launch Sequence Playbook',
    tagline: 'Step-by-step digital product launch system.',
    deliveryEnvKey: 'PRODUCT_LINK_LAUNCH_SEQUENCE',
    accentColor: '#ffd60a',
  },
  'ai-prompt-vault': {
    name: 'AI Prompt Vault',
    tagline: '500+ battle-tested prompts for content, copy, and strategy.',
    deliveryEnvKey: 'PRODUCT_LINK_AI_PROMPT_VAULT',
    accentColor: '#00E5FF',
  },
  'newsletter-engine': {
    name: 'Newsletter Growth Engine',
    tagline: 'Templates, sequences, and a 90-day growth playbook.',
    deliveryEnvKey: 'PRODUCT_LINK_NEWSLETTER_ENGINE',
    accentColor: '#00E5FF',
  },
  'video-repurpose-kit': {
    name: 'Video Repurposing Masterkit',
    tagline: 'Turn one video into 15+ pieces of distributed content.',
    deliveryEnvKey: 'PRODUCT_LINK_VIDEO_REPURPOSE_KIT',
    accentColor: '#00E5FF',
  },
  'seo-content-matrix': {
    name: 'SEO Content Matrix',
    tagline: 'Research-to-publish content system engineered for organic traffic.',
    deliveryEnvKey: 'PRODUCT_LINK_SEO_CONTENT_MATRIX',
    accentColor: '#30d158',
  },
  'affiliate-stack': {
    name: 'Affiliate Revenue Stack',
    tagline: 'Plug-and-play systems to build passive affiliate income.',
    deliveryEnvKey: 'PRODUCT_LINK_AFFILIATE_STACK',
    accentColor: '#00E5FF',
  },
  'podcast-launch-kit': {
    name: 'Podcast Launch Kit',
    tagline: 'Launch and monetize a podcast in 30 days.',
    deliveryEnvKey: 'PRODUCT_LINK_PODCAST_LAUNCH_KIT',
    accentColor: '#ffd60a',
  },
  'creator-legal-pack': {
    name: 'Creator Legal Pack',
    tagline: 'Professional contracts and templates for online creators.',
    deliveryEnvKey: 'PRODUCT_LINK_CREATOR_LEGAL_PACK',
    accentColor: '#ffd60a',
  },
  'email-monetization': {
    name: 'Email Monetization Playbook',
    tagline: 'Convert your email list into predictable recurring revenue.',
    deliveryEnvKey: 'PRODUCT_LINK_EMAIL_MONETIZATION',
    accentColor: '#00E5FF',
  },
  'course-blueprint': {
    name: 'Digital Course Blueprint',
    tagline: 'End-to-end system to outline, build, and sell online courses.',
    deliveryEnvKey: 'PRODUCT_LINK_COURSE_BLUEPRINT',
    accentColor: '#30d158',
  },
  'time-blocking-system': {
    name: 'Elite Time Blocking System',
    tagline: 'Calendar architecture for creators who protect deep work.',
    deliveryEnvKey: 'PRODUCT_LINK_TIME_BLOCKING_SYSTEM',
    accentColor: '#00E5FF',
  },
}

function buildEmailHtml(opts: {
  productName: string
  tagline: string
  downloadUrl: string
  accentColor: string
  customerEmail: string
}): string {
  const { productName, tagline, downloadUrl, accentColor } = opts

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your download is ready — ${productName}</title>
</head>
<body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080808;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:40px;text-align:center;">
              <span style="font-size:20px;font-weight:900;color:#f2f2f2;letter-spacing:-0.02em;">Get</span><span style="font-size:20px;font-weight:900;background:linear-gradient(135deg,#ff6b60,#ff3b30);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.02em;">Screwed</span><span style="font-size:20px;font-weight:900;color:#f2f2f2;letter-spacing:-0.02em;">Score</span>
              <div style="margin-top:6px;font-size:11px;font-weight:600;color:rgba(242,242,242,0.3);letter-spacing:0.12em;text-transform:uppercase;">Productivity Digital Media</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:rgba(15,15,15,0.8);border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;">

              <!-- Top accent bar -->
              <tr>
                <td style="height:3px;background:linear-gradient(90deg,${accentColor}00,${accentColor},${accentColor}00);"></td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 36px;">

                  <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(0,229,255,0.6);letter-spacing:0.2em;text-transform:uppercase;">Purchase Confirmed</p>
                  <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f2f2f2;letter-spacing:-0.03em;line-height:1.1;">${productName}</h1>
                  <p style="margin:0 0 32px;font-size:15px;color:rgba(242,242,242,0.5);line-height:1.5;">${tagline}</p>

                  <!-- Download button -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                    <tr>
                      <td style="border-radius:12px;background:linear-gradient(135deg,${accentColor}22,${accentColor}08);border:1px solid ${accentColor}44;">
                        <a href="${downloadUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:${accentColor};text-decoration:none;letter-spacing:0.02em;">
                          Download Your Product →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px;">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(242,242,242,0.6);">Access Instructions</p>
                        <p style="margin:0;font-size:13px;color:rgba(242,242,242,0.4);line-height:1.6;">
                          Click the download button above to access your product. The link is tied to your purchase and does not expire. Bookmark it for future reference.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:12px;color:rgba(242,242,242,0.25);line-height:1.6;">
                    Questions? Reply to this email — we respond within 24 hours.<br />
                    REMbyDesign · <a href="https://screwedscore.com" style="color:rgba(242,242,242,0.35);text-decoration:none;">screwedscore.com</a>
                  </p>

                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:rgba(242,242,242,0.2);">
                © ${new Date().getFullYear()} REMbyDesign. You received this because you purchased ${productName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendProductDeliveryEmail(opts: {
  toEmail: string
  productId: string
  stripeSessionId: string
}): Promise<{ ok: boolean; error?: string }> {
  const { toEmail, productId } = opts
  const product = PRODUCT_CATALOG[productId]

  if (!product) {
    return { ok: false, error: `Unknown product_id: ${productId}` }
  }

  const downloadUrl = process.env[product.deliveryEnvKey]
  if (!downloadUrl) {
    console.error(`[product-delivery] Missing env var: ${product.deliveryEnvKey}`)
    return { ok: false, error: `Download URL not configured for ${productId}` }
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'products@screwedscore.com'

  try {
    const { error } = await getResend().emails.send({
      from: `REMbyDesign <${fromAddress}>`,
      to: toEmail,
      subject: `Your download is ready — ${product.name}`,
      html: buildEmailHtml({
        productName: product.name,
        tagline: product.tagline,
        downloadUrl,
        accentColor: product.accentColor,
        customerEmail: toEmail,
      }),
    })

    if (error) {
      console.error('[product-delivery] Resend error:', error)
      return { ok: false, error: error.message }
    }

    console.log(`[product-delivery] Delivered ${productId} to ${toEmail}`)
    return { ok: true }
  } catch (err) {
    console.error('[product-delivery] Unexpected error:', err)
    return { ok: false, error: String(err) }
  }
}
