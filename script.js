const ROLL_COST = 5000;
const ROLL_CONFIG = { zonk: 67, polosan: 30, jackpot: 3 };

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("bloxmart_cart") || "[]");
let tickets = parseInt(localStorage.getItem("bloxmart_tickets") || "0", 10);
let isRolling = false;
let rollHistory = [];
let searchPermanen = "";
let searchFruit = "";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function saveTickets() {
  localStorage.setItem("bloxmart_tickets", String(tickets));
  const el = $("#ticketCount");
  if (el) el.textContent = tickets;
  const rollBtn = $("#rollBtn");
  if (rollBtn) {
    rollBtn.disabled = tickets <= 0 || isRolling;
    rollBtn.textContent = tickets > 0 ? `2. ROLL (sisa ${tickets} tiket)` : "2. ROLL (beli tiket dulu)";
  }
}

async function loadProducts() {
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("fetch gagal");
    const data = await res.json();
    PRODUCTS = Object.entries(data).map(([id, item]) => ({ id, ...item }));
    renderAll();
    updateCartUI();
    saveTickets();
  } catch (e) {
    console.error(e);
    ["gridPermanen", "gridFruit", "gridJoki"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#ef4444">Gagal load products.json</p>`;
    });
  }
}

function getStockStatus(stock) {
  if (stock <= 0) return { label: "Habis", class: "out-of-stock" };
  if (stock <= 5) return { label: `Sisa ${stock}`, class: "low-stock" };
  return { label: "Tersedia", class: "in-stock" };
}

function cardHTML(p) {
  const status = getStockStatus(p.stock);
  const disabled = p.stock <= 0 ? "disabled" : "";
  const btnText = p.stock <= 0 ? "Habis" : "+ Keranjang";
  return `
    <article class="product-card">
      <div class="product-img-wrap">
        <span class="stock-badge ${status.class}">${status.label}</span>
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
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
}

function renderGrid(gridId, category, searchQ) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  let list = PRODUCTS.filter((p) => p.category === category);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.desc && p.desc.toLowerCase().includes(q)));
  }
  if (!list.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#8b8ba7;padding:20px">Tidak ada produk.</p>`;
    return;
  }
  grid.innerHTML = list.map(cardHTML).join("");
  grid.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id));
  });
}

function renderAll() {
  renderGrid("gridPermanen", "permanen", searchPermanen);
  renderGrid("gridFruit", "fruit", searchFruit);
  renderGrid("gridJoki", "joki", "");
}

function addToCart(id, qty = 1, customName = null, customPrice = null) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (product && product.stock <= 0 && !customName) return;
  const existing = cart.find((c) => c.id === id && !c.isCustom);
  if (existing && !customName) {
    if (product && existing.qty + qty > product.stock) {
      alert("Stok tidak mencukupi!");
      return;
    }
    existing.qty += qty;
  } else {
    cart.push({
      id: customName ? `CUSTOM-${Date.now()}` : id,
      qty,
      name: customName || (product && product.name),
      price: customPrice != null ? customPrice : product && product.price,
      isCustom: !!customName
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
  if (newQty <= 0) cart = cart.filter((c) => c.id !== id);
  else if (product && !item.isCustom && newQty > product.stock) {
    alert("Stok tidak mencukupi!");
    return;
  } else item.qty = newQty;
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
  if (!cart.length) {
    container.innerHTML = `<p class="cart-empty">Keranjang kosong.</p>`;
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
          <div class="cart-item-name">${name}</div>
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
  $$(".qty-btn").forEach((btn) =>
    btn.addEventListener("click", () => changeQty(btn.dataset.id, btn.dataset.action === "plus" ? 1 : -1))
  );
  $$(".cart-item-remove").forEach((btn) =>
    btn.addEventListener("click", () => removeFromCart(btn.dataset.id))
  );
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
  if (!cart.length) {
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
  msg += `%0A*Total: ${formatRupiah(total)}*%0A%0AMohon info pembayaran ya. Terima kasih!`;
  window.open(`https://wa.me/628117070168?text=${msg}`, "_blank");
}

function buyTicket() {
  addToCart("TICKET", 1, "Tiket Roll Akun", ROLL_COST);
  openCart();
  window.open(
    `https://wa.me/628117070168?text=${encodeURIComponent(
      `Halo admin BloxMart! Saya beli 1 Tiket Roll Akun (${formatRupiah(ROLL_COST)}). Mohon info pembayaran.`
    )}`,
    "_blank"
  );
}

function confirmPaid() {
  tickets += 1;
  saveTickets();
  $("#rollIcon").textContent = "🎫";
  $("#rollLabel").textContent = "Tiket siap!";
  $("#rollSub").innerHTML = `Tiket kamu: <strong id="ticketCount">${tickets}</strong>`;
  alert("Tiket +1. Sekarang bisa tekan ROLL.");
}

function doRoll() {
  if (isRolling || tickets <= 0) {
    if (tickets <= 0) alert("Beli tiket dulu & bayar via WhatsApp!");
    return;
  }
  isRolling = true;
  tickets -= 1;
  saveTickets();
  const btn = $("#rollBtn");
  btn.disabled = true;
  btn.textContent = "ROLLING...";
  const machine = $("#rollMachine");
  machine.className = "roll-machine spinning";
  $("#rollIcon").textContent = "🎲";
  $("#rollLabel").textContent = "Mengocok...";
  $("#rollSub").textContent = "Tunggu...";
  const icons = ["❓", "💀", "👤", "⭐", "🔥", "💎", "⚔️", "🎯", "👑"];
  let i = 0;
  const interval = setInterval(() => {
    $("#rollIcon").textContent = icons[i % icons.length];
    i++;
  }, 120);
  setTimeout(() => {
    clearInterval(interval);
    const result = getRollResult();
    showRollResult(result);
    isRolling = false;
    saveTickets();
  }, 2500);
}

function getRollResult() {
  const r = Math.random() * 100;
  let acc = 0;
  acc += ROLL_CONFIG.zonk;
  if (r < acc) return { type: "zonk", name: "ZONK", icon: "💀" };
  acc += ROLL_CONFIG.polosan;
  if (r < acc) return { type: "win", name: "Akun Polosan Level 1000", icon: "👤" };
  return { type: "jackpot", name: "JACKPOT! Akun Max Sanguine", icon: "👑" };
}

function showRollResult(result) {
  const machine = $("#rollMachine");
  machine.className = "roll-machine " + result.type;
  $("#rollIcon").textContent = result.icon;
  $("#rollLabel").textContent = result.name;
  $("#rollSub").textContent = result.type === "zonk" ? "Coba lagi ya!" : "Screenshot & chat admin untuk klaim!";
  if (result.type === "win" || result.type === "jackpot") {
    addToCart(
      "PRIZE",
      1,
      result.type === "jackpot" ? "🏆 Klaim: Akun Max Sanguine" : "🎁 Klaim: Akun Polosan Lvl 1000",
      0
    );
  }
  rollHistory.unshift({
    ...result,
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  });
  updateHistory();
  $("#modalIcon").textContent = result.icon;
  $("#modalTitle").textContent =
    result.type === "zonk" ? "Zonk!" : result.type === "jackpot" ? "JACKPOT!!!" : "Kamu Menang!";
  $("#modalDesc").textContent =
    result.type === "zonk"
      ? "Tiket sudah terpakai. Beli tiket lagi untuk roll berikutnya."
      : `${result.name} — screenshot lalu chat admin untuk klaim.`;
  $("#resultModal").classList.add("open");
}

function updateHistory() {
  const list = $("#historyList");
  if (!rollHistory.length) {
    list.textContent = "Belum ada roll.";
    return;
  }
  list.innerHTML = rollHistory
    .slice(0, 12)
    .map((h) => `<div class="history-item ${h.type}">${h.time} — ${h.icon} ${h.name}</div>`)
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  const sp = $("#searchPermanen");
  const sf = $("#searchFruit");
  if (sp)
    sp.addEventListener("input", (e) => {
      searchPermanen = e.target.value.trim();
      renderGrid("gridPermanen", "permanen", searchPermanen);
    });
  if (sf)
    sf.addEventListener("input", (e) => {
      searchFruit = e.target.value.trim();
      renderGrid("gridFruit", "fruit", searchFruit);
    });

  $("#cartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#cartOverlay").addEventListener("click", closeCart);
  $("#checkoutBtn").addEventListener("click", checkoutWhatsApp);
  $("#buyTicketBtn").addEventListener("click", buyTicket);
  $("#confirmPayBtn").addEventListener("click", confirmPaid);
  $("#rollBtn").addEventListener("click", doRoll);
  $("#modalClose").addEventListener("click", () => $("#resultModal").classList.remove("open"));

  const menuToggle = $("#menuToggle");
  const navLinks = $(".nav-links");
  if (menuToggle) menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  $$(".nav-links a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));
});
