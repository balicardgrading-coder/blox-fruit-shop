# BloxMart — Website Jualan Blox Fruits

## Isi folder
```
bloxfruit-shop/
├── index.html
├── styles.css
├── script.js
├── products.json   ← EDIT STOK DI SINI
└── README.md
```

## Cara ganti stok
Buka `products.json`, ubah angka `"stock"`.

## Cara ganti peluang roll
Buka `script.js`, cari:

```js
const ROLL_CONFIG = {
  zonk: 67,       // %
  polosan: 30,    // %
  jackpot: 3      // %
};
```

Total harus 100.

## Harga roll
Di `script.js`:
```js
const ROLL_COST = 5000;
```

## Nomor WhatsApp
Di `script.js` cari `waNumber` dan di `index.html` link wa.me

## Cara jalanin
Upload ke GitHub Pages (paling gampang) atau pakai Live Server.
