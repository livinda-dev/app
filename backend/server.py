from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import httpx
import jwt
from passlib.hash import bcrypt
import google.generativeai as genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Google AI
genai.configure(api_key=os.environ['GOOGLE_AI_API_KEY'])

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Health Companion API")

# Session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=JWT_SECRET
)

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================== Models ==================

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None
    created_at: datetime
    last_active: datetime

class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    symptom: Optional[str] = None
    possible_causes: Optional[List[str]] = None
    advice: str
    session_id: str

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # walk, run, cycle
    duration: int  # in minutes
    distance: Optional[float] = None  # in km
    date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class ActivityCreate(BaseModel):
    type: str
    duration: int
    distance: Optional[float] = None
    notes: Optional[str] = None

class WeatherResponse(BaseModel):
    condition: str
    temperature: float
    feels_like: float
    humidity: int
    alert_message: str
    icon: str

# ================== Auth Utilities ==================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        # Get user from database
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ================== Google OAuth ==================

@api_router.post("/auth/google")
async def google_auth(auth_request: GoogleAuthRequest):
    try:
        # Verify the Google ID token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={auth_request.id_token}"
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid token")
            
            google_user = response.json()
            
            # Check if user exists
            user = await db.users.find_one({"email": google_user["email"]})
            
            if not user:
                # Create new user
                user_id = str(uuid.uuid4())
                user = {
                    "id": user_id,
                    "name": google_user.get("name", ""),
                    "email": google_user["email"],
                    "avatar": google_user.get("picture", ""),
                    "created_at": datetime.utcnow(),
                    "last_active": datetime.utcnow()
                }
                await db.users.insert_one(user)
            else:
                # Update last active
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"last_active": datetime.utcnow()}}
                )
            
            # Create JWT token
            access_token = create_access_token({"sub": user["id"]})
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "avatar": user["avatar"]
                }
            }
    
    except Exception as e:
        logger.error(f"Google auth error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== AI Symptom Checker ==================

@api_router.post("/chat/symptom-check", response_model=ChatResponse)
async def symptom_check(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get chat history
        chat_doc = await db.chats.find_one({"session_id": session_id, "user_id": user_id})
        
        if not chat_doc:
            chat_doc = {
                "session_id": session_id,
                "user_id": user_id,
                "messages": [],
                "created_at": datetime.utcnow()
            }
        
        # Add user message to history
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow()
        }
        chat_doc["messages"].append(user_message)
        
        # Configure Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # System prompt for symptom checking
        system_prompt = """You are a helpful health assistant that provides general, educational health guidance.
        
IMPORTANT GUIDELINES:
- You do NOT provide medical diagnoses
- You provide educational information about possible causes of symptoms
- You always recommend consulting a healthcare professional for proper diagnosis
- Keep responses concise, friendly, and supportive
- Focus on general wellness advice

When analyzing symptoms, respond with:
1. Brief acknowledgment of the symptom
2. 2-3 possible common causes (general education only)
3. Self-care advice
4. Always end with a reminder to consult a doctor if symptoms persist or worsen

Keep your response under 150 words."""
        
        # Build conversation history for context
        conversation_history = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in chat_doc["messages"][-6:]  # Last 3 exchanges
        ])
        
        full_prompt = f"{system_prompt}\n\nConversation:\n{conversation_history}"
        
        # Generate response
        response = model.generate_content(full_prompt)
        ai_response = response.text
        
        # Add AI response to history
        ai_message = {
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.utcnow()
        }
        chat_doc["messages"].append(ai_message)
        
        # Save to database
        await db.chats.update_one(
            {"session_id": session_id, "user_id": user_id},
            {"$set": chat_doc},
            upsert=True
        )
        
        # Try to extract structured info (simple parsing)
        symptom = None
        possible_causes = []
        
        # Simple keyword extraction
        lower_message = request.message.lower()
        symptom_keywords = ['headache', 'fever', 'cough', 'pain', 'tired', 'nausea', 'dizzy']
        for keyword in symptom_keywords:
            if keyword in lower_message:
                symptom = keyword.capitalize()
                break
        
        return ChatResponse(
            response=ai_response,
            symptom=symptom,
            possible_causes=possible_causes,
            advice="Remember to stay hydrated and rest. Consult a doctor if symptoms persist.",
            session_id=session_id
        )
    
    except Exception as e:
        logger.error(f"Symptom check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing symptom check: {str(e)}")

# ================== Chat History ==================

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, current_user: dict = Depends(get_current_user)):
    try:
        chat = await db.chats.find_one({
            "session_id": session_id,
            "user_id": current_user["id"]
        })
        
        if not chat:
            return {"messages": []}
        
        return {"messages": chat.get("messages", [])}
    except Exception as e:
        logger.error(f"Get chat history error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/sessions")
async def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    try:
        chats = await db.chats.find(
            {"user_id": current_user["id"]}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        sessions = []
        for chat in chats:
            last_message = chat["messages"][-1] if chat["messages"] else None
            sessions.append({
                "session_id": chat["session_id"],
                "created_at": chat["created_at"],
                "last_message": last_message["content"][:50] + "..." if last_message else "",
                "message_count": len(chat["messages"])
            })
        
        return {"sessions": sessions}
    except Exception as e:
        logger.error(f"Get chat sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== Activity Tracker ==================

@api_router.post("/activity", response_model=Activity)
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):
    try:
        activity_obj = Activity(
            user_id=current_user["id"],
            type=activity.type,
            duration=activity.duration,
            distance=activity.distance,
            notes=activity.notes
        )
        
        await db.activities.insert_one(activity_obj.dict())
        return activity_obj
    except Exception as e:
        logger.error(f"Create activity error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/activity", response_model=List[Activity])
async def get_activities(current_user: dict = Depends(get_current_user), limit: int = 50):
    try:
        activities = await db.activities.find(
            {"user_id": current_user["id"]}
        ).sort("date", -1).limit(limit).to_list(limit)
        
        return [Activity(**activity) for activity in activities]
    except Exception as e:
        logger.error(f"Get activities error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/activity/stats")
async def get_activity_stats(current_user: dict = Depends(get_current_user)):
    try:
        # Get activities from last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        activities = await db.activities.find({
            "user_id": current_user["id"],
            "date": {"$gte": seven_days_ago}
        }).to_list(1000)
        
        total_duration = sum(a["duration"] for a in activities)
        total_distance = sum(a.get("distance", 0) for a in activities)
        total_activities = len(activities)
        
        # Count by type
        by_type = {}
        for activity in activities:
            activity_type = activity["type"]
            if activity_type not in by_type:
                by_type[activity_type] = {"count": 0, "duration": 0, "distance": 0}
            by_type[activity_type]["count"] += 1
            by_type[activity_type]["duration"] += activity["duration"]
            by_type[activity_type]["distance"] += activity.get("distance", 0)
        
        return {
            "total_activities": total_activities,
            "total_duration": total_duration,
            "total_distance": round(total_distance, 2),
            "by_type": by_type,
            "period": "last_7_days"
        }
    except Exception as e:
        logger.error(f"Get activity stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== Weather API ==================

@api_router.get("/weather", response_model=WeatherResponse)
async def get_weather(city: str = "London"):
    try:
        api_key = os.environ['WEATHER_API_KEY']
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://api.weatherapi.com/v1/current.json?key={api_key}&q={city}"
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Unable to fetch weather data")
            
            data = response.json()
            current = data["current"]
            
            temp_c = current["temp_c"]
            condition = current["condition"]["text"]
            
            # Generate health alert based on weather
            alert_message = ""
            if temp_c > 30:
                alert_message = "It's hot today! Stay hydrated and avoid prolonged sun exposure. 💧☀️"
            elif temp_c > 25:
                alert_message = "Pleasant weather! Great day for outdoor activities. 🌤️"
            elif temp_c < 10:
                alert_message = "It's cold! Dress warmly and stay cozy. 🧥❄️"
            elif temp_c < 0:
                alert_message = "Freezing temperatures! Bundle up and limit time outdoors. 🥶"
            elif "rain" in condition.lower():
                alert_message = "Rainy weather. Stay dry and be careful if going out. ☔"
            else:
                alert_message = "Comfortable weather. Perfect for a walk! 🚶‍♂️"
            
            return WeatherResponse(
                condition=condition,
                temperature=temp_c,
                feels_like=current["feelslike_c"],
                humidity=current["humidity"],
                alert_message=alert_message,
                icon=current["condition"]["icon"]
            )
    except Exception as e:
        logger.error(f"Weather API error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== User Profile ==================

@api_router.get("/user/profile", response_model=UserProfile)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    try:
        return UserProfile(**current_user)
    except Exception as e:
        logger.error(f"Get user profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/user/profile")
async def update_user_profile(name: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    try:
        update_data = {}
        if name:
            update_data["name"] = name
        
        if update_data:
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$set": update_data}
            )
        
        updated_user = await db.users.find_one({"id": current_user["id"]})
        return UserProfile(**updated_user)
    except Exception as e:
        logger.error(f"Update user profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== Health Summary ==================

@api_router.get("/user/health-summary")
async def get_health_summary(current_user: dict = Depends(get_current_user)):
    try:
        # Get latest activity
        latest_activity = await db.activities.find_one(
            {"user_id": current_user["id"]},
            sort=[("date", -1)],
            projection={"_id": 0}  # Exclude MongoDB ObjectId
        )
        
        # Get latest chat
        latest_chat = await db.chats.find_one(
            {"user_id": current_user["id"]},
            sort=[("created_at", -1)],
            projection={"_id": 0}  # Exclude MongoDB ObjectId
        )
        
        last_chat_message = None
        if latest_chat and latest_chat.get("messages"):
            last_msg = latest_chat["messages"][-1]
            last_chat_message = {
                "content": last_msg["content"][:100] + "..." if len(last_msg["content"]) > 100 else last_msg["content"],
                "timestamp": last_msg["timestamp"]
            }
        
        return {
            "last_activity": latest_activity,
            "last_chat": last_chat_message,
            "total_activities": await db.activities.count_documents({"user_id": current_user["id"]}),
            "total_chats": await db.chats.count_documents({"user_id": current_user["id"]})
        }
    except Exception as e:
        logger.error(f"Get health summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ================== Root Route ==================

@api_router.get("/")
async def root():
    return {
        "message": "Health Companion API",
        "version": "1.0",
        "endpoints": [
            "/api/auth/google",
            "/api/chat/symptom-check",
            "/api/activity",
            "/api/weather",
            "/api/user/profile"
        ]
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)