/**
 * Liquid Glass landing — Interstellar-inspired
 * Install + Manifest copy, ranked companion addons, GitHub-only footer
 */
const LOGO_FALLBACK = 'https://raw.githubusercontent.com/TheNerdCow/CinemaGraphy/refs/heads/master/logo.png'
const PUBLIC_INSTALL = 'https://cinemagraphy.vercel.app/manifest.json'
const PUBLIC_SITE = 'https://cinemagraphy.vercel.app'
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
  version = '3.2.8',
} = {}) {
  const m = escapeHtml(manifestUrl || PUBLIC_INSTALL)
  const install = escapeHtml(
    installUrl || `stremio://${String(manifestUrl || PUBLIC_INSTALL).replace(/^https?:\/\//i, '')}`,
  )
  const logo = escapeHtml(logoUrl || LOGO_FALLBACK)
  const ver = escapeHtml(String(version || '3.2.8'))

  const addonCards = RECOMMENDED.map(
    (a) => `
<a class="c glass" href="${escapeHtml(a.href)}" target="_blank" rel="noopener">
  <img class="ico-img" src="${escapeHtml(a.icon)}" alt="" width="40" height="40" loading="lazy" onerror="this.style.display='none'"/>
  <div>
    <b>${escapeHtml(a.name)}</b>
    <span class="lang-fa">${escapeHtml(a.descFa)}</span>
    <span class="lang-en">${escapeHtml(a.descEn)}</span>
  </div>
</a>`,
  ).join('')

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>سینماگرافی — Cinemagraphy</title>
<link rel="icon" href="${logo}"/>
<style>
:root{--t:#f4f0ea;--m:#a89f94;--a:#e8a04a;--a2:#7eb6ff;--g:rgba(255,255,255,.07);--gb:rgba(255,255,255,.14);--gl:rgba(232,160,74,.35)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Vazirmatn,Tahoma,Segoe UI,system-ui,sans-serif;color:var(--t);min-height:100vh;line-height:1.65;overflow-x:hidden;
cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='8' cy='8' r='5.5' fill='none' stroke='%23e8a04a' stroke-width='1.8'/%3E%3Ccircle cx='8' cy='8' r='1.6' fill='%23e8a04a'/%3E%3Cpath d='M12.5 12.5L22 22' stroke='%23e8a04a' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") 8 8,auto}
a,button,.chip,.btn,.copy{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='8' cy='8' r='6' fill='rgba(232,160,74,.25)' stroke='%23e8a04a' stroke-width='1.8'/%3E%3Ccircle cx='8' cy='8' r='2' fill='%23e8a04a'/%3E%3C/svg%3E") 8 8,pointer}
.bg{position:fixed;inset:0;z-index:-2;background:
radial-gradient(ellipse 120% 80% at 50% 120%,#1a0a2e 0%,transparent 55%),
radial-gradient(ellipse 60% 50% at 80% 20%,#0d1b3a 0%,transparent 50%),
radial-gradient(ellipse 50% 40% at 15% 30%,#1a1025 0%,transparent 45%),
linear-gradient(180deg,#050508,#0a0612 40%,#12081c)}
.stars{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.7;
background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 30% 60%,#fff,transparent),radial-gradient(1.5px 1.5px at 50% 15%,#ffe9c4,transparent),radial-gradient(1px 1px at 70% 40%,#fff,transparent),radial-gradient(1px 1px at 85% 75%,#cde4ff,transparent),radial-gradient(1.5px 1.5px at 20% 80%,#fff,transparent),radial-gradient(1px 1px at 60% 90%,#fff,transparent),radial-gradient(1px 1px at 40% 35%,#ffe9c4,transparent),radial-gradient(1.5px 1.5px at 90% 10%,#fff,transparent),radial-gradient(1px 1px at 5% 50%,#fff,transparent)}
.neb{position:fixed;z-index:-1;pointer-events:none;border-radius:50%;filter:blur(80px);opacity:.28}
.n1{top:-20%;right:-15%;width:70vw;height:70vw;background:radial-gradient(circle,#3d1a6e,transparent 70%)}
.n2{bottom:-25%;left:-20%;width:70vw;height:70vw;background:radial-gradient(circle,#1a3a6e,transparent 70%)}
.glass{background:var(--g);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border:1px solid var(--gb);border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
.rec-nuvio{border-color:rgba(126,182,255,.35)!important;box-shadow:0 0 0 1px rgba(126,182,255,.12),0 12px 40px rgba(20,40,90,.35),inset 0 1px 0 rgba(255,255,255,.1)!important}
.rec-nuvio::before{content:'';position:absolute;inset:-40% -20%;background:radial-gradient(ellipse at 30% 0%,rgba(126,182,255,.18),transparent 55%);pointer-events:none}
.rec-badge{position:absolute;top:12px;inset-inline-end:12px;font-size:.68rem;font-weight:800;padding:4px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(126,182,255,.35),rgba(232,160,74,.25));border:1px solid rgba(126,182,255,.4);color:#e8f0ff;letter-spacing:.02em;z-index:1}
.tile .hov{gap:6px!important;padding:10px 8px!important}
.tile .hov a{margin:0!important;width:100%;display:block}
.tile .hov .s-nuvio{background:linear-gradient(135deg,#6a9dff,#4a7ae0);color:#fff}

.lang-en{display:none!important}html[lang=en] .lang-fa{display:none!important}html[lang=en] .lang-en{display:revert!important}html[lang=en] body{direction:ltr}/* block-level bilingual nodes stay block when visible */h1.lang-fa,h1.lang-en,p.lang-fa,p.lang-en,h2.lang-fa,h2.lang-en,section .sub.lang-fa,section .sub.lang-en{display:block}html[lang=en] h1.lang-en,html[lang=en] p.lang-en,html[lang=en] h2.lang-en,html[lang=en] section .sub.lang-en{display:block!important}html[lang=en] h1.lang-fa,html[lang=en] p.lang-fa,html[lang=en] h2.lang-fa,html[lang=en] section .sub.lang-fa{display:none!important}
header{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:14px 5vw;background:rgba(5,5,8,.45);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}
.brand{display:flex;gap:12px;align-items:center;color:var(--t);text-decoration:none;font-weight:800;font-size:1.15rem}
.brand img{width:40px;height:40px;border-radius:12px;box-shadow:0 0 20px var(--gl)}
.chip{border:1px solid var(--gb);background:var(--g);backdrop-filter:blur(12px);color:var(--t);border-radius:999px;padding:8px 14px;font-weight:600;font-size:.85rem}
.hero{max-width:1080px;margin:0 auto;padding:48px 5vw 32px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:40px;align-items:center}
@media(max-width:860px){.hero{grid-template-columns:1fr;text-align:center}.vis{order:-1}.row{justify-content:center}.badge{align-self:center!important}.hero-copy{align-items:center}}
.hero-copy{display:flex;flex-direction:column;align-items:flex-start;min-width:0;max-width:100%;position:relative;z-index:2}
.badge{display:inline-flex;align-self:flex-start;padding:4px 12px;border-radius:999px;font-size:.72rem;font-weight:700;background:rgba(232,160,74,.15);color:var(--a);border:1px solid rgba(232,160,74,.3);margin-bottom:4px}
.hero-copy h1{font-size:clamp(1.85rem,4.6vw,2.85rem);font-weight:900;line-height:1.2;margin:4px 0 12px;letter-spacing:-.03em;max-width:100%;word-break:break-word}
.hero-copy h1 span{display:inline;background:linear-gradient(135deg,var(--a),#ff6b4a 40%,var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{color:var(--m);font-size:.98rem;line-height:1.7;max-width:32rem;width:100%;margin:0 0 4px;position:relative;z-index:2}
@media(max-width:860px){.lead{margin-inline:auto;text-align:center}}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 14px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 22px;border-radius:14px;font-weight:800;font-size:.95rem;text-decoration:none;border:none;transition:transform .2s,box-shadow .2s;font-family:inherit}
.btn:hover{transform:translateY(-2px)}
.bp{background:linear-gradient(135deg,#e8a04a,#d4783a);color:#1a0f05;box-shadow:0 8px 28px rgba(232,160,74,.35)}
.bp.ok{background:linear-gradient(135deg,#5dcea0,#3aa87a);color:#06150f;box-shadow:0 8px 28px rgba(93,206,160,.35)}
.box{margin-top:4px;padding:14px 16px}
.box label{font-size:.72rem;color:var(--m);display:block;margin-bottom:8px;font-weight:600}
.box .r{display:flex;gap:8px;align-items:center}
.box input{flex:1;min-width:0;background:rgba(0,0,0,.25);border:1px solid var(--gb);border-radius:10px;color:var(--t);font-family:ui-monospace,monospace;font-size:.75rem;padding:10px 12px;direction:ltr;text-align:left;outline:none}
.copy{border:1px solid var(--gb);background:rgba(255,255,255,.1);color:var(--t);border-radius:10px;padding:10px 14px;font-weight:700;font-size:.8rem;white-space:nowrap}
.copy.ok{color:#7dffb3;border-color:rgba(125,255,179,.4)}
.vis{display:flex;justify-content:center}
.stage{width:min(260px,65vw);animation:f 5s ease-in-out infinite;position:relative}
@keyframes f{50%{transform:translateY(-14px)}}
.stage::before{content:'';position:absolute;inset:-20%;background:radial-gradient(circle,var(--gl),transparent 65%);filter:blur(30px);opacity:.6;z-index:-1}
.stage .gwrap{padding:20px;border-radius:28px}
.stage img{width:100%;border-radius:20px;display:block}
section{max-width:1080px;margin:0 auto;padding:20px 5vw 28px}
section h2{font-size:1.25rem;font-weight:800;margin-bottom:4px}
section .sub{color:var(--m);font-size:.9rem;margin-bottom:16px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.p{display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 12px;text-align:center;text-decoration:none;color:var(--t);font-weight:700;font-size:.9rem;border-radius:16px;transition:transform .2s}
.p:hover{transform:translateY(-3px);border-color:rgba(232,160,74,.35)}
.p svg{width:20px;height:20px;opacity:.9;flex-shrink:0}
.pl{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.pl .c{display:flex;gap:12px;align-items:center;padding:16px;border-radius:16px;transition:transform .2s;text-decoration:none;color:var(--t)}
.pl .c:hover{transform:translateY(-2px);border-color:rgba(232,160,74,.35)}
.pl .ico-img{width:40px;height:40px;border-radius:10px;object-fit:cover;background:rgba(255,255,255,.08);flex-shrink:0}
.pl b{font-size:.92rem;display:block}
.pl span{color:var(--m);font-size:.8rem;display:block}
footer{margin-top:12px;padding:32px 5vw 44px;border-top:1px solid rgba(255,255,255,.06);text-align:center}
.gh{display:inline-flex;align-items:center;gap:10px;color:var(--t);text-decoration:none;font-weight:700;font-size:.95rem;padding:12px 18px;border-radius:14px;transition:transform .2s,border-color .2s}
.gh:hover{transform:translateY(-2px);border-color:rgba(232,160,74,.35)}
.gh svg{width:22px;height:22px;flex-shrink:0}
.gh .label{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.gh .label small{color:var(--m);font-weight:600;font-size:.8rem}

.prov{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.prov .card{display:flex;flex-direction:column;gap:8px;padding:14px 12px;border-radius:16px;transition:transform .2s,border-color .2s}
.prov .card:hover{transform:translateY(-2px)}
.prov .top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.prov .name{font-weight:800;font-size:.9rem}
.prov .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;box-shadow:0 0 8px currentColor}
.prov .dot.on{background:#5dcea0;color:#5dcea0}
.prov .dot.off{background:#e07070;color:#e07070}
.prov .dot.na{background:#6a6570;color:#6a6570}
.prov .meta{font-size:.72rem;color:var(--m)}
.prov .sk{height:72px;border-radius:16px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.1),rgba(255,255,255,.04));background-size:200% 100%;animation:sh 1.2s ease-in-out infinite}
@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}

.rail{display:flex;gap:12px;overflow-x:auto;padding:6px 2px 10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;
overscroll-behavior-x:contain;scrollbar-width:none!important;-ms-overflow-style:none!important}
.rail::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;background:transparent!important}
.rail::-webkit-scrollbar-thumb{display:none!important;background:transparent!important}
.rail::-webkit-scrollbar-track{display:none!important}
.tile{flex:0 0 120px;scroll-snap-align:start;text-decoration:none;color:var(--t);transition:transform .2s}
.tile:hover{transform:translateY(-3px)}
.tile img{width:120px;height:180px;object-fit:cover;border-radius:12px;background:rgba(255,255,255,.06);display:block}
.tile .cap{margin-top:6px;font-size:.78rem;font-weight:700;line-height:1.3;max-height:2.6em;overflow:hidden}
.tile .sub2{font-size:.7rem;color:var(--m);margin-top:2px}
.tr-tile{flex:0 0 168px;max-width:168px}
.tr-tile .thumb{position:relative;border-radius:12px;overflow:hidden;height:94px;background:#111;display:block}
.tr-tile .thumb img{width:100%;height:100%;object-fit:cover;display:block;opacity:.9}
.tr-tile .play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);font-size:1.25rem;pointer-events:none}
.tr-tile .cap{margin-top:6px;font-size:.72rem;font-weight:700;line-height:1.25;max-height:2.5em;overflow:hidden}
.tr-tile .actions{display:flex;gap:4px;margin-top:4px}
.tr-tile .actions a{flex:1;font-size:.62rem;font-weight:800;padding:5px 4px;border-radius:8px;text-decoration:none;text-align:center}
.tr-tile .actions .s{background:linear-gradient(135deg,#e8a04a,#d4783a);color:#1a0f05}
.tr-tile .actions .y{background:rgba(255,255,255,.12);color:#fff}
.modal{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.75);padding:16px}
.modal.open{display:flex}
.modal .inner{width:min(900px,100%);aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;position:relative}
.modal iframe{width:100%;height:100%;border:0}
.modal .x{position:absolute;top:-36px;inset-inline-end:0;background:transparent;border:0;color:#fff;font-size:1.4rem;font-weight:700}

.tile{position:relative}
.tile .hov{position:absolute;inset:0;border-radius:12px;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.85));opacity:0;transition:opacity .2s;display:flex;flex-direction:column;justify-content:flex-end;padding:8px;gap:4px}
.tile:hover .hov,.tile:focus-within .hov{opacity:1}
.tile .hov a,.tile .hov button{font-size:.65rem;font-weight:700;padding:5px 6px;border-radius:8px;border:0;text-decoration:none;text-align:center;font-family:inherit;cursor:pointer}
.tile .hov .s{background:linear-gradient(135deg,#e8a04a,#d4783a);color:#1a0f05}
.tile .hov .w{background:rgba(255,255,255,.15);color:#fff;backdrop-filter:blur(6px)}
.tile .poster-wrap{position:relative;width:120px;height:180px;border-radius:12px;overflow:hidden}
.tr-tile .hov{opacity:0}
.tr-tile:hover .hov{opacity:1}
.foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center}
.foot .gh{margin:0}

.feat-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:8px 0 20px}
.feat-card{padding:16px 14px;text-align:center;transition:transform .2s,border-color .2s}
.feat-card:hover{transform:translateY(-3px);border-color:rgba(232,160,74,.35)}
.feat-card .ico{width:36px;height:36px;margin:0 auto 8px;border-radius:12px;display:grid;place-items:center;background:rgba(232,160,74,.12);color:var(--a)}
.feat-card .ico svg{width:20px;height:20px;fill:currentColor}
.feat-card b{display:block;font-size:.88rem;margin-bottom:4px}
.feat-card span{font-size:.75rem;color:var(--m);line-height:1.35}
.sec-h{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.sec-h .ico{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.06);color:var(--a2);flex-shrink:0}
.sec-h .ico svg{width:16px;height:16px;fill:currentColor}
.prov .card{transition:transform .18s,border-color .18s}
.prov .card:hover{transform:translateY(-2px);border-color:rgba(232,160,74,.3)}

.chip.soon{opacity:.85;cursor:default;display:inline-flex;align-items:center;gap:6px;padding:8px 12px}
.chip.soon .soon-tag{position:static;transform:none;font-size:.62rem;font-weight:800;padding:2px 7px;border-radius:999px;background:rgba(232,160,74,.22);color:var(--a);letter-spacing:.02em;white-space:nowrap;flex-shrink:0}
.chip.soon:hover{transform:none;border-color:var(--gb)}
.nav-chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;min-width:0}
@media(max-width:860px){
  header{padding:10px 3.5vw;gap:10px}
  .brand span{display:none}
  .brand img{width:36px;height:36px;border-radius:11px}
  .nav-chips{gap:6px}
  .chip{padding:6px 10px;font-size:.75rem}
  .chip.soon{display:none} /* hero already has support button */
  .row{gap:8px;justify-content:center}
  .row .btn{flex:1 1 calc(50% - 8px);min-width:0;padding:12px 12px;font-size:.84rem}
  .stage{width:min(210px,58vw)}
  .feat-row{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .box .r{flex-wrap:wrap}
  .box input{width:100%}
}
@media(max-width:420px){
  .row .btn{flex:1 1 100%;font-size:.88rem}
  .chip{padding:6px 9px;font-size:.72rem}
  header{padding:8px 3vw}
}
</style>
</head>
<body>
<div class="bg"></div><div class="stars"></div>
<div class="neb n1"></div><div class="neb n2"></div>
<header>
<a class="brand" href="/"><img src="${logo}" alt="Cinemagraphy" onerror="this.src='${LOGO_FALLBACK}'"/><span>سینماگرافی</span></a>
<div class="nav-chips">
<a class="chip" href="/guide" style="text-decoration:none"><span class="lang-fa">راهنما</span><span class="lang-en">Guide</span></a>
<a class="chip" href="/configure" style="text-decoration:none"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
<span class="chip soon" title="به‌زودی / Coming soon" role="button" aria-disabled="true">
  <span class="lang-fa">♥ حمایت مالی</span><span class="lang-en">♥ Support</span>
  <span class="soon-tag lang-fa">به‌زودی</span><span class="soon-tag lang-en">Soon</span>
</span>
<button class="chip" id="langBtn" type="button">EN</button>
</div>
</header>
<main>
<div class="hero">
<div class="hero-copy">
<span class="badge">v${ver}</span>
<h1 class="lang-fa">سینماگرافی<br/><span>فیلم، سریال، انیمه</span></h1>
<h1 class="lang-en">Cinemagraphy<br/><span>Movies, Series, Anime</span></h1>
<p class="lead lang-fa">افزونه استریمیو برای تماشای فیلم و سریال از منابع ایرانی و بین‌المللی — کیفیت، حجم و وضعیت سانسور در یک نگاه.</p>
<p class="lead lang-en">Stremio addon for Iranian &amp; international sources — quality, size and censor status at a glance.</p>
<div class="row">
<a class="btn bp" href="${install}"><span class="lang-fa">نصب در نوویو و استریمیو</span><span class="lang-en">Install in Nuvio &amp; Stremio</span></a>
<button class="btn bp" id="manifestCopyBtn" type="button"><span class="lang-fa">لینک منیفست</span><span class="lang-en">Manifest link</span></button>
<a class="btn bp" href="/configure" style="background:rgba(255,255,255,.1);color:var(--t);box-shadow:none;border:1px solid var(--gb)"><span class="lang-fa">شخصی‌سازی</span><span class="lang-en">Configure</span></a>
<a class="btn bp" href="/guide" style="background:rgba(255,255,255,.08);color:var(--t);box-shadow:none;border:1px solid var(--gb)"><span class="lang-fa">📖 راهنما</span><span class="lang-en">📖 Guide</span></a>
<button class="btn bp" type="button" disabled style="opacity:.72;cursor:default;background:rgba(232,160,74,.12);color:var(--a);box-shadow:none;border:1px solid rgba(232,160,74,.35)" title="به‌زودی — حمایت از ایران و خارج (کریپتو و …)"><span class="lang-fa">♥ حمایت مالی · به‌زودی</span><span class="lang-en">♥ Support · Soon</span></button>
</div>
<input type="hidden" id="manifestUrl" value="${m}"/>
</div>
<div class="vis"><div class="stage"><div class="gwrap glass"><img src="${logo}" alt="logo" onerror="this.src='${LOGO_FALLBACK}'"/></div></div></div>
</div>

<section>
<div class="feat-row">
<div class="feat-card glass"><div class="ico"><svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/></svg></div><b class="lang-fa">منابع ایرانی</b><b class="lang-en">Iran sources</b><span class="lang-fa">چند پروایدر موازی</span><span class="lang-en">Parallel providers</span></div>
<div class="feat-card glass"><div class="ico"><svg viewBox="0 0 24 24"><path d="M12 3v12.5l4-4 1.4 1.4L12 19.3l-5.4-6.4L8 11.5l4 4V3z"/></svg></div><b class="lang-fa">متای فارسی</b><b class="lang-en">Persian meta</b><span class="lang-fa">TMDB fa-IR</span><span class="lang-en">TMDB fa-IR</span></div>
<div class="feat-card glass"><div class="ico"><svg viewBox="0 0 24 24"><path d="M12 1a9 9 0 0 0-9 9c0 6 9 13 9 13s9-7 9-13a9 9 0 0 0-9-9zm0 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg></div><b class="lang-fa">شخصی‌سازی</b><b class="lang-en">Configure</b><span class="lang-fa">منیفست اختصاصی</span><span class="lang-en">Custom manifest</span></div>
<div class="feat-card glass"><div class="ico"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg></div><b class="lang-fa">راهنما</b><b class="lang-en">Guide</b><span class="lang-fa">آموزش نصب</span><span class="lang-en">Setup help</span></div>
</div>
</section>
<section>
<h2 class="lang-fa">دانلود کلاینت</h2><h2 class="lang-en">Download clients</h2>
<p class="sub lang-fa">سینماگرافی روی <b>Stremio</b> و <b>Nuvio</b> (سازگار با منیفست استریمیو) کار می‌کند. هر دو را می‌توانید نصب کنید.</p>
<p class="sub lang-en">CinemaGraphy works on <b>Stremio</b> and <b>Nuvio</b> (Stremio-manifest compatible).</p>

<div class="glass" style="padding:14px 16px;margin-bottom:14px">
<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
<img src="https://www.google.com/s2/favicons?domain=stremio.com&sz=64" width="28" height="28" alt="" style="border-radius:8px"/>
<b class="lang-fa">Stremio</b><b class="lang-en">Stremio</b>
<span class="muted" style="font-size:.85rem">— <span class="lang-fa">کلاسیک و پایدار</span><span class="lang-en">classic &amp; stable</span></span>
</div>
<div class="g">
<a class="p glass" href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Windows</a>
<a class="p glass" href="https://www.stremio.com/downloads" target="_blank" rel="noopener">macOS</a>
<a class="p glass" href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Linux</a>
<a class="p glass" href="https://www.stremio.com/downloads" target="_blank" rel="noopener">Android</a>
<a class="p glass" href="https://apps.apple.com/app/stremio/id1297124690" target="_blank" rel="noopener">iOS / tvOS</a>
<a class="p glass" href="https://web.stremio.com/" target="_blank" rel="noopener"><span class="lang-fa">وب‌اپ</span><span class="lang-en">Web</span></a>
</div>
</div>

<div class="glass rec-nuvio" style="padding:16px 18px;margin-bottom:8px;position:relative;overflow:hidden">
<div class="rec-badge"><span class="lang-fa">پیشنهاد ما</span><span class="lang-en">Recommended</span></div>
<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
<img src="https://nuvio.tv/assets/Logo_1080x1080.png" width="32" height="32" alt="" style="border-radius:10px;object-fit:cover;box-shadow:0 0 18px rgba(126,182,255,.45)" onerror="this.src='https://www.google.com/s2/favicons?domain=nuvio.tv&sz=64'"/>
<b style="font-size:1.05rem">Nuvio</b>
<span class="muted" style="font-size:.85rem">— <span class="lang-fa">سریع‌تر، پایدارتر، قابل‌سفارشی‌سازی</span><span class="lang-en">faster, more stable, customizable</span></span>
</div>
<p class="sub lang-fa" style="margin-bottom:10px">کلاینت مدرن سازگار با منیفست استریمیو. دانلود داخل اپ، پروفایل چندگانه و چیدمان دلخواه کاتالوگ. UI رسمی هنوز فارسی کامل ندارد؛ محتوای سینماگرافی فارسی است. جزئیات در <a href="/guide">راهنما</a>.</p>
<p class="sub lang-en" style="margin-bottom:10px">Modern Stremio-compatible client with in-app download and catalog layout control. See <a href="/guide">guide</a>.</p>
<div class="g">
<a class="p glass" href="https://nuvio.tv" target="_blank" rel="noopener"><span class="lang-fa">سایت رسمی</span><span class="lang-en">Official site</span></a>
<a class="p glass" href="https://github.com/NuvioMedia/NuvioMobile/releases/latest" target="_blank" rel="noopener">Android</a>
<a class="p glass" href="https://github.com/NuvioMedia/NuvioTV/releases/latest" target="_blank" rel="noopener">Android TV</a>
<a class="p glass" href="https://testflight.apple.com/join/u4y7MHK9" target="_blank" rel="noopener">iOS TestFlight</a>
<a class="p glass" href="https://github.com/NuvioMedia/NuvioDesktop/releases/latest" target="_blank" rel="noopener">Desktop</a>
<a class="p glass" href="https://play.google.com/store/apps/details?id=com.nuvio.app" target="_blank" rel="noopener">Play Store</a>
</div>
</div>
</section>


<section id="sec-trend-day">
<h2 class="lang-fa">🔥 محبوب امروز</h2><h2 class="lang-en">🔥 Trending today</h2>
<div class="rail" id="railDay"><div class="sk glass" style="min-width:120px;height:180px"></div></div>
</section>
<section id="sec-trend-week">
<h2 class="lang-fa">🔥 محبوب این هفته</h2><h2 class="lang-en">🔥 Trending this week</h2>
<div class="rail" id="railWeek"><div class="sk glass" style="min-width:120px;height:180px"></div></div>
</section>
<section id="sec-now">
<h2 class="lang-fa">🎬 در سالن نمایش</h2><h2 class="lang-en">🎬 Now playing</h2>
<div class="rail" id="railNow"><div class="sk glass" style="min-width:120px;height:180px"></div></div>
</section>
<section id="sec-trailers">
<h2 class="lang-fa">▶️ آخرین تریلرها</h2><h2 class="lang-en">▶️ Latest trailers</h2>
<div class="rail" id="railTrailers"><div class="sk glass" style="min-width:220px;height:124px"></div></div>
</section>
<div class="modal" id="trailerModal" role="dialog" aria-modal="true">
  <div class="inner">
    <button class="x" type="button" id="trailerClose" aria-label="Close">×</button>
    <iframe id="trailerFrame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>
<section>
<h2 class="lang-fa">منابع</h2><h2 class="lang-en">Sources</h2>
<div class="prov" id="providerGrid" aria-live="polite">
<div class="sk glass"></div><div class="sk glass"></div><div class="sk glass"></div><div class="sk glass"></div>
</div>
</section>

<section>
<h2 class="lang-fa">افزونه‌های پیشنهادی</h2><h2 class="lang-en">Recommended addons</h2>
<p class="sub lang-fa">بر اساس محبوبیت جامعه استریمیو.</p>
<p class="sub lang-en">Based on community popularity.</p>
<div class="pl">
${addonCards}
</div>
</section>
</main>
<footer>
<div class="foot">
<a class="gh glass" href="${GITHUB_URL}" target="_blank" rel="noopener" aria-label="GitHub">
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.02-.02-2-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/></svg>
<span class="label"><span class="lang-fa">گیت‌هاب</span><span class="lang-en">GitHub</span></span>
</a>
<a class="gh glass" href="${TELEGRAM_CHANNEL}" target="_blank" rel="noopener" aria-label="Telegram">
<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 6.46-1.55 7.33c-.12.52-.43.65-.87.4l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.45 4.47-4.04c.19-.17-.04-.27-.3-.1l-5.53 3.48-2.38-.74c-.52-.16-.53-.52.11-.77l9.3-3.58c.43-.16.81.1.67.78z"/></svg>
<span class="label"><span class="lang-fa">کانال تلگرام سینماگرافی</span><span class="lang-en">CinemaGraphy channel</span></span>
</a>
<a class="gh glass" href="${TELEGRAM_SUPPORT}" target="_blank" rel="noopener" aria-label="Support">
<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
<span class="label"><span class="lang-fa">پشتیبانی</span><span class="lang-en">Support</span></span>
</a>
</div>
</footer>
<script>
(function(){
const r=document.documentElement,lb=document.getElementById('langBtn');
let L=localStorage.getItem('cg-lang')||'fa';
var tmdbCache=null;
function al(l){
  r.lang=l;r.dir=l==='fa'?'rtl':'ltr';
  if(lb)lb.textContent=l==='fa'?'EN':'FA';
  localStorage.setItem('cg-lang',l);
  if(tmdbCache) renderTmdb(tmdbCache);
}
al(L);if(lb)lb.onclick=()=>al(r.lang==='fa'?'en':'fa');
const inp=document.getElementById('manifestUrl');
async function copyManifest(btn){
  if(!inp)return;
  const fa=r.lang==='fa';
  const prev=btn.innerHTML;
  try{
    await navigator.clipboard.writeText(inp.value);
    btn.classList.add('ok');
    btn.innerHTML=fa?'کپی شد ✓':'Copied ✓';
    setTimeout(()=>{btn.classList.remove('ok');btn.innerHTML=prev},1800);
  }catch{}
}
const mb=document.getElementById('manifestCopyBtn');
if(mb)mb.onclick=()=>copyManifest(mb);

async function loadProviders(){
  const grid=document.getElementById('providerGrid');
  if(!grid)return;
  const fa=document.documentElement.lang==='fa';
  try{
    const res=await fetch('/providers.json',{credentials:'omit'});
    if(!res.ok)throw new Error('bad status');
    const data=await res.json();
    const list=Array.isArray(data.providers)?data.providers:[];
    if(!list.length){
      grid.innerHTML='<p class="sub">'+(fa?'منبعی پیکربندی نشده.':'No providers configured.')+'</p>';
      return;
    }
    grid.innerHTML=list.map(function(p){
      var status, cls, label;
      if(!p.configured){
        cls='na'; status=fa?'پیکربندی نشده':'Not configured'; label=fa?'غیرفعال':'Off';
      }else if(p.online){
        cls='on'; status=fa?'آنلاین':'Online'; label=fa?'آنلاین':'Online';
      }else{
        cls='off'; status=fa?'آفلاین':'Offline'; label=fa?'آفلاین':'Offline';
      }
      var lat=(p.online && p.latencyMs!=null)?(' · '+p.latencyMs+'ms'):'';
      return '<div class="card glass">'+
        '<div class="top"><span class="name">'+esc(p.name||p.key)+'</span><span class="dot '+cls+'" title="'+esc(status)+'"></span></div>'+
        '<div class="meta">'+esc(label)+lat+'</div>'+
      '</div>';
    }).join('');
  }catch(e){
    grid.innerHTML='<p class="sub">'+(fa?'دریافت وضعیت ممکن نشد.':'Could not load provider status.')+'</p>';
  }
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
loadProviders();

function detailId(item){
  if(item.imdbId) return String(item.imdbId);
  return 'tmdb:'+item.id;
}
function localizeItem(item){
  var en=document.documentElement.lang==='en';
  var o=Object.assign({}, item);
  o.title = en
    ? (item.titleEn || item.title || item.originalTitle || '')
    : (item.titleFa || item.title || item.originalTitle || '');
  o.poster = en
    ? (item.posterEn || item.poster || item.posterFa || '')
    : (item.posterFa || item.poster || item.posterEn || '');
  o.backdrop = en
    ? (item.backdropEn || item.backdrop || item.backdropFa || '')
    : (item.backdropFa || item.backdrop || item.backdropEn || '');
  o.overview = en
    ? (item.overviewEn || item.overview || '')
    : (item.overviewFa || item.overview || '');
  return o;
}
function stremioDetailLinks(item){
  var mt=item.mediaType==='tv'?'series':'movie';
  var id=detailId(item);
  var webApp='https://web.stremio.com/#/detail/'+mt+'/'+encodeURIComponent(id);
  var app='stremio://detail/'+mt+'/'+id;
  var lang=document.documentElement.lang==='en'?'en-US':'fa-IR';
  var tmdb=item.mediaType==='tv'
    ?('https://www.themoviedb.org/tv/'+item.id+'?language='+lang)
    :('https://www.themoviedb.org/movie/'+item.id+'?language='+lang);
  return {mt:mt,id:id,webApp:webApp,app:app,tmdb:tmdb};
}
function tileHtml(raw){
  var item=localizeItem(raw);
  var title=esc(item.title||item.originalTitle||'');
  var sub=[item.year,item.rating!=null?('★ '+item.rating):''].filter(Boolean).join(' · ');
  var L=stremioDetailLinks(item);
  var img=item.poster
    ?('<img src="'+esc(item.poster)+'" alt="" loading="lazy"/>')
    :'<div style="width:100%;height:100%;background:rgba(255,255,255,.06)"></div>';
  var fa=document.documentElement.lang==='fa';
  return '<div class="tile">'+
    '<div class="poster-wrap">'+img+
      '<div class="hov">'+
        '<a class="s" href="'+esc(L.webApp)+'" target="_blank" rel="noopener">'+(fa?'استریمیو وب':'Stremio web')+'</a>'+
        '<a class="s s-nuvio" href="https://nuvio.tv" target="_blank" rel="noopener">Nuvio</a>'+
        '<a class="w" href="'+esc(L.tmdb)+'" target="_blank" rel="noopener">TMDB</a>'+
      '</div>'+
    '</div>'+
    '<div class="cap">'+title+'</div>'+(sub?'<div class="sub2">'+esc(sub)+'</div>':'')+
  '</div>';
}
function fillRail(id, items){
  var el=document.getElementById(id);
  if(!el)return;
  if(!items||!items.length){el.innerHTML='<p class="sub">—</p>';return;}
  el.innerHTML=items.map(tileHtml).join('');
}
function fillTrailers(items){
  var el=document.getElementById('railTrailers');
  if(!el)return;
  if(!items||!items.length){el.innerHTML='<p class="sub">—</p>';return;}
  var fa=document.documentElement.lang==='fa';
  el.innerHTML=items.map(function(raw){
    var item=localizeItem(raw);
    var title=esc(item.title||item.originalTitle||'');
    var bg=item.backdrop||item.poster||'';
    var key=item.trailer&&item.trailer.key;
    var yt=key?('https://www.youtube.com/watch?v='+encodeURIComponent(key)):'#';
    var L=stremioDetailLinks(item);
    return '<div class="tile tr-tile">'+
      '<a class="thumb" href="'+esc(yt)+'" target="_blank" rel="noopener" title="YouTube">'+
        (bg?'<img src="'+esc(bg)+'" alt="" loading="lazy"/>':'')+
        '<div class="play">▶</div>'+
      '</a>'+
      '<div class="cap" title="'+title+'">'+title+'</div>'+
      '<div class="actions">'+
        '<a class="s" href="'+esc(L.webApp)+'" target="_blank" rel="noopener">'+(fa?'استریمیو':'Stremio')+'</a>'+
        '<a class="s" href="https://nuvio.tv" target="_blank" rel="noopener">Nuvio</a>'+
        '<a class="y" href="'+esc(yt)+'" target="_blank" rel="noopener">YT</a>'+
      '</div>'+
    '</div>';
  }).join('');
}
function renderTmdb(data){
  if(!data)return;
  fillRail('railDay', data.trendingDay);
  fillRail('railWeek', data.trendingWeek);
  fillRail('railNow', data.nowPlaying);
  fillTrailers(data.trailers);
}
(function(){
  var modal=document.getElementById('trailerModal');
  var frame=document.getElementById('trailerFrame');
  var close=document.getElementById('trailerClose');
  function shut(){if(modal)modal.classList.remove('open');if(frame)frame.src='';}
  if(close)close.onclick=shut;
  if(modal)modal.addEventListener('click',function(e){if(e.target===modal)shut();});
})();
async function loadTmdb(){
  try{
    var res=await fetch('/tmdb/landing.json',{credentials:'omit'});
    if(!res.ok)throw new Error('bad');
    var data=await res.json();
    tmdbCache=data;
    renderTmdb(data);
  }catch(e){
    tmdbCache=null;
    ['railDay','railWeek','railNow','railTrailers'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.innerHTML='';
    });
  }
}
loadTmdb();

function bindRailWheel(){
  document.querySelectorAll('.rail').forEach(function(rail){
    rail.addEventListener('wheel', function(e){
      if(Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if(rail.scrollWidth <= rail.clientWidth + 4) return;
      e.preventDefault();
      rail.scrollLeft += e.deltaY;
    }, {passive:false});
  });
}
bindRailWheel();



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
.wrap{position:relative;z-index:1;max-width:880px;width:100%;margin:0 auto;padding:20px 4.5vw 48px}
header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;max-width:100%}
.brand{display:flex;gap:10px;align-items:center;color:var(--t);text-decoration:none;font-weight:800;min-width:0}
.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brand img{width:36px;height:36px;border-radius:10px;flex-shrink:0;box-shadow:0 0 16px var(--gl)}
.chip{border:1px solid var(--gb);background:var(--g);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--t);border-radius:999px;padding:8px 12px;text-decoration:none;font-weight:600;font-size:.82rem;font-family:inherit;cursor:pointer;white-space:nowrap}
h1{font-size:clamp(1.25rem,5vw,1.75rem);font-weight:900;margin:8px 0;overflow-wrap:anywhere}
h2{font-size:1.05rem;margin:0 0 10px;overflow-wrap:anywhere}
.sub{color:var(--m);margin-bottom:14px;font-size:.92rem;overflow-wrap:anywhere}
.glass{background:var(--g);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border:1px solid var(--gb);border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.08)}
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
  version = '3.2.8',
  origin = PUBLIC_SITE,
} = {}) {
  const logo = escapeHtml(logoUrl || LOGO_FALLBACK)
  const ver = escapeHtml(String(version || '3.2.8'))
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
  version = '3.2.8',
  manifestUrl = PUBLIC_INSTALL,
} = {}) {
  const logo = escapeHtml(logoUrl || LOGO_FALLBACK)
  const ver = escapeHtml(String(version || '3.2.8'))
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
<span class="lang-fa">منیفست: <code>https://YOUR-NAME.workers.dev/manifest.json</code></span>
<span class="lang-en">Manifest: <code>https://YOUR-NAME.workers.dev/manifest.json</code></span>
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
<tr><td><code>ANIMEX_BASEURL</code></td><td>Animex</td><td><code>https://animex.click</code></td></tr>
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
