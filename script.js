/**
 * BloxMart — Script
 * Edit stok di products.json
 * Peluang roll bisa diubah di bagian ROLL_CONFIG di bawah
 */

const ROLL_COST = 5000;

// ====== EDIT PELUANG DI SINI ======
const ROLL_CONFIG = {
  zonk: 67,       // %
  polosan: 30,    // % akun level 1000
  jackpot: 3      // % akun max sanguine
};
// Total harus 100

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(n);

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("bloxmart_cart") || "[]");
let currentFilter = "all";
let searchQuery = "";
let isRolling = false;
let rollHistory = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

async function loadProducts() {
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("gagal fetch");
    const data = await res.json();
    PRODUCTS = Object.entries(data).map(([id, item]) => ({ id, ...item }));
    renderProducts();
    updateCartUI();
  } catch (e) {
    console.error(e);
    $("#productsGrid").innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#ef4444;padding:30px">Gagal memuat products.json. Pastikan file ada & JSON valid, jalankan lewat server / GitHub Pages.</p>`;
  }
}

function getStockStatus(stock) {
  if (stock <= 0) return { label: "Habis", class: "out-of-stock" };
  if (stock <= 5) return { label: `Sisa ${stock}`, class: "low-stock" };
  return { label: "Tersedia", class: "in-stock" };
}

function renderProducts() {
  const grid = $("#productsGrid");
  const empty = $("#emptyState");
  let filtered = PRODUCTS.filter((p) => {
    const matchCat = currentFilter === "all" || p.category === currentFilter;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      (p.desc && p.desc.toLowerCase().includes(searchQuery));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = filtered
    .map((p) => {
      const status = getStockStatus(p.stock);
      const disabled = p.stock <= 0 ? "disabled" : "";
      const btnText = p.stock <= 0 ? "Habis" : "+ Keranjang";
      return `
      <article class="product-card">
        <div class="product-img-wrap">
          <span class="stock-badge ${status.class}">${status.label}</span>
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.style.display='none'">
        </div>
        <div class="product-body">
          <span class="product-category">${p.category}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.desc || ""}</p>
          <div class="product-footer">
            <span class="product-price">${formatRupiah(p.price)}</span>
            <button class="add-btn" data-id="${p.id}" ${disabled}>${btnText}</button>
          </div>
        </div>
      </article>`;
    })
    .join("");

  $$(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id));
  });
}

/* ---------- CART ---------- */
function addToCart(id, qty = 1, customName = null, customPrice = null) {
  const product = PRODUCTS.find((p) => p.id === id);
  // Allow custom items from roll (even if not in stock check for roll prizes)
  if (product && product.stock <= 0 && !customName) return;

  const existing = cart.find((c) => c.id === id && !c.isRoll);
  if (existing && !customName) {
    if (product && existing.qty + qty > product.stock) {
      alert("Stok tidak mencukupi!");
      return;
    }
    existing.qty += qty;
  } else {
    cart.push({
      id: customName ? `ROLL-${Date.now()}` : id,
      qty,
      name: customName || (product && product.name),
      price: customPrice != null ? customPrice : (product && product.price),
      isRoll: !!customName
    });
  }
  saveCart();
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find((c) => c.id === id);
  if (!item) return;
  const product = PRODUCTS.find((p) => p.id === id);
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    cart = cart.filter((c) => c.id !== id);
  } else if (product && !item.isRoll && newQty > product.stock) {
    alert("Stok tidak mencukupi!");
    return;
  } else {
    item.qty = newQty;
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem("bloxmart_cart", JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  $("#cartCount").textContent = count;
  const container = $("#cartItems");

  if (cart.length === 0) {
    container.innerHTML = `<p class="cart-empty">Keranjang kosong.<br>Yuk roll atau pilih produk!</p>`;
    $("#cartTotal").textContent = formatRupiah(0);
    return;
  }

  let total = 0;
  container.innerHTML = cart
    .map((c) => {
      const name = c.name || (PRODUCTS.find((p) => p.id === c.id) || {}).name || c.id;
      const price = c.price != null ? c.price : (PRODUCTS.find((p) => p.id === c.id) || {}).price || 0;
      total += price * c.qty;
      return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${name}${c.isRoll ? " 🎲" : ""}</div>
          <div class="cart-item-price">${formatRupiah(price)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-action="minus" data-id="${c.id}">−</button>
            <span>${c.qty}</span>
            <button class="qty-btn" data-action="plus" data-id="${c.id}">+</button>
          </div>
          <button class="cart-item-remove" data-id="${c.id}">Hapus</button>
        </div>
      </div>`;
    })
    .join("");

  $("#cartTotal").textContent = formatRupiah(total);

  $$(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      changeQty(btn.dataset.id, btn.dataset.action === "plus" ? 1 : -1);
    });
  });
  $$(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
  });
}

function openCart() {
  $("#cartDrawer").classList.add("open");
  $("#cartOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  $("#cartDrawer").classList.remove("open");
  $("#cartOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function checkoutWhatsApp() {
  if (cart.length === 0) {
    alert("Keranjang masih kosong!");
    return;
  }
  let msg = "Halo admin BloxMart! Saya ingin order:%0A%0A";
  let total = 0;
  cart.forEach((c) => {
    const name = c.name || (PRODUCTS.find((p) => p.id === c.id) || {}).name || c.id;
    const price = c.price != null ? c.price : (PRODUCTS.find((p) => p.id === c.id) || {}).price || 0;
    const sub = price * c.qty;
    total += sub;
    msg += `• ${name} x${c.qty} = ${formatRupiah(sub)}%0A`;
  });
  msg += `%0A*Total: ${formatRupiah(total)}*%0A%0AMohon info ketersediaan ya. Terima kasih!`;
  const waNumber = "628117070168";
  window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
}

/* ---------- ROLL / GACHA ---------- */
function doRoll() {
  if (isRolling) return;
  isRolling = true;
  const btn = $("#rollBtn");
  btn.disabled = true;
  btn.textContent = "ROLLING...";

  const machine = $("#rollMachine");
  machine.className = "roll-machine spinning";
  $("#rollIcon").textContent = "🎲";
  $("#rollLabel").textContent = "Mengocok...";
  $("#rollSub").textContent = "Tunggu sebentar";

  // Animasi icon berganti cepat
  const icons = ["❓", "💀", "👤", "⭐", "🔥", "💎", "⚔️", "🎯"];
  let i = 0;
  const interval = setInterval(() => {
    $("#rollIcon").textContent = icons[i % icons.length];
    i++;
  }, 120);

  // Hasil setelah 2.5 detik
  setTimeout(() => {
    clearInterval(interval);
    const result = getRollResult();
    showRollResult(result);
    isRolling = false;
    btn.disabled = false;
    btn.textContent = "ROLL SEKARANG";
  }, 2500);
}

function getRollResult() {
  const r = Math.random() * 100;
  let acc = 0;

  acc += ROLL_CONFIG.zonk;
  if (r < acc) return { type: "zonk", name: "ZONK", icon: "💀" };

  acc += ROLL_CONFIG.polosan;
  if (r < acc) {
    // Cek stok akun polosan
    const p = PRODUCTS.find((x) => x.id === "ACC-001");
    if (p && p.stock > 0) {
      return {
        type: "win",
        name: "Akun Polosan Level 1000",
        icon: "👤",
        productId: "ACC-001",
        price: ROLL_COST // yang dibayar tetap 5k (biaya roll), akun didapat
      };
    }
    // Stok habis → zonk
    return { type: "zonk", name: "ZONK (stok akun habis)", icon: "💀" };
  }

  // Jackpot
  const j = PRODUCTS.find((x) => x.id === "ACC-002");
  if (j && j.stock > 0) {
    return {
      type: "jackpot",
      name: "JACKPOT! Akun Max Sanguine",
      icon: "👑",
      productId: "ACC-002",
      price: ROLL_COST
    };
  }
  return { type: "zonk", name: "ZONK (jackpot habis)", icon: "💀" };
}

function showRollResult(result) {
  const machine = $("#rollMachine");
  machine.className = "roll-machine " + result.type;

  $("#rollIcon").textContent = result.icon;
  $("#rollLabel").textContent = result.name;
  $("#rollSub").textContent =
    result.type === "zonk"
      ? "Coba lagi ya!"
      : result.type === "jackpot"
      ? "SELAMAT! Kamu menang jackpot!"
      : "Selamat! Akun masuk keranjang.";

  // Tambah ke keranjang: biaya roll + hadiah (kalau menang)
  // Biaya roll selalu ditambahkan
  addToCart("ROLL-FEE", 1, "Biaya Roll Akun", ROLL_COST);

  if (result.type === "win" || result.type === "jackpot") {
    // Hadiah akun (harga 0 karena sudah bayar roll) — atau bisa set harga 0
    const prizeName =
      result.type === "jackpot"
        ? "🏆 HADIAH: Akun Max Sanguine"
        : "🎁 HADIAH: Akun Polosan Lvl 1000";
    addToCart(result.productId || "PRIZE", 1, prizeName, 0);

    // Kurangi stok lokal (untuk sesi ini; stok permanen diubah di products.json)
    const prod = PRODUCTS.find((p) => p.id === result.productId);
    if (prod) prod.stock = Math.max(0, prod.stock - 1);
    renderProducts();
  }

  // History
  rollHistory.unshift({
    ...result,
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  });
  updateHistory();

  // Modal
  $("#modalIcon").textContent = result.icon;
  $("#modalTitle").textContent =
    result.type === "zonk"
      ? "Zonk!"
      : result.type === "jackpot"
      ? "JACKPOT!!!"
      : "Kamu Menang!";
  $("#modalDesc").textContent =
    result.type === "zonk"
      ? "Sayang sekali, coba roll lagi. Biaya roll tetap masuk keranjang."
      : `${result.name} sudah masuk keranjang. Silakan checkout via WhatsApp.`;
  $("#resultModal").classList.add("open");
}

function updateHistory() {
  const list = $("#historyList");
  if (rollHistory.length === 0) {
    list.textContent = "Belum ada roll.";
    return;
  }
  list.innerHTML = rollHistory
    .slice(0, 10)
    .map(
      (h) =>
        `<div class="history-item ${h.type}">${h.time} — ${h.icon} ${h.name}</div>`
    )
    .join("");
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  $$(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderProducts();
    });
  });

  $("#searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderProducts();
  });

  $("#cartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#cartOverlay").addEventListener("click", closeCart);
  $("#checkoutBtn").addEventListener("click", checkoutWhatsApp);
  $("#rollBtn").addEventListener("click", doRoll);
  $("#modalClose").addEventListener("click", () => {
    $("#resultModal").classList.remove("open");
  });

  const menuToggle = $("#menuToggle");
  const navLinks = $(".nav-links");
  menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  $$(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => navLinks.classList.remove("open"))
  );
});
