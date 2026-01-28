"""Authentication routes"""
import uuid
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from models.schemas import UserRegister, UserLogin, PasswordReset, PasswordResetConfirm, GoogleAuthRequest
from utils.database import db
from utils.auth import (
    hash_password, verify_password, create_access_token, 
    get_current_user, JWT_SECRET
)
import jwt
import httpx

# Router tetap menggunakan prefix /auth, sehingga total path: /api/auth
router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

# --- ENDPOINT REGISTER & LOGIN (TETAP) ---

@router.post("/register")
async def register(user_data: UserRegister):
    """Register a new user"""
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_access_token({"user_id": user_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "email": user_data.email.lower(),
            "name": user_data.name,
            "is_admin": False
        }
    }

@router.post("/login")
async def login(user_data: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": user_data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"user_id": user["user_id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "is_admin": user.get("is_admin", False)
        }
    }

@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """Get current user info"""
    return user

# --- PERBAIKAN GOOGLE AUTH (GET METHOD & PATH /google/login) ---

@router.get("/google/login")
async def google_auth(request: Request):
    """Authenticate with Google OAuth via GET"""
    # Mengambil 'code' dari query parameter (dikirim otomatis oleh Google setelah redirect)
    code = request.query_params.get("code")
    # Redirect URI harus sama dengan yang didaftarkan di Google Console
    redirect_uri = "https://relasi4warna.com/api/auth/google/login"

    # Tahap 1: Jika tidak ada code, redirect user ke Google Consent Screen
    if not code:
        google_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={GOOGLE_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope=openid%20email%20profile"
        )
        return RedirectResponse(url=google_url)

    # Tahap 2: Jika ada code, tukarkan dengan Token
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                }
            )
            tokens = token_response.json()
            
            if "error" in tokens:
                raise HTTPException(status_code=400, detail=tokens.get("error_description", "Google auth failed"))
            
            # Ambil info user menggunakan Access Token
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            userinfo = userinfo_response.json()
        
        email = userinfo.get("email", "").lower()
        if not email:
            raise HTTPException(status_code=400, detail="Could not get email from Google")
        
        # Cari atau buat user baru di Database
        user = await db.users.find_one({"email": email})
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                "user_id": user_id,
                "email": email,
                "name": userinfo.get("name", email.split("@")[0]),
                "google_id": userinfo.get("id"),
                "avatar": userinfo.get("picture"),
                "is_admin": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "auth_provider": "google"
            }
            await db.users.insert_one(user)
        else:
            user_id = user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "google_id": userinfo.get("id"),
                    "avatar": userinfo.get("picture"),
                    "last_login": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Buat token akses lokal (JWT)
        token = create_access_token({"user_id": user_id})
        
        # Redirect kembali ke Frontend dengan membawa token
        frontend_url = f"https://relasi4warna.com/login?token={token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")

# --- ENDPOINT PASSWORD RESET (TETAP) ---

@router.post("/request-reset")
async def request_password_reset(data: PasswordReset):
    """Request a password reset email"""
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        return {"message": "If email exists, reset link will be sent"}
    
    reset_token = jwt.encode(
        {
            "user_id": user["user_id"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "password_reset"
        },
        JWT_SECRET,
        algorithm="HS256"
    )
    
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False
    })
    
    return {"message": "If email exists, reset link will be sent", "token": reset_token}

@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm):
    """Reset password with token"""
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        user_id = payload.get("user_id")
        reset_record = await db.password_resets.find_one({
            "token": data.token,
            "used": False
        })
        if not reset_record:
            raise HTTPException(status_code=400, detail="Token invalid or already used")
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"password_hash": hash_password(data.new_password)}}
        )
        
        await db.password_resets.update_one(
            {"token": data.token},
            {"$set": {"used": True}}
        )
        
        return {"message": "Password reset successful"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid token")
