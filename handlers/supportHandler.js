
const { ref, get, set, update, push } = require('firebase/database');
const { backToMenu, backToAdmin } = require('../utils/keyboards');
const { isAdmin } = require('../utils/helpers');

const activeSupportSessions = new Map();
const recentChatLogsCache = new Map(); // Maps adminId -> array of log objects

const showSupportMenu = async (chatId, userId) => {
  try {
    const sessionRef = ref(global.db, `supportSessions/${userId}`);
    const sessionSnapshot = await get(sessionRef);
    const activeSession = sessionSnapshot.exists() ? sessionSnapshot.val() : null;

    let message = '💬 *Support Center*\n\n';
    
    if (activeSession && activeSession.status === 'active') {
      message += '✅ You are currently connected with a staff member.\n\n';
      message += '📝 Send your messages below and our team will assist you.\n\n';
      message += '⚠️ The staff member will end the conversation when your issue is resolved.';
      
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
          ]
        }
      });
    } else if (activeSession && activeSession.status === 'pending') {
      message += '⏳ Your support request is pending.\n\n';
      message += '🔔 A staff member will connect with you shortly.\n\n';
      message += '⏱️ Please wait while we find an available agent.';
      
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
          ]
        }
      });
    } else {
      message += '👋 Need help? Connect with our support team!\n\n';
      message += '✨ Our staff members are here to assist you with:\n';
      message += '• Account issues\n';
      message += '• Key claiming problems\n';
      message += '• Technical support\n';
      message += '• General inquiries\n\n';
      message += '🚀 Click below to start a conversation!';
      
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎧 Connect with Support', callback_data: 'request_support' }],
            [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error in showSupportMenu:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading support menu.', backToMenu);
  }
};

const requestSupport = async (chatId, userId) => {
  try {
    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      await global.bot.sendMessage(chatId, '❌ Please use /start first.', backToMenu);
      return;
    }

    const sessionRef = ref(global.db, `supportSessions/${userId}`);
    const sessionSnapshot = await get(sessionRef);

    if (sessionSnapshot.exists() && sessionSnapshot.val().status !== 'completed') {
      await global.bot.sendMessage(chatId, '⚠️ You already have an active or pending support request.', backToMenu);
      return;
    }

    const requestId = Date.now().toString();
    await set(sessionRef, {
      userId: userId.toString(),
      userName: user.name,
      username: user.username || '',
      status: 'pending',
      requestedAt: Date.now(),
      staffId: null,
      staffName: null,
      requestId: requestId
    });

    await global.bot.sendMessage(chatId, 
      '✅ *Support Request Sent!*\n\n' +
      '🔔 Our support team has been notified.\n' +
      '⏱️ Please wait while we connect you with an available staff member.\n\n' +
      '💡 You will receive a notification when a staff member accepts your request.', {
      parse_mode: 'Markdown',
      ...backToMenu
    });

    const staffRef = ref(global.db, 'staff');
    const staffSnapshot = await get(staffRef);
    
    if (staffSnapshot.exists()) {
      const staffData = staffSnapshot.val();
      const notificationMessage = 
        '🔔 *New Support Request*\n\n' +
        `👤 User: ${user.name}${user.username ? ` (@${user.username})` : ''}\n` +
        `🆔 User ID: \`${userId}\`\n` +
        `⏰ Requested: Just now\n\n` +
        `💬 Click below to accept this request.`;

      for (const staffId in staffData) {
        if (staffData[staffId].isActive) {
          try {
            const enhancedMessage = 
              `🔔 *NEW SUPPORT REQUEST - ACTION REQUIRED*\n\n` +
              `╔════════════════════════════╗\n` +
              `║  USER DETAILS              ║\n` +
              `╚════════════════════════════╝\n\n` +
              `👤 *Name:* ${user.name}\n` +
              `🆔 *User ID:* \`${userId}\`\n` +
              `📱 *Username:* ${user.username ? `@${user.username}` : 'Not set'}\n` +
              `⏰ *Requested:* Just now\n` +
              `📊 *Balance:* ${user.balance || 0} points\n` +
              `👥 *Total Referrals:* ${user.totalReferrals || 0}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `💬 *ACTION REQUIRED:*\n` +
              `Click below to accept this support request and start helping this user!`;
            
            await global.bot.sendMessage(staffId, enhancedMessage, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ ACCEPT REQUEST', callback_data: `accept_support_${userId}_${requestId}` }],
                  [{ text: '📋 View Full Details', callback_data: `view_support_${userId}` }],
                  [{ text: '⏭️ Skip', callback_data: 'back_to_menu' }]
                ]
              }
            });
          } catch (e) {
            console.log(`Could not notify staff ${staffId}:`, e.message);
          }
        }
      }
    }

    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
    for (const adminId of adminIds) {
      if (adminId) {
        try {
          const enhancedMessage = 
            `🔔 *NEW SUPPORT REQUEST - ACTION REQUIRED*\n\n` +
            `╔════════════════════════════╗\n` +
            `║  USER DETAILS              ║\n` +
            `╚════════════════════════════╝\n\n` +
            `👤 *Name:* ${user.name}\n` +
            `🆔 *User ID:* \`${userId}\`\n` +
            `📱 *Username:* ${user.username ? `@${user.username}` : 'Not set'}\n` +
            `⏰ *Requested:* Just now\n` +
            `📊 *Balance:* ${user.balance || 0} points\n` +
            `👥 *Total Referrals:* ${user.totalReferrals || 0}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `💬 *ACTION REQUIRED:*\n` +
            `Click below to accept this support request and start helping this user!`;
          
          await global.bot.sendMessage(adminId, enhancedMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ ACCEPT REQUEST', callback_data: `accept_support_${userId}_${requestId}` }],
                [{ text: '📋 View Full Details', callback_data: `view_support_${userId}` }],
                [{ text: '⏭️ Skip', callback_data: 'back_to_menu' }]
              ]
            }
          });
        } catch (e) {
          console.log(`Could not notify admin ${adminId}:`, e.message);
        }
      }
    }

  } catch (error) {
    console.error('Error in requestSupport:', error);
    await global.bot.sendMessage(chatId, '❌ Error creating support request.', backToMenu);
  }
};

const acceptSupport = async (chatId, staffId, userId, requestId) => {
  try {
    const sessionRef = ref(global.db, `supportSessions/${userId}`);
    const sessionSnapshot = await get(sessionRef);

    if (!sessionSnapshot.exists() || sessionSnapshot.val().status !== 'pending' || sessionSnapshot.val().requestId !== requestId) {
      await global.bot.sendMessage(chatId, '❌ This support request is no longer available.', backToAdmin);
      return;
    }

    const staffRef = ref(global.db, `staff/${staffId}`);
    const staffSnapshot = await get(staffRef);
    const isStaff = staffSnapshot.exists();
    const staffName = isStaff ? staffSnapshot.val().name : 'Admin';

    await update(sessionRef, {
      status: 'active',
      staffId: staffId.toString(),
      staffName: staffName,
      acceptedAt: Date.now()
    });

    activeSupportSessions.set(userId.toString(), staffId.toString());
    activeSupportSessions.set(`staff_${staffId}`, userId.toString());

    const chatLogRef = push(ref(global.db, 'chatLogs'));
    await set(chatLogRef, {
      userId: userId.toString(),
      staffId: staffId.toString(),
      staffName: staffName,
      startedAt: Date.now(),
      endedAt: null,
      messages: []
    });

    await update(sessionRef, { chatLogId: chatLogRef.key });

    await global.bot.sendMessage(staffId, 
      `✅ *Support Request Accepted*\n\n` +
      `👤 You are now connected with User ID: \`${userId}\`\n\n` +
      `💬 All messages you send will be forwarded to the user.\n` +
      `🛑 Use /end to terminate this conversation.`, {
      parse_mode: 'Markdown'
    });

    await global.bot.sendMessage(userId, 
      `✨ *Connected with Support!*\n\n` +
      `🎧 ${staffName} is now assisting you.\n\n` +
      `📝 Please describe your issue below, and our team will help you.\n` +
      `💡 The conversation will be ended by the staff member once your issue is resolved.`, {
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Error in acceptSupport:', error);
    await global.bot.sendMessage(chatId, '❌ Error accepting support request.', backToAdmin);
  }
};

const endSupportSession = async (staffId) => {
  try {
    let userId = activeSupportSessions.get(`staff_${staffId}`);
    
    // If not in memory map, search Firebase for active session with this staff member
    if (!userId) {
      const sessionsRef = ref(global.db, 'supportSessions');
      const sessionsSnapshot = await get(sessionsRef);
      
      if (sessionsSnapshot.exists()) {
        const sessions = sessionsSnapshot.val();
        for (const uId in sessions) {
          if (sessions[uId].staffId === staffId.toString() && sessions[uId].status === 'active') {
            userId = uId;
            break;
          }
        }
      }
    }
    
    if (!userId) {
      await global.bot.sendMessage(staffId, '❌ You are not currently in a support conversation.');
      return;
    }

    const sessionRef = ref(global.db, `supportSessions/${userId}`);
    const sessionSnapshot = await get(sessionRef);
    const session = sessionSnapshot.val();

    await update(sessionRef, {
      status: 'completed',
      endedAt: Date.now()
    });

    if (session.chatLogId) {
      await update(ref(global.db, `chatLogs/${session.chatLogId}`), {
        endedAt: Date.now()
      });
    }

    activeSupportSessions.delete(userId);
    activeSupportSessions.delete(`staff_${staffId}`);

    await global.bot.sendMessage(staffId, 
      `✅ *Conversation Ended*\n\n` +
      `👋 You have successfully ended the support session with User ID: \`${userId}\`\n\n` +
      `📊 You can now accept new support requests.`, {
      parse_mode: 'Markdown'
    });

    await global.bot.sendMessage(userId, 
      `✅ *Support Session Ended*\n\n` +
      `👋 ${session.staffName} has ended the conversation.\n\n` +
      `💚 Thank you for contacting support!\n` +
      `🌟 If you need further assistance, feel free to request support again.`, {
      parse_mode: 'Markdown',
      ...backToMenu
    });

    await cleanupOldChatLogs();

  } catch (error) {
    console.error('Error in endSupportSession:', error);
    await global.bot.sendMessage(staffId, '❌ Error ending support session.');
  }
};

const cleanupOldChatLogs = async () => {
  try {
    const logsRef = ref(global.db, 'chatLogs');
    const logsSnapshot = await get(logsRef);

    if (!logsSnapshot.exists()) return;

    const logs = [];
    const logsData = logsSnapshot.val();
    
    for (const logId in logsData) {
      if (logsData[logId].endedAt) {
        logs.push({ id: logId, ...logsData[logId] });
      }
    }

    logs.sort((a, b) => b.endedAt - a.endedAt);

    if (logs.length > 10) {
      const toDelete = logs.slice(10);
      for (const log of toDelete) {
        await set(ref(global.db, `chatLogs/${log.id}`), null);
      }
    }
  } catch (error) {
    console.error('Error in cleanupOldChatLogs:', error);
  }
};

const handleSupportMessage = async (msg) => {
  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  const text = msg.text;

  // Don't forward /end command to users
  if (text === '/end') {
    return false;
  }

  const targetUserId = activeSupportSessions.get(userId);
  const staffId = activeSupportSessions.get(`staff_${userId}`);

  if (targetUserId) {
    const sessionRef = ref(global.db, `supportSessions/${targetUserId}`);
    const sessionSnapshot = await get(sessionRef);
    const session = sessionSnapshot.val();

    if (!session) {
      return false;
    }

    if (session && session.chatLogId) {
      const logRef = ref(global.db, `chatLogs/${session.chatLogId}`);
      const logSnapshot = await get(logRef);
      const log = logSnapshot.val() || {};
      const messages = log.messages || {};
      
      const newMsg = {
        from: 'staff',
        staffId: userId,
        message: text,
        timestamp: Date.now()
      };

      const idx = Object.keys(messages).length;
      messages[idx] = newMsg;
      
      await update(logRef, { messages: messages });
    }

    await global.bot.sendMessage(targetUserId, 
      `💬 *Support Staff:*\n\n${text}`, {
      parse_mode: 'Markdown'
    });
    return true;
  }

  if (staffId) {
    const sessionRef = ref(global.db, `supportSessions/${userId}`);
    const sessionSnapshot = await get(sessionRef);
    const session = sessionSnapshot.val();

    if (!session) {
      return false;
    }

    if (session && session.chatLogId) {
      const logRef = ref(global.db, `chatLogs/${session.chatLogId}`);
      const logSnapshot = await get(logRef);
      const log = logSnapshot.val() || {};
      const messages = log.messages || {};
      
      const newMsg = {
        from: 'user',
        userId: userId,
        message: text,
        timestamp: Date.now()
      };

      const idx = Object.keys(messages).length;
      messages[idx] = newMsg;
      
      await update(logRef, { messages: messages });
    }

    await global.bot.sendMessage(staffId, 
      `💬 *User (${userId}):*\n\n${text}`, {
      parse_mode: 'Markdown'
    });
    return true;
  }

  return false;
};

const showStaffManagement = async (chatId) => {
  try {
    const staffRef = ref(global.db, 'staff');
    const staffSnapshot = await get(staffRef);

    let message = '👥 *Staff Management*\n\n';
    
    if (staffSnapshot.exists()) {
      const staffData = staffSnapshot.val();
      let count = 0;
      
      for (const staffId in staffData) {
        count++;
        const staff = staffData[staffId];
        const status = staff.isActive ? '✅ Active' : '⏸️ Inactive';
        message += `${count}. ${staff.name}\n`;
        message += `   ID: \`${staffId}\`\n`;
        message += `   Status: ${status}\n\n`;
      }
    } else {
      message += '📋 No staff members found.\n\n';
      message += '💡 Add staff members to enable support system.';
    }

    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Staff', callback_data: 'add_staff' }],
          [{ text: '➖ Remove Staff', callback_data: 'remove_staff' }],
          [{ text: '📊 Active Sessions', callback_data: 'view_active_sessions' }],
          [{ text: '📜 Chat Logs', callback_data: 'view_chat_logs' }],
          [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error in showStaffManagement:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading staff management.', backToAdmin);
  }
};

const viewActiveSessions = async (chatId) => {
  try {
    const sessionsRef = ref(global.db, 'supportSessions');
    const sessionsSnapshot = await get(sessionsRef);

    let message = '📊 *Active Support Sessions*\n\n';
    const buttons = [];
    
    if (sessionsSnapshot.exists()) {
      const sessions = sessionsSnapshot.val();
      let activeCount = 0;
      let pendingCount = 0;

      for (const userId in sessions) {
        const session = sessions[userId];
        if (session.status === 'active') {
          activeCount++;
          message += `🟢 ${session.userName} ↔️ ${session.staffName}\n`;
          message += `   User ID: \`${userId}\`\n`;
          message += `   Started: ${new Date(session.acceptedAt).toLocaleString()}\n`;
          message += `   [Force End: /end_${userId}]\n\n`;
          buttons.push([{
            text: `🛑 End - ${session.userName}`,
            callback_data: `force_end_session_${userId}`
          }]);
        } else if (session.status === 'pending') {
          pendingCount++;
          message += `🟡 ${session.userName} - Pending\n`;
          message += `   User ID: \`${userId}\`\n`;
          message += `   Requested: ${new Date(session.requestedAt).toLocaleString()}\n\n`;
          buttons.push([{
            text: `🛑 End - ${session.userName} (Pending)`,
            callback_data: `force_end_session_${userId}`
          }]);
        }
      }

      message += `\n📈 Summary: ${activeCount} active, ${pendingCount} pending`;
    } else {
      message += '📋 No active sessions found.';
    }

    buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    console.error('Error in viewActiveSessions:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading active sessions.', backToAdmin);
  }
};

const viewChatLogs = async (chatId, adminId) => {
  try {
    const logsRef = ref(global.db, 'chatLogs');
    const logsSnapshot = await get(logsRef);

    let message = '📜 Recent Chat Logs (Last 10)\n\n';
    const buttons = [];
    const recentLogs = [];
    
    if (logsSnapshot.exists()) {
      const logs = [];
      const logsData = logsSnapshot.val();
      
      for (const logId in logsData) {
        logs.push({ id: logId, ...logsData[logId] });
      }

      logs.sort((a, b) => b.startedAt - a.startedAt);
      const recent = logs.slice(0, 10);

      for (let idx = 0; idx < recent.length; idx++) {
        const log = recent[idx];
        const userRef = ref(global.db, `users/${log.userId}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        
        const staffRef = ref(global.db, `staff/${log.staffId}`);
        const staffSnapshot = await get(staffRef);
        const staffData = staffSnapshot.val();

        const duration = log.endedAt ? Math.floor((log.endedAt - log.startedAt) / 60000) : 0;
        const userName = userData?.name || 'User';
        const userUsername = userData?.username ? `@${userData.username}` : 'N/A';
        const userVIP = userData?.vipTier ? `⭐ ${userData.vipTier}` : 'Regular';
        const staffName = staffData?.name || log.staffName;
        const startTime = new Date(log.startedAt).toLocaleString();
        
        message += `\n*${idx + 1}. CONVERSATION*\n`;
        message += `User: ${userName} (${userUsername})\n`;
        message += `Status: ${userVIP}\n`;
        message += `Staff: ${staffName}\n`;
        message += `Time: ${startTime}\n`;
        message += `Duration: ${duration} min\n`;
        
        recentLogs.push(log);
        buttons.push([{ text: `Conversation ${idx + 1}`, callback_data: `viewlog_${idx}` }]);
      }

      recentChatLogsCache.set(adminId.toString(), recentLogs);
    } else {
      message += 'No chat logs found.';
    }

    buttons.push([{ text: 'Back to Admin Panel', callback_data: 'back_to_admin' }]);

    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    console.error('Error in viewChatLogs:', error);
    await global.bot.sendMessage(chatId, 'Error loading chat logs.', backToAdmin);
  }
};

const getChatLogByIndex = async (index) => {
  try {
    const logsRef = ref(global.db, 'chatLogs');
    const logsSnapshot = await get(logsRef);

    if (!logsSnapshot.exists()) {
      return null;
    }

    const logs = [];
    const logsData = logsSnapshot.val();
    
    for (const logId in logsData) {
      logs.push({ id: logId, ...logsData[logId] });
    }

    logs.sort((a, b) => b.startedAt - a.startedAt);
    const recent = logs.slice(0, 10);

    return recent[index] || null;
  } catch (error) {
    console.error('Error in getChatLogByIndex:', error);
    return null;
  }
};

const generateChatLogFile = async (logId) => {
  try {
    const logRef = ref(global.db, `chatLogs/${logId}`);
    const logSnapshot = await get(logRef);
    
    if (!logSnapshot.exists()) {
      return null;
    }

    const log = logSnapshot.val();
    const userRef = ref(global.db, `users/${log.userId}`);
    const userSnapshot = await get(userRef);
    const userData = userSnapshot.val();
    
    const staffRef = ref(global.db, `staff/${log.staffId}`);
    const staffSnapshot = await get(staffRef);
    const staffData = staffSnapshot.val();

    let content = '';
    content += `═══════════════════════════════════\n`;
    content += `SUPPORT CHAT LOG EXPORT\n`;
    content += `═══════════════════════════════════\n\n`;

    // User Details
    content += `USER DETAILS:\n`;
    content += `Name: ${userData?.name || 'User'}\n`;
    content += `Username: @${userData?.username || 'N/A'}\n`;
    content += `User ID: ${log.userId}\n`;
    content += `VIP Status: ${userData?.vipTier || 'Regular'}\n\n`;

    // Staff Details
    content += `STAFF DETAILS:\n`;
    content += `Name: ${staffData?.name || log.staffName}\n`;
    content += `Staff ID: ${log.staffId}\n\n`;

    // Session Details
    content += `SESSION DETAILS:\n`;
    content += `Started: ${new Date(log.startedAt).toLocaleString()}\n`;
    content += `Ended: ${log.endedAt ? new Date(log.endedAt).toLocaleString() : 'Ongoing'}\n`;
    content += `Duration: ${log.endedAt ? Math.floor((log.endedAt - log.startedAt) / 60000) : 0} minutes\n\n`;

    // Conversation
    content += `═══════════════════════════════════\n`;
    content += `CONVERSATION:\n`;
    content += `═══════════════════════════════════\n\n`;

    if (log.messages && typeof log.messages === 'object') {
      // Firebase stores arrays as objects with numeric keys
      const msgArray = Object.values(log.messages);
      msgArray.forEach((msg) => {
        const sender = msg.from === 'staff' ? 'STAFF' : 'USER';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        content += `[${time}] ${sender}: ${msg.message}\n`;
      });
    }

    content += `\n═══════════════════════════════════\n`;
    content += `END OF LOG\n`;
    content += `═══════════════════════════════════`;

    return content;
  } catch (error) {
    console.error('Error generating chat log file:', error);
    return null;
  }
};

const exportChatLogs = async (chatId) => {
  try {
    const logsRef = ref(global.db, 'chatLogs');
    const logsSnapshot = await get(logsRef);

    if (!logsSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '❌ No chat logs found to export.', backToAdmin);
      return;
    }

    const logs = [];
    const logsData = logsSnapshot.val();
    
    for (const logId in logsData) {
      logs.push({ id: logId, ...logsData[logId] });
    }

    logs.sort((a, b) => b.startedAt - a.startedAt);
    const recent = logs.slice(0, 10);

    let exportText = `📊 SUPPORT CHAT LOGS EXPORT\n`;
    exportText += `Generated: ${new Date().toLocaleString()}\n`;
    exportText += `════════════════════════════════════════\n\n`;

    recent.forEach((log, idx) => {
      const duration = log.endedAt ? Math.floor((log.endedAt - log.startedAt) / 60000) : 0;
      exportText += `${idx + 1}. CONVERSATION #${idx + 1}\n`;
      exportText += `─────────────────────────────\n`;
      exportText += `User ID: ${log.userId}\n`;
      exportText += `Staff: ${log.staffName}\n`;
      exportText += `Started: ${new Date(log.startedAt).toLocaleString()}\n`;
      exportText += `Ended: ${log.endedAt ? new Date(log.endedAt).toLocaleString() : 'Ongoing'}\n`;
      exportText += `Duration: ${duration} minutes\n\n`;

      if (log.messages && typeof log.messages === 'object') {
        exportText += `Messages:\n`;
        const msgArray = Object.values(log.messages);
        msgArray.forEach((msg) => {
          const sender = msg.from === 'staff' ? `[STAFF ${msg.staffId}]` : `[USER ${msg.userId}]`;
          const time = new Date(msg.timestamp).toLocaleTimeString();
          exportText += `  ${time} ${sender}: ${msg.message}\n`;
        });
      }
      exportText += `\n════════════════════════════════════════\n\n`;
    });

    await global.bot.sendMessage(chatId, 
      `📥 Export Complete\n\nLast 10 conversations exported.\n\nTotal size: ${exportText.length} characters\n\nExport summary has been generated.`, 
      {
        ...backToAdmin
      }
    );
  } catch (error) {
    console.error('Error in exportChatLogs:', error);
    await global.bot.sendMessage(chatId, '❌ Error exporting chat logs.', backToAdmin);
  }
};

module.exports = {
  showSupportMenu,
  requestSupport,
  acceptSupport,
  endSupportSession,
  handleSupportMessage,
  showStaffManagement,
  viewActiveSessions,
  viewChatLogs,
  exportChatLogs,
  generateChatLogFile,
  getChatLogByIndex,
  activeSupportSessions,
  recentChatLogsCache
};
