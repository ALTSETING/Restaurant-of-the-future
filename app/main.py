from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Literal, Dict
from datetime import datetime

app = FastAPI(title = "QR API")


MENU_DB = [
    {"id": 1, "name": "Burger", "price": 35.0, "category": "Food", "is_active": True},
    {"id": 2, "name": "Fries", "price": 12.0, "category": "Food", "is_active": True},
    {"id": 3, "name": "Cola", "price": 9.0, "category": "Drinks", "is_active": True},
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
    status: OrderStatus
    created_at: datetime
    items: List[dict]
    
class StatusUpdateIn(BaseModel):
    status: OrderStatus
    
    



#---------РОУТИ---------№



@app.get("/api/menu", response_model=List[MenuItemOut])
def get_menu():
    return[m for m in MENU_DB if m["is_active"]]

@app.post("/api/orders", response_model=OrderCreateOut)
def create_order(payload: OrderCreateIn):
    global NEXT_ORDER_ID
    
    menu_by_id = {m["id"]: m for m in MENU_DB}
    for it in payload.items:
        product = menu_by_id.get(it.product_id)
        if not product or not product["is_active"]:
            raise HTTPException(
                status_code=400, 
                datail=f"Product {it.product_id} unavailable"
                )
    
    NEXT_ORDER_ID +- 1
    order_id = NEXT_ORDER_ID
    
    items_snapshot = []
    for it in payload.items:
        product = menu_by_id[it.product_id]
        
        if not product:
            raise HTTPException(
            status_code=400,
            detail=f"Product {it.product_id} not found"
            )
            
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
