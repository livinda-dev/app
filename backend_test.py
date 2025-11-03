#!/usr/bin/env python3
"""
Backend API Testing Suite for AI Health Companion App
Tests all backend endpoints systematically
"""

import requests
import json
import uuid
from datetime import datetime
import os
import sys

# Configuration
BACKEND_URL = "https://symptomcheck-5.preview.emergentagent.com/api"
TEST_USER_ID = str(uuid.uuid4())
TEST_JWT_TOKEN = None

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def test_root_endpoint():
    """Test the root API endpoint"""
    print_test_header("Root Endpoint")
    
    try:
        response = requests.get(f"{BACKEND_URL}/")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Root endpoint working - Status: {response.status_code}")
            print_info(f"API Message: {data.get('message', 'N/A')}")
            print_info(f"Version: {data.get('version', 'N/A')}")
            print_info(f"Available endpoints: {len(data.get('endpoints', []))}")
            return True
        else:
            print_error(f"Root endpoint failed - Status: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Root endpoint error: {str(e)}")
        return False

def test_weather_endpoint():
    """Test the weather API endpoint (public, no auth required)"""
    print_test_header("Weather API Endpoint")
    
    test_cities = ["London", "New York", "Tokyo", "InvalidCity123"]
    results = []
    
    for city in test_cities:
        try:
            response = requests.get(f"{BACKEND_URL}/weather", params={"city": city})
            
            if city == "InvalidCity123":
                # Expect this to fail
                if response.status_code != 200:
                    print_success(f"Invalid city '{city}' correctly rejected - Status: {response.status_code}")
                    results.append(True)
                else:
                    print_warning(f"Invalid city '{city}' unexpectedly accepted")
                    results.append(False)
            else:
                if response.status_code == 200:
                    data = response.json()
                    print_success(f"Weather for {city} - Status: {response.status_code}")
                    print_info(f"  Condition: {data.get('condition', 'N/A')}")
                    print_info(f"  Temperature: {data.get('temperature', 'N/A')}°C")
                    print_info(f"  Alert: {data.get('alert_message', 'N/A')}")
                    results.append(True)
                else:
                    print_error(f"Weather for {city} failed - Status: {response.status_code}")
                    print_error(f"Response: {response.text}")
                    results.append(False)
                    
        except Exception as e:
            print_error(f"Weather API error for {city}: {str(e)}")
            results.append(False)
    
    return all(results)

def test_google_oauth():
    """Document Google OAuth flow (cannot test without valid Google token)"""
    print_test_header("Google OAuth Authentication")
    
    print_info("Google OAuth requires a valid Google ID token from client-side authentication")
    print_info("Endpoint: POST /api/auth/google")
    print_info("Expected request body: {'id_token': 'valid_google_id_token'}")
    print_info("Expected response: {'access_token': 'jwt_token', 'token_type': 'bearer', 'user': {...}}")
    
    # Test with invalid token to verify error handling
    try:
        invalid_token_data = {"id_token": "invalid_token_123"}
        response = requests.post(f"{BACKEND_URL}/auth/google", json=invalid_token_data)
        
        if response.status_code == 400 or response.status_code == 500:
            print_success("Invalid token correctly rejected")
            return True
        else:
            print_warning(f"Unexpected response for invalid token - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"OAuth test error: {str(e)}")
        return False

def create_test_jwt_token():
    """Create a test JWT token for protected endpoint testing"""
    print_test_header("Creating Test JWT Token")
    
    try:
        import jwt
        from datetime import datetime, timedelta
        
        # Use the same secret as the backend
        JWT_SECRET = "health-companion-secret-key-2025"
        JWT_ALGORITHM = "HS256"
        
        # Create test user data
        payload = {
            "sub": TEST_USER_ID,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        global TEST_JWT_TOKEN
        TEST_JWT_TOKEN = token
        
        print_success(f"Test JWT token created for user ID: {TEST_USER_ID}")
        print_info(f"Token: {token[:50]}...")
        return True
        
    except ImportError:
        print_error("PyJWT library not available - installing...")
        os.system("pip install PyJWT")
        return create_test_jwt_token()
    except Exception as e:
        print_error(f"JWT token creation error: {str(e)}")
        return False

def create_test_user_in_db():
    """Create a test user directly in MongoDB for testing"""
    print_test_header("Creating Test User in Database")
    
    try:
        from pymongo import MongoClient
        
        client = MongoClient("mongodb://localhost:27017")
        db = client["health_companion_db"]
        
        # Check if test user already exists
        existing_user = db.users.find_one({"id": TEST_USER_ID})
        if existing_user:
            print_info("Test user already exists in database")
            return True
        
        # Create test user
        test_user = {
            "id": TEST_USER_ID,
            "name": "Test User",
            "email": "testuser@example.com",
            "avatar": "https://example.com/avatar.jpg",
            "created_at": datetime.utcnow(),
            "last_active": datetime.utcnow()
        }
        
        result = db.users.insert_one(test_user)
        print_success(f"Test user created in database with ID: {result.inserted_id}")
        return True
        
    except ImportError:
        print_error("PyMongo library not available - installing...")
        os.system("pip install pymongo")
        return create_test_user_in_db()
    except Exception as e:
        print_error(f"Database user creation error: {str(e)}")
        return False

def test_protected_endpoint(method, endpoint, data=None, expected_status=200):
    """Helper function to test protected endpoints"""
    headers = {"Authorization": f"Bearer {TEST_JWT_TOKEN}"}
    
    try:
        if method.upper() == "GET":
            response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers)
        elif method.upper() == "POST":
            response = requests.post(f"{BACKEND_URL}{endpoint}", json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(f"{BACKEND_URL}{endpoint}", json=data, headers=headers)
        else:
            print_error(f"Unsupported method: {method}")
            return False
        
        if response.status_code == expected_status:
            print_success(f"{method} {endpoint} - Status: {response.status_code}")
            return True, response.json() if response.content else {}
        else:
            print_error(f"{method} {endpoint} failed - Status: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, {}
            
    except Exception as e:
        print_error(f"{method} {endpoint} error: {str(e)}")
        return False, {}

def test_ai_symptom_checker():
    """Test AI symptom checker endpoint"""
    print_test_header("AI Symptom Checker")
    
    test_messages = [
        "I have a headache and feel tired",
        "I've been coughing for 2 days",
        "I feel nauseous after eating"
    ]
    
    results = []
    
    for message in test_messages:
        print_info(f"Testing symptom: '{message}'")
        
        data = {"message": message}
        success, response_data = test_protected_endpoint("POST", "/chat/symptom-check", data)
        
        if success:
            print_info(f"  AI Response: {response_data.get('response', 'N/A')[:100]}...")
            print_info(f"  Session ID: {response_data.get('session_id', 'N/A')}")
            print_info(f"  Detected Symptom: {response_data.get('symptom', 'None')}")
        
        results.append(success)
    
    return all(results)

def test_chat_history():
    """Test chat history endpoints"""
    print_test_header("Chat History Management")
    
    # First, create a chat session by sending a message
    data = {"message": "Test message for history"}
    success, response_data = test_protected_endpoint("POST", "/chat/symptom-check", data)
    
    if not success:
        print_error("Failed to create chat session for history testing")
        return False
    
    session_id = response_data.get('session_id')
    if not session_id:
        print_error("No session ID returned from chat")
        return False
    
    # Test getting chat history
    success1, _ = test_protected_endpoint("GET", f"/chat/history/{session_id}")
    
    # Test getting chat sessions list
    success2, sessions_data = test_protected_endpoint("GET", "/chat/sessions")
    
    if success2:
        sessions = sessions_data.get('sessions', [])
        print_info(f"Found {len(sessions)} chat sessions")
    
    return success1 and success2

def test_activity_tracker():
    """Test activity tracker endpoints"""
    print_test_header("Activity Tracker")
    
    # Test creating activities
    test_activities = [
        {"type": "walk", "duration": 30, "distance": 2.5, "notes": "Morning walk in the park"},
        {"type": "run", "duration": 45, "distance": 5.0, "notes": "Evening jog"},
        {"type": "cycle", "duration": 60, "distance": 15.0, "notes": "Weekend bike ride"}
    ]
    
    created_activities = []
    
    for activity_data in test_activities:
        print_info(f"Creating {activity_data['type']} activity")
        success, response_data = test_protected_endpoint("POST", "/activity", activity_data)
        
        if success:
            created_activities.append(response_data)
            print_info(f"  Activity ID: {response_data.get('id', 'N/A')}")
        else:
            return False
    
    # Test getting activities list
    success, activities_data = test_protected_endpoint("GET", "/activity")
    if success:
        activities = activities_data if isinstance(activities_data, list) else []
        print_info(f"Retrieved {len(activities)} activities")
    else:
        return False
    
    # Test getting activity stats
    success, stats_data = test_protected_endpoint("GET", "/activity/stats")
    if success:
        print_info(f"Total activities: {stats_data.get('total_activities', 0)}")
        print_info(f"Total duration: {stats_data.get('total_duration', 0)} minutes")
        print_info(f"Total distance: {stats_data.get('total_distance', 0)} km")
    
    return success

def test_user_profile():
    """Test user profile endpoints"""
    print_test_header("User Profile Management")
    
    # Test getting user profile
    success1, profile_data = test_protected_endpoint("GET", "/user/profile")
    
    if success1:
        print_info(f"User name: {profile_data.get('name', 'N/A')}")
        print_info(f"User email: {profile_data.get('email', 'N/A')}")
    
    # Test updating user profile
    update_data = {"name": "Updated Test User"}
    success2, _ = test_protected_endpoint("PUT", "/user/profile", update_data)
    
    return success1 and success2

def test_health_summary():
    """Test health summary endpoint"""
    print_test_header("Health Summary")
    
    success, summary_data = test_protected_endpoint("GET", "/user/health-summary")
    
    if success:
        print_info(f"Total activities: {summary_data.get('total_activities', 0)}")
        print_info(f"Total chats: {summary_data.get('total_chats', 0)}")
        
        last_activity = summary_data.get('last_activity')
        if last_activity:
            print_info(f"Last activity: {last_activity.get('type', 'N/A')} for {last_activity.get('duration', 0)} minutes")
    
    return success

def cleanup_test_data():
    """Clean up test data from database"""
    print_test_header("Cleaning Up Test Data")
    
    try:
        from pymongo import MongoClient
        
        client = MongoClient("mongodb://localhost:27017")
        db = client["health_companion_db"]
        
        # Remove test user and related data
        db.users.delete_many({"id": TEST_USER_ID})
        db.activities.delete_many({"user_id": TEST_USER_ID})
        db.chats.delete_many({"user_id": TEST_USER_ID})
        
        print_success("Test data cleaned up successfully")
        return True
        
    except Exception as e:
        print_error(f"Cleanup error: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("AI HEALTH COMPANION - BACKEND API TESTING SUITE")
    print("=" * 80)
    print(f"{Colors.ENDC}")
    
    test_results = {}
    
    # Test public endpoints
    test_results["Root Endpoint"] = test_root_endpoint()
    test_results["Weather API"] = test_weather_endpoint()
    test_results["Google OAuth"] = test_google_oauth()
    
    # Setup for protected endpoint testing
    jwt_created = create_test_jwt_token()
    user_created = create_test_user_in_db()
    
    if jwt_created and user_created:
        # Test protected endpoints
        test_results["AI Symptom Checker"] = test_ai_symptom_checker()
        test_results["Chat History"] = test_chat_history()
        test_results["Activity Tracker"] = test_activity_tracker()
        test_results["User Profile"] = test_user_profile()
        test_results["Health Summary"] = test_health_summary()
        
        # Cleanup
        cleanup_test_data()
    else:
        print_error("Failed to setup test environment for protected endpoints")
    
    # Print final results
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}FINAL TEST RESULTS{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        if result:
            print_success(f"{test_name}: PASSED")
            passed += 1
        else:
            print_error(f"{test_name}: FAILED")
    
    print(f"\n{Colors.BOLD}Overall Result: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print_success("🎉 All backend tests passed!")
        return True
    else:
        print_error(f"❌ {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)