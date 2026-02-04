const menuGrid = document.getElementById("menu-grid");
const refreshButton = document.getElementById("refresh");
const orderForm = document.getElementById("order-form");
const orderResult = document.getElementById("order-result");

let selectedProductId = null;

const API_BASE_URL = "https://restaurant-of-the-future.onrender.com";

const formatPrice = (value) => `${value.toFixed(2)} ₴`;

const renderMenu = (items) => {
  menuGrid.innerHTML = "";
  if (!items.length) {
    menuGrid.innerHTML = "<p>Меню порожнє.</p>";
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-card";
    card.innerHTML = `
      <h3>${item.name}</h3>
      <div class="menu-meta">
        <span class="badge">${item.category}</span>
        <span class="menu-price">${formatPrice(item.price)}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      selectedProductId = item.id;
      document
        .querySelectorAll(".menu-card")
        .forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
      orderResult.textContent = `Обрано: ${item.name}`;
    });
    menuGrid.appendChild(card);
  });
};

const fetchMenu = async () => {
  const response = await fetch(`${API_BASE_URL}/api/menu`);
  if (!response.ok) {
    throw new Error("Не вдалося завантажити меню");
  }
  return response.json();
};

const loadMenu = async () => {
  try {
    const items = await fetchMenu();
    renderMenu(items);
  } catch (error) {
    menuGrid.innerHTML = `<p>${error.message}</p>`;
  }
};

const createOrder = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

   const isJson = response.headers.get("content-type")?.includes("application/json");
   const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
   if (isJson && data?.detail) {
      throw new Error(data.detail);
    }
    throw new Error(typeof data === "string" && data ? data : "Не вдалося створити замовлення");
  }

  return data;
};

refreshButton.addEventListener("click", loadMenu);

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  orderResult.textContent = "";

  if (!selectedProductId) {
    orderResult.textContent = "Оберіть позицію меню, щоб створити замовлення.";
    return;
  }

  const formData = new FormData(orderForm);
  const payload = {
    table_code: formData.get("tableCode"),
    items: [
      {
        product_id: selectedProductId,
        qty: Number(formData.get("quantity")),
        comment: formData.get("comment"),
      },
    ],
  };

  try {
    const result = await createOrder(payload);
    orderResult.textContent = `Замовлення #${result.order_id} створено. Статус: ${result.status}.`;
  } catch (error) {
    orderResult.textContent = error.message;
  }
});

loadMenu();
