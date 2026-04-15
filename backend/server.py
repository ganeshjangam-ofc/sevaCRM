from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import List, Optional
from pymongo import ReturnDocument
import os
import logging
import uuid
import bcrypt
import jwt
import io

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== AUTH HELPERS ====================

JWT_ALG = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_pw(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALG)

def create_refresh(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALG)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== PYDANTIC MODELS ====================

class RegisterInput(BaseModel):
    email: str
    password: str
    name: str
    role: str = "customer"
    phone: str = ""
    company: str = ""

class LoginInput(BaseModel):
    email: str
    password: str

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    profile_notes: Optional[str] = None

class InquiryInput(BaseModel):
    title: str
    description: str = ""
    customer_id: Optional[str] = None
    customer_name: str = ""
    customer_email: str = ""
    assigned_to: Optional[str] = None
    priority: str = "medium"
    source: str = "website"

class FollowUpInput(BaseModel):
    inquiry_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str = ""
    assigned_to: Optional[str] = None
    type: str = "call"
    notes: str = ""
    due_date: str = ""

class QuotationItemInput(BaseModel):
    name: str
    description: str = ""
    quantity: float = 1
    unit_price: float = 0
    gst_rate: float = 18

class QuotationInput(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str = ""
    customer_email: str = ""
    customer_gst: str = ""
    billing_address: str = ""
    items: List[QuotationItemInput] = []
    valid_until: str = ""
    notes: str = ""
    status: str = "draft"

class InventoryInput(BaseModel):
    name: str
    sku: str = ""
    category: str = ""
    description: str = ""
    quantity: int = 0
    unit_price: float = 0
    gst_rate: float = 18
    hsn_code: str = ""
    reorder_level: int = 10
    supplier: str = ""

class TicketInput(BaseModel):
    subject: str
    description: str = ""
    priority: str = "medium"

class TicketMessageInput(BaseModel):
    message: str

class GSTRateInput(BaseModel):
    name: str
    rate: float
    hsn_code: str = ""
    description: str = ""

# ==================== AUTH ROUTES ====================

@api.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_pw(data.password),
        "name": data.name,
        "role": "customer",
        "phone": data.phone,
        "company": data.company,
        "gst_number": "",
        "address": "",
        "profile_notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_token(user_id, email, "customer")
    refresh = create_refresh(user_id)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax", max_age=604800)
    return {
        "user": {"id": user_id, "email": email, "name": data.name, "role": "customer",
                 "phone": data.phone, "company": data.company},
        "access_token": token
    }

@api.post("/auth/login")
async def login(data: LoginInput, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    token = create_token(user_id, email, user["role"])
    refresh = create_refresh(user_id)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=86400)
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax", max_age=604800)
    return {
        "user": {
            "id": user_id, "email": email, "name": user["name"], "role": user["role"],
            "phone": user.get("phone", ""), "company": user.get("company", ""),
            "gst_number": user.get("gst_number", ""), "address": user.get("address", "")
        },
        "access_token": token
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

@api.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}

@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_token = create_token(str(user["_id"]), user["email"], user["role"])
        response.set_cookie("access_token", new_token, httponly=True, samesite="lax", max_age=86400)
        return {"access_token": new_token}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== USER MANAGEMENT (ADMIN) ====================

@api.get("/users")
async def list_users(request: Request, role: str = ""):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@api.post("/users")
async def create_user(data: RegisterInput, request: Request):
    admin = await get_current_user(request)
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user_doc = {
        "email": email,
        "password_hash": hash_pw(data.password),
        "name": data.name,
        "role": data.role,
        "phone": data.phone,
        "company": data.company,
        "gst_number": "",
        "address": "",
        "profile_notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    return {"_id": str(result.inserted_id), "email": email, "name": data.name, "role": data.role}

@api.put("/users/{user_id}")
async def update_user(user_id: str, data: CustomerUpdate, request: Request):
    current = await get_current_user(request)
    if current["role"] != "admin" and current["_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    updated["_id"] = str(updated["_id"])
    return updated

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    admin = await get_current_user(request)
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== CUSTOMER ROUTES ====================

@api.get("/customers")
async def list_customers(request: Request, search: str = ""):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "sales_team"]:
        raise HTTPException(status_code=403, detail="Access denied")
    query = {"role": "customer"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    for c in customers:
        c["_id"] = str(c["_id"])
    return customers

@api.get("/customers/{customer_id}")
async def get_customer(customer_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] == "customer" and user["_id"] != customer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    customer = await db.users.find_one({"_id": ObjectId(customer_id)}, {"password_hash": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer["_id"] = str(customer["_id"])
    return customer

# ==================== INQUIRY ROUTES ====================

@api.get("/inquiries")
async def list_inquiries(request: Request, status: str = "", priority: str = "", assigned_to: str = ""):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["_id"]
    elif user["role"] == "sales_team" and assigned_to == "me":
        query["assigned_to"] = user["_id"]
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    inquiries = await db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return inquiries

@api.get("/inquiries/{inquiry_id}")
async def get_inquiry(inquiry_id: str, request: Request):
    await get_current_user(request)
    inquiry = await db.inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return inquiry

@api.post("/inquiries")
async def create_inquiry(data: InquiryInput, request: Request):
    user = await get_current_user(request)
    assigned_to_name = ""
    if data.assigned_to:
        try:
            assignee = await db.users.find_one({"_id": ObjectId(data.assigned_to)})
            if assignee:
                assigned_to_name = assignee["name"]
        except Exception:
            pass
    doc = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "customer_id": data.customer_id or "",
        "customer_name": data.customer_name,
        "customer_email": data.customer_email,
        "assigned_to": data.assigned_to or "",
        "assigned_to_name": assigned_to_name,
        "status": "new",
        "priority": data.priority,
        "source": data.source,
        "notes": "",
        "created_by": user["_id"],
        "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.inquiries.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/inquiries/{inquiry_id}")
async def update_inquiry(inquiry_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    update_data = {}
    for field in ["title", "description", "customer_id", "customer_name", "customer_email",
                   "assigned_to", "status", "priority", "source", "notes"]:
        if field in body:
            update_data[field] = body[field]
    if "assigned_to" in update_data and update_data["assigned_to"]:
        try:
            assignee = await db.users.find_one({"_id": ObjectId(update_data["assigned_to"])})
            if assignee:
                update_data["assigned_to_name"] = assignee["name"]
        except Exception:
            pass
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    updated = await db.inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    return updated

@api.delete("/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.inquiries.delete_one({"id": inquiry_id})
    return {"message": "Deleted"}

# ==================== FOLLOW-UP ROUTES ====================

@api.get("/followups")
async def list_followups(request: Request, status: str = "", assigned_to: str = ""):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "sales_team" and assigned_to == "me":
        query["assigned_to"] = user["_id"]
    if status:
        query["status"] = status
    followups = await db.followups.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return followups

@api.post("/followups")
async def create_followup(data: FollowUpInput, request: Request):
    user = await get_current_user(request)
    assigned_to = data.assigned_to or user["_id"]
    assigned_name = user["name"]
    if data.assigned_to and data.assigned_to != user["_id"]:
        try:
            assignee = await db.users.find_one({"_id": ObjectId(data.assigned_to)})
            if assignee:
                assigned_name = assignee["name"]
        except Exception:
            pass
    doc = {
        "id": str(uuid.uuid4()),
        "inquiry_id": data.inquiry_id or "",
        "customer_id": data.customer_id or "",
        "customer_name": data.customer_name,
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_name,
        "type": data.type,
        "notes": data.notes,
        "due_date": data.due_date,
        "status": "pending",
        "completed_at": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.followups.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/followups/{followup_id}")
async def update_followup(followup_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    update = {}
    for f in ["type", "notes", "due_date", "status", "assigned_to", "customer_name", "inquiry_id"]:
        if f in body:
            update[f] = body[f]
    if "status" in update and update["status"] == "completed":
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    if "assigned_to" in update and update["assigned_to"]:
        try:
            assignee = await db.users.find_one({"_id": ObjectId(update["assigned_to"])})
            if assignee:
                update["assigned_to_name"] = assignee["name"]
        except Exception:
            pass
    await db.followups.update_one({"id": followup_id}, {"$set": update})
    updated = await db.followups.find_one({"id": followup_id}, {"_id": 0})
    return updated

@api.delete("/followups/{followup_id}")
async def delete_followup(followup_id: str, request: Request):
    await get_current_user(request)
    await db.followups.delete_one({"id": followup_id})
    return {"message": "Deleted"}

# ==================== QUOTATION ROUTES ====================

async def get_next_quotation_number():
    counter = await db.counters.find_one_and_update(
        {"_id": "quotation"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return f"QT-{counter['seq']:05d}"

@api.get("/quotations")
async def list_quotations(request: Request, status: str = ""):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["_id"]
    if status:
        query["status"] = status
    quotations = await db.quotations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotations

@api.get("/quotations/{quotation_id}")
async def get_quotation(quotation_id: str, request: Request):
    await get_current_user(request)
    q = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return q

@api.post("/quotations")
async def create_quotation(data: QuotationInput, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "sales_team"]:
        raise HTTPException(status_code=403, detail="Access denied")
    items = []
    subtotal = 0
    total_gst = 0
    for item in data.items:
        amount = item.quantity * item.unit_price
        gst_amount = amount * (item.gst_rate / 100)
        items.append({
            "name": item.name, "description": item.description,
            "quantity": item.quantity, "unit_price": item.unit_price,
            "gst_rate": item.gst_rate, "amount": round(amount, 2),
            "gst_amount": round(gst_amount, 2)
        })
        subtotal += amount
        total_gst += gst_amount
    doc = {
        "id": str(uuid.uuid4()),
        "quotation_number": await get_next_quotation_number(),
        "customer_id": data.customer_id or "",
        "customer_name": data.customer_name,
        "customer_email": data.customer_email,
        "customer_gst": data.customer_gst,
        "billing_address": data.billing_address,
        "items": items,
        "subtotal": round(subtotal, 2),
        "total_gst": round(total_gst, 2),
        "total": round(subtotal + total_gst, 2),
        "status": data.status,
        "valid_until": data.valid_until,
        "notes": data.notes,
        "created_by": user["_id"],
        "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quotations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/quotations/{quotation_id}")
async def update_quotation(quotation_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    update = {}
    if "status" in body:
        update["status"] = body["status"]
    if "notes" in body:
        update["notes"] = body["notes"]
    if "items" in body:
        items = []
        subtotal = 0
        total_gst = 0
        for item in body["items"]:
            amount = item["quantity"] * item["unit_price"]
            gst_amount = amount * (item.get("gst_rate", 18) / 100)
            items.append({
                "name": item["name"], "description": item.get("description", ""),
                "quantity": item["quantity"], "unit_price": item["unit_price"],
                "gst_rate": item.get("gst_rate", 18), "amount": round(amount, 2),
                "gst_amount": round(gst_amount, 2)
            })
            subtotal += amount
            total_gst += gst_amount
        update["items"] = items
        update["subtotal"] = round(subtotal, 2)
        update["total_gst"] = round(total_gst, 2)
        update["total"] = round(subtotal + total_gst, 2)
    for f in ["customer_name", "customer_email", "customer_gst", "billing_address", "valid_until"]:
        if f in body:
            update[f] = body[f]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.quotations.update_one({"id": quotation_id}, {"$set": update})
    updated = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    return updated

@api.delete("/quotations/{quotation_id}")
async def delete_quotation(quotation_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.quotations.delete_one({"id": quotation_id})
    return {"message": "Deleted"}

@api.get("/quotations/{quotation_id}/pdf")
async def get_quotation_pdf(quotation_id: str, request: Request):
    await get_current_user(request)
    q = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50)
    elements = []
    styles = getSampleStyleSheet()
    elements.append(Paragraph("QUOTATION", styles['Title']))
    elements.append(Paragraph(f"#{q['quotation_number']}", styles['Heading2']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"<b>Customer:</b> {q['customer_name']}", styles['Normal']))
    if q.get('customer_email'):
        elements.append(Paragraph(f"<b>Email:</b> {q['customer_email']}", styles['Normal']))
    if q.get('customer_gst'):
        elements.append(Paragraph(f"<b>GSTIN:</b> {q['customer_gst']}", styles['Normal']))
    if q.get('billing_address'):
        elements.append(Paragraph(f"<b>Address:</b> {q['billing_address']}", styles['Normal']))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>Date:</b> {q['created_at'][:10]}", styles['Normal']))
    if q.get('valid_until'):
        elements.append(Paragraph(f"<b>Valid Until:</b> {q['valid_until']}", styles['Normal']))
    elements.append(Spacer(1, 20))
    data = [['#', 'Item', 'Qty', 'Unit Price', 'GST %', 'GST Amt', 'Total']]
    for i, item in enumerate(q['items'], 1):
        data.append([
            str(i), item['name'], str(item['quantity']),
            f"Rs.{item['unit_price']:.2f}", f"{item['gst_rate']}%",
            f"Rs.{item['gst_amount']:.2f}", f"Rs.{item['amount'] + item['gst_amount']:.2f}"
        ])
    table = Table(data, colWidths=[30, 150, 40, 80, 50, 70, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#002FA7')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10))
    totals_data = [
        ['', '', '', '', '', 'Subtotal:', f"Rs.{q['subtotal']:.2f}"],
        ['', '', '', '', '', 'Total GST:', f"Rs.{q['total_gst']:.2f}"],
        ['', '', '', '', '', 'TOTAL:', f"Rs.{q['total']:.2f}"],
    ]
    totals = Table(totals_data, colWidths=[30, 150, 40, 80, 50, 70, 80])
    totals.setStyle(TableStyle([
        ('FONTNAME', (5, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (5, 0), (-1, -1), 9),
        ('ALIGN', (5, 0), (-1, -1), 'RIGHT'),
        ('LINEABOVE', (5, -1), (-1, -1), 2, colors.black),
    ]))
    elements.append(totals)
    if q.get('notes'):
        elements.append(Spacer(1, 30))
        elements.append(Paragraph(f"<b>Notes:</b> {q['notes']}", styles['Normal']))
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=quotation_{q['quotation_number']}.pdf"}
    )

# ==================== INVENTORY ROUTES ====================

@api.get("/inventory")
async def list_inventory(request: Request, category: str = "", search: str = ""):
    await get_current_user(request)
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    items = await db.inventory.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return items

@api.get("/inventory/categories")
async def get_categories(request: Request):
    await get_current_user(request)
    categories = await db.inventory.distinct("category")
    return [c for c in categories if c]

@api.get("/inventory/{item_id}")
async def get_inventory_item(item_id: str, request: Request):
    await get_current_user(request)
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api.post("/inventory")
async def create_inventory(data: InventoryInput, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "sales_team"]:
        raise HTTPException(status_code=403, detail="Access denied")
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.inventory.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/inventory/{item_id}")
async def update_inventory(item_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "sales_team"]:
        raise HTTPException(status_code=403, detail="Access denied")
    body = await request.json()
    update = {}
    for f in ["name", "sku", "category", "description", "quantity", "unit_price", "gst_rate", "hsn_code", "reorder_level", "supplier"]:
        if f in body:
            update[f] = body[f]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.inventory.update_one({"id": item_id}, {"$set": update})
    updated = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    return updated

@api.delete("/inventory/{item_id}")
async def delete_inventory(item_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.inventory.delete_one({"id": item_id})
    return {"message": "Deleted"}

# ==================== TICKET ROUTES ====================

@api.get("/tickets")
async def list_tickets(request: Request, status: str = ""):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["_id"]
    if status:
        query["status"] = status
    tickets = await db.tickets.find(query, {"_id": 0, "messages": 0}).sort("created_at", -1).to_list(1000)
    return tickets

@api.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user["role"] == "customer" and ticket["customer_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket

@api.post("/tickets")
async def create_ticket(data: TicketInput, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()),
        "customer_id": user["_id"],
        "customer_name": user["name"],
        "customer_email": user.get("email", ""),
        "subject": data.subject,
        "description": data.description,
        "status": "open",
        "priority": data.priority,
        "assigned_to": "",
        "assigned_to_name": "",
        "messages": [{
            "id": str(uuid.uuid4()),
            "sender_id": user["_id"],
            "sender_name": user["name"],
            "sender_role": user["role"],
            "message": data.description,
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    update = {}
    for f in ["status", "priority", "assigned_to"]:
        if f in body:
            update[f] = body[f]
    if "assigned_to" in update and update["assigned_to"]:
        try:
            assignee = await db.users.find_one({"_id": ObjectId(update["assigned_to"])})
            if assignee:
                update["assigned_to_name"] = assignee["name"]
        except Exception:
            pass
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tickets.update_one({"id": ticket_id}, {"$set": update})
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return updated

@api.post("/tickets/{ticket_id}/messages")
async def add_ticket_message(ticket_id: str, data: TicketMessageInput, request: Request):
    user = await get_current_user(request)
    msg = {
        "id": str(uuid.uuid4()),
        "sender_id": user["_id"],
        "sender_name": user["name"],
        "sender_role": user["role"],
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"messages": msg}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return updated

# ==================== DASHBOARD ROUTES ====================

@api.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    if user["role"] == "customer":
        tickets = await db.tickets.count_documents({"customer_id": user["_id"]})
        open_tickets = await db.tickets.count_documents({"customer_id": user["_id"], "status": "open"})
        quotations = await db.quotations.count_documents({"customer_id": user["_id"]})
        return {"total_tickets": tickets, "open_tickets": open_tickets, "total_quotations": quotations}
    total_customers = await db.users.count_documents({"role": "customer"})
    total_inquiries = await db.inquiries.count_documents({})
    active_inquiries = await db.inquiries.count_documents({"status": {"$nin": ["closed", "converted"]}})
    pending_followups = await db.followups.count_documents({"status": "pending"})
    total_quotations = await db.quotations.count_documents({})
    accepted_quotations = await db.quotations.count_documents({"status": "accepted"})
    pipeline = [{"$match": {"status": "accepted"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    revenue_result = await db.quotations.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    open_tickets = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    low_stock = await db.inventory.count_documents({"$expr": {"$lte": ["$quantity", "$reorder_level"]}})
    return {
        "total_customers": total_customers,
        "total_inquiries": total_inquiries,
        "active_inquiries": active_inquiries,
        "pending_followups": pending_followups,
        "total_quotations": total_quotations,
        "accepted_quotations": accepted_quotations,
        "total_revenue": round(total_revenue, 2),
        "open_tickets": open_tickets,
        "low_stock_items": low_stock
    }

@api.get("/dashboard/recent")
async def get_dashboard_recent(request: Request):
    user = await get_current_user(request)
    if user["role"] == "customer":
        tickets = await db.tickets.find({"customer_id": user["_id"]}, {"_id": 0, "messages": 0}).sort("created_at", -1).to_list(5)
        quotations = await db.quotations.find({"customer_id": user["_id"]}, {"_id": 0}).sort("created_at", -1).to_list(5)
        return {"recent_tickets": tickets, "recent_quotations": quotations}
    recent_inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    upcoming_followups = await db.followups.find({"status": "pending"}, {"_id": 0}).sort("due_date", 1).to_list(5)
    recent_quotations = await db.quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    recent_tickets = await db.tickets.find({}, {"_id": 0, "messages": 0}).sort("created_at", -1).to_list(5)
    return {
        "recent_inquiries": recent_inquiries,
        "upcoming_followups": upcoming_followups,
        "recent_quotations": recent_quotations,
        "recent_tickets": recent_tickets
    }

# ==================== GST ROUTES ====================

@api.get("/gst/rates")
async def list_gst_rates(request: Request):
    await get_current_user(request)
    rates = await db.gst_rates.find({}, {"_id": 0}).sort("rate", 1).to_list(100)
    return rates

@api.post("/gst/rates")
async def create_gst_rate(data: GSTRateInput, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name, "rate": data.rate,
        "hsn_code": data.hsn_code, "description": data.description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gst_rates.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/gst/rates/{rate_id}")
async def update_gst_rate(rate_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    update = {}
    for f in ["name", "rate", "hsn_code", "description", "is_active"]:
        if f in body:
            update[f] = body[f]
    await db.gst_rates.update_one({"id": rate_id}, {"$set": update})
    updated = await db.gst_rates.find_one({"id": rate_id}, {"_id": 0})
    return updated

@api.delete("/gst/rates/{rate_id}")
async def delete_gst_rate(rate_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.gst_rates.delete_one({"id": rate_id})
    return {"message": "Deleted"}

# ==================== SALES TEAM ROUTES ====================

@api.get("/sales-team")
async def list_sales_team(request: Request):
    await get_current_user(request)
    members = await db.users.find({"role": {"$in": ["admin", "sales_team"]}}, {"password_hash": 0}).to_list(100)
    for m in members:
        m["_id"] = str(m["_id"])
    return members

# ==================== APP SETUP ====================

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info("Starting CRM application...")
    await db.users.create_index("email", unique=True)
    await db.inquiries.create_index("id", unique=True)
    await db.followups.create_index("id", unique=True)
    await db.quotations.create_index("id", unique=True)
    await db.inventory.create_index("id", unique=True)
    await db.tickets.create_index("id", unique=True)
    await db.gst_rates.create_index("id", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@crm.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_pw(admin_password),
            "name": "Admin", "role": "admin", "phone": "", "company": "CRM Corp",
            "gst_number": "", "address": "", "profile_notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_pw(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_pw(admin_password)}})

    # Seed default GST rates
    gst_count = await db.gst_rates.count_documents({})
    if gst_count == 0:
        default_rates = [
            {"id": str(uuid.uuid4()), "name": "GST 5%", "rate": 5, "hsn_code": "", "description": "5% GST slab", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "GST 12%", "rate": 12, "hsn_code": "", "description": "12% GST slab", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "GST 18%", "rate": 18, "hsn_code": "", "description": "18% GST slab", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "GST 28%", "rate": 28, "hsn_code": "", "description": "28% GST slab", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.gst_rates.insert_many(default_rates)
        logger.info("Default GST rates seeded")

    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- POST /api/auth/logout\n- GET /api/auth/me\n")

    logger.info("CRM startup complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()
