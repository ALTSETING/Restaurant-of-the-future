const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const tableSearchEl = document.getElementById("tableSearch");
const msgEl = document.getElementById("msg");
const infoEl = document.getElementById("info");

let timer = null;
let autoOn = true;


const openComments = Object.create(null);


const saveTimers = Object.create(null);


function fmtDate(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMsg(text, ok = true) {
  msgEl.textContent = text;
  msgEl.className = ok ? "mini ok mt10" : "mini err mt10";
  if (text) setTimeout(() => { msgEl.textContent = ""; }, 2500);
}

// ---------------- UI: comment toggle ----------------
window.toggleItemComment = (orderId, itemIdx) => {
  const key = `${orderId}-${itemIdx}`;
  openComments[key] = !openComments[key];

  const wrap = document.getElementById(`cw-${orderId}-${itemIdx}`);
  if (!wrap) return;

  wrap.classList.toggle("show", !!openComments[key]);


  if (openComments[key]) {
    const input = wrap.querySelector("input");
    input?.focus();
  }
};


window.setItemComment = (orderId, itemIdx, val) => {

  const key = `${orderId}-${itemIdx}`;
  if (val && !openComments[key]) openComments[key] = true;
}

async function load() {
  const st = statusEl.value;
  const q = tableSearchEl.value.trim().toLowerCase();

  const url = "/api/kitchen/orders" + (st ? `?status=${encodeURIComponent(st)}` : "");
  const res = await fetch(url);
  const orders = await res.json();

  let filtered = orders;
  if (q) {
    filtered = orders.filter(o => String(o.table_code || "").toLowerCase().includes(q));
  }

  infoEl.textContent = `Wyświetlono: ${filtered.length}`;

  if (!filtered.length) {
    listEl.textContent = "Brak zamówień.";
    return;
  }

  listEl.innerHTML = filtered.map(o => {
    const tableLabel = o.table_code ?? "—";

    return `
      <div class="card">
        <div class="row">
          <div>
            <div style="font-weight:900; font-size:18px;">Order #${o.order_id}</div>
            <div class="mini">
              Table: <span class="tag"><b>${esc(tableLabel)}</b></span>
              · Status: <span class="tag"><b>${esc(o.status)}</b></span>
              · ${esc(fmtDate(o.created_at))}
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn2" type="button" onclick="setStatus(${o.order_id}, 'cooking')">Przyjęte</button>
            <button class="btn1" type="button" onclick="setStatus(${o.order_id}, 'canceled')">Anuluj</button>
          </div>
        </div>

        <div class="items">
          ${(o.items || []).map((i, itemIdx) => {
            const key = `${o.order_id}-${itemIdx}`;
            const isOpen = !!openComments[key];

            // якщо коментар існує — можна автоматично відкривати (опційно)
            // const isOpen = !!openComments[key] || !!i.comment;

            return `
              <div class="mini itemLine">
                • <b>${esc(i.name)}</b> x${esc(i.qty)} (${esc(i.price_at_time)} zł)
                ${i.comment ? `<span class="tagComment">📝 ${esc(i.comment)}</span>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

// ---------------- Status update ----------------
window.setStatus = async (orderId, status) => {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setMsg("Błąd: " + (data.detail || res.status), false);
    return;
  }

  setMsg(`✅ Order #${orderId} → ${status}`);
  load();
};

// ---------------- UI events ----------------
document.getElementById("refresh").addEventListener("click", load);

document.getElementById("auto").addEventListener("click", () => {
  autoOn = !autoOn;
  document.getElementById("auto").textContent = "Auto: " + (autoOn ? "ON" : "OFF");

  if (autoOn) {
    timer = setInterval(load, 4000);
  } else {
    clearInterval(timer);
    timer = null;
  }
});

statusEl.addEventListener("change", load);

let searchTimeout = null;
tableSearchEl.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(load, 200);
});

// ---------------- boot ----------------
load();
timer = setInterval(load, 4000);

