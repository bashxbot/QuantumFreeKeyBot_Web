# Telegram Key Distribution Bot - Deployment Guide

## Quick Start for New Project

### 1. Create a New Replit Project
- Fork or import this repository to Replit
- Or create new project and copy the code

### 2. Environment Variables
Set these in your `.env` file or Replit Secrets:
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
FIREBASE_DATABASE_URL=your_firebase_rtdb_url
ADMIN_IDS=admin_user_id1,admin_user_id2
```

### 3. Get Required Credentials

**Telegram Bot Token:**
- Message @BotFather on Telegram
- Create new bot
- Copy the token

**Firebase Database:**
- Go to https://console.firebase.google.com
- Create new project
- Enable Realtime Database
- Get database URL (format: https://project-id-default-rtdb.region.firebasedatabase.app)

### 4. Install & Run
```bash
npm install
npm start
```

### 5. Deploy to Pella Hosting
1. Push code to GitHub
2. Go to pella.io
3. Create new project
4. Connect your GitHub repository
5. Add environment variables
6. Deploy!

## Project Structure
```
├── index.js                 # Main entry point
├── config/firebase.js       # Firebase config
├── handlers/
│   ├── userHandler.js       # User features
│   ├── adminHandler.js      # Admin panel & user management
│   ├── callbackHandler.js   # Button callbacks
│   └── supportHandler.js    # Support system
├── utils/
│   ├── buttonConfig.js      # Centralized button routing
│   ├── keyboards.js         # Telegram keyboards
│   ├── helpers.js           # Utility functions
│   └── notifications.js     # Key expiration alerts
└── package.json
```

## Features

### User Features
- Channel verification
- Key claiming with durations (1-30 days)
- Referral system with VIP multipliers
- Daily rewards
- Leaderboards
- Help & Support system
- Key history tracking

### Admin Features
- User search with full profile view
- Add/Deduct points
- VIP membership management
- Ban/Unban users
- Key management
- Game management
- Broadcast messages
- Statistics dashboard

## New in This Version
✨ **User Management System**
- Direct user search (by username or ID)
- Full user profile with details
- One-click user management buttons
- Clean interface with proper message editing

## Support
For issues, check the logs or contact support.
