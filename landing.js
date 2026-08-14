/**
 * Shared landing page for all runtimes (Express / Vercel / Cloudflare Workers).
 * Served at GET / so a self-hosted instance shows a branded install page
 * instead of a blank 404 — same pattern other public Stremio addons use.
 */
const LOGO_FALLBACK =
    'https://raw.githubusercontent.com/TheNerdCow/CinemaGraphy/refs/heads/master/logo.png'

/**
 * @param {{
 *   manifestUrl: string,
 *   installUrl?: string,
 *   logoUrl?: string,
 *   version?: string,
 * }} opts
 */
export function renderLandingPage({
    manifestUrl,
    installUrl,
    logoUrl = LOGO_FALLBACK,
    version = '1.8.1',
} = {}) {
    const safeManifest = escapeHtml(manifestUrl || '')
    const stremioLink = installUrl
        || (manifestUrl
            ? `stremio://${String(manifestUrl).replace(/^https?:\/\//i, '')}`
            : '')
    const safeInstall = escapeHtml(stremioLink)
    const safeLogo = escapeHtml(logoUrl)
    const safeVersion = escapeHtml(String(version || ''))

    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>سینماگرافی — Cinemagraphy</title>
  <meta name="description" content="افزونه‌ی استریمیو برای فیلم، سریال، انیمه و پخش زنده از منابع ایرانی و بین‌المللی." />
  <link rel="icon" href="${safeLogo}" />
  <style>
    :root {
      --bg: #0b0d12;
      --card: #141822;
      --text: #f3f5f9;
      --muted: #9aa3b5;
      --accent: #6c8cff;
      --accent2: #a78bfa;
      --ok: #34d399;
      --border: rgba(255,255,255,.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Vazirmatn", "Tahoma", "Segoe UI", system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(1200px 600px at 80% -10%, rgba(108,140,255,.25), transparent 60%),
        radial-gradient(900px 500px at 0% 100%, rgba(167,139,250,.18), transparent 55%),
        var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .card {
      width: 100%;
      max-width: 560px;
      background: linear-gradient(180deg, rgba(255,255,255,.04), transparent 40%), var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 36px 28px 28px;
      box-shadow: 0 24px 80px rgba(0,0,0,.45);
      text-align: center;
    }
    .logo {
      width: 96px;
      height: 96px;
      border-radius: 22px;
      object-fit: cover;
      margin: 0 auto 18px;
      display: block;
      box-shadow: 0 10px 30px rgba(108,140,255,.35);
    }
    h1 {
      margin: 0 0 6px;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .version {
      display: inline-block;
      margin-bottom: 14px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: .75rem;
      color: var(--muted);
      background: rgba(255,255,255,.05);
      border: 1px solid var(--border);
    }
    p.lead {
      margin: 0 0 24px;
      color: var(--muted);
      line-height: 1.7;
      font-size: .98rem;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
    }
    a.btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 18px;
      border-radius: 14px;
      text-decoration: none;
      font-weight: 700;
      font-size: .98rem;
      transition: transform .15s ease, opacity .15s ease;
    }
    a.btn:hover { transform: translateY(-1px); opacity: .95; }
    a.btn-primary {
      color: #0b0d12;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
    }
    a.btn-secondary {
      color: var(--text);
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border);
    }
    .manifest-box {
      text-align: right;
      background: rgba(0,0,0,.25);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .manifest-box label {
      display: block;
      font-size: .75rem;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .manifest-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .manifest-row input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .78rem;
      direction: ltr;
      text-align: left;
      outline: none;
    }
    button.copy {
      flex-shrink: 0;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.06);
      color: var(--text);
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: .8rem;
    }
    button.copy.ok { color: var(--ok); border-color: rgba(52,211,153,.4); }
    ul.features {
      list-style: none;
      padding: 0;
      margin: 0 0 18px;
      text-align: right;
      color: var(--muted);
      font-size: .88rem;
      line-height: 1.9;
    }
    ul.features li::before {
      content: "✓ ";
      color: var(--ok);
      font-weight: 700;
    }
    footer {
      color: var(--muted);
      font-size: .75rem;
      line-height: 1.6;
    }
    footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <main class="card">
    <img class="logo" src="${safeLogo}" alt="Cinemagraphy" width="96" height="96" />
    <h1>سینماگرافی</h1>
    <div class="version">نسخه ${safeVersion}</div>
    <p class="lead">
      افزونه‌ی استریمیو برای فیلم، سریال، انیمه و پخش زنده —
      منابع ایرانی و بین‌المللی، همه در یک جا.
    </p>

    <div class="actions">
      <a class="btn btn-primary" href="${safeInstall}">نصب در Stremio</a>
      <a class="btn btn-secondary" href="${safeManifest}" target="_blank" rel="noopener">مشاهدهٔ manifest.json</a>
    </div>

    <div class="manifest-box">
      <label for="manifestUrl">آدرس منیفست (برای نصب دستی)</label>
      <div class="manifest-row">
        <input id="manifestUrl" readonly value="${safeManifest}" />
        <button type="button" class="copy" id="copyBtn">کپی</button>
      </div>
    </div>

    <ul class="features">
      <li>جستجوی همزمان در چند پروایدر ایرانی</li>
      <li>نمایش کیفیت، حجم، صدا و وضعیت سانسور</li>
      <li>کاتالوگ‌های خارجی، تورنت و زیرنویس فارسی</li>
      <li>متادیتای فارسی از TMDB</li>
    </ul>

    <footer>
      خودمیزبانی روی VPS · Docker · Vercel · Cloudflare Workers<br />
      <a href="https://github.com/TheNerdCow/CinemaGraphy" target="_blank" rel="noopener">GitHub</a>
      · فورک شخصی‌سازی‌شده از stremio-ir-providers
    </footer>
  </main>
  <script>
    const btn = document.getElementById('copyBtn');
    const input = document.getElementById('manifestUrl');
    if (btn && input) {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(input.value);
          btn.textContent = 'کپی شد';
          btn.classList.add('ok');
          setTimeout(() => { btn.textContent = 'کپی'; btn.classList.remove('ok'); }, 1600);
        } catch {
          input.select();
          document.execCommand('copy');
        }
      });
    }
  </script>
</body>
</html>`
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/**
 * Build absolute public URLs for the landing page from a request-like object.
 * Works for Express (req) and Cloudflare Workers (Request + url).
 */
export function landingUrlsFromRequest(requestLike, env = {}) {
    // Express: req.protocol + req.get('host')
    // Worker: new URL(request.url)
    let protocol = 'https'
    let host = ''

    if (typeof requestLike?.get === 'function') {
        protocol = String(requestLike.headers?.['x-forwarded-proto'] || requestLike.protocol || 'https')
            .split(',')[0]
            .trim()
        host = String(requestLike.headers?.['x-forwarded-host'] || requestLike.get('host') || '')
            .split(',')[0]
            .trim()
    } else if (requestLike?.url) {
        const url = new URL(requestLike.url)
        protocol = url.protocol.replace(':', '') || 'https'
        host = url.host
    }

    if (!host && env.PUBLIC_BASE_URL) {
        try {
            const base = new URL(env.PUBLIC_BASE_URL)
            protocol = base.protocol.replace(':', '') || protocol
            host = base.host
        } catch {
            // ignore invalid PUBLIC_BASE_URL
        }
    }

    const origin = host ? `${protocol}://${host}` : ''
    const manifestUrl = origin ? `${origin}/manifest.json` : '/manifest.json'
    const installUrl = host ? `stremio://${host}/manifest.json` : ''
    const logoUrl = origin ? `${origin}/logo.png` : LOGO_FALLBACK

    return {manifestUrl, installUrl, logoUrl, origin}
}
