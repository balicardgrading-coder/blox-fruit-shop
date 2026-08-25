# BloxMart — Shop Blox Fruits Lengkap

## Isi toko
- **Fruit Permanen** (43) — Rocket s/d Dragon + Blade, Creation
- **Fruit Biasa** (43) — physical fruit yang sama
- **Joki** (36) — level, mastery, money, fragment, race V2–V4, gun/style, sword legend, CDK, Soul Guitar, awaken, raid, paket bundle
- **Roll Akun** — bayar tiket dulu, baru spin (67% zonk / 30% polosan / 3% jackpot)

## Edit stok & harga
Buka `products.json`, ubah `"stock"` atau `"price"`.

## Edit peluang roll
Di `script.js`:
```js
const ROLL_CONFIG = { zonk: 67, polosan: 30, jackpot: 3 };
const ROLL_COST = 5000;
```

## Nomor WhatsApp
`628117070168` di `script.js` + link di `index.html`.

## Deploy
Upload ke GitHub Pages / Netlify. Jangan buka file://.
