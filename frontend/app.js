const API = ""; // якщо сайт і API на одному домені — лишай порожнім

const menuListEl = document.getElementById("menuList");
const cartListEl = document.getElementById("cartList");
const totalEl = document.getElementById("total");
const msgEl = document.getElementById("msg");
const tableCodeEl = document.getElementById("tableCode");

let menu = [];
let cart = []; // [{product_id, name, price, qty, comment}]

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderMenu() {
  if (!menu.length) {
    menuListEl.textContent = "Menu jest puste.";
    return;
  }

  menuListEl.innerHTML = menu.map(m => `
    <div class="item">
      <div>
        <div class="itemTitle">${esc(m.name)}</div>
        <div class="mini">${esc(m.category)} · ${money(m.price)} zł</div>
      </div>
      <button class="btn" type="button" onclick="addToCart(${m.id})">Dodaj</button>
    </div>
  `).join("");
}

function renderCart(){
  if(!cart.length){
    cartListEl.textContent = "Поки пусто";
    totalEl.textContent = "Total: 0 zł";
    return;
  }

  cartListEl.innerHTML = cart.map((c, idx) => `
    <div class="item" style="align-items:flex-start;">
      <div style="flex:1;">
        <div class="itemTitle">${esc(c.name)}</div>
        <div class="mini">${money(c.price)} zł · Ilość: ${c.qty}</div>

        <div class="commentBlock">
          <button class="btnComment" type="button"
                  onclick="toggleComment(${idx})">
            Komentarz
          </button>

          <div id="commentWrap-${idx}" class="commentWrap">
            <input
            class="commentInput"
            placeholder="Komentarz (np.: bez cebuli / sos osobno)"
            value="${esc(c.comment || "")}"
            oninput="setComment(${idx}, this.value)"
          />
          </div>
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-left:10px;">
        <button class="btn2" type="button" onclick="decQty(${idx})">-</button>
        <button class="btn2" type="button" onclick="incQty(${idx})">+</button>
      </div>
    </div>
  `).join("");

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  totalEl.textContent = `Total: ${money(total)} zł`;
}

// --- Глобальні (бо ти використовуєш onclick=...) ---
window.addToCart = (id) => {
  const p = menu.find(x => x.id === id);
  if(!p) return;

  const ex = cart.find(x => x.product_id === id);
  if(ex) ex.qty += 1;
  else cart.push({ product_id: id, name: p.name, price: p.price, qty: 1, comment: "" });

  renderCart();
};

window.incQty = (idx) => {
  if(!cart[idx]) return;
  cart[idx].qty += 1;
  renderCart();
};

window.decQty = (idx) => {
  if(!cart[idx]) return;
  cart[idx].qty -= 1;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
};

window.setComment = (idx, val) => {
  if(!cart[idx]) return;
  cart[idx].comment = val;
};

window.toggleComment = (idx) => {
  const el = document.getElementById(`commentWrap-${idx}`);
  if (!el) return;

  const isOpen = el.classList.toggle("show");

  if (isOpen) {
    el.querySelector("input")?.focus();
  }
};

document.getElementById("clearBtn").addEventListener("click", () => {
  cart = [];
  msgEl.textContent = "";
  msgEl.className = "mini mt12";
  renderCart();
});

async function loadMenu() {
  menuListEl.textContent = "Loading...";
  const res = await fetch(API + "/api/menu");
  menu = await res.json();
  renderMenu();
}

document.getElementById("orderBtn").addEventListener("click", async () => {
  msgEl.textContent = "";
  msgEl.className = "mini mt12";

  const table_code = tableCodeEl.value.trim();
  if (!table_code) {
    msgEl.textContent = "Podaj numer stolika";
    msgEl.className = "mini err mt12";
    return;
  }
  if (!cart.length) {
    msgEl.textContent = "Koszyk jest pusty";
    msgEl.className = "mini err mt12";
    return;
  }

  const payload = {
    table_code,
    items: cart.map(c => ({
      product_id: c.product_id,
      qty: c.qty,
      comment: c.comment || ""
    }))
  };

  try {
    const res = await fetch(API + "/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      msgEl.textContent = "Błąd: " + (data.detail || JSON.stringify(data));
      msgEl.className = "mini err mt12";
      return;
    }

    msgEl.innerHTML = `<span class="ok">✅ Zamówienie zostało złożone!</span> order_id: <b>${data.order_id}</b>, status: <b>${data.status}</b>`;
    cart = [];
    renderCart();
  } catch (e) {
    msgEl.textContent = "Network error: " + e;
    msgEl.className = "mini err mt12";
  }
});

loadMenu();

;
