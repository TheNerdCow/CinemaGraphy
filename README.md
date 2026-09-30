<div align="center">
  <img src="logo.png" alt="CinemaGraphy" width="120"/>
  <h1>CinemaGraphy · سینماگرافی</h1>
  <p>
    <a href="#-فارسی">فارسی</a> · <a href="#-english">English</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/version-3.2.11-e8a04a.svg" alt="3.2.11"/>
    <img src="https://img.shields.io/badge/Stremio%20%7C%20Nuvio-addon-7eb6ff.svg" alt="addon"/>
    <img src="https://img.shields.io/badge/Local%20%7C%20CF%20%7C%20Vercel-yes-5dcea0.svg" alt="deploy"/>
  </p>
</div>

---

<a id="-فارسی"></a>

## فارسی

**سینماگرافی** افزونهٔ استریمیو / نوویو برای فیلم، سریال، انیمه و منابع ایرانی است.

### لینک‌ها
- مخزن: [github.com/TheNerdCow/CinemaGraphy](https://github.com/TheNerdCow/CinemaGraphy)
- در صورت فیلتر بودن `workers.dev`، از **اجرای لوکال** یا دامنهٔ اختصاصی روی Worker استفاده کنید.

### امکانات
- چند پروایدر ایرانی به‌صورت موازی  
- متای فارسی (TMDB) وقتی شبکه اجازه دهد  
- کاتالوگ ترکی، انیمکس، ۱۰۱، ماهواره و شخصی‌سازی  
- اجرا روی لوکال، Cloudflare Worker یا Vercel  

### اجرای لوکال
1. Node.js ۱۸+ نصب باشد  
2. داخل پوشهٔ پروژه: `npm install`  
3. فایل `.env` کنار `index.js` (نمونه در `env.public.example` / فایل env شخصی)  
4. اجرا:

```bash
npm start
# یا
node --env-file=.env ./index.js
```

5. در استریمیو نصب کنید:

```text
http://127.0.0.1:7000/manifest.json
```

اگر لاگ `ECONNRESET` برای TMDB دیدید: از ایران `api.themoviedb.org` قطع می‌شود. استریم پروایدرها معمولاً کار می‌کند؛ برای پوستر/متای فارسی روی همان سیستم VPN بزنید. **OMDB جایگزین کامل TMDB نیست** (سقف ۱۰۰۰ درخواست/روز، بدون فارسی غنی).

### Ava / Digi روی لوکال
در `.env` می‌توانید بگذارید (ریسک و انقضا با خودتان):

```env
DIGIMOVIE_BASEURL=...
DIGIMOVIE_COOKIE=...
AVAMOVIE_BASEURL=...
AVAMOVIE_COOKIE=...
```

جزئیات VIP و Env کامل روی صفحهٔ `/guide` سایت افزونه است.

### احترام
با احترام به **آقای محبّی** و همهٔ مشارکت‌کنندگان.

### لایسنس
ISC

---

<a id="-english"></a>

## English

**CinemaGraphy** is a Stremio / Nuvio addon for movies, series, anime and Iranian stream sources.

### Links
- Repo: [github.com/TheNerdCow/CinemaGraphy](https://github.com/TheNerdCow/CinemaGraphy)
- If `workers.dev` is blocked in your network, run **locally** or put a custom domain on the Worker.

### Features
- Multiple Iranian providers in parallel  
- Persian metadata via TMDB when reachable  
- Turkish / Animex / 101 / IPTV catalogs and Configure  
- Local, Cloudflare Worker, or Vercel  

### Local run
1. Node.js 18+  
2. `npm install`  
3. Place `.env` next to `index.js`  
4. Start:

```bash
npm start
# or
node --env-file=.env ./index.js
```

5. Install in Stremio:

```text
http://127.0.0.1:7000/manifest.json
```

`ECONNRESET` on TMDB usually means the API is filtered (e.g. from some Iranian ISPs). Streams can still work; use a VPN on the host for posters/FA meta. **OMDB is not a full TMDB replacement** (≈1000 req/day free, no rich Persian meta).

### License
ISC
