<div align="center">
  <img src="./logo.png" alt="Cinemagraphy" width="128" height="128" />
  <h1>سینماگرافی — Cinemagraphy</h1>
  <p>
    <b>افزونهٔ رایگان استریمیو برای فیلم، سریال، انیمه و منابع ایرانی</b><br/>
    Free Stremio addon — Iranian sources, Persian metadata, optional torrents &amp; IPTV
  </p>
  <p>
    <a href="https://cmplugin.ir/"><img src="https://img.shields.io/badge/site-cmplugin.ir-e50914?style=for-the-badge" alt="Site" /></a>
    <a href="https://cmplugin.ir/manifest.json"><img src="https://img.shields.io/badge/manifest-install-blue?style=for-the-badge" alt="Manifest" /></a>
    <a href="https://cmplugin.ir/configure"><img src="https://img.shields.io/badge/configure-custom-orange?style=for-the-badge" alt="Configure" /></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/version-2.1.51-blue.svg" alt="2.1.51" />
    <img src="https://img.shields.io/badge/vercel-ready-black.svg" alt="Vercel" />
    <img src="https://img.shields.io/badge/Nuvio-compatible-7eb6ff.svg" alt="Nuvio" />
    <img src="https://img.shields.io/badge/FA%20%7C%20EN-supported-5dcea0.svg" alt="FA EN" />
    <img src="https://img.shields.io/badge/license-ISC-lightgrey.svg" alt="ISC" />
  </p>
</div>

---

## 🇮🇷 نصب سریع

1. [Stremio](https://www.stremio.com/downloads) یا **[Nuvio](https://nuvio.tv)** را نصب کنید  
2. منیفست عمومی:

```text
https://cmplugin.ir/manifest.json
```

3. از سایت:

| | |
|---|---|
| 🏠 | [صفحه اصلی](https://cmplugin.ir/) |
| ⚙️ | [شخصی‌سازی / Configure](https://cmplugin.ir/configure) |
| 📖 | [راهنما](https://cmplugin.ir/guide) |

در استریمیو کنار Install دکمهٔ **Configure** هم نمایش داده می‌شود.

## 🇬🇧 Quick install

```text
https://cmplugin.ir/manifest.json
```

[Site](https://cmplugin.ir/) · [Configure](https://cmplugin.ir/configure) · [Guide](https://cmplugin.ir/guide)

---

## امکانات

| | |
|---|---|
| 🇮🇷 | منابع ایرانی موازی |
| 🖼️ | پروکسی تصویر TMDB (بدون VPN در ایران) |
| 📝 | متای فارسی + fallback انگلیسی |
| 🌐 | زبان افزونه، برچسب استریم، **نام کاتالوگ‌ها** (FA / EN) |
| 📺 | ماهواره / IPTV Bridge — مستقل از «فقط استریم» |
| 📚 | کاتالوگ ۱۰۱ / AIO / انیمه از env |
| 🌱 | تورنت اختیاری |
| ⚙️ | `/configure` → منیفست `/c/{cfg}/manifest.json` |
| 🎛️ | فقط استریم · بدون متا · بدون کاتالوگ فیلم (IPTV جدا می‌ماند) |

---

## شخصی‌سازی

https://cmplugin.ir/configure

- پروایدرها، فقط‌استریم، زبان متا، **زبان افزونه (فارسی/English)**
- با زبان انگلیسی: نام کاتالوگ‌ها (نتفلیکس، کرانچی‌رول، ماهواره، …) انگلیسی می‌مانند
- با زبان فارسی: همان‌ها به برچسب‌های فارسی ترجمه می‌شوند
- ماهواره: تیک جدا + لینک اختیاری (خالی = پیش‌فرض `iptvbridge.vercel.app`)
- بارگذاری لینک `/c/...` قبلی برای ویرایش بدون وارد کردن دوبارهٔ کلیدها

---

## متغیرهای محیطی مهم

| متغیر | نقش |
|--------|------|
| `TMDB_API_KEY` | متا و پوستر |
| `*_BASEURL` | پروایدرهای ایرانی |
| `TORRENT_METEOR_MANIFEST_URL` | تورنت |
| `CATALOG101_MANIFEST_URL` | کاتالوگ ۱۰۱ |
| `CATALOG_AIO_MANIFEST_URL` | AIOCatalogs |
| `CATALOG_ANIME_MANIFEST_URL` | انیمه |
| `CATALOG_IPTVBRIDGE_MANIFEST_URL` | ماهواره (یا پیش‌فرض داخلی) |
| `PUBLIC_BASE_URL` | پایهٔ پروکسی تصویر |

---

## نسخه ۲.۱.۵۱

| نسخه | موضوع |
|------|--------|
| ۲.۱.۴۳ | Animex قسمت‌ها |
| ۲.۱.۴۴ | دکمه Configure در استریمیو |
| ۲.۱.۴۵–۴۸ | IPTV در Configure + استقلال از فقط‌استریم |
| ۲.۱.۴۹ | هیرو لندینگ + ترتیب کرانچی‌رول |
| ۲.۱.۵۰ | meta و stream ماهواره از IPTV Bridge |
| **۲.۱.۵۱** | نام کاتالوگ‌ها (۱۰۱ / AIO / انیمه / ماهواره) بر اساس زبان افزونه |

---

## دیپلوی

Vercel · Cloudflare Workers · VPS / لوکال (`npm i` سپس start)

منیفست عمومی: `cmplugin.ir` — نسخهٔ خصوصی تست را عمومی نکنید.

---

## کانال

- [t.me/cinemmagraphy](https://t.me/cinemmagraphy)
- پشتیبانی: [t.me/nerdcow](https://t.me/nerdcow)
- [GitHub](https://github.com/TheNerdCow/CinemaGraphy)

با احترام به پروژهٔ پایهٔ استریمیو ایرانی (محبّی / ir-stremio).

## License

ISC
