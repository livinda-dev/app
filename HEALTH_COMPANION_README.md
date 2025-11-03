# AI Health Companion App 🏥

A complete AI-powered mobile health companion app built with React Native (Expo), FastAPI, and Google Gemini AI.

## 🎯 Features

### ✅ Core Features Implemented

1. **Google OAuth Authentication**
   - Seamless sign-in with Google
   - Secure JWT token-based authentication
   - Persistent login state

2. **AI Symptom Checker**
   - Chat with Google Gemini AI (gemini-2.0-flash model)
   - Safe, educational health guidance
   - Contextual conversation history
   - Non-diagnostic symptom analysis

3. **Activity Tracker**
   - Manual activity logging (Walk, Run, Cycle)
   - Track duration and distance
   - Weekly statistics dashboard
   - Activity history with visual cards

4. **Weather Integration**
   - Real-time weather data from weatherapi.com
   - Location-based weather alerts
   - Health tips based on weather conditions
   - Temperature, humidity, and conditions display

5. **Daily Notifications**
   - Configurable health reminders
   - Scheduled notifications at 9:00 AM
   - Permission management
   - Enable/disable from profile

6. **User Profile**
   - View personal information
   - Health activity summary
   - Settings management
   - Logout functionality

## 🛠️ Technology Stack

### Frontend (Mobile App)
- **React Native** with **Expo** (iOS & Android support)
- **Expo Router** for navigation
- **TypeScript** for type safety
- **React Native Gifted Chat** for chat UI
- **Axios** for API calls
- **AsyncStorage** for local data persistence
- **Expo Notifications** for push notifications
- **Zustand** for state management

### Backend (API)
- **FastAPI** (Python)
- **MongoDB** with Motor (async driver)
- **Google Gemini AI** (gemini-2.0-flash)
- **JWT** for authentication
- **Pydantic** for data validation

### External APIs
- Google OAuth 2.0
- Google Gemini AI API
- WeatherAPI.com

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application with all endpoints
│   ├── .env              # Environment variables
│   └── requirements.txt   # Python dependencies
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   └── login.tsx        # Google OAuth login screen
    │   ├── (tabs)/
    │   │   ├── _layout.tsx      # Tab navigation
    │   │   ├── home.tsx         # Dashboard with weather & summary
    │   │   ├── chat.tsx         # AI symptom checker chat
    │   │   ├── activity.tsx     # Activity tracker & logger
    │   │   └── profile.tsx      # User profile & settings
    │   ├── context/
    │   │   └── AuthContext.tsx  # Authentication state management
    │   ├── _layout.tsx          # Root layout
    │   └── index.tsx            # Entry point with routing
    ├── app.json              # Expo configuration
    └── package.json          # Dependencies
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth authentication

### AI Chat
- `POST /api/chat/symptom-check` - Send message to AI symptom checker
- `GET /api/chat/history/{session_id}` - Get chat history
- `GET /api/chat/sessions` - List all chat sessions

### Activity Tracking
- `POST /api/activity` - Log new activity
- `GET /api/activity` - Get activity history
- `GET /api/activity/stats` - Get activity statistics

### Weather
- `GET /api/weather?city={city}` - Get weather data with health alerts

### User Profile
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/health-summary` - Get health summary

## 🗄️ Database Schema

### Collections

**users**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "avatar": "string (url)",
  "created_at": "datetime",
  "last_active": "datetime"
}
```

**chats**
```json
{
  "session_id": "string",
  "user_id": "uuid",
  "messages": [
    {
      "role": "user|assistant",
      "content": "string",
      "timestamp": "datetime"
    }
  ],
  "created_at": "datetime"
}
```

**activities**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "walk|run|cycle",
  "duration": "integer (minutes)",
  "distance": "float (km)",
  "date": "datetime",
  "notes": "string"
}
```

## 🔐 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=health_companion_db
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_AI_API_KEY=your_google_ai_api_key
WEATHER_API_KEY=your_weather_api_key
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=your_backend_url
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI
- Google OAuth credentials
- Google AI API key
- Weather API key

### Installation

1. **Backend Setup**
```bash
cd /app/backend
pip install -r requirements.txt
python server.py
```

2. **Frontend Setup**
```bash
cd /app/frontend
yarn install
yarn start
```

## 📱 Mobile App Screens

### 1. Login Screen
- Beautiful welcome screen with feature highlights
- Google OAuth sign-in button
- Health disclaimer

### 2. Home Dashboard
- Weather card with health alerts
- Quick action buttons
- Health summary statistics
- Daily health tips
- Pull-to-refresh

### 3. AI Chat
- Conversation with AI health assistant
- Message bubbles with timestamps
- Loading indicator while AI responds
- Educational symptom guidance
- Safe, non-diagnostic responses

### 4. Activity Tracker
- Stats cards (minutes, distance, activities)
- Recent activities list with icons
- Add activity modal with type selection
- Duration, distance, and notes input
- Empty state with call-to-action

### 5. Profile
- User avatar and information
- Daily reminders toggle
- Settings menu
- About, privacy, and terms links
- Health disclaimer
- Logout button

## 🎨 Design System

### Colors
- Primary: `#4A90E2` (Blue)
- Success: `#27AE60` (Green)
- Danger: `#E74C3C` (Red)
- Warning: `#F39C12` (Orange)
- Background: `#F5F7FA` (Light Gray)
- Text Primary: `#2C3E50` (Dark)
- Text Secondary: `#7F8C8D` (Gray)

### Components
- Card shadows for depth
- Rounded corners (12-16px)
- Icon-driven navigation
- Consistent padding (16-24px)
- Touch-friendly targets (44-48px)

## 🔒 Security Features

- JWT token authentication
- Secure token storage with AsyncStorage
- Protected API endpoints
- OAuth 2.0 with Google
- Input validation with Pydantic
- CORS configuration

## ⚠️ Important Notes

### Medical Disclaimer
This app provides **general health information only**. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with any questions regarding medical conditions.

### AI Limitations
- The AI provides educational guidance only
- Not a diagnostic tool
- Always recommends consulting healthcare professionals
- Responses are general and not personalized medical advice

## 🧪 Testing

### Backend Testing
```bash
# Test root endpoint
curl http://localhost:8001/api/

# Test weather endpoint
curl "http://localhost:8001/api/weather?city=London"
```

### Frontend Testing
- Use Expo Go app on physical device
- Scan QR code from terminal
- Test all navigation flows
- Verify authentication
- Test chat functionality
- Log activities
- Check notifications

## 📊 Features Implementation Status

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Google OAuth | ✅ | ✅ | Complete |
| AI Chat | ✅ | ✅ | Complete |
| Activity Tracker | ✅ | ✅ | Complete |
| Weather Alerts | ✅ | ✅ | Complete |
| Notifications | ✅ | ✅ | Complete |
| User Profile | ✅ | ✅ | Complete |
| Chat History | ✅ | ✅ | Complete |

## 🎯 Next Steps / Enhancements

### Potential Features
1. Voice input for symptom description
2. Health metrics tracking (weight, blood pressure)
3. Medication reminders
4. Doctor appointment scheduling
5. Health record storage
6. Emergency contacts
7. Multi-language support
8. Dark mode
9. Fitness goals and challenges
10. Integration with wearable devices

### Technical Improvements
1. Offline mode with local storage
2. Push notifications for chat responses
3. Image upload for symptom documentation
4. Location-based doctor recommendations
5. Data export functionality
6. Analytics dashboard
7. Performance optimization
8. Automated testing suite
9. CI/CD pipeline
10. App store deployment

## 📝 API Keys Configuration

You have already provided:
- ✅ Google Client ID: `28823270577-kj9q4l1srv2tflmus990dj3t0g9k72o1.apps.googleusercontent.com`
- ✅ Google Client Secret: `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`
- ✅ Google AI API Key: `AIzaSyBbu4nGzrT3IjBDecqMxulVqNyPuDoKDvo`
- ✅ Weather API Key: `d4ff715a2dfb40b7a2d105056250211`

## 🐛 Troubleshooting

### Common Issues

1. **Login not working**
   - Check Google OAuth credentials
   - Verify redirect URIs in Google Console
   - Check backend logs for errors

2. **AI chat not responding**
   - Verify Google AI API key
   - Check backend logs
   - Ensure internet connection

3. **Weather not loading**
   - Verify Weather API key
   - Check city name spelling
   - Review API rate limits

4. **Notifications not showing**
   - Grant notification permissions
   - Check device notification settings
   - Verify time configuration

## 📞 Support

For issues or questions:
- Check backend logs: `sudo supervisorctl tail -f backend`
- Check frontend logs: `sudo supervisorctl tail -f expo`
- Review MongoDB collections
- Test API endpoints with curl

## 📄 License

This project is built for educational and demonstration purposes.

---

**Built with ❤️ for your wellness**
