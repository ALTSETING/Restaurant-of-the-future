import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Literal, Dict
from datetime import datetime
from pathlib import Path

app = FastAPI(title="QR API")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env.strip() == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

MENU_DB = [
    {"id": 1, "name": "Burger", "price": 35.0, "category": "Food", "is_active": True},
    {"id": 2, "name": "Fries", "price": 12.0, "category": "Food", "is_active": True},
    {"id": 3, "name": "Cola", "price": 9.0, "category": "Drinks", "is_active": True},
    {"id": 4, "name": "Beer", "price": 15.0, "category": "Drinks", "is_active": True},
    {"id": 5, "name": "Pizza", "price": 31.0, "category": "Food", "is_active": True},
]


ORDERS_DB: Dict[int, dict] = {}
NEXT_ORDER_ID = 100

OrderStatus = Literal["new", "cooking", "ready", "served", "canceled"]

class MenuItemOut(BaseModel):
    id: int
    name: str
    price: float
    category: str
    is_active: bool
    
class OrderItemIn(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=20)
    comment: str = ""
        


class OrderCreateIn(BaseModel):
    table_code: str = Field(min_length=1, max_length=30)
    items: List[OrderItemIn] = Field(min_length=1)
    
    
    
class OrderCreateOut(BaseModel):
    order_id: int
    status: OrderStatus    
    


class KitchenOrderOut(BaseModel):
    order_id: int
    table_code: str
    status: OrderStatus
    created_at: datetime
    items: List[dict]
    
class StatusUpdateIn(BaseModel):
    status: OrderStatus
    
    



#---------РОУТИ---------№
@app.get("/", response_class=HTMLResponse)
def index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="index.html not found")


@app.get("/admin", response_class=HTMLResponse)
def admin_page():
    admin_file = FRONTEND_DIR / "admin.html"
    if admin_file.exists():
        return FileResponse(admin_file)
    raise HTTPException(status_code=404, detail="admin.html not found")


@app.get("/api/menu", response_model=List[MenuItemOut])
def get_menu():
    return [m for m in MENU_DB if m["is_active"]]

@app.post("/api/orders", response_model=OrderCreateOut)
def create_order(payload: OrderCreateIn):
    global NEXT_ORDER_ID
    
    menu_by_id = {m["id"]: m for m in MENU_DB}
    for it in payload.items:
        product = menu_by_id.get(it.product_id)
        if not product or not product["is_active"]:
            raise HTTPException(
                  status_code=400,
                detail=f"Product {it.product_id} unavailable",
            )

    NEXT_ORDER_ID += 1
    order_id = NEXT_ORDER_ID
    
    items_snapshot = []
    for it in payload.items:
        product = menu_by_id[it.product_id]
        
       
            
        items_snapshot.append({
            "product_id": it.product_id,
            "name": product["name"],
            "qty": it.qty,
            "price_at_time": product["price"],
            "comment": it.comment,
        })
    
    
    ORDERS_DB[order_id] = {
        "order_id": order_id,
        "table_code": payload.table_code,
        "status": "new",
        "created_at": datetime.utcnow(),
        "items": items_snapshot,
        
    }
    
    return {"order_id": order_id, "status": "new"}


@app.get("/api/kitchen/orders", response_model=List[KitchenOrderOut])
def kitchen_orders(status: OrderStatus | None = Query(default=None)):
    orders = list(ORDERS_DB.values())
    # фільтр по статусу, якщо передали
    if status:
        orders = [o for o in orders if o["status"] == status]
    # найновіші зверху
    orders.sort(key=lambda o: o["created_at"], reverse=True)
    return orders


@app.patch("/api/orders/{order_id}/status")
def update_status(order_id: int, payload: StatusUpdateIn):
    order = ORDERS_DB.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order["status"] = payload.status
    return {"ok": True, "order_id": order_id, "status": order["status"]}
