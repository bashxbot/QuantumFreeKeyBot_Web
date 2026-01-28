# Telegram Key Distribution Bot

## Overview
A Telegram bot for distributing time-based keys with a referral system, admin panel, and Firebase RTDB integration.

## Technology Stack
- **Runtime**: Node.js 20
- **Bot Framework**: node-telegram-bot-api (polling-based)
- **Database**: Firebase Realtime Database
- **Environment**: dotenv

## Project Structure
```
├── index.js                 # Main bot entry point
├── config/
│   └── firebase.js          # Firebase initialization
├── handlers/
│   ├── userHandler.js       # User command handlers
│   ├── adminHandler.js      # Admin panel handlers
│   ├── callbackHandler.js   # Button callback handlers
│   └── supportHandler.js    # Support system handlers
├── utils/
│   ├── keyboards.js         # Telegram keyboard layouts
│   ├── buttonConfig.js      # Centralized inline button handling
│   ├── helpers.js           # Utility functions
│   └── notifications.js     # Key expiration notifications
├── client/                  # Web Admin Panel (React TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Reusable UI components (GlassCard, StatCard, DataTable, etc.)
│   │   │   └── layout/      # Layout components (Sidebar, TopBar, Layout)
│   │   ├── pages/           # Page components (Dashboard, Keys, Users, Games, etc.)
│   │   ├── lib/             # Utilities and types
│   │   ├── App.tsx          # Main app with routing
│   │   └── main.tsx         # Entry point
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   └── tsconfig.json        # TypeScript configuration
└── package.json
```

## Web Admin Panel
A beautiful dark glassmorphism admin panel built with React TypeScript.

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS with custom glassmorphism theme
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM

### Design Features
- Pure black backgrounds with animated gradient orbs
- Glassmorphism cards with backdrop blur and subtle borders
- Cyan/blue gradient accents
- Smooth micro-interactions and transitions
- Collapsible sidebar navigation
- Responsive design

### Pages
1. **Dashboard** - Stats overview, 7-day growth chart, recent activity
2. **Key Management** - Add/view/search keys, filters, export
3. **User Management** - User list, VIP tiers, points management, ban/unban
4. **Game Management** - Game cards, key statistics, add/edit games
5. **Broadcast** - Target selection, message composer, delivery tracking
6. **Settings** - Bot configuration toggles and dropdowns
7. **Staff & Support** - Staff management, live chat interface

### Running the Admin Panel
```bash
cd client && npm run dev
```
Runs on port 5000

## Environment Variables Required
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `FIREBASE_DATABASE_URL` - Firebase RTDB URL (https://tgbot-7f330-default-rtdb.asia-southeast1.firebasedatabase.app)
- `ADMIN_IDS` - Comma-separated Telegram user IDs for admin access

## Features
### User Features
- Channel membership verification (@QuantXBox)
- Referral system with VIP multipliers (1x/1.5x/2x on rewards and referrals)
- Key claiming with duration options (1, 3, 7, 15, 30 days)
- Profile and statistics viewing
- Daily rewards with VIP multiplier bonus
- Leaderboards (by referrals, points earned, keys claimed)
- Help & Support system with staff assistance
- Key history and expiration tracking

### Admin Features
- Key management (add, view, remove, search)
- User management (search, view, add/deduct points, ban/unban)
- Game management (add, remove, view)
- Staff member management
- VIP membership management and multiplier configuration
- Statistics overview (users, keys, channels)
- Broadcast messages to all users
- Settings control (claiming enabled/disabled, point costs)

## Key Costs
- 1 Day: 3 points
- 3 Days: 6 points
- 7 Days: 10 points
- 15 Days: 15 points
- 30 Days: 20 points

## Architecture Notes
- **Centralized Button Handling**: All inline button callbacks are processed through `buttonConfig.js` via the `executeButtonAction` function. This ensures consistent message editing behavior across all interactive elements.
- **Message Handler Priority**: The message handler in `index.js` follows this priority:
  1. Support chat validation (prevents commands during support)
  2. Admin text input processing (for various admin commands)
  3. Admin search input handling (for user search functionality)
  4. Regular menu button text processing
  This ordering prevents interference between different handler types.
- **VIP System**: Users can have VIP status (0=No VIP, 1=Bronze, 2=Silver, 3=Gold) with corresponding multipliers applied to daily rewards and referral bonuses.

## Running the Bot
```bash
npm start
```

## Deployment
Currently deployed on Pella Hosting (free tier, 24/7 uptime, no credit card required):
- GitHub Repository: https://github.com/bashxbot/quantxbot
- Hosting: Pella Hosting

## Recent Changes
- **Dec 1, 2025 - Web Admin Panel**: Built a beautiful dark glassmorphism admin panel with React TypeScript, featuring Dashboard, Key Management, User Management, Game Management, Broadcast, Settings, and Staff & Support pages. Includes animated backgrounds, glass cards, and smooth micro-interactions.
- **Nov 30, 2025 - Message Handler Reorganization**: Fixed "All Users" button responsiveness by reordering message handler flow to prevent interference between callback queries and search input handling. Moved admin search state check after handleAdminTextInput to ensure proper priority.
- **Earlier - VIP System Implementation**: Added VIP membership with points multiplier (1x/1.5x/2x) applied to daily rewards and referral bonuses.
- **Initial implementation (Nov 2025)**: Created full bot with all core features, admin panel, Firebase integration, and deployment setup.
