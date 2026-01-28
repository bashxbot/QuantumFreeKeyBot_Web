require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { ref, get, set, push, update } = require('firebase/database');
const { initializeFirebase } = require('./config/firebase');
const { handleStart, handleReferUsers, handleProfile, handleClaimKey, handleStats, handleHelp } = require('./handlers/userHandler');
const { showStatistics } = require('./handlers/adminHandler');
const { handleCallback, handleAdminTextInput } = require('./handlers/callbackHandler');
const { isAdmin } = require('./utils/helpers');
const { adminPanel } = require('./utils/keyboards');

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set!');
  process.exit(1);
}

if (!process.env.FIREBASE_DATABASE_URL) {
  console.error('❌ FIREBASE_DATABASE_URL is not set!');
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const db = initializeFirebase();

global.bot = bot;
global.db = db;

// Express server for admin panel
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// API endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'telegram-bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API endpoint for Firebase config (used by frontend)
app.get('/api/config', (req, res) => {
  res.json({ 
    firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL
  });
});

// API endpoint for admin login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password, username } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password required' });
    }

    // Check if logging in as a sub-admin with username
    if (username) {
      const adminsRef = ref(db, 'webAdmins');
      const adminsSnapshot = await get(adminsRef);
      
      if (adminsSnapshot.exists()) {
        const admins = adminsSnapshot.val();
        for (const adminId in admins) {
          const admin = admins[adminId];
          if (admin.username === username && admin.isActive) {
            const isMatch = await bcrypt.compare(password, admin.passwordHash);
            if (isMatch) {
              return res.json({ 
                success: true, 
                adminId,
                username: admin.username,
                isDefaultAdmin: false 
              });
            }
          }
        }
      }
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // Default admin login (no username)
    const adminPasswordRef = ref(db, 'settings/adminPasswordHash');
    const adminPasswordSnapshot = await get(adminPasswordRef);
    const adminPasswordHash = adminPasswordSnapshot.val();

    if (!adminPasswordHash) {
      return res.status(500).json({ success: false, error: 'Admin password not configured' });
    }

    const isMatch = await bcrypt.compare(password, adminPasswordHash);
    
    if (isMatch) {
      res.json({ success: true, isDefaultAdmin: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to set default admin password
app.post('/api/auth/setup', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const adminPasswordRef = ref(db, 'settings/adminPasswordHash');
    const adminPasswordSnapshot = await get(adminPasswordRef);
    
    if (adminPasswordSnapshot.exists()) {
      return res.status(400).json({ success: false, error: 'Admin password already configured. Use change password instead.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await set(adminPasswordRef, hashedPassword);
    
    res.json({ success: true, message: 'Admin password set successfully' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to change default admin password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const adminPasswordRef = ref(db, 'settings/adminPasswordHash');
    const adminPasswordSnapshot = await get(adminPasswordRef);
    const currentHash = adminPasswordSnapshot.val();

    if (currentHash) {
      const isMatch = await bcrypt.compare(currentPassword, currentHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await set(adminPasswordRef, hashedPassword);
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to get all web admins
app.get('/api/admins', async (req, res) => {
  try {
    const adminsRef = ref(db, 'webAdmins');
    const adminsSnapshot = await get(adminsRef);
    
    const admins = [];
    if (adminsSnapshot.exists()) {
      const data = adminsSnapshot.val();
      for (const adminId in data) {
        const admin = data[adminId];
        admins.push({
          id: adminId,
          username: admin.username,
          name: admin.name || admin.username,
          isActive: admin.isActive !== false,
          createdAt: admin.createdAt,
          lastLogin: admin.lastLogin
        });
      }
    }
    
    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// API endpoint to add new web admin
app.post('/api/admins', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const adminsRef = ref(db, 'webAdmins');
    const adminsSnapshot = await get(adminsRef);
    
    if (adminsSnapshot.exists()) {
      const admins = adminsSnapshot.val();
      for (const adminId in admins) {
        if (admins[adminId].username === username) {
          return res.status(400).json({ success: false, error: 'Username already exists' });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdminRef = push(adminsRef);
    
    await set(newAdminRef, {
      username,
      name: name || username,
      passwordHash: hashedPassword,
      isActive: true,
      createdAt: Date.now()
    });
    
    res.json({ 
      success: true, 
      admin: {
        id: newAdminRef.key,
        username,
        name: name || username,
        isActive: true,
        createdAt: Date.now()
      }
    });
  } catch (error) {
    console.error('Add admin error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to update web admin
app.put('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, isActive } = req.body;
    
    const adminRef = ref(db, `webAdmins/${id}`);
    const adminSnapshot = await get(adminRef);
    
    if (!adminSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password && password.length >= 6) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }
    
    await update(adminRef, updates);
    
    res.json({ success: true, message: 'Admin updated successfully' });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to delete web admin
app.delete('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const adminRef = ref(db, `webAdmins/${id}`);
    const adminSnapshot = await get(adminRef);
    
    if (!adminSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    await set(adminRef, null);
    
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint for sub-admin login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const adminsRef = ref(db, 'webAdmins');
    const adminsSnapshot = await get(adminsRef);
    
    if (adminsSnapshot.exists()) {
      const admins = adminsSnapshot.val();
      for (const adminId in admins) {
        const admin = admins[adminId];
        if (admin.username === username && admin.isActive !== false) {
          const isMatch = await bcrypt.compare(password, admin.passwordHash);
          if (isMatch) {
            await update(ref(db, `webAdmins/${adminId}`), { lastLogin: Date.now() });
            return res.json({ 
              success: true, 
              adminId,
              username: admin.username,
              isDefaultAdmin: false 
            });
          }
        }
      }
    }
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// API endpoint to check if default admin password is set
app.get('/api/auth/status', async (req, res) => {
  try {
    const adminPasswordRef = ref(db, 'settings/adminPasswordHash');
    const adminPasswordSnapshot = await get(adminPasswordRef);
    
    res.json({ 
      isConfigured: adminPasswordSnapshot.exists(),
      hasDefaultAdmin: adminPasswordSnapshot.exists()
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint for weekly statistics
app.get('/api/statistics/weekly', async (req, res) => {
  try {
    const usersRef = ref(db, 'users');
    const keysRef = ref(db, 'keys');
    const statsRef = ref(db, 'statistics');
    
    const [usersSnapshot, keysSnapshot, statsSnapshot] = await Promise.all([
      get(usersRef),
      get(keysRef),
      get(statsRef)
    ]);
    
    const now = Date.now();
    const oneDay = 86400000;
    
    const weeklyData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i * oneDay);
      const dayEnd = dayStart + oneDay;
      
      let usersCount = 0;
      let keysCount = 0;
      let referralsCount = 0;
      
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        for (const userId in users) {
          const user = users[userId];
          if (user.joinedAt >= dayStart && user.joinedAt < dayEnd) {
            usersCount++;
          }
          if (user.referredBy && user.joinedAt >= dayStart && user.joinedAt < dayEnd) {
            referralsCount++;
          }
        }
      }
      
      if (keysSnapshot.exists()) {
        const keys = keysSnapshot.val();
        for (const keyId in keys) {
          const key = keys[keyId];
          if (key.claimedAt >= dayStart && key.claimedAt < dayEnd) {
            keysCount++;
          }
        }
      }
      
      const date = new Date(dayStart);
      weeklyData.push({
        name: days[date.getDay()],
        users: usersCount,
        keys: keysCount,
        referrals: referralsCount
      });
    }
    
    res.json(weeklyData);
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    res.status(500).json({ error: 'Failed to fetch weekly statistics' });
  }
});

// API endpoint for recent activity
app.get('/api/statistics/recent-activity', async (req, res) => {
  try {
    const usersRef = ref(db, 'users');
    const keysRef = ref(db, 'keys');
    
    const [usersSnapshot, keysSnapshot] = await Promise.all([
      get(usersRef),
      get(keysRef)
    ]);
    
    const activities = [];
    const now = Date.now();
    
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      for (const userId in users) {
        const user = users[userId];
        
        if (user.joinedAt) {
          activities.push({
            id: `user_${userId}_join`,
            type: 'user_join',
            message: `New user joined: ${user.username ? '@' + user.username : user.name}`,
            time: user.joinedAt
          });
        }
        
        if (user.vipTier && user.vipUpgradedAt) {
          activities.push({
            id: `user_${userId}_vip`,
            type: 'vip',
            message: `${user.username ? '@' + user.username : user.name} upgraded to ${user.vipTier} VIP`,
            time: user.vipUpgradedAt
          });
        }
        
        if (user.referredBy && user.joinedAt) {
          activities.push({
            id: `user_${userId}_referral`,
            type: 'referral',
            message: `New referral: ${user.username ? '@' + user.username : user.name} (+${user.referralReward || 1} points)`,
            time: user.joinedAt
          });
        }
      }
    }
    
    if (keysSnapshot.exists()) {
      const keys = keysSnapshot.val();
      for (const keyId in keys) {
        const key = keys[keyId];
        if (key.claimed && key.claimedAt) {
          activities.push({
            id: `key_${keyId}_claim`,
            type: 'key_claim',
            message: `Key claimed for ${key.gameName} (${key.duration} days)`,
            time: key.claimedAt
          });
        }
        if (key.addedAt && !key.claimed) {
          activities.push({
            id: `key_${keyId}_add`,
            type: 'key_add',
            message: `Admin added key for ${key.gameName}`,
            time: key.addedAt
          });
        }
      }
    }
    
    activities.sort((a, b) => b.time - a.time);
    
    const recentActivities = activities.slice(0, 10).map(activity => {
      const timeDiff = now - activity.time;
      let timeText = '';
      
      if (timeDiff < 60000) {
        timeText = 'just now';
      } else if (timeDiff < 3600000) {
        const mins = Math.floor(timeDiff / 60000);
        timeText = `${mins} min${mins > 1 ? 's' : ''} ago`;
      } else if (timeDiff < 86400000) {
        const hours = Math.floor(timeDiff / 3600000);
        timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(timeDiff / 86400000);
        timeText = `${days} day${days > 1 ? 's' : ''} ago`;
      }
      
      return {
        id: activity.id,
        type: activity.type,
        message: activity.message,
        time: timeText
      };
    });
    
    res.json(recentActivities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// API endpoint for top games
app.get('/api/statistics/top-games', async (req, res) => {
  try {
    const gamesRef = ref(db, 'games');
    const keysRef = ref(db, 'keys');
    
    const [gamesSnapshot, keysSnapshot] = await Promise.all([
      get(gamesRef),
      get(keysRef)
    ]);
    
    const gameClaims = {};
    
    if (keysSnapshot.exists()) {
      const keys = keysSnapshot.val();
      for (const keyId in keys) {
        const key = keys[keyId];
        if (key.claimed && key.gameName) {
          gameClaims[key.gameName] = (gameClaims[key.gameName] || 0) + 1;
        }
      }
    }
    
    const topGames = Object.entries(gameClaims)
      .map(([name, keys]) => ({ name, keys }))
      .sort((a, b) => b.keys - a.keys)
      .slice(0, 5);
    
    res.json(topGames);
  } catch (error) {
    console.error('Error fetching top games:', error);
    res.status(500).json({ error: 'Failed to fetch top games' });
  }
});

// Active broadcasts tracking
const activeBroadcasts = new Map();

// API endpoint to send broadcast
app.post('/api/broadcast', async (req, res) => {
  try {
    const { broadcastId, message, target } = req.body;
    
    if (!broadcastId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      return res.status(404).json({ error: 'No users found' });
    }
    
    const users = [];
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    
    usersSnapshot.forEach((child) => {
      const userData = child.val();
      const userId = child.key;
      
      if (target === 'All Users' || target === 'all') {
        users.push(userId);
      } else if ((target === 'Active Users' || target === 'active') && userData.lastActive && userData.lastActive > oneDayAgo) {
        users.push(userId);
      } else if ((target === 'VIP Users' || target === 'vip') && userData.vipTier) {
        users.push(userId);
      }
    });
    
    activeBroadcasts.set(broadcastId, { cancelled: false });
    
    res.json({ status: 'started', totalUsers: users.length });
    
    // Send broadcasts in background
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    
    for (const userId of users) {
      if (activeBroadcasts.get(broadcastId)?.cancelled) {
        await update(ref(db, `broadcasts/${broadcastId}`), {
          status: 'cancelled',
          sent,
          delivered,
          failed
        });
        activeBroadcasts.delete(broadcastId);
        return;
      }
      
      try {
        await bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
        delivered++;
      } catch (error) {
        if (error.response && error.response.body.error_code === 403) {
          // User blocked the bot - mark them as blocked
          await update(ref(db, `users/${userId}`), { 
            isBlocked: true,
            blockedAt: Date.now()
          });
          console.log(`User ${userId} has blocked the bot`);
        }
        failed++;
      }
      sent++;
      
      // Update progress every 10 messages
      if (sent % 10 === 0 || sent === users.length) {
        await update(ref(db, `broadcasts/${broadcastId}`), {
          sent,
          delivered,
          failed,
          status: sent === users.length ? 'completed' : 'sending'
        });
      }
      
      // Rate limiting - wait 50ms between messages
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await update(ref(db, `broadcasts/${broadcastId}`), {
      status: 'completed',
      sent,
      delivered,
      failed,
      completedAt: Date.now()
    });
    
    activeBroadcasts.delete(broadcastId);
    
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

// API endpoint to cancel broadcast
app.post('/api/broadcast/cancel', async (req, res) => {
  try {
    const { broadcastId } = req.body;
    
    if (activeBroadcasts.has(broadcastId)) {
      activeBroadcasts.set(broadcastId, { cancelled: true });
      res.json({ status: 'cancelling' });
    } else {
      res.status(404).json({ error: 'Broadcast not found or already completed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel broadcast' });
  }
});

// All other GET routes serve the React app (but not API routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start Express server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🌐 Express API server running on ${HOST}:${PORT}`);
  console.log(`📱 Admin Panel: http://${HOST}:${PORT}`);
});

console.log('🤖 Bot started successfully!');

// Start notification service for expiring keys
const { startNotificationService } = require('./utils/notifications');
startNotificationService();

const initializeDefaultSettings = async () => {
  try {
    const settingsRef = ref(db, 'settings');
    const snapshot = await get(settingsRef);

    if (!snapshot.exists()) {
      await set(ref(db, 'settings/requiredChannel'), '@QuantumBox');
      await set(ref(db, 'settings/referralReward'), 1);
      await set(ref(db, 'settings/pointsConfig'), {
        '1day': 3,
        '3days': 6,
        '7days': 10,
        '15days': 15,
        '30days': 20
      });

      console.log('✅ Default settings created');
    }

    const adminPasswordRef = ref(db, 'settings/adminPasswordHash');
    const adminPasswordSnapshot = await get(adminPasswordRef);
    
    if (!adminPasswordSnapshot.exists()) {
      const defaultPassword = 'QuantX@Admin2025';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await set(adminPasswordRef, hashedPassword);
      console.log('✅ Default admin password set: QuantX@Admin2025');
    }
  } catch (error) {
    console.error('Error initializing default settings:', error);
  }
};

initializeDefaultSettings();

bot.onText(/\/start(.*)/, async (msg, match) => {
  await handleStart(msg, match);
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    await bot.sendMessage(chatId, '❌ You do not have admin permissions.');
    return;
  }
  
  await bot.sendMessage(chatId, '🔐 *Admin Panel*\n\nChoose an option:', {
    parse_mode: 'Markdown',
    ...adminPanel
  });
});

bot.on('my_chat_member', async (update) => {
  try {
    const chat = update.chat;
    const newStatus = update.new_chat_member.status;
    const oldStatus = update.old_chat_member.status;
    const userId = update.from.id;

    // Bot was added to a channel or group
    if ((newStatus === 'member' || newStatus === 'administrator') && (oldStatus === 'left' || oldStatus === 'kicked')) {
      if (chat.type === 'channel') {
        const channelRef = ref(global.db, `channels/${chat.id}`);
        await set(channelRef, {
          chatId: chat.id.toString(),
          name: chat.title,
          username: chat.username || '',
          addedAt: Date.now(),
          addedBy: userId.toString()
        });

        const statsRef = ref(global.db, 'statistics/totalChannelsAdded');
        const statsSnapshot = await get(statsRef);
        await set(statsRef, (statsSnapshot.val() || 0) + 1);
      } else if (chat.type === 'group' || chat.type === 'supergroup') {
        const groupRef = ref(global.db, `groups/${chat.id}`);
        await set(groupRef, {
          chatId: chat.id.toString(),
          name: chat.title,
          addedAt: Date.now(),
          addedBy: userId.toString()
        });

        const statsRef = ref(global.db, 'statistics/totalGroupsAdded');
        const statsSnapshot = await get(statsRef);
        await set(statsRef, (statsSnapshot.val() || 0) + 1);
      }
    }

    // Bot was removed from a channel or group
    if ((newStatus === 'left' || newStatus === 'kicked') && (oldStatus === 'member' || oldStatus === 'administrator')) {
      if (chat.type === 'channel') {
        await update(ref(global.db, `channels/${chat.id}`), null);

        const statsRef = ref(global.db, 'statistics/totalChannelsAdded');
        const statsSnapshot = await get(statsRef);
        await set(statsRef, Math.max(0, (statsSnapshot.val() || 0) - 1));
      } else if (chat.type === 'group' || chat.type === 'supergroup') {
        await update(ref(global.db, `groups/${chat.id}`), null);

        const statsRef = ref(global.db, 'statistics/totalGroupsAdded');
        const statsSnapshot = await get(statsRef);
        await set(statsRef, Math.max(0, (statsSnapshot.val() || 0) - 1));
      }
    }
  } catch (error) {
    console.error('Error in my_chat_member handler:', error);
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text) return;

  // Check maintenance mode (admins bypass)
  if (!isAdmin(userId)) {
    const maintenanceRef = ref(db, 'settings/maintenanceMode');
    const maintenanceSnapshot = await get(maintenanceRef);
    if (maintenanceSnapshot.exists() && maintenanceSnapshot.val() === true) {
      await bot.sendMessage(chatId, 
        '🔧 *Bot Maintenance*\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '⚙️ We are currently performing scheduled maintenance to improve your experience.\n\n' +
        '⏰ The bot will be back online shortly.\n\n' +
        '💫 Thank you for your patience!\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '✨ _Stay tuned for exciting updates!_',
        { parse_mode: 'Markdown' }
      );
      return;
    }
  }

  const { activeSupportSessions } = require('./handlers/supportHandler');
  const isInSupportChat = activeSupportSessions.has(userId.toString()) || activeSupportSessions.has(`staff_${userId}`);

  if (isInSupportChat && text.startsWith('/') && text !== '/end') {
    const isStaff = activeSupportSessions.has(`staff_${userId}`);
    const message = isStaff 
      ? '⚠️ *Command Restricted*\n\nYou cannot use commands during an active support conversation.\n\n🛑 Please end the conversation first using /end command.'
      : '⚠️ *Command Restricted*\n\nYou cannot use commands during an active support conversation.\n\n💬 Please ask the staff member to end the conversation.';
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return;
  }

  if (isInSupportChat && text !== '/end') {
    const { handleSupportMessage } = require('./handlers/supportHandler');
    await handleSupportMessage(msg);
    return;
  }

  const adminHandled = await handleAdminTextInput(msg);
  if (adminHandled) return;

  // Check for admin search input (only if not already handled by adminHandled)
  if (isAdmin(userId)) {
    const adminStateRef = ref(global.db, `adminStates/${chatId}`);
    const adminStateSnapshot = await get(adminStateRef);
    if (adminStateSnapshot.exists() && adminStateSnapshot.val().action === 'searching_user') {
      const { searchUserByQuery } = require('./handlers/adminHandler');
      await searchUserByQuery(chatId, text);
      return;
    }
  }

  if (text.startsWith('/start')) {
    return;
  }

  if (text === '👤 My Profile') {
    await handleProfile(chatId, userId);
  }
  else if (text === '🔑 Claim Key') {
    await handleClaimKey(chatId, userId);
  }
  else if (text === '📊 My Stats') {
    await handleStats(chatId, userId);
  }
  else if (text === '🔗 Refer Users') {
    await handleReferUsers(chatId, userId);
  }
  else if (text === '🎁 Daily Reward') {
    const { handleDailyReward } = require('./handlers/userHandler');
    await handleDailyReward(chatId, userId);
  }
  else if (text === '🏆 Leaderboard') {
    const { handleLeaderboard } = require('./handlers/userHandler');
    await handleLeaderboard(chatId, userId);
  }
  else if (text === '📜 Key History') {
    const { handleKeyHistory } = require('./handlers/userHandler');
    await handleKeyHistory(chatId, userId);
  }
  else if (text === '❓ Help & Support') {
    await handleHelp(chatId, userId);
  }
  else {
    const { handleSupportMessage } = require('./handlers/supportHandler');
    const handled = await handleSupportMessage(msg);
    if (!handled) {
      return;
    }
  }
});

// Handle photo messages for broadcast
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) return;
  
  const { pendingActions } = require('./handlers/callbackHandler');
  const pending = pendingActions.get(userId);
  
  if (pending && pending.action === 'broadcast_photo') {
    const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
    const caption = msg.caption || '';
    
    pendingActions.set(userId, { 
      action: 'broadcast_target', 
      messageText: caption,
      photoFileId: photo.file_id
    });
    
    const { getBroadcastTargetKeyboard, backToAdmin } = require('./utils/keyboards');
    await bot.sendMessage(chatId, '✅ *Photo Received*\n\nChoose broadcast target:', {
      parse_mode: 'Markdown',
      ...getBroadcastTargetKeyboard()
    });
  }
});

bot.onText(/\/end/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const { activeSupportSessions, endSupportSession } = require('./handlers/supportHandler');
  
  if (!activeSupportSessions.has(`staff_${userId}`)) {
    if (activeSupportSessions.has(userId.toString())) {
      await bot.sendMessage(chatId, '⚠️ *Cannot End Conversation*\n\nOnly staff members can end support conversations.\n\n💬 Please wait for the staff member to resolve your issue.', {
        parse_mode: 'Markdown'
      });
    } else {
      await bot.sendMessage(chatId, '❌ You are not in an active support conversation.');
    }
    return;
  }

  await endSupportSession(userId);
});

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  
  // Check maintenance mode (admins bypass)
  if (!isAdmin(userId)) {
    const maintenanceRef = ref(db, 'settings/maintenanceMode');
    const maintenanceSnapshot = await get(maintenanceRef);
    if (maintenanceSnapshot.exists() && maintenanceSnapshot.val() === true) {
      await bot.answerCallbackQuery(query.id, {
        text: '🔧 Bot is under maintenance. Please try again later.',
        show_alert: true
      });
      return;
    }
  }
  
  await handleCallback(query);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});