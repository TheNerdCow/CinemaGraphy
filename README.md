<div align="center">

<img src="logo.png" alt="CinemaGraphy" width="100"/>

# سینماگرافی · CinemaGraphy

🇮🇷 افزونهٔ **استریمیو** و **نوویو** برای فیلم و سریال با منابع ایرانی

[![version](https://img.shields.io/badge/version-3.2.17-e8a04a?style=flat-square)](#)
[![Stremio](https://img.shields.io/badge/Stremio%20%7C%20Nuvio-addon-6ea8ff?style=flat-square)](#)
[![Deploy](https://img.shields.io/badge/Cloudflare%20%7C%20Local-ready-3ecf8e?style=flat-square)](#)

**زبان:** [فارسی](#فارسی) · [English](#english)

</div>

---

<a id="فارسی"></a>

## فارسی

### این پروژه چیست؟

**سینماگرافی** یک افزونه برای برنامه‌های **Stremio** و **Nuvio** است.
هدفش این است که بتوانید از منابع ایرانی فیلم و سریال را در همان اپ جست‌وجو و پخش کنید — بدون پیچیدگی اضافه.

### امکانات

- جست‌وجوی چند پروایدر به‌صورت موازی
- متا و پوستر فارسی (وقتی شبکه به TMDB برسد)
- صفحهٔ **شخصی‌سازی** برای ساخت منیفست اختصاصی
- اجرا روی **لوکال**، **Cloudflare Worker** یا Vercel
- راهنمای نصب فارسی / انگلیسی داخل سایت

### نصب سریع

| نوع | لینک |
|-----|------|
| سایت | https://cmplugin.ir |
| منیفست | https://cmplugin.ir/manifest.json |
| شخصی‌سازی | https://cmplugin.ir/configure |
| راهنما | https://cmplugin.ir/guide |

در استریمیو: **Addons → Community / URL** و منیفست بالا را وارد کنید.

### اجرای لوکال

1. Node.js ۱۸ یا بالاتر
2. `npm install`
3. فایل `.env` کنار `index.js`
4. اجرا:

```bash
npm start
# یا
node --env-file=.env ./index.js
```

5. نصب در اپ:

```text
http://127.0.0.1:7000/manifest.json
```

اگر از ایران به TMDB وصل نشوید (`ECONNRESET`)، استریم پروایدرها معمولاً همچنان کار می‌کند؛ برای پوستر بهتر است روی همان سیستم VPN/TUN باشد.

### احترام

با احترام به **آقای محبّی** و همهٔ کسانی که به این مسیر کمک کرده‌اند.

### لایسنس

ISC

---

<a id="english"></a>

## English

### What is this?

**CinemaGraphy** is a **Stremio / Nuvio** addon focused on Iranian stream sources for movies and series.

### Features

- Parallel multi-provider search
- Persian meta/posters when TMDB is reachable
- **Configure** page for a personal manifest
- Runs on **local**, **Cloudflare Worker**, or Vercel
- Bilingual guide on the site

### Quick install

| Item | URL |
|------|-----|
| Site | https://cmplugin.ir |
| Manifest | https://cmplugin.ir/manifest.json |
| Configure | https://cmplugin.ir/configure |
| Guide | https://cmplugin.ir/guide |

### Local run

```bash
npm install
npm start
# manifest: http://127.0.0.1:7000/manifest.json
```

### Credits

With respect to **Mr. Mohebbi** and all contributors.

### License

ISC
