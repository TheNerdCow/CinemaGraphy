/**
 * Liquid Glass landing — Interstellar-inspired
 * Install + Manifest copy, ranked companion addons, GitHub-only footer
 */
const LOGO_FALLBACK = 'https://raw.githubusercontent.com/TheNerdCow/CinemaGraphy/refs/heads/master/logo.png'
const PUBLIC_INSTALL = 'https://cmplugin.ir/manifest.json'
const PUBLIC_SITE = 'https://cmplugin.ir'
const GITHUB_URL = 'https://github.com/TheNerdCow/CinemaGraphy'
const TELEGRAM_CHANNEL = 'https://t.me/cinemmagraphy'
const TELEGRAM_SUPPORT = 'https://t.me/nerdcow'

// Popular companions (rough order from stremio-addons.net / community rankings 2026)
const RECOMMENDED = [
  {
    name: 'Torrentio',
    descFa: 'محبوب‌ترین منبع تورنت / Debrid',
    descEn: 'Most popular torrent / Debrid sources',
    href: 'https://torrentio.strem.fun/configure',
    icon: 'https://www.google.com/s2/favicons?domain=torrentio.strem.fun&sz=128',
  },
  {
    name: 'Comet',
    descFa: 'جستجوی سریع تورنت و Debrid',
    descEn: 'Fast torrent & Debrid search',
    href: 'https://comet.elfhosted.com/configure',
    icon: 'https://www.google.com/s2/favicons?domain=comet.elfhosted.com&sz=128',
  },
  {
    name: 'MediaFusion',
    descFa: 'چندمنبعی فیلم، سریال و بیشتر',
    descEn: 'Multi-source movies & series',
    href: 'https://mediafusion.elfhosted.com/configure',
    icon: 'https://www.google.com/s2/favicons?domain=mediafusion.elfhosted.com&sz=128',
  },
  {
    name: 'AIOStreams',
    descFa: 'ادغام چند افزونه در یک لیست',
    descEn: 'Merge multiple addons into one list',
    href: 'https://aiostreams.elfhosted.com/stremio/configure',
    icon: 'https://aiostreams.elfhosted.com/logo.png',
  },
  {
    name: 'OpenSubtitles v3',
    descFa: 'زیرنویس رسمی استریمیو',
    descEn: 'Official-style subtitle addon',
    href: 'https://opensubtitles-v3.strem.io/manifest.json',
    icon: 'https://www.google.com/s2/favicons?domain=opensubtitles.com&sz=128',
  },
  {
    name: 'Anime Kitsu',
    descFa: 'کاتالوگ انیمه (Kitsu)',
    descEn: 'Anime catalogs via Kitsu',
    href: 'https://anime-kitsu.strem.fun/manifest.json',
    icon: 'https://www.google.com/s2/favicons?domain=kitsu.io&sz=128',
  },
]

export function renderLandingPage({
  manifestUrl = PUBLIC_INSTALL,
  installUrl,
  logoUrl = '/logo.png',
  version = '3.2.17',
} = {}) {
  const m = escapeHtml(manifestUrl || PUBLIC_INSTALL)
  const install = escapeHtml(
    installUrl || `stremio://${String(manifestUrl || PUBLIC_INSTALL).replace(/^https?:\/\//i, '')}`,
  )
  const logo = escapeHtml(logoUrl || LOGO_FALLBACK)
  const ver = escapeHtml(String(version || '3.2.17'))

  const addonCards = RECOMMENDED.map(
    (a) => `
<a class="card" href="${escapeHtml(a.href)}" target="_blank" rel="noopener">
  <img src="${escapeHtml(a.icon)}" alt="" width="36" height="36" loading="lazy" onerror="this.style.opacity='0'"/>
  <div>
    <b>${escapeHtml(a.name)}</b>
    <span class="lang-fa">${escapeHtml(a.descFa)}</span>
    <span class="lang-en">${escapeHtml(a.descEn)}</span>
  </div>
</a>`,
  ).join('')

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-lang="fa">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#0b0d12"/>
<title>سینماگرافی · CinemaGraphy</title>
<link rel="icon" href="${logo}"/>
<style>
:root{
  --bg:#0b0d12;--card:#141821;--line:#252b38;--text:#eef1f6;--muted:#9aa3b5;
  --accent:#e8a04a;--accent2:#6ea8ff;--ok:#3ecf8e;--radius:14px;
  --font:Tahoma,"Segoe UI",system-ui,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.7;min-height:100vh}
a{color:var(--accent2);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{width:min(880px,100%);margin:0 auto;padding:0 16px}
header{position:sticky;top:0;z-index:20;background:rgba(11,13,18,.92);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}
.nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--text);text-decoration:none}
.brand img{width:36px;height:36px;border-radius:10px;object-fit:cover}
.nav-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card);color:var(--text);
  border-radius:999px;padding:7px 12px;font-size:.85rem;font-weight:600;cursor:pointer;font-family:inherit}
.chip:hover{border-color:var(--accent)}
.chip .flag{font-size:1rem;line-height:1}
.ver{font-size:.78rem;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:4px 10px}
main{padding:28px 0 48px}
.hero{text-align:center;padding:28px 0 20px}
.hero img.logo{width:88px;height:88px;border-radius:22px;object-fit:cover;margin-bottom:14px;box-shadow:0 8px 28px rgba(0,0,0,.35)}
.hero h1{font-size:clamp(1.45rem,4vw,1.9rem);font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
.hero p{color:var(--muted);max-width:36rem;margin:0 auto 18px;font-size:.95rem}
.btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border-radius:12px;
  font-weight:700;font-size:.92rem;border:1px solid transparent;cursor:pointer;font-family:inherit;text-decoration:none}
.btn-p{background:var(--accent);color:#1a1208}
.btn-p:hover{filter:brightness(1.06);text-decoration:none}
.btn-g{background:var(--card);color:var(--text);border-color:var(--line)}
.btn-g:hover{border-color:var(--accent2);text-decoration:none}
.hint{font-size:.8rem;color:var(--muted);word-break:break-all;direction:ltr;unicode-bidi:plaintext}
section{margin-top:28px}
section h2{font-size:1.1rem;margin-bottom:12px;font-weight:700}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.card{display:flex;gap:12px;align-items:flex-start;padding:14px;background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius);color:var(--text);text-decoration:none;transition:border-color .15s}
.card:hover{border-color:var(--accent2);text-decoration:none}
.card img{border-radius:8px;flex-shrink:0}
.card b{display:block;font-size:.92rem;margin-bottom:2px}
.card span{display:block;font-size:.8rem;color:var(--muted)}
.feat b{color:var(--text)}
.feat span{color:var(--muted);font-size:.82rem}
.clients a{display:inline-block;margin:4px 6px 4px 0;padding:8px 12px;background:var(--card);border:1px solid var(--line);
  border-radius:10px;color:var(--text);font-size:.85rem;font-weight:600}
.clients a:hover{border-color:var(--accent);text-decoration:none}
.box{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px}
.box h3{font-size:.95rem;margin-bottom:8px}
footer{border-top:1px solid var(--line);padding:20px 0 32px;text-align:center;color:var(--muted);font-size:.85rem}
footer a{color:var(--muted)}
footer a:hover{color:var(--accent2)}
html[data-lang="fa"] .lang-en{display:none!important}
html[data-lang="en"] .lang-fa{display:none!important}
html[data-lang="en"] body,html[data-lang="en"]{direction:ltr;text-align:left;font-family:"Segoe UI",system-ui,sans-serif}
html[data-lang="en"] .hero,html[data-lang="en"] footer{text-align:center}
@media(max-width:560px){
  .hero{padding-top:18px}
  .btns .btn{flex:1 1 100%}
}
</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <a class="brand" href="/">
      <img src="${logo}" alt="CinemaGraphy" width="36" height="36" onerror="this.src='${LOGO_FALLBACK}'"/>
      <span class="lang-fa">سینماگرافی</span>
      <span class="lang-en">CinemaGraphy</span>
    </a>
    <div class="nav-actions">
      <span class="ver">v${ver}</span>
      <button type="button" class="chip" id="langBtn" aria-label="Language">
        <span class="flag" aria-hidden="true">🇮🇷</span>
        <span id="langLabel">FA | EN</span>
      </button>
      <a class="chip" href="/configure"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
      <a class="chip" href="/guide"><span class="lang-fa">راهنما</span><span class="lang-en">Guide</span></a>
    </div>
  </div>
</header>
<main class="wrap">
  <section class="hero">
    <img class="logo" src="${logo}" alt="" width="88" height="88" onerror="this.src='${LOGO_FALLBACK}'"/>
    <h1 class="lang-fa">سینماگرافی</h1>
    <h1 class="lang-en">CinemaGraphy</h1>
    <p class="lang-fa">افزونهٔ استریمیو و نوویو برای فیلم و سریال با منابع ایرانی — نصب یک‌مرحله‌ای، شخصی‌سازی و راهنمای کامل.</p>
    <p class="lang-en">Stremio &amp; Nuvio addon for movies and series with Iranian sources — one-tap install, configure, and full guide.</p>
    <div class="btns">
      <a class="btn btn-p" href="${install}"><span class="lang-fa">نصب در استریمیو</span><span class="lang-en">Install in Stremio</span></a>
      <button type="button" class="btn btn-g" id="copyManifest"><span class="lang-fa">کپی لینک منیفست</span><span class="lang-en">Copy manifest</span></button>
      <a class="btn btn-g" href="/configure"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
    </div>
    <p class="hint" id="manifestHint">${m}</p>
    <input type="hidden" id="manifestUrl" value="${m}"/>
  </section>

  <section>
    <h2 class="lang-fa">امکانات</h2>
    <h2 class="lang-en">Features</h2>
    <div class="grid feat">
      <div class="card"><div><b class="lang-fa">چند پروایدر</b><b class="lang-en">Multi-provider</b><span class="lang-fa">جستجوی موازی از منابع ایرانی</span><span class="lang-en">Parallel search across IR sources</span></div></div>
      <div class="card"><div><b class="lang-fa">متای فارسی</b><b class="lang-en">Persian meta</b><span class="lang-fa">عنوان و پوستر وقتی شبکه اجازه دهد</span><span class="lang-en">Titles &amp; posters when network allows</span></div></div>
      <div class="card"><div><b class="lang-fa">شخصی‌سازی</b><b class="lang-en">Configure</b><span class="lang-fa">کاتالوگ و کلیدها در منیفست اختصاصی</span><span class="lang-en">Catalogs &amp; keys in your own manifest</span></div></div>
      <div class="card"><div><b class="lang-fa">استریمیو و نوویو</b><b class="lang-en">Stremio &amp; Nuvio</b><span class="lang-fa">سازگار با منیفست استریمیو</span><span class="lang-en">Stremio-manifest compatible</span></div></div>
    </div>
  </section>

  <section>
    <h2 class="lang-fa">کلاینت‌ها</h2>
    <h2 class="lang-en">Clients</h2>
    <div class="box">
      <h3>Stremio</h3>
      <div class="clients">
        <a href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Windows</a>
        <a href="https://www.stremio.com/downloads" target="_blank" rel="noopener">macOS</a>
        <a href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Linux</a>
        <a href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Android</a>
        <a href="https://web.stremio.com/" target="_blank" rel="noopener"><span class="lang-fa">وب</span><span class="lang-en">Web</span></a>
      </div>
    </div>
    <div class="box">
      <h3>Nuvio <span style="color:var(--ok);font-size:.8rem" class="lang-fa">پیشنهادی</span><span style="color:var(--ok);font-size:.8rem" class="lang-en">Recommended</span></h3>
      <div class="clients">
        <a href="https://nuvio.tv" target="_blank" rel="noopener"><span class="lang-fa">سایت نوویو</span><span class="lang-en">Nuvio site</span></a>
      </div>
    </div>
  </section>

  <section>
    <h2 class="lang-fa">افزونه‌های پیشنهادی</h2>
    <h2 class="lang-en">Recommended addons</h2>
    <div class="grid">${addonCards}</div>
  </section>
</main>
<footer>
  <div class="wrap">
    <p class="lang-fa">با احترام به آقای محبّی · نسخه ${ver}</p>
    <p class="lang-en">With respect to Mr. Mohebbi · v${ver}</p>
    <p style="margin-top:8px">
      <a href="${GITHUB_URL}" target="_blank" rel="noopener">GitHub</a>
      ·
      <a href="${TELEGRAM_CHANNEL}" target="_blank" rel="noopener">Telegram</a>
      ·
      <a href="${TELEGRAM_SUPPORT}" target="_blank" rel="noopener"><span class="lang-fa">پشتیبانی</span><span class="lang-en">Support</span></a>
    </p>
  </div>
</footer>
<script>
(function(){
  var root=document.documentElement;
  var btn=document.getElementById('langBtn');
  var label=document.getElementById('langLabel');
  function apply(lang){
    root.setAttribute('data-lang',lang);
    root.setAttribute('lang',lang==='en'?'en':'fa');
    root.setAttribute('dir',lang==='en'?'ltr':'rtl');
    if(label) label.textContent=lang==='en'?'EN | FA':'FA | EN';
    try{localStorage.setItem('cg_lang',lang)}catch(e){}
  }
  var saved=null;
  try{saved=localStorage.getItem('cg_lang')}catch(e){}
  apply(saved==='en'?'en':'fa');
  if(btn) btn.addEventListener('click',function(){
    apply(root.getAttribute('data-lang')==='fa'?'en':'fa');
  });
  var copy=document.getElementById('copyManifest');
  var inp=document.getElementById('manifestUrl');
  if(copy&&inp){
    copy.addEventListener('click',function(){
      var v=inp.value||'';
      function ok(){
        var fa=root.getAttribute('data-lang')!=='en';
        copy.textContent=fa?'کپی شد':'Copied';
        setTimeout(function(){copy.innerHTML=fa?'<span class="lang-fa">کپی لینک منیفست</span>':'<span class="lang-en">Copy manifest</span>';apply(root.getAttribute('data-lang'))},1200);
      }
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok).catch(function(){});
      else ok();
    });
  }
})();
</script>
</body></html>`
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function landingUrlsFromRequest(requestLike, env = {}) {
  let protocol = 'https',
    host = ''
  if (typeof requestLike?.get === 'function') {
    protocol = String(requestLike.headers?.['x-forwarded-proto'] || requestLike.protocol || 'https')
      .split(',')[0]
      .trim()
    host = String(requestLike.headers?.['x-forwarded-host'] || requestLike.get('host') || '')
      .split(',')[0]
      .trim()
  } else if (requestLike?.url) {
    const u = new URL(requestLike.url)
    protocol = u.protocol.replace(':', '') || 'https'
    host = u.host
  }
  if (!host && env.PUBLIC_BASE_URL) {
    try {
      const b = new URL(env.PUBLIC_BASE_URL)
      protocol = b.protocol.replace(':', '') || protocol
      host = b.host
    } catch {}
  }
  const origin = host ? `${protocol}://${host}` : PUBLIC_SITE
  const manifestUrl = `${origin}/manifest.json`
  return {
    manifestUrl,
    installUrl: `stremio://${manifestUrl.replace(/^https?:\/\//i, '')}`,
    logoUrl: `${origin}/logo.png`,
  }
}


/** Shared shell styles for /guide and /configure */
function shellStyle() {
  return `:root{--t:#f4f0ea;--m:#a89f94;--a:#e8a04a;--a2:#7eb6ff;--g:rgba(255,255,255,.07);--gb:rgba(255,255,255,.14);--gl:rgba(232,160,74,.35)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{max-width:100%;overflow-x:hidden}
body{font-family:Vazirmatn,Tahoma,Segoe UI,system-ui,sans-serif;color:var(--t);min-height:100vh;line-height:1.65;position:relative;
background:radial-gradient(ellipse 120% 80% at 50% 120%,#1a0a2e 0%,transparent 55%),
radial-gradient(ellipse 60% 50% at 80% 20%,#0d1b3a 0%,transparent 50%),
linear-gradient(180deg,#050508,#0a0612 40%,#12081c)}
body::before{content:'';position:fixed;inset:0;pointer-events:none;opacity:.55;z-index:0;
background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 70% 40%,#fff,transparent),radial-gradient(1.5px 1.5px at 50% 15%,#ffe9c4,transparent)}
a{color:var(--a2)}
.wrap{max-width:920px;margin:0 auto;position:relative;z-index:1;max-width:880px;width:100%;margin:0 auto;padding:20px 4.5vw 48px}
header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;max-width:100%}
.brand{display:flex;gap:10px;align-items:center;color:var(--t);text-decoration:none;font-weight:800;min-width:0}
.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand img{width:36px;height:36px;border-radius:10px;flex-shrink:0;box-shadow:0 0 16px var(--gl)}
.chip{border:1px solid var(--gb);background:var(--g);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);color:var(--t);border-radius:999px;padding:8px 12px;text-decoration:none;font-weight:600;font-size:.82rem;font-family:inherit;cursor:pointer;white-space:nowrap}
h1{font-size:clamp(1.25rem,5vw,1.75rem);font-weight:900;margin:8px 0;overflow-wrap:anywhere}
h2{font-size:1.05rem;margin:0 0 10px;overflow-wrap:anywhere}
.sub{color:var(--m);margin-bottom:14px;font-size:.92rem;overflow-wrap:anywhere}
.glass{background:var(--g);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid var(--gb);border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.08)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:12px;font-weight:800;font-size:.88rem;text-decoration:none;border:none;cursor:pointer;font-family:inherit;max-width:100%}
.bp{background:linear-gradient(135deg,#e8a04a,#d4783a);color:#1a0f05}
.bp.ok{background:linear-gradient(135deg,#5dcea0,#3aa87a)}
.ghost{background:rgba(255,255,255,.08);color:var(--t);border:1px solid var(--gb)}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;max-width:100%}
.lang-en{display:none!important}html[lang=en] .lang-fa{display:none!important}html[lang=en] .lang-en{display:initial!important}html[lang=en] body{direction:ltr}
.cfg-item{padding:14px 16px;margin-bottom:10px;max-width:100%;overflow:hidden}
.cfg-item .top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px}
.cfg-item code,code,pre{direction:ltr;font-size:.78rem;color:var(--a2);overflow-wrap:anywhere;word-break:break-all;max-width:100%}
.diff{font-size:.68rem;font-weight:800;padding:3px 8px;border-radius:999px;flex-shrink:0}
.diff.e{background:rgba(93,206,160,.15);color:#5dcea0}
.diff.m{background:rgba(232,160,74,.15);color:var(--a)}
.diff.h{background:rgba(224,112,112,.15);color:#e07070}
.cfg-item input,.out input{width:100%;max-width:100%;margin-top:8px;background:rgba(0,0,0,.28);border:1px solid var(--gb);border-radius:10px;color:var(--t);padding:10px 12px;font-family:ui-monospace,monospace;font-size:.78rem;direction:ltr;outline:none;box-sizing:border-box}
.cfg-item .hint{font-size:.78rem;color:var(--m);overflow-wrap:anywhere}
.out{margin-top:16px;padding:14px 16px;max-width:100%;overflow:hidden}
.feat{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr));gap:10px;margin:12px 0}
.feat .c{padding:14px;text-align:center}.feat b{display:block;margin:4px 0}.feat span{font-size:.78rem;color:var(--m)}
.step{padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;min-width:0;max-width:100%}
.step>b{flex-shrink:0}
.step>span{min-width:0;flex:1;overflow-wrap:anywhere;word-break:break-word}
.faq details{padding:12px 14px;margin-bottom:8px;max-width:100%;overflow:hidden}
.faq summary{cursor:pointer;font-weight:700;overflow-wrap:anywhere}.faq p{color:var(--m);margin-top:8px;font-size:.9rem;overflow-wrap:anywhere}
.call{padding:14px;margin:12px 0;border-color:rgba(232,160,74,.35)!important;max-width:100%;overflow:hidden;overflow-wrap:anywhere}
.gbox{max-width:100%;overflow:hidden}
.olist{max-width:100%}
@media (max-width:480px){
  .wrap{padding:14px 3.5vw 40px}
  .chip{padding:6px 10px;font-size:.75rem}
  .btn{padding:11px 14px;font-size:.84rem}
  .cfg-item,.out,.gbox,.call,.step{padding:12px}
  .prov-grid{grid-template-columns:1fr!important}
}
`
}

export function renderConfigurePage({
  logoUrl = '/logo.png',
  version = '3.2.17',
  origin = PUBLIC_SITE,
} = {}) {
  const logo = escapeHtml(logoUrl || LOGO_FALLBACK)
  const ver = escapeHtml(String(version || '3.2.17'))
  const originClean = String(origin || PUBLIC_SITE).replace(/\/$/, '')
  const base = escapeHtml(originClean)
  const baseJson = JSON.stringify(originClean)

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Configure — سینماگرافی</title>
<link rel="icon" href="${logo}"/>
<style>${shellStyle()}
.prov-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;padding:14px;margin-bottom:16px}
.prov-grid label{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid var(--gb);cursor:pointer;font-weight:700;user-select:none}
.prov-grid label:has(input:checked){border-color:rgba(232,160,74,.55);background:rgba(232,160,74,.12)}
.prov-grid input{width:18px;height:18px;accent-color:#e8a04a}
.prov-grid label.locked{filter:blur(1.2px);opacity:.45;pointer-events:none;cursor:not-allowed;position:relative}
.vip-block input[data-k]{width:100%;box-sizing:border-box;margin:0;background:rgba(0,0,0,.28);border:1px solid var(--gb);border-radius:10px;color:var(--t);padding:10px 12px;font-family:inherit;font-size:.85rem}
.vip-block[hidden]{display:none!important}
.vip-block .hint{font-size:.78rem;color:var(--m);font-weight:600}

.sel-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.toggle-grid{display:grid;gap:10px;margin-bottom:16px}
.toggle-grid label.tog{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;cursor:pointer}
.toggle-grid label.tog input{width:18px;height:18px;margin-top:3px;accent-color:#e8a04a;flex-shrink:0}
.toggle-grid label.tog b{display:block;margin-bottom:4px}
.toggle-grid label.tog span.hint{font-size:.82rem;color:var(--m);font-weight:500}
.load-box{padding:14px 16px;margin-bottom:16px}
.load-box .row{margin-top:10px}
.note{font-size:.82rem;color:var(--m);margin-top:10px}
.pill{display:inline-block;font-size:.68rem;font-weight:800;padding:3px 8px;border-radius:999px;background:rgba(126,182,255,.15);color:var(--a2);margin-inline-start:6px}
</style>
</head>
<body>
<div class="wrap">
<header>
<a class="brand" href="/"><img src="${logo}" alt=""/><span>سینماگرافی</span></a>
<div style="display:flex;gap:8px">
<button class="chip" type="button" id="langBtn">EN</button>
<a class="chip" href="/"><span class="lang-fa">خانه</span><span class="lang-en">Home</span></a>
</div>
</header>
<p style="font-size:.75rem;color:var(--a)">v${ver}</p>
<h1 class="lang-fa">🔧 شخصی‌سازی پیشرفته</h1>
<h1 class="lang-en">🔧 Advanced configure</h1>
<p class="sub lang-fa">این صفحه همیشه <b>منیفست اختصاصی</b> می‌سازد (نه لینک پیش‌فرض عمومی). پیش‌فرض کامل روی <a href="/">صفحهٔ اصلی</a> است. تنظیمات در مرورگر ذخیره می‌شود تا برای ویرایش بعدی کلیدها را دوباره وارد نکنید.</p>
<p class="sub lang-en">This page always builds a <b>custom</b> manifest (not the public default). Defaults live on the <a href="/">home page</a>. Settings are saved in your browser so you can edit without retyping keys.</p>

<div class="glass" style="padding:14px 16px;margin-bottom:16px;border:1px solid rgba(232,160,74,.45);background:rgba(232,160,74,.08)">
<p class="lang-fa" style="margin:0;font-size:.88rem;line-height:1.55"><b>⚠️ امنیت:</b> لینک نصب اختصاصی (<code>/c/...</code>) ممکن است شامل کلید TMDB و رمز پروایدرها باشد. آن را در گروه عمومی یا شبکه‌های اجتماعی نفرستید. برای اطلاعات حساس از متغیرهای محیطی سرور استفاده کنید.</p>
<p class="lang-en" style="margin:0;font-size:.88rem;line-height:1.55"><b>⚠️ Security:</b> Your custom install link (<code>/c/...</code>) may contain your TMDB API key and provider passwords. Do not share it publicly. Prefer server environment variables for secrets.</p>
</div>

<div class="load-box glass">
<h2 class="lang-fa">بارگذاری تنظیمات قبلی</h2>
<h2 class="lang-en">Load existing config</h2>
<p class="hint lang-fa" style="font-size:.85rem;color:var(--m)">لینک منیفست اختصاصی‌تان را بچسبانید (شامل <code>/c/...</code>) تا فیلدها پر شوند — بعد تغییر بدهید و لینک جدید بگیرید.</p>
<p class="hint lang-en" style="font-size:.85rem;color:var(--m)">Paste your custom manifest URL (with <code>/c/...</code>) to refill the form, edit, then copy a new link.</p>
<input id="loadUrl" placeholder="https://…/c/xxxxx/manifest.json" autocomplete="off" style="width:100%;margin-top:8px;background:rgba(0,0,0,.28);border:1px solid var(--gb);border-radius:10px;color:var(--t);padding:10px 12px;font-family:ui-monospace,monospace;font-size:.78rem;direction:ltr"/>
<div class="row">
<button class="btn ghost" type="button" id="btnLoad"><span class="lang-fa">بارگذاری</span><span class="lang-en">Load</span></button>
<button class="btn ghost" type="button" id="btnClearLocal"><span class="lang-fa">پاک کردن حافظهٔ محلی</span><span class="lang-en">Clear local save</span></button>
</div>
<p class="note" id="loadMsg"></p>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">
<h2 class="lang-fa" style="margin-top:0">حالت افزونه</h2>
<h2 class="lang-en" style="margin-top:0">Addon mode</h2>
<div class="toggle-grid" style="margin:0">
<label class="tog" style="background:rgba(0,0,0,.2);border-radius:12px;border:1px solid var(--gb)">
<input type="checkbox" id="optStreamsOnly"/>
<div>
<b class="lang-fa">فقط استریم <span class="pill">STREAMS_ONLY</span></b>
<b class="lang-en">Streams only <span class="pill">STREAMS_ONLY</span></b>
<span class="hint lang-fa">متا و کاتالوگ فیلم/سریال خاموش؛ فقط پخش. کاتالوگ ماهواره (IPTV) اگر تیک خورده باشد جدا می‌ماند. حداقل یک پروایدر لازم است.</span>
<span class="hint lang-en">Movie/series meta &amp; catalogs off — streams only. IPTV stays if enabled separately. Needs at least one provider.</span>
</div>
</label>
<label class="tog" style="background:rgba(0,0,0,.2);border-radius:12px;border:1px solid var(--gb)">
<input type="checkbox" id="optDisableMeta"/>
<div>
<b class="lang-fa">غیرفعال کردن متا</b>
<b class="lang-en">Disable metadata</b>
<span class="hint lang-fa">فقط متا حذف می‌شود.</span>
<span class="hint lang-en">Removes meta resource only.</span>
</div>
</label>
<label class="tog" style="background:rgba(0,0,0,.2);border-radius:12px;border:1px solid var(--gb)">
<input type="checkbox" id="optDisableCatalog"/>
<div>
<b class="lang-fa">غیرفعال کردن کاتالوگ‌ها</b>
<b class="lang-en">Disable catalogs</b>
<span class="hint lang-fa">کاتالوگ فیلم/سریال (پروایدر و ۱۰۱/AIO/…) حذف می‌شود — ماهواره جداست.</span>
<span class="hint lang-en">Hides movie/series catalogs only — IPTV is separate.</span>
</div>
</label>
<label class="tog" style="background:rgba(0,0,0,.2);border-radius:12px;border:1px solid var(--gb)">
<input type="checkbox" id="optDisableSubs"/>
<div>
<b class="lang-fa">غیرفعال کردن زیرنویس</b>
<b class="lang-en">Disable subtitles</b>
<span class="hint lang-fa">اگر OpenSubtitles جدا دارید.</span>
<span class="hint lang-en">If you use a separate subtitle addon.</span>
</div>
</label>
</div>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">
<h2 class="lang-fa" style="margin-top:0">زبان متادیتا (TMDB)</h2>
<h2 class="lang-en" style="margin-top:0">Metadata language (TMDB)</h2>
<p class="hint lang-fa" style="font-size:.85rem;color:var(--m);margin-bottom:10px">عنوان، توضیح و ژانر. پوسترها همان تصاویر TMDB هستند؛ زبان روی متن اثر دارد.</p>
<p class="hint lang-en" style="font-size:.85rem;color:var(--m);margin-bottom:10px">Titles, descriptions, genres. Posters are the same TMDB art; this switches text language.</p>
<div class="sel-row" style="margin:0">
<label class="tog" style="flex:1;min-width:140px;background:rgba(0,0,0,.22);border-radius:12px;border:1px solid var(--gb);padding:12px 14px;cursor:pointer">
<input type="radio" name="metaLang" value="fa" checked style="width:16px;height:16px;accent-color:#e8a04a"/>
<span class="lang-fa"><b>فارسی</b> (پیش‌فرض)</span>
<span class="lang-en"><b>Persian</b> (default)</span>
</label>
<label class="tog" style="flex:1;min-width:140px;background:rgba(0,0,0,.22);border-radius:12px;border:1px solid var(--gb);padding:12px 14px;cursor:pointer">
<input type="radio" name="metaLang" value="en" style="width:16px;height:16px;accent-color:#e8a04a"/>
<span class="lang-fa"><b>انگلیسی</b></span>
<span class="lang-en"><b>English</b></span>
</label>
</div>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">
<h2 class="lang-fa" style="margin-top:0">زبان افزونه (نام در لیست)</h2>
<h2 class="lang-en" style="margin-top:0">Addon language (list name)</h2>
<p class="hint lang-fa" style="font-size:.85rem;color:var(--m);margin-bottom:10px">نام و توضیح منیفست در استریمیو/Nuvio — فارسی یا انگلیسی.</p>
<p class="hint lang-en" style="font-size:.85rem;color:var(--m);margin-bottom:10px">Manifest display name &amp; description in Stremio/Nuvio.</p>
<div class="sel-row" style="margin:0">
<label class="tog" style="flex:1;min-width:140px;background:rgba(0,0,0,.22);border-radius:12px;border:1px solid var(--gb);padding:12px 14px;cursor:pointer">
<input type="radio" name="addonLang" value="fa" checked style="width:16px;height:16px;accent-color:#e8a04a"/>
<span class="lang-fa"><b>فارسی</b> — سینماگرافی</span>
<span class="lang-en"><b>Persian</b> — سینماگرافی</span>
</label>
<label class="tog" style="flex:1;min-width:140px;background:rgba(0,0,0,.22);border-radius:12px;border:1px solid var(--gb);padding:12px 14px;cursor:pointer">
<input type="radio" name="addonLang" value="en" style="width:16px;height:16px;accent-color:#e8a04a"/>
<span class="lang-fa"><b>English</b> — CinemaGraphy</span>
<span class="lang-en"><b>English</b> — CinemaGraphy</span>
</label>
</div>
</div>

<div class="sel-row">
<button class="btn ghost" type="button" id="btnAll"><span class="lang-fa">انتخاب همه پروایدرها</span><span class="lang-en">Select all providers</span></button>
<button class="btn ghost" type="button" id="btnNone"><span class="lang-fa">حذف انتخاب پروایدر</span><span class="lang-en">Clear providers</span></button>
</div>

<h2 class="lang-fa">پروایدرها</h2>
<h2 class="lang-en">Providers</h2>
<p class="sub lang-fa">اگر هیچ‌کدام را نزنید، استریم از <b>همهٔ پروایدرهای فعال سرور</b> می‌آید. با تیک زدن، فقط همان‌ها در این منیفست اختصاصی فعال می‌شوند.</p>
<p class="sub lang-en">None checked = all server-enabled providers. Checking any limits this custom install to those only.</p>
<div class="prov-grid glass" id="provGrid">
<label><input type="checkbox" data-prov="f2media"/> F2Media</label>
<label><input type="checkbox" data-prov="cinamatic"/> Cinamatic</label>
<label><input type="checkbox" data-prov="aslmoviez"/> AslMoviez</label>
<label><input type="checkbox" data-prov="serialblog"/> SerialBlog</label>
<label><input type="checkbox" data-prov="donyayeserial"/> DonyayeSerial</label>
<label><input type="checkbox" data-prov="animex"/> Animex</label>
<label><input type="checkbox" data-prov="digimovie" id="provDigi"/> DigiMovie <span class="diff m">VIP</span></label>
<label><input type="checkbox" data-prov="avamovie" id="provAva"/> AvaMovie <span class="diff m">VIP</span></label>
</div>

<div class="vip-block" id="vipDigiPanel" hidden>
<div class="glass" style="padding:14px;margin:0 0 12px;border:1px solid rgba(232,160,74,.4)">
<div style="font-weight:800;margin-bottom:6px">DigiMovie · VIP</div>
<p class="note lang-fa" style="margin:0 0 10px;font-size:.8rem;line-height:1.45">لینک شخصی. ترجیحاً <b>کوکی سشن</b> از مرورگر. ریسک اکانت با شماست.</p>
<p class="note lang-en" style="margin:0 0 10px;font-size:.8rem;line-height:1.45">Personal link only. Prefer browser <b>session cookie</b>. Account risk is yours.</p>
<label class="hint" style="display:block;margin-bottom:4px">BASEURL</label>
<input data-k="DIGIMOVIE_BASEURL" placeholder="https://www.digimoviez.com" autocomplete="off"/>
<label class="hint" style="display:block;margin:10px 0 4px">COOKIE <span class="lang-fa">(ترجیحی)</span><span class="lang-en">(preferred)</span></label>
<input data-k="DIGIMOVIE_COOKIE" placeholder="name=value; name2=value2" autocomplete="off" style="font-family:ui-monospace,monospace;font-size:.75rem;direction:ltr"/>
<label class="hint" style="display:block;margin:10px 0 4px">USERNAME / PASSWORD <span class="lang-fa">(اختیاری)</span><span class="lang-en">(optional)</span></label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
<input data-k="DIGIMOVIE_USERNAME" placeholder="username" autocomplete="off"/>
<input data-k="DIGIMOVIE_PASSWORD" type="password" placeholder="password" autocomplete="off"/>
</div>
</div>
</div>

<div class="vip-block" id="vipAvaPanel" hidden>
<div class="glass" style="padding:14px;margin:0 0 16px;border:1px solid rgba(232,160,74,.4)">
<div style="font-weight:800;margin-bottom:6px">AvaMovie · VIP</div>
<p class="note lang-fa" style="margin:0 0 10px;font-size:.8rem;line-height:1.45">لینک شخصی. کوکی بعد از ورود VIP. پیش‌فرض سایت: avamovie.shop</p>
<p class="note lang-en" style="margin:0 0 10px;font-size:.8rem;line-height:1.45">Personal link. Cookie after VIP login. Default site: avamovie.shop</p>
<label class="hint" style="display:block;margin-bottom:4px">BASEURL</label>
<input data-k="AVAMOVIE_BASEURL" placeholder="https://avamovie.shop" autocomplete="off"/>
<label class="hint" style="display:block;margin:10px 0 4px">COOKIE <span class="lang-fa">(ترجیحی)</span><span class="lang-en">(preferred)</span></label>
<input data-k="AVAMOVIE_COOKIE" placeholder="Cookie header from browser" autocomplete="off" style="font-family:ui-monospace,monospace;font-size:.75rem;direction:ltr"/>
<label class="hint" style="display:block;margin:10px 0 4px">USERNAME / PASSWORD</label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
<input data-k="AVAMOVIE_USERNAME" placeholder="email / user" autocomplete="off"/>
<input data-k="AVAMOVIE_PASSWORD" type="password" placeholder="password" autocomplete="off"/>
</div>
</div>
</div>

<h2 class="lang-fa">کلیدها و کاتالوگ‌های خارجی</h2>
<h2 class="lang-en">Keys &amp; external catalogs</h2>
<div class="cfg-item glass">
<div class="top"><code>TMDB_API_KEY</code><span class="diff e"><span class="lang-fa">آسان</span><span class="lang-en">Easy</span></span></div>
<div class="hint"><span class="lang-fa">اختیاری — خالی = کلید سرور (برای حالت فقط‌استریم معمولاً لازم نیست)</span><span class="lang-en">Optional — empty uses server key (usually unused in streams-only)</span></div>
<input data-k="TMDB_API_KEY" placeholder="…" autocomplete="off"/>
</div>
<div class="cfg-item glass">
<div class="top"><code>TORRENT_METEOR_MANIFEST_URL</code><span class="diff m"><span class="lang-fa">متوسط</span><span class="lang-en">Medium</span></span></div>
<div class="hint"><span class="lang-fa">منیفست تورنت Meteor</span><span class="lang-en">Meteor torrent manifest URL</span></div>
<input data-k="TORRENT_METEOR_MANIFEST_URL" placeholder="https://…/manifest.json" autocomplete="off"/>
</div>
<div class="cfg-item glass">
<div class="top"><code>CATALOG_AIO_MANIFEST_URL</code><span class="diff m"><span class="lang-fa">متوسط</span><span class="lang-en">Medium</span></span></div>
<div class="hint"><span class="lang-fa">منیفست AIOCatalogs</span><span class="lang-en">AIOCatalogs manifest</span></div>
<input data-k="CATALOG_AIO_MANIFEST_URL" placeholder="https://…/manifest.json" autocomplete="off"/>
</div>
<div class="cfg-item glass">
<div class="top"><code>CATALOG101_MANIFEST_URL</code><span class="diff m"><span class="lang-fa">متوسط</span><span class="lang-en">Medium</span></span></div>
<div class="hint"><span class="lang-fa">منیفست ۱۰۱</span><span class="lang-en">101 catalogs manifest</span></div>
<input data-k="CATALOG101_MANIFEST_URL" placeholder="https://…/manifest.json" autocomplete="off"/>
</div>
<div class="cfg-item glass">
<div class="top"><code>CATALOG_ANIME_MANIFEST_URL</code><span class="diff m"><span class="lang-fa">متوسط</span><span class="lang-en">Medium</span></span></div>
<div class="hint"><span class="lang-fa">کاتالوگ انیمه</span><span class="lang-en">Anime catalog manifest</span></div>
<input data-k="CATALOG_ANIME_MANIFEST_URL" placeholder="https://…/manifest.json" autocomplete="off"/>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">
<h2 class="lang-fa" style="margin-top:0">ماهواره / IPTV</h2>
<h2 class="lang-en" style="margin-top:0">Satellite / IPTV</h2>
<label class="tog" style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;cursor:pointer">
<input type="checkbox" id="optIptv" style="width:18px;height:18px;margin-top:3px;accent-color:#e8a04a;flex-shrink:0"/>
<div>
<b class="lang-fa">فعال‌سازی کاتالوگ ماهواره (IPTV Bridge)</b>
<b class="lang-en">Enable IPTV / satellite catalogs</b>
<span class="hint lang-fa" style="display:block;font-size:.82rem;color:var(--m);font-weight:500;margin-top:4px">بدون تیک = ماهواره در منیفست نیست. با تیک = پیش‌فرض سرور مگر لینک زیر را عوض کنید.</span>
<span class="hint lang-en" style="display:block;font-size:.82rem;color:var(--m);font-weight:500;margin-top:4px">Off = no satellite catalogs. On = server default unless you set a custom URL.</span>
</div>
</label>
<label class="lang-fa" style="display:block;font-size:.85rem;color:var(--m);margin:8px 0 4px">لینک منیفست IPTV (اختیاری)</label>
<label class="lang-en" style="display:block;font-size:.85rem;color:var(--m);margin:8px 0 4px">IPTV manifest URL (optional)</label>
<input id="iptvUrl" data-k="CATALOG_IPTVBRIDGE_MANIFEST_URL" placeholder="خالی = پیش‌فرض iptvbridge.vercel.app" autocomplete="off"/>
<p class="note lang-fa" style="margin-top:8px">کاتالوگ ماهواره جدا از پروایدرهای فیلم است و <b>آخر لیست</b> می‌آید.</p>
<p class="note lang-en" style="margin-top:8px">IPTV stays separate from movie providers and is listed <b>last</b>.</p>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">
<h2 class="lang-fa" style="margin-top:0">سریال ترکی (F2Media)</h2>
<h2 class="lang-en" style="margin-top:0">Turkish Series (F2Media)</h2>
<label class="tog" style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;cursor:pointer">
<input type="checkbox" id="f2turkishOn" style="width:18px;height:18px;margin-top:3px;accent-color:#e8a04a;flex-shrink:0"/>
<div>
<b class="lang-fa">فعال‌سازی کاتالوگ سریال ترکی</b>
<b class="lang-en">Enable Turkish series catalog</b>
</div>
</label>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">
<h2 class="lang-fa" style="margin-top:0">انیمه - انیمکس</h2>
<h2 class="lang-en" style="margin-top:0">Anime - Animex</h2>
<label class="tog" style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;cursor:pointer">
<input type="checkbox" id="animexCatalogOn" style="width:18px;height:18px;margin-top:3px;accent-color:#e8a04a;flex-shrink:0"/>
<div>
<b class="lang-fa">فعال‌سازی کاتالوگ انیمه - انیمکس</b>
<span class="hint lang-fa" style="display:block;font-size:.82rem;color:var(--m);font-weight:500;margin-top:4px">زیر «ترکی» و بالای کاتالوگ انیمهٔ خارجی. متا از TMDB؛ پوستر پشتیبان از انیمکس.</span>
<b class="lang-en">Enable Anime - Animex catalog</b>
<span class="hint lang-en" style="display:block;font-size:.82rem;color:var(--m);font-weight:500;margin-top:4px">Below Turkish, above external anime catalogs. TMDB meta; poster fallback from Animex.</span>
</div>
</label>
</div>

<div class="glass" style="padding:16px;margin-bottom:16px">



<div class="cfg-item glass">
<div class="top"><code>EXTERNAL_CATALOG_MANIFEST_URLS</code><span class="diff m"><span class="lang-fa">متوسط</span><span class="lang-en">Medium</span></span></div>
<div class="hint"><span class="lang-fa">کاتالوگ‌های اضافه با ویرگول</span><span class="lang-en">Extra catalogs, comma-separated</span></div>
<input data-k="EXTERNAL_CATALOG_MANIFEST_URLS" placeholder="https://…/manifest.json" autocomplete="off"/>
</div>
<div class="cfg-item glass">
<div class="top"><code>PROVIDER_TIMEOUT_MS</code><span class="diff m"><span class="lang-fa">متوسط</span><span class="lang-en">Medium</span></span></div>
<div class="hint"><span class="lang-fa">مهلت هر پروایدر (ms)</span><span class="lang-en">Per-provider timeout (ms)</span></div>
<input data-k="PROVIDER_TIMEOUT_MS" placeholder="11000" autocomplete="off"/>
</div>
<div class="cfg-item glass">
<div class="top"><code>ADDON_NAME_SUFFIX</code><span class="diff e"><span class="lang-fa">آسان</span><span class="lang-en">Easy</span></span></div>
<div class="hint"><span class="lang-fa">پسوند اختیاری نام در لیست افزونه‌ها (مثلاً خانه)</span><span class="lang-en">Optional name suffix in the addon list</span></div>
<input data-k="ADDON_NAME_SUFFIX" placeholder=" · home" autocomplete="off"/>
</div>

<p id="cfgWarn" class="glass" style="display:none;padding:12px 14px;margin-bottom:12px;border-color:rgba(224,112,112,.45)!important;color:#e07070;font-size:.9rem"></p>
<div class="out glass">
<label class="lang-fa" style="font-size:.8rem;color:var(--m)">منیفست اختصاصی شما</label>
<label class="lang-en" style="font-size:.8rem;color:var(--m)">Your custom manifest</label>
<input id="outUrl" readonly value=""/>
<p id="cfgTokenTip" class="hint" style="margin:6px 0 0;font-size:.75rem;word-break:break-all"></p>
<div class="row">
<button class="btn bp" type="button" id="btnCopy"><span class="lang-fa">کپی لینک</span><span class="lang-en">Copy link</span></button>
<a class="btn bp" id="btnInstall" href="#"><span class="lang-fa">نصب در نوویو و استریمیو</span><span class="lang-en">Install in Nuvio &amp; Stremio</span></a>
</div>
<p class="note lang-fa">برای به‌روزرسانی: همین صفحه را باز کنید → بارگذاری لینک قبلی یا استفاده از حافظهٔ مرورگر → تغییر → نصب مجدد همان لینک جدید (یا جایگزینی در استریمیو).</p>
<p class="note lang-en">To update later: reopen this page → load your old URL or use browser memory → edit → install the new link.</p>
</div>
</div>
<script>
(function () {
  var BASE = ${baseJson};
  var STORE = 'cg-configure-v2';
  var root = document.documentElement;
  var langBtn = document.getElementById('langBtn');

  function setLang(l) {
    root.lang = l;
    root.dir = l === 'fa' ? 'rtl' : 'ltr';
    if (langBtn) langBtn.textContent = l === 'fa' ? 'EN' : 'FA';
    try { localStorage.setItem('cg-lang', l); } catch (e) {}
  }
  setLang((function () { try { return localStorage.getItem('cg-lang') || 'fa'; } catch (e) { return 'fa'; } })());
  if (langBtn) langBtn.onclick = function () { setLang(root.lang === 'fa' ? 'en' : 'fa'); };

  function toB64Url(obj) {
    var s = JSON.stringify(obj);
    var b64 = btoa(unescape(encodeURIComponent(s)));
    var out = '';
    for (var i = 0; i < b64.length; i++) {
      var ch = b64.charAt(i);
      if (ch === '+') out += '-';
      else if (ch === '/') out += '_';
      else if (ch === '=') continue;
      else out += ch;
    }
    return out;
  }
  function fromB64Url(str) {
    try {
      var b64 = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }
  function stripProto(u) {
    var s = String(u || '');
    if (s.slice(0, 8).toLowerCase() === 'https://') return s.slice(8);
    if (s.slice(0, 7).toLowerCase() === 'http://') return s.slice(7);
    return s;
  }
  function extractCfgToken(url) {
    var s = String(url || '');
    var marker = '/c/';
    var idx = s.indexOf(marker);
    if (idx < 0) return null;
    var rest = s.slice(idx + marker.length);
    var cut = rest.length;
    for (var i = 0; i < rest.length; i++) {
      var c = rest.charAt(i);
      if (c === '/' || c === '?' || c === '#' || c === ' ') { cut = i; break; }
    }
    var token = rest.slice(0, cut);
    try { return decodeURIComponent(token); } catch (e) { return token; }
  }

  function syncVipPanels() {
    var d = document.getElementById('provDigi');
    var a = document.getElementById('provAva');
    var pd = document.getElementById('vipDigiPanel');
    var pa = document.getElementById('vipAvaPanel');
    if (pd) pd.hidden = !(d && d.checked);
    if (pa) pa.hidden = !(a && a.checked);
  }

  function syncStreamToggles() {
    var so = document.getElementById('optStreamsOnly');
    var dm = document.getElementById('optDisableMeta');
    var dc = document.getElementById('optDisableCatalog');
    if (so && so.checked) {
      if (dm) { dm.checked = true; dm.disabled = true; }
      if (dc) { dc.checked = true; dc.disabled = true; }
    } else {
      if (dm) dm.disabled = false;
      if (dc) dc.disabled = false;
    }
  }

  function collect() {
    var o = {};
    var on = [];
    var nodes = document.querySelectorAll('[data-prov]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].checked) on.push(nodes[i].getAttribute('data-prov'));
    }
    if (on.length) o.ENABLED_PROVIDERS = on.join(',');

    var fields = document.querySelectorAll('[data-k]');
    for (var j = 0; j < fields.length; j++) {
      var key = fields[j].getAttribute('data-k');
      var val = (fields[j].value || '').trim();
      if (key && val) o[key] = val;
    }

    function flag(id, prop) {
      var el = document.getElementById(id);
      if (el && el.checked) o[prop] = '1';
    }
    var streams = document.getElementById('optStreamsOnly');
    if (streams && streams.checked) {
      o.STREAMS_ONLY = '1';
    } else {
      flag('optDisableMeta', 'DISABLE_META');
      flag('optDisableCatalog', 'DISABLE_CATALOG');
    }
    flag('optDisableSubs', 'DISABLE_SUBTITLES');
    // always 0/1 so server env defaults can be turned OFF in personal install
    var iptv = document.getElementById('optIptv');
    if (iptv) o.ENABLE_IPTV = iptv.checked ? '1' : '0';
    var f2t = document.getElementById('f2turkishOn');
    if (f2t) o.ENABLE_F2_TURKISH = f2t.checked ? '1' : '0';
    var axc = document.getElementById('animexCatalogOn');
    if (axc) o.ENABLE_ANIMEX_CATALOG = axc.checked ? '1' : '0';

    var metaR = document.querySelector('input[name="metaLang"]:checked');
    if (metaR && metaR.value === 'en') o.META_LANG = 'en';
    var addR = document.querySelector('input[name="addonLang"]:checked');
    if (addR && addR.value === 'en') o.ADDON_LANG = 'en';
    return o;
  }

  function applyObj(o) {
    if (!o || typeof o !== 'object') o = {};
    document.querySelectorAll('[data-prov]').forEach(function (cb) { cb.checked = false; });
    String(o.ENABLED_PROVIDERS || '').split(',').forEach(function (k) {
      k = k.trim().toLowerCase();
      if (!k) return;
      var el = document.querySelector('[data-prov="' + k + '"]');
      if (el) el.checked = true;
    });
    document.querySelectorAll('[data-k]').forEach(function (inp) {
      var key = inp.getAttribute('data-k');
      inp.value = o[key] != null ? String(o[key]) : '';
    });
    var streamsOnly = o.STREAMS_ONLY === '1' || o.STREAMS_ONLY === 'true';
    var so = document.getElementById('optStreamsOnly');
    var dm = document.getElementById('optDisableMeta');
    var dc = document.getElementById('optDisableCatalog');
    var ds = document.getElementById('optDisableSubs');
    if (so) so.checked = streamsOnly;
    if (dm) dm.checked = streamsOnly || o.DISABLE_META === '1' || o.DISABLE_META === 'true';
    if (dc) dc.checked = streamsOnly || o.DISABLE_CATALOG === '1' || o.DISABLE_CATALOG === 'true';
    if (ds) ds.checked = o.DISABLE_SUBTITLES === '1' || o.DISABLE_SUBTITLES === 'true';
    var iptvEl = document.getElementById('optIptv');
    if (iptvEl) iptvEl.checked = o.ENABLE_IPTV === '1' || o.ENABLE_IPTV === 'true' || Boolean(o.CATALOG_IPTVBRIDGE_MANIFEST_URL);
    var f2tEl = document.getElementById('f2turkishOn');
    if (f2tEl) f2tEl.checked = o.ENABLE_F2_TURKISH === '1' || o.ENABLE_F2_TURKISH === 'true';
    var axcEl = document.getElementById('animexCatalogOn');
    if (axcEl) axcEl.checked = o.ENABLE_ANIMEX_CATALOG !== '0' && o.ENABLE_ANIMEX_CATALOG !== 'false';
    var metaVal = o.META_LANG === 'en' ? 'en' : 'fa';
    document.querySelectorAll('input[name="metaLang"]').forEach(function (r) { r.checked = r.value === metaVal; });
    var addVal = o.ADDON_LANG === 'en' ? 'en' : 'fa';
    document.querySelectorAll('input[name="addonLang"]').forEach(function (r) { r.checked = r.value === addVal; });
    syncStreamToggles();
    syncVipPanels();
  }

  function setMsg(text, ok) {
    var el = document.getElementById('loadMsg');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = ok ? '#5dcea0' : 'var(--m)';
  }

  function refresh() {
    try {
      syncStreamToggles();
      syncVipPanels();
      var o = collect();
      try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}

      var streams = document.getElementById('optStreamsOnly');
      var needProv = streams && streams.checked;
      var provCount = (o.ENABLED_PROVIDERS || '').split(',').filter(Boolean).length;
      var warn = document.getElementById('cfgWarn');
      var btn = document.getElementById('btnInstall');
      var btnCopy = document.getElementById('btnCopy');

      if (needProv && provCount === 0) {
        if (warn) {
          warn.style.display = 'block';
          warn.textContent = root.lang === 'fa'
            ? 'برای حالت فقط‌استریم حداقل یک پروایدر را انتخاب کنید.'
            : 'Streams-only requires at least one provider.';
        }
        if (btn) { btn.href = '#'; btn.style.opacity = '0.45'; btn.style.pointerEvents = 'none'; }
        if (btnCopy) { btnCopy.disabled = true; btnCopy.style.opacity = '0.45'; }
      } else {
        if (warn) warn.style.display = 'none';
        if (btnCopy) { btnCopy.disabled = false; btnCopy.style.opacity = '1'; }
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
      }

      var token = toB64Url(o);
      var manifest = BASE + '/c/' + token + '/manifest.json';
      var install = 'stremio://' + stripProto(BASE) + '/c/' + token + '/manifest.json';
      var out = document.getElementById('outUrl');
      if (out) out.value = manifest;
      if (btn && !(needProv && provCount === 0)) btn.href = install;

      var tip = document.getElementById('cfgTokenTip');
      if (tip) {
        var keys = Object.keys(o).filter(function (k) {
          var v = String(o[k] == null ? '' : o[k]).trim().toLowerCase();
          if (!v || v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
          return true;
        });
        if (!keys.length) {
          tip.textContent = root.lang === 'fa'
            ? 'بدون تنظیم اضافه — همان منیفست عمومی سرور'
            : 'No extra settings — public server manifest';
        } else {
          tip.textContent = (root.lang === 'fa' ? 'فعال: ' : 'Active: ') + keys.join(', ')
            + ' · ' + token.length + ' chars · ' + token.slice(0, 12) + '…';
        }
      }
    } catch (err) {
      console.error('configure refresh', err);
      var tip2 = document.getElementById('cfgTokenTip');
      if (tip2) tip2.textContent = 'Error: ' + (err && err.message ? err.message : err);
    }
  }

  function isConfigControl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.hasAttribute('data-prov') || el.hasAttribute('data-k')) return true;
    var id = el.id || '';
    if (id === 'optStreamsOnly' || id === 'optDisableMeta' || id === 'optDisableCatalog' || id === 'optDisableSubs' || id === 'optIptv' || id === 'f2turkishOn' || id === 'animexCatalogOn') return true;
    if (el.name === 'metaLang' || el.name === 'addonLang') return true;
    return false;
  }

  document.addEventListener('change', function (e) {
    if (isConfigControl(e.target)) refresh();
  });
  document.addEventListener('input', function (e) {
    if (isConfigControl(e.target)) refresh();
  });
  // label clicks on mobile
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.closest && (t.closest('.prov-grid label') || t.closest('label.tog'))) {
      setTimeout(refresh, 0);
    }
  });

  var btnAll = document.getElementById('btnAll');
  var btnNone = document.getElementById('btnNone');
  if (btnAll) btnAll.onclick = function () {
    document.querySelectorAll('[data-prov]:not(:disabled)').forEach(function (cb) { cb.checked = true; });
    refresh();
  };
  if (btnNone) btnNone.onclick = function () {
    document.querySelectorAll('[data-prov]:not(:disabled)').forEach(function (cb) { cb.checked = false; });
    refresh();
  };

  var btnLoad = document.getElementById('btnLoad');
  if (btnLoad) btnLoad.onclick = function () {
    var url = (document.getElementById('loadUrl') || {}).value || '';
    var token = extractCfgToken(url);
    if (!token) {
      setMsg(root.lang === 'fa' ? 'لینک باید شامل /c/... باشد.' : 'URL must include /c/...', false);
      return;
    }
    var obj = fromB64Url(token);
    if (!obj) {
      setMsg(root.lang === 'fa' ? 'نشد تنظیمات از لینک خوانده شود.' : 'Could not decode config from URL.', false);
      return;
    }
    applyObj(obj);
    refresh();
    setMsg(root.lang === 'fa' ? 'بارگذاری شد.' : 'Loaded.', true);
  };

  var btnClear = document.getElementById('btnClearLocal');
  if (btnClear) btnClear.onclick = function () {
    try { localStorage.removeItem(STORE); } catch (e) {}
    applyObj({});
    document.querySelectorAll('[data-prov]').forEach(function (cb) { cb.checked = false; });
    ['optStreamsOnly','optDisableMeta','optDisableCatalog','optDisableSubs','optIptv','f2turkishOn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.checked = false; el.disabled = false; }
    });
    var axc = document.getElementById('animexCatalogOn');
    if (axc) axc.checked = true;
    refresh();
    setMsg(root.lang === 'fa' ? 'حافظه پاک شد.' : 'Local save cleared.', true);
  };

  var btnCopy = document.getElementById('btnCopy');
  if (btnCopy) btnCopy.onclick = function () {
    var inp = document.getElementById('outUrl');
    if (!inp || !inp.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inp.value).then(function () {
        var prev = btnCopy.innerHTML;
        btnCopy.innerHTML = root.lang === 'fa' ? 'کپی شد ✓' : 'Copied ✓';
        setTimeout(function () { btnCopy.innerHTML = prev; }, 1600);
      }).catch(function () { inp.select(); });
    } else {
      inp.select();
      try { document.execCommand('copy'); } catch (e) {}
    }
  };

  // Always start clean on full page load / refresh — do not auto-restore.
  // Use «بارگذاری از لینک» to load a previous /c/… manifest URL.
  try { localStorage.removeItem(STORE); } catch (e) {}
  applyObj({});
  document.querySelectorAll('[data-prov]').forEach(function (cb) { cb.checked = false; });
  ['optStreamsOnly','optDisableMeta','optDisableCatalog','optDisableSubs','optIptv','f2turkishOn'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.checked = false; el.disabled = false; }
  });
  var axc0 = document.getElementById('animexCatalogOn');
  if (axc0) axc0.checked = false;
  document.querySelectorAll('[data-k]').forEach(function (inp) { inp.value = ''; });
  var loadUrl = document.getElementById('loadUrl');
  if (loadUrl) loadUrl.value = '';
  refresh();
})();
</script>
</body></html>`
}


export function renderGuidePage({
  logoUrl = '/logo.png',
  version = '3.2.17',
  manifestUrl = PUBLIC_INSTALL,
} = {}) {
  const logo = escapeHtml(logoUrl || LOGO_FALLBACK)
  const ver = escapeHtml(String(version || '3.2.17'))
  const install = escapeHtml(
    'stremio://' + String(manifestUrl || PUBLIC_INSTALL).replace(/^https?:\/\//i, ''),
  )
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Guide — CinemaGraphy / راهنما — سینماگرافی</title>
<link rel="icon" href="${logo}"/>
<style>${shellStyle()}
.gbox{padding:14px;margin-bottom:12px}
.gbox h2{margin:0 0 8px;font-size:1rem}
.gbox h3{margin:12px 0 6px;font-size:.9rem;color:var(--a)}
.muted{color:var(--m);font-size:.88rem;line-height:1.55;overflow-wrap:anywhere}
.gbox p,.gbox li{line-height:1.55;overflow-wrap:anywhere;margin:0 0 8px}
.gbox code{font-size:.8rem;background:rgba(0,0,0,.22);padding:1px 5px;border-radius:5px;word-break:break-all}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}
.toc a{font-size:.78rem;padding:7px 12px;border-radius:999px;border:1px solid var(--gb);color:var(--t);text-decoration:none;background:rgba(255,255,255,.04)}
.toc a:hover{border-color:var(--a);color:var(--a)}
.olist{display:grid;gap:6px;margin:8px 0}
.step{padding:10px 12px;border-radius:12px;border:1px solid var(--gb);background:rgba(0,0,0,.15);font-size:.88rem;line-height:1.5}
.step b{color:var(--a);margin-inline-end:6px}
.env-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:8px;border-radius:10px;border:1px solid var(--gb)}
.env-wrap table{width:100%;min-width:480px;border-collapse:collapse;font-size:.75rem}
.env-wrap th,.env-wrap td{border-bottom:1px solid var(--gb);padding:7px 9px;text-align:start;vertical-align:top}
.env-wrap th{background:rgba(232,160,74,.1);color:var(--a);font-weight:700;position:sticky;top:0}
.env-wrap td code{font-size:.72rem}
details.faq{margin:6px 0;padding:10px 12px;border-radius:12px;border:1px solid var(--gb);background:rgba(0,0,0,.12)}
details.faq summary{cursor:pointer;font-weight:700}
@media (max-width:640px){
  .gbox{padding:12px}
  .toc a{flex:1 1 calc(50% - 6px);text-align:center}
}
</style>
</head>
<body>
<div class="wrap">
<header>
<a class="brand" href="/"><img src="${logo}" alt=""/><span class="lang-fa">سینماگرافی</span><span class="lang-en">CinemaGraphy</span></a>
<div style="display:flex;gap:8px;flex-wrap:wrap">
<button class="chip" type="button" id="langBtn">EN</button>
<a class="chip" href="/configure"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
<a class="chip" href="/"><span class="lang-fa">خانه</span><span class="lang-en">Home</span></a>
</div>
</header>

<p style="font-size:.75rem;color:var(--a);margin:0 0 4px">v${ver}</p>
<h1 class="lang-fa" style="margin:0 0 8px">📖 راهنما</h1>
<h1 class="lang-en" style="margin:0 0 8px">📖 Guide</h1>
<p class="lang-fa muted">نصب کلاینت، دیپلوی، متغیرها و سشن VIP.</p>
<p class="lang-en muted">Client install, deploy, env vars, and VIP session.</p>

<nav class="toc" aria-label="Sections">
<a href="#install"><span class="lang-fa">نصب</span><span class="lang-en">Install</span></a>
<a href="#configure"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
<a href="#cf"><span class="lang-fa">Cloudflare</span><span class="lang-en">Cloudflare</span></a>
<a href="#vercel"><span class="lang-fa">Vercel</span><span class="lang-en">Vercel</span></a>
<a href="#env">Env</a>
<a href="#vip"><span class="lang-fa">کوکی VIP</span><span class="lang-en">VIP cookie</span></a>
<a href="#faq">FAQ</a>
</nav>

<div class="gbox glass" id="install">
<h2 class="lang-fa">۱) نصب در استریمیو / نوویو</h2>
<h2 class="lang-en">1) Install in Stremio / Nuvio</h2>
<div class="olist">
<div class="step"><b>1</b>
<span class="lang-fa">کلاینت: <a href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Stremio</a> یا <a href="https://github.com/NuvioMedia/NuvioMobile/releases/latest" target="_blank" rel="noopener">Nuvio</a></span>
<span class="lang-en">Client: <a href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Stremio</a> or <a href="https://github.com/NuvioMedia/NuvioMobile/releases/latest" target="_blank" rel="noopener">Nuvio</a></span>
</div>
<div class="step"><b>2</b>
<span class="lang-fa">افزونه‌ها → لینک منیفست (دکمه نصب در خانه، یا <a href="/configure">شخصی‌سازی</a>)</span>
<span class="lang-en">Addons → manifest URL (home Install, or <a href="/configure">Configure</a>)</span>
</div>
<div class="step"><b>3</b>
<span class="lang-fa">برای متای فارسی پایدار، سینماگرافی را بالاتر از Cinemeta بگذارید.</span>
<span class="lang-en">Keep CinemaGraphy above Cinemeta for stable Persian meta.</span>
</div>
</div>
<p class="muted"><a href="${install}"><span class="lang-fa">لینک نصب stremio://</span><span class="lang-en">stremio:// install link</span></a></p>
</div>

<div class="gbox glass" id="configure">
<h2 class="lang-fa">۲) شخصی‌سازی</h2>
<h2 class="lang-en">2) Configure</h2>
<p class="lang-fa muted">پروایدر، زبان، IPTV، TMDB و VIP را در <a href="/configure">/configure</a> تنظیم کنید. خروجی <code>/c/…/manifest.json</code> است — عمومی پخش نکنید (ممکن است کوکی/رمز داخلش باشد).</p>
<p class="lang-en muted">Set providers, language, IPTV, TMDB and VIP on <a href="/configure">/configure</a>. You get <code>/c/…/manifest.json</code> — do not share it publicly.</p>
</div>

<div class="gbox glass" id="cf">
<h2 class="lang-fa">۳) Cloudflare Workers</h2>
<h2 class="lang-en">3) Cloudflare Workers</h2>
<p class="lang-fa muted">ریپو: <a href="https://github.com/TheNerdCow/CinemaGraphy" target="_blank" rel="noopener">TheNerdCow/CinemaGraphy</a></p>
<p class="lang-en muted">Repo: <a href="https://github.com/TheNerdCow/CinemaGraphy" target="_blank" rel="noopener">TheNerdCow/CinemaGraphy</a></p>

<h3 class="lang-fa">الف) از داشبورد (بدون ترمینال)</h3>
<h3 class="lang-en">A) Dashboard (no terminal)</h3>
<div class="olist">
<div class="step"><b>1</b>
<span class="lang-fa">ورود به <a href="https://dash.cloudflare.com" target="_blank" rel="noopener">dash.cloudflare.com</a></span>
<span class="lang-en">Sign in at <a href="https://dash.cloudflare.com" target="_blank" rel="noopener">dash.cloudflare.com</a></span>
</div>
<div class="step"><b>2</b>
<span class="lang-fa"><b>Compute</b> → <b>Workers &amp; Pages</b> → Create / اتصال به GitHub یا آپلود کد Worker</span>
<span class="lang-en"><b>Compute</b> → <b>Workers &amp; Pages</b> → Create / connect GitHub or upload Worker</span>
</div>
<div class="step"><b>3</b>
<span class="lang-fa">بعد از دیپلوی: Worker را باز کنید → <b>Settings</b> → <b>Variables and Secrets</b></span>
<span class="lang-en">After deploy: open the Worker → <b>Settings</b> → <b>Variables and Secrets</b></span>
</div>
<div class="step"><b>4</b>
<span class="lang-fa">هر متغیر را دستی اضافه کنید (جدول Env). برای کلیدها و کوکی‌ها نوع <b>Secret</b> را بزنید تا بعد از آپدیت کد پاک نشوند.</span>
<span class="lang-en">Add each variable (Env table). Mark keys/cookies as <b>Secret</b> so code deploys do not wipe them.</span>
</div>
<div class="step"><b>5</b>
<span class="lang-fa">منیفست: <code>https://cmplugin.ir/manifest.json</code></span>
<span class="lang-en">Manifest: <code>https://cmplugin.ir/manifest.json</code></span>
</div>
</div>

<h3 class="lang-fa">ب) با Wrangler (توسعه‌دهنده)</h3>
<h3 class="lang-en">B) Wrangler (developers)</h3>
<div class="olist">
<div class="step"><b>1</b> <code>pnpm install</code> → <code>npx wrangler login</code></div>
<div class="step"><b>2</b>
<span class="lang-fa">فایل <code>.dev.vars</code> از روی <code>.env.example</code> (در Git نرود)</span>
<span class="lang-en"><code>.dev.vars</code> from <code>.env.example</code> (never commit)</span>
</div>
<div class="step"><b>3</b> <code>npx wrangler deploy</code>
<span class="lang-fa"> — جزئیات: </span><span class="lang-en"> — see </span><code>docs/CLOUDFLARE.md</code>
</div>
</div>
<p class="lang-fa muted">پلن رایگان CF محدودیت CPU دارد؛ ترافیک خیلی همزمان ممکن است ضعیف‌تر از Vercel باشد.</p>
<p class="lang-en muted">CF Free has CPU limits; heavy concurrency may be weaker than Vercel.</p>
</div>

<div class="gbox glass" id="vercel">
<h2 class="lang-fa">۴) Vercel</h2>
<h2 class="lang-en">4) Vercel</h2>
<div class="olist">
<div class="step"><b>1</b>
<span class="lang-fa">Import ریپو در Vercel (Node / Other)</span>
<span class="lang-en">Import the repo in Vercel (Node / Other)</span>
</div>
<div class="step"><b>2</b>
<span class="lang-fa">Settings → Environment Variables — جدول Env. حداقل <code>TMDB_API_KEY</code></span>
<span class="lang-en">Settings → Environment Variables — Env table. At least <code>TMDB_API_KEY</code></span>
</div>
<div class="step"><b>3</b>
<span class="lang-fa">Deploy → <code>https://YOUR-APP.vercel.app/manifest.json</code></span>
<span class="lang-en">Deploy → <code>https://YOUR-APP.vercel.app/manifest.json</code></span>
</div>
<div class="step"><b>4</b>
<span class="lang-fa">اگر Billing pause شد، از Cloudflare پشتیبان بگیرید.</span>
<span class="lang-en">If billing is paused, use Cloudflare as backup.</span>
</div>
</div>
</div>

<div class="gbox glass" id="env">
<h2 class="lang-fa">۵) متغیرهای محیطی</h2>
<h2 class="lang-en">5) Environment variables</h2>
<p class="lang-fa muted">روی سرور برای نمونهٔ عمومی. خیلی‌ها از <a href="/configure">/configure</a> هم در لینک شخصی ست می‌شوند.</p>
<p class="lang-en muted">On the host for a public instance. Many can also be set via <a href="/configure">/configure</a> in a personal link.</p>
<div class="env-wrap"><table>
<thead><tr>
<th>Var</th>
<th><span class="lang-fa">توضیح</span><span class="lang-en">Meaning</span></th>
<th><span class="lang-fa">نمونه</span><span class="lang-en">Example</span></th>
</tr></thead>
<tbody>
<tr><td><code>TMDB_API_KEY</code></td><td><span class="lang-fa">متای TMDB</span><span class="lang-en">TMDB meta</span></td><td>—</td></tr>
<tr><td><code>F2MEDIA_BASEURL</code></td><td>F2Media</td><td><code>https://www.film2med.top</code></td></tr>
<tr><td><code>CINAMATIC_BASEURL</code></td><td>Cinamatic</td><td><code>https://cinamatic.top</code></td></tr>
<tr><td><code>ASLMOVIEZ_BASEURL</code></td><td>AslMoviez</td><td>—</td></tr>
<tr><td><code>SERIALBLOG_BASEURL</code></td><td>SerialBlog</td><td>—</td></tr>
<tr><td><code>DONYAYESERIAL_BASEURL</code></td><td>DonyayeSerial</td><td>—</td></tr>
<tr><td><code>ANIMEX_BASEURL</code></td><td>Animex</td><td><code>https://animex.my</code></td></tr>
<tr><td><code>DIGIMOVIE_BASEURL</code></td><td>DigiMovie</td><td><code>https://www.digimoviez.com</code></td></tr>
<tr><td><code>DIGIMOVIE_COOKIE</code></td><td><span class="lang-fa">سشن VIP (ترجیحی)</span><span class="lang-en">VIP session (preferred)</span></td><td>—</td></tr>
<tr><td><code>AVAMOVIE_BASEURL</code></td><td>AvaMovie</td><td><code>https://avamovie.shop</code></td></tr>
<tr><td><code>AVAMOVIE_COOKIE</code></td><td><span class="lang-fa">سشن VIP (ترجیحی)</span><span class="lang-en">VIP session (preferred)</span></td><td>—</td></tr>
<tr><td><code>ENABLED_PROVIDERS</code></td><td><span class="lang-fa">لیست با ویرگول</span><span class="lang-en">comma list</span></td><td><code>f2media,animex</code></td></tr>
<tr><td><code>CATALOG_IPTVBRIDGE_MANIFEST_URL</code></td><td>IPTV</td><td><code>https://iptvbridge.vercel.app/manifest.json</code></td></tr>
<tr><td><code>PROXY_ENABLE</code></td><td><span class="lang-fa">پروکسی عمومی (غیر TMDB image)</span><span class="lang-en">generic proxy (not TMDB images)</span></td><td><code>false</code></td></tr>
</tbody></table></div>
</div>

<div class="gbox glass" id="vip">
<h2 class="lang-fa">۶) کوکی VIP — Digi و Ava (یک روش برای هر دو)</h2>
<h2 class="lang-en">6) VIP cookie — Digi &amp; Ava (same steps)</h2>
<p class="lang-fa muted">فقط در <a href="/configure">شخصی‌سازی</a>. روی Env سرور نگذارید. اکانت و ریسک با خودتان است.</p>
<p class="lang-en muted">Only in <a href="/configure">Configure</a>. Never on server Env. Account risk is yours.</p>
<p class="muted"><b>BASEURL:</b> Digi <code>https://digimoviez.com</code> · Ava <code>https://avamovie.shop</code></p>

<div class="step" style="margin-top:10px"><b>1</b>
<span class="lang-fa">وارد سایت شو (لاگین + اشتراک فعال).</span>
<span class="lang-en">Log in on the site (active VIP).</span>
</div>
<div class="step"><b>2</b>
<span class="lang-fa">صفحه را <b>Refresh</b> کن. کلید <b>F12</b> → تب <b>Network</b>.</span>
<span class="lang-en">Refresh the page. Press <b>F12</b> → <b>Network</b> tab.</span>
</div>
<div class="step"><b>3</b>
<span class="lang-fa">روی اولین درخواست همان دامنه کلیک کن (مثلاً <code>digimoviez.com</code> یا <code>avamovie.shop</code>).</span>
<span class="lang-en">Click the first request for that domain (e.g. <code>digimoviez.com</code> / <code>avamovie.shop</code>).</span>
</div>
<div class="step"><b>4</b>
<span class="lang-fa">سمت راست → <b>Headers</b> → بخش <b>Request Headers</b> → خط <b>Cookie</b>.</span>
<span class="lang-en">Right panel → <b>Headers</b> → <b>Request Headers</b> → line <b>Cookie</b>.</span>
</div>
<div class="step"><b>5</b>
<span class="lang-fa">روی مقدار Cookie راست‌کلیک → <b>Copy value</b> (یک خط بلند).</span>
<span class="lang-en">Right-click the Cookie value → <b>Copy value</b> (one long line).</span>
</div>

<div class="glass" style="padding:12px;margin:12px 0;font-family:ui-monospace,monospace;font-size:.72rem;direction:ltr;text-align:left;line-height:1.6;border:1px dashed var(--gb)">
<div style="color:var(--m);margin-bottom:6px">DevTools · Request Headers (example)</div>
<div>:method: GET</div>
<div>accept: text/html</div>
<div><b style="color:var(--a)">Cookie:</b> PHPSESSID=<span style="filter:blur(4px);user-select:none">xxxx</span>; wordpress_logged_in_<span style="filter:blur(4px);user-select:none">ab12</span>=<span style="filter:blur(4px);user-select:none">Nerd••••secret••••</span>; mode=darkMode</div>
<div style="margin-top:8px;color:var(--m)" class="lang-fa">↑ فقط همین خط Cookie را کامل کپی کنید (اعداد واقعی تار شده‌اند)</div>
<div style="margin-top:4px;color:var(--m)" class="lang-en">↑ Copy the entire Cookie line only (real values are blurred)</div>
</div>

<div class="step"><b>6</b>
<span class="lang-fa">در Configure تیک Digi یا Ava → فیلد <b>COOKIE</b> → چسباندن. BASEURL را هم بگذار. دکمه نصب / کپی لینک.</span>
<span class="lang-en">Configure → tick Digi or Ava → paste into <b>COOKIE</b>. Set BASEURL. Install / copy link.</span>
</div>
<div class="step"><b>7</b>
<span class="lang-fa">سشن چند ساعت تا حدود یک روز است. استریم خالی شد → دوباره کوکی تازه بگیر. در استریمیو افزونهٔ قبلی را حذف و لینک جدید را نصب کن.</span>
<span class="lang-en">Session lasts hours to ~a day. Empty streams → new cookie. In Stremio remove the old addon and install the new link.</span>
</div>
<p class="lang-fa muted" style="margin-top:10px">Application → Cookies هم می‌شود، ولی باید دستی <code>name=value; …</code> بسازی. Network یک‌جا کپی می‌دهد.</p>
<p class="lang-en muted" style="margin-top:10px">Application → Cookies works too, but you must build <code>name=value; …</code> yourself. Network copies one line.</p>
</div>

<div class="gbox glass" id="faq">
<h2>FAQ</h2>
<details class="faq"><summary class="lang-fa">استریم خالی؟</summary><summary class="lang-en">No streams?</summary>
<p class="lang-fa muted" style="margin-top:8px">عنوان نیست، پروایدر آفلاین، یا سشن/VIP منقضی.</p>
<p class="lang-en muted" style="margin-top:8px">Missing title, offline provider, or expired VIP session.</p>
</details>
<details class="faq"><summary class="lang-fa">پوستر نمی‌آید؟</summary><summary class="lang-en">Missing posters?</summary>
<p class="lang-fa muted" style="margin-top:8px">پروکسی تصویر TMDB روی همان دامنهٔ افزونه باید در دسترس باشد. <code>PROXY_ENABLE</code> برای پوستر TMDB لازم نیست.</p>
<p class="lang-en muted" style="margin-top:8px">TMDB image proxy must be on the addon origin. <code>PROXY_ENABLE</code> is not required for TMDB posters.</p>
</details>
<details class="faq"><summary class="lang-fa">پشتیبانی</summary><summary class="lang-en">Support</summary>
<p style="margin-top:8px"><a href="https://t.me/nerdcow" target="_blank" rel="noopener">t.me/nerdcow</a> · <a href="https://t.me/cinemmagraphy" target="_blank" rel="noopener">channel</a> · <a href="https://github.com/TheNerdCow/CinemaGraphy" target="_blank" rel="noopener">GitHub</a></p>
</details>
</div>

<p style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px">
<a class="chip" href="/"><span class="lang-fa">خانه</span><span class="lang-en">Home</span></a>
<a class="chip" href="/configure"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
</p>
</div>
<script>
(function(){
  var r=document.documentElement,lb=document.getElementById('langBtn');
  function al(l){r.lang=l;r.dir=l==='fa'?'rtl':'ltr';if(lb)lb.textContent=l==='fa'?'EN':'FA';localStorage.setItem('cg-lang',l)}
  al(localStorage.getItem('cg-lang')||'fa');
  if(lb)lb.onclick=function(){al(r.lang==='fa'?'en':'fa')};
})();
</script>
</body></html>`
}
