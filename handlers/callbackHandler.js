const { ref, get, set, update, push } = require('firebase/database');
const { mainMenu, adminPanel, backToMenu, backToAdmin, getDurationKeyboard, getConfirmClaimKeyboard } = require('../utils/keyboards');
const { isAdmin, formatDate, getPointsCost } = require('../utils/helpers');
const { checkChannelMembership } = require('./userHandler');
const { executeButtonAction } = require('../utils/buttonConfig');

const pendingActions = new Map();

const handleCallback = async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;

  try {
    const { activeSupportSessions } = require('./supportHandler');
    const isInSupportChat = activeSupportSessions.has(userId.toString()) || activeSupportSessions.has(`staff_${userId}`);

    if (isInSupportChat && data !== 'back_to_menu') {
      const isStaff = activeSupportSessions.has(`staff_${userId}`);
      await global.bot.answerCallbackQuery(query.id, {
        text: isStaff ? 'Please end the conversation first (/end)' : 'Please wait for staff to end the conversation',
        show_alert: true
      });
      return;
    }
    
    // Check if waiting for search input
    const adminStateRef = ref(global.db, `adminStates/${chatId}`);
    const adminStateSnapshot = await get(adminStateRef);
    if (adminStateSnapshot.exists() && adminStateSnapshot.val().action === 'searching_user') {
      // If they clicked a button while in search mode, cancel search
      await set(adminStateRef, { action: null });
    }

    // Special case: verify_membership (custom logic)
    if (data === 'verify_membership') {
      const isMember = await checkChannelMembership(userId);
      if (isMember) {
        await global.bot.deleteMessage(chatId, messageId);
        const userRef = ref(global.db, `users/${userId}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();

        if (!userSnapshot.exists()) {
          // This should technically not happen if they used /start, but handle just in case
          await set(userRef, {
            name: query.from.first_name || 'User',
            username: query.from.username || '',
            balance: 0,
            totalReferrals: 0,
            referredBy: null,
            referralClaimed: false,
            joinedAt: Date.now(),
            isBlocked: false,
            isBanned: false,
            channelJoined: true,
            totalPointsEarned: 0,
            totalPointsSpent: 0
          });
        } else {
          // User exists, check if they were referred and points haven't been awarded yet
          if (userData.referredBy && !userData.referralClaimed) {
            const referrerId = userData.referredBy;
            const referrerRef = ref(global.db, `users/${referrerId}`);
            const referrerSnapshot = await get(referrerRef);

            if (referrerSnapshot.exists()) {
              const referrerData = referrerSnapshot.val();
              let referralReward = 1;

              // Apply VIP points multiplier if referrer is VIP
              if (referrerData.isVIP) {
                const vipMultiplierRef = ref(global.db, 'settings/vipPointsMultiplier');
                const vipMultiplierSnapshot = await get(vipMultiplierRef);
                const vipMultiplier = vipMultiplierSnapshot.exists() ? vipMultiplierSnapshot.val() : 1;
                referralReward = Math.floor(referralReward * vipMultiplier);
              }

              // Award points to referrer
              await update(referrerRef, {
                balance: (referrerData.balance || 0) + referralReward,
                totalReferrals: (referrerData.totalReferrals || 0) + 1,
                totalPointsEarned: (referrerData.totalPointsEarned || 0) + referralReward
              });

              // Mark referral as claimed for the new user
              await update(userRef, { referralClaimed: true });

              // Notify referrer
              try {
                const notifyMsg = `🎉 *Referral Successful!*\n\n` +
                  `User ${userData.name || 'someone'} joined the channels using your referral link.\n` +
                  `💰 ${referralReward} point is added to balance.`;
                await global.bot.sendMessage(referrerId, notifyMsg, { parse_mode: 'Markdown' });
              } catch (e) {
                console.log(`Could not notify referrer ${referrerId} about successful referral:`, e.message);
              }
            }
          }
        }

        await global.bot.sendMessage(chatId, '✅ Verification successful! Welcome!', mainMenu);
      } else {
        await global.bot.answerCallbackQuery(query.id, {
          text: '❌ Please join the channel first!',
          show_alert: true
        });
      }
      return;
    }

    // Try centralized button config first
    const buttonResult = await executeButtonAction(data, { chatId, userId, messageId, query });
    if (buttonResult?.success || buttonResult?.error) {
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Pagination handlers - custom logic
    if (data.startsWith('keys_page_')) {
      if (!isAdmin(userId)) return;
      const page = parseInt(data.split('_')[2]);
      const { showAllKeys } = require('./adminHandler');
      await showAllKeys(chatId, page, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('unclaimed_page_')) {
      if (!isAdmin(userId)) return;
      const page = parseInt(data.split('_')[2]);
      const { showUnclaimedKeys } = require('./adminHandler');
      await showUnclaimedKeys(chatId, page, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('claimed_page_')) {
      if (!isAdmin(userId)) return;
      const page = parseInt(data.split('_')[2]);
      const { showClaimedKeys } = require('./adminHandler');
      await showClaimedKeys(chatId, page, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('users_page_')) {
      if (!isAdmin(userId)) return;
      const page = parseInt(data.split('_')[2]);
      const { showAllUsers } = require('./adminHandler');
      await showAllUsers(chatId, page, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Game selection
    if (data.startsWith('select_game_')) {
      const gameId = data.replace('select_game_', '');
      const userRef = ref(global.db, `users/${userId}`);
      const userSnapshot = await get(userRef);
      const user = userSnapshot.val();

      if (!user) {
        await global.bot.sendMessage(chatId, '❌ User not found. Please use /start first.', backToMenu);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();

      if (!game) {
        await global.bot.sendMessage(chatId, '❌ Game not found.', backToMenu);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const message = `🎮 *${game.name}* - Choose Duration\n\nYour Balance: ${user.balance || 0} points\n\nSelect key duration:`;
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...getDurationKeyboard(gameId, user.balance || 0, game.pricing)
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Key duration selection
    if (data.startsWith('duration_')) {
      const parts = data.split('_');
      const duration = parseInt(parts[1]);
      const gameId = parts[2];
      const points = parseInt(parts[3]);

      const userRef = ref(global.db, `users/${userId}`);
      const userSnapshot = await get(userRef);
      const user = userSnapshot.val();

      if (!user) {
        await global.bot.sendMessage(chatId, '❌ User not found. Please use /start first.', backToMenu);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();

      if (!game) {
        await global.bot.sendMessage(chatId, '❌ Game not found.', backToMenu);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const settingsRef = ref(global.db, 'settings/claimingEnabled');
      const settingsSnapshot = await get(settingsRef);
      const claimingEnabled = settingsSnapshot.exists() ? settingsSnapshot.val() : true;

      if (!claimingEnabled) {
        await global.bot.sendMessage(chatId, '❌ *No keys available at the moment. Please try again later.*', {
          parse_mode: 'Markdown',
          ...backToMenu
        });
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      if ((user.balance || 0) < points) {
        const message = `❌ *Insufficient Balance*\n\nRequired: ${points} points\nYour Balance: ${user.balance || 0} points\nNeed: ${points - (user.balance || 0)} more points\n\n💡 Earn points by referring friends!`;
        await global.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Get Referral Link', callback_data: 'get_referral' }],
              [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
            ]
          }
        });
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const message = `⚠️ *Confirmation Required*\n\nGame: 🎮 ${game.name}\nDuration: ${duration} day${duration > 1 ? 's' : ''}\nCost: ${points} points\nYour Balance: ${user.balance} points\nRemaining: ${user.balance - points} points\n\nAre you sure you want to claim this key?`;

      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...getConfirmClaimKeyboard(gameId, duration, points)
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Confirm key claim
    if (data.startsWith('confirm_claim_')) {
      const parts = data.split('_');
      const gameId = parts[2];
      const duration = parseInt(parts[3]);
      const points = parseInt(parts[4]);

      const userRef = ref(global.db, `users/${userId}`);
      const userSnapshot = await get(userRef);
      const user = userSnapshot.val();

      if (!user) {
        await global.bot.sendMessage(chatId, '❌ User not found. Please use /start first.', backToMenu);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      if ((user.balance || 0) < points) {
        await global.bot.sendMessage(chatId, '❌ Insufficient balance.', backToMenu);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const keysRef = ref(global.db, 'keys');
      const keysSnapshot = await get(keysRef);
      let availableKey = null;
      let keyId = null;

      if (keysSnapshot.exists()) {
        const keysData = keysSnapshot.val();
        for (const id in keysData) {
          const key = keysData[id];
          if (!key.userId && key.gameId === gameId && key.duration === duration && key.status === 'unclaimed') {
            availableKey = key;
            keyId = id;
            break;
          }
        }
      }

      if (!availableKey) {
        const gameRef = ref(global.db, `games/${gameId}`);
        const gameSnapshot = await get(gameRef);
        const game = gameSnapshot.val();
        const gameName = game?.name || 'this game';

        const message = `❌ *No Keys Available*\n\nWe're currently out of 🎮 ${gameName} keys for ${duration} day${duration > 1 ? 's' : ''}.\n\n⏰ Please try again later or choose another game.\n\n💡 We'll restock soon!`;

        try {
          await global.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Choose Another Game', callback_data: 'claim_key' }],
                [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          });
        } catch (sendError) {
           console.error('Error sending no keys message:', sendError.message);
        }
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const expiresAt = Date.now() + (duration * 24 * 60 * 60 * 1000);

      await update(ref(global.db, `keys/${keyId}`), {
        userId: userId.toString(),
        claimedAt: Date.now(),
        expiresAt: expiresAt,
        status: 'active'
      });

      await update(userRef, {
        balance: (user.balance || 0) - points,
        totalPointsSpent: (user.totalPointsSpent || 0) + points
      });

      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();
      const apkLink = game?.apkLink;

      let message = `✅ *Key Claimed Successfully!*\n\n🎮 Game: ${availableKey.gameName}\n🔑 Your Key: \`${availableKey.key}\`\n\n⏰ Valid Until: ${formatDate(expiresAt)}`;
      
      if (apkLink) {
        message += `\n\n📥 Download APK: ${apkLink}`;
      }
      
      message += `\n\n⚠️ Save this key! It won't be shown again.`;

      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...backToMenu
      });

      // Send receipt to logs channel
      const logsChannel = process.env.LOGS_CHANNEL;
      if (logsChannel) {
        const claimDate = new Date();
        const receipt = `🧾 *KEY CLAIM RECEIPT*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📅 *Date:* ${claimDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}\n` +
          `🕐 *Time:* ${claimDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}\n\n` +
          `👤 *User Details:*\n` +
          `   • Name: ${user.name || user.firstName || 'N/A'}\n` +
          `   • Username: ${user.username ? '@' + user.username : 'N/A'}\n` +
          `   • Chat ID: \`${userId}\`\n\n` +
          `📦 *Claim Details:*\n` +
          `   • Product: ${availableKey.gameName}\n` +
          `   • Key: \`${availableKey.key}\`\n` +
          `   • Validity: ${duration} day${duration > 1 ? 's' : ''}\n` +
          `   • Cost: ${points} points\n` +
          `   • Expires: ${formatDate(expiresAt)}\n\n` +
          `💰 *Balance:*\n` +
          `   • Before: ${user.balance || 0} pts\n` +
          `   • After: ${(user.balance || 0) - points} pts\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 Quantum Key Generator Bot`;

        try {
          await global.bot.sendMessage(logsChannel, receipt, { parse_mode: 'Markdown' });
        } catch (logError) {
          console.error('Failed to send receipt to logs channel:', logError.message);
        }
      }

      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // User actions
    if (data === 'claim_key') {
      const { handleClaimKey } = require('./userHandler');
      await handleClaimKey(chatId, userId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'get_referral') {
      const { handleReferUsers } = require('./userHandler');
      await handleReferUsers(chatId, userId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'refresh_leaderboard') {
      const { handleLeaderboard } = require('./userHandler');
      await handleLeaderboard(chatId, userId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Support contact menu
    if (data === 'contact_support') {
      const message = `📞 *Contact Support*\n\nHow would you like to reach us?\n\n💬 *Connect with Staff* - Get live chat support from our team\n📝 *Send Feedback* - Share your feedback or report an issue\n\nChoose an option below:`;
      
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Connect with Staff', callback_data: 'confirm_request_support' }],
            [{ text: '📝 Send Feedback', callback_data: 'send_feedback' }],
            [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
          ]
        }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'confirm_request_support') {
      const message = `💬 *Connect with Staff*\n\nAre you sure you want to connect with our support team?\n\n✨ A staff member will be notified to assist you.`;
      
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Connect with Staff', callback_data: 'request_support' }],
            [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
          ]
        }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'request_support') {
      const { requestSupport } = require('./supportHandler');
      await requestSupport(chatId, userId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'send_feedback') {
      pendingActions.set(userId, { action: 'send_feedback' });
      await global.bot.sendMessage(chatId, 
        `📝 *Send Feedback*\n\nWe'd love to hear from you!\n\nPlease describe your feedback or issue:`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]]
        }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Support session actions
    if (data.startsWith('accept_support_')) {
      const parts = data.split('_');
      const targetUserId = parts[2];
      const requestId = parts[3];
      const { acceptSupport } = require('./supportHandler');
      await acceptSupport(chatId, userId, targetUserId, requestId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('view_support_')) {
      const targetUserId = data.replace('view_support_', '');
      const userRef = ref(global.db, `users/${targetUserId}`);
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ User not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const user = userSnapshot.val();
      const vipStatus = user.vipTier ? `⭐ ${user.vipTier}` : 'Regular';
      const joinDate = new Date(user.joinedAt).toLocaleDateString();
      
      const message = 
        `📋 *USER DETAILS*\n\n` +
        `👤 *Name:* ${user.name}\n` +
        `🆔 *User ID:* \`${targetUserId}\`\n` +
        `📱 *Username:* ${user.username ? `@${user.username}` : 'Not set'}\n` +
        `⭐ *VIP Status:* ${vipStatus}\n` +
        `📊 *Balance:* ${user.balance || 0} points\n` +
        `👥 *Total Referrals:* ${user.totalReferrals || 0}\n` +
        `🎮 *Keys Claimed:* ${user.keysClaimed || 0}\n` +
        `📅 *Member Since:* ${joinDate}\n` +
        `🔄 *Daily Streak:* ${user.dailyStreak || 0} days\n\n` +
        `${user.isBanned ? '🚫 *Status:* BANNED' : '✅ *Status:* Active'}\n` +
        `${user.isBlocked ? '⛔ *Account:* BLOCKED' : ''}`;
      
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'view_active_sessions') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { viewActiveSessions } = require('./supportHandler');
      await viewActiveSessions(chatId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('force_end_session_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const targetUserId = data.replace('force_end_session_', '');
      const sessionRef = ref(global.db, `supportSessions/${targetUserId}`);
      const sessionSnapshot = await get(sessionRef);
      
      if (!sessionSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ Session not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const session = sessionSnapshot.val();
      const staffId = session.staffId;
      const { activeSupportSessions } = require('./supportHandler');
      
      await update(sessionRef, {
        status: 'completed',
        endedAt: Date.now(),
        forcedEndedBy: userId.toString()
      });

      activeSupportSessions.delete(targetUserId);
      activeSupportSessions.delete(`staff_${staffId}`);

      await global.bot.sendMessage(chatId, `✅ Support session with user ${targetUserId} has been force ended.`);
      
      try {
        await global.bot.sendMessage(staffId, 
          `🔴 *Session Forcibly Ended*\n\nYour support session with User ID: \`${targetUserId}\` has been ended by an admin.`, {
          parse_mode: 'Markdown'
        });
      } catch (e) {
        console.log('Could not notify staff of force end:', e.message);
      }

      try {
        await global.bot.sendMessage(targetUserId, 
          `🔴 *Support Session Ended*\n\nYour support session has been ended by an administrator.`, {
          parse_mode: 'Markdown'
        });
      } catch (e) {
        console.log('Could not notify user of force end:', e.message);
      }

      const { viewActiveSessions } = require('./supportHandler');
      await viewActiveSessions(chatId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'view_chat_logs') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { viewChatLogs } = require('./supportHandler');
      await viewChatLogs(chatId, userId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'export_chat_logs') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { exportChatLogs } = require('./supportHandler');
      await exportChatLogs(chatId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('viewlog_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      try {
        const index = parseInt(data.replace('viewlog_', ''));
        const { getChatLogByIndex, generateChatLogFile } = require('./supportHandler');
        const log = await getChatLogByIndex(index);
        
        if (!log || !log.id) {
          await global.bot.sendMessage(chatId, '❌ Error loading chat log.', backToAdmin);
          await global.bot.answerCallbackQuery(query.id);
          return;
        }

        const content = await generateChatLogFile(log.id);
        
        if (!content || content.length === 0) {
          await global.bot.sendMessage(chatId, '❌ Error generating chat log file.', backToAdmin);
          await global.bot.answerCallbackQuery(query.id);
          return;
        }

        const fs = require('fs');
        const path = require('path');
        
        const userRef = ref(global.db, `users/${log.userId}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        
        const staffRef = ref(global.db, `staff/${log.staffId}`);
        const staffSnapshot = await get(staffRef);
        const staffData = staffSnapshot.val();
        
        const staffName = (staffData?.name || log.staffName || 'Staff').replace(/\s+/g, '-');
        const userName = (userData?.name || 'User').replace(/\s+/g, '-');
        
        const fileName = `chat_log_${staffName}_${userName}.txt`;
        const tempPath = path.join('/tmp', fileName);
        
        try {
          fs.writeFileSync(tempPath, content, 'utf-8');
          
          if (!fs.existsSync(tempPath)) {
            await global.bot.sendMessage(chatId, '❌ Failed to create file.', backToAdmin);
            await global.bot.answerCallbackQuery(query.id);
            return;
          }
          
          await global.bot.sendDocument(chatId, fs.createReadStream(tempPath), {
            filename: fileName,
            reply_markup: backToAdmin.reply_markup
          });
          
          setTimeout(() => {
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
              }
            } catch (e) {}
          }, 1000);
        } catch (writeError) {
          console.error('File write error:', writeError);
          await global.bot.sendMessage(chatId, '❌ Error creating file.', backToAdmin);
        }
      } catch (error) {
        console.error('Error in viewlog callback:', error);
        await global.bot.sendMessage(chatId, '❌ Error sending chat log.', backToAdmin);
      }
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Staff management
    if (data === 'add_staff') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      pendingActions.set(userId, { action: 'add_staff' });
      await global.bot.sendMessage(chatId, '👥 *Add Staff Member*\n\nSend the User ID of the person you want to add as staff:', {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'remove_staff') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const staffRef = ref(global.db, 'staff');
      const staffSnapshot = await get(staffRef);

      if (!staffSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '📋 No staff members to remove.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const buttons = [];
      const staffData = staffSnapshot.val();
      for (const staffId in staffData) {
        buttons.push([{
          text: `👤 ${staffData[staffId].name}`,
          callback_data: `confirm_remove_staff_${staffId}`
        }]);
      }
      buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

      await global.bot.sendMessage(chatId, '👥 *Remove Staff*\n\nSelect a staff member to remove:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('confirm_remove_staff_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const staffId = data.replace('confirm_remove_staff_', '');
      await set(ref(global.db, `staff/${staffId}`), null);
      await global.bot.sendMessage(chatId, '✅ Staff member removed successfully.', backToAdmin);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Settings toggles
    if (data === 'settings_toggle_claiming') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { toggleClaiming } = require('./adminHandler');
      await toggleClaiming(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'settings_toggle_daily_reward') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { toggleDailyReward } = require('./adminHandler');
      await toggleDailyReward(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'settings_referral_multiplier') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { cycleReferralMultiplier } = require('./adminHandler');
      await cycleReferralMultiplier(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'settings_max_keys_per_day') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { cycleMaxKeysPerDay } = require('./adminHandler');
      await cycleMaxKeysPerDay(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'settings_vip_points_multiplier') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { cycleVipPointsMultiplier } = require('./adminHandler');
      await cycleVipPointsMultiplier(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'settings_toggle_expiry_warnings') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { toggleAutoExpiryWarnings } = require('./adminHandler');
      await toggleAutoExpiryWarnings(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'settings_weekly_bonus') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { cycleWeeklyBonus } = require('./adminHandler');
      await cycleWeeklyBonus(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Game management
    if (data === 'games_add') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      pendingActions.set(userId, { action: 'add_game' });
      await global.bot.sendMessage(chatId, '📦 *Add New Product*\n\nSend the name of the new product:', {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Pricing management
    if (data === 'admin_pricing') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { showPricingMenu } = require('./adminHandler');
      await showPricingMenu(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'pricing_view') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const { showCurrentPrices } = require('./adminHandler');
      await showCurrentPrices(chatId, messageId);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('pricing_edit_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const days = parseInt(data.replace('pricing_edit_', ''));
      pendingActions.set(userId, { action: 'edit_pricing', days });
      await global.bot.sendMessage(chatId, `💰 *Edit ${days} Day Price*\n\nCurrent configuration will be updated.\n\nEnter new price in points:`, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('manage_product_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gameId = data.replace('manage_product_', '');
      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);

      if (!gameSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ Product not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const game = gameSnapshot.val();
      let pricingText = '_No pricing configured_';
      
      if (game.pricing && Object.keys(game.pricing).length > 0) {
        const sortedPricing = Object.entries(game.pricing)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .map(([key, cost]) => `• ${key.replace('day', ' Day(s)')}: ${cost} pts`)
          .join('\n');
        pricingText = sortedPricing;
      }

      const message = `📦 *${game.name}*\n\n` +
        `📊 *Stats:*\n` +
        `• Total Keys: ${game.totalKeys || 0}\n` +
        `• Claimed: ${game.claimedKeys || 0}\n` +
        `• Available: ${game.unclaimedKeys || 0}\n\n` +
        `💰 *Pricing:*\n${pricingText}\n\n` +
        `📥 *APK Link:* ${game.apkLink || 'Not set'}\n\n` +
        `Choose an action:`;

      const buttons = [
        [{ text: '✏️ Edit Name', callback_data: `edit_product_name_${gameId}` }],
        [{ text: '💰 Edit Pricing', callback_data: `edit_game_pricing_${gameId}` }],
        [{ text: '📥 Edit APK Link', callback_data: `edit_apk_${gameId}` }],
        [{ text: '🔑 Add Keys', callback_data: `add_keys_to_${gameId}` }],
        [{ text: '🗑️ Delete Product', callback_data: `remove_game_${gameId}` }],
        [{ text: '🔙 Back to Products', callback_data: 'admin_games' }]
      ];

      try {
        await global.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      } catch (err) {
        console.error('Error sending product management message:', err.message);
        await global.bot.sendMessage(chatId, message.replace(/[*_`]/g, ''), {
          reply_markup: { inline_keyboard: buttons }
        });
      }
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('remove_game_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gameId = data.replace('remove_game_', '');
      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);

      if (!gameSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ Product not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const game = gameSnapshot.val();
      await set(gameRef, null);
      
      const keysRef = ref(global.db, 'keys');
      const keysSnapshot = await get(keysRef);
      if (keysSnapshot.exists()) {
        const keysData = keysSnapshot.val();
        for (const keyId in keysData) {
          if (keysData[keyId].gameId === gameId) {
            await set(ref(global.db, `keys/${keyId}`), null);
          }
        }
      }

      await global.bot.sendMessage(chatId, `✅ Product "${game.name}" and its keys have been deleted successfully.`, backToAdmin);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('edit_apk_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const gameId = data.replace('edit_apk_', '');
      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();

      pendingActions.set(userId, { action: 'edit_apk_link', gameId });
      await global.bot.sendMessage(chatId, `📥 *Edit APK Link*\n\nProduct: ${game.name}\nCurrent Link: ${game.apkLink || 'None'}\n\nEnter new APK link (or type 'none' to remove):`, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('add_keys_to_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gameId = data.replace('add_keys_to_', '');
      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);

      if (!gameSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ Product not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const game = gameSnapshot.val();
      
      // Show duration selection for adding keys
      let durationButtons = [];
      if (game.pricing && Object.keys(game.pricing).length > 0) {
        const sortedDurations = Object.keys(game.pricing)
          .map(key => parseInt(key.replace('day', '')))
          .sort((a, b) => a - b);
        
        durationButtons = sortedDurations.map(days => [{
          text: `${days} Day${days > 1 ? 's' : ''}`,
          callback_data: `add_keys_duration_${gameId}_${days}`
        }]);
      } else {
        durationButtons = [
          [{ text: '1 Day', callback_data: `add_keys_duration_${gameId}_1` }],
          [{ text: '7 Days', callback_data: `add_keys_duration_${gameId}_7` }],
          [{ text: '30 Days', callback_data: `add_keys_duration_${gameId}_30` }]
        ];
      }
      
      durationButtons.push([{ text: '🔙 Back', callback_data: `manage_product_${gameId}` }]);

      await global.bot.sendMessage(chatId, 
        `🔑 *Add Keys to ${game.name}*\n\nSelect key duration:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: durationButtons }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('add_keys_duration_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      // Extract duration (the part after the last underscore)
      const lastUnderscoreIndex = data.lastIndexOf('_');
      const duration = parseInt(data.substring(lastUnderscoreIndex + 1));
      
      // Extract gameId (the part between 'add_keys_duration_' and the last underscore)
      const prefix = 'add_keys_duration_';
      const gameId = data.substring(prefix.length, lastUnderscoreIndex);
      
      console.log(`Debug: Adding keys. Data=${data}, GameId=${gameId}, Duration=${duration}`);
      
      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();

      if (!game) {
        // Fallback: If not found, try to find by name or check if ID was parsed incorrectly
        const gamesRef = ref(global.db, 'games');
        const allGamesSnapshot = await get(gamesRef);
        let foundGame = null;
        let actualId = gameId;

        if (allGamesSnapshot.exists()) {
          const allGames = allGamesSnapshot.val();
          // Check if gameId is actually a name or if it's slightly off
          for (const id in allGames) {
            if (id === gameId || allGames[id].name === gameId) {
              foundGame = allGames[id];
              actualId = id;
              break;
            }
          }
        }

        if (!foundGame) {
          console.error(`Add Keys Error: Game not found for ID: ${gameId}`);
          await global.bot.sendMessage(chatId, `❌ Product not found. Please try re-selecting it from the menu.`, backToAdmin);
          await global.bot.answerCallbackQuery(query.id);
          return;
        }
        
        // Use the found game
        pendingActions.set(userId, { 
          action: 'waiting_keys', 
          gameId: actualId, 
          gameName: foundGame.name, 
          duration 
        });

        await global.bot.sendMessage(chatId, 
          `🔑 *Add Keys*\n\n📦 Product: ${foundGame.name}\n⏱️ Duration: ${duration} day${duration > 1 ? 's' : ''}\n\nPaste your keys (one per line):`, {
          parse_mode: 'Markdown',
          ...backToAdmin
        });
      } else {
        pendingActions.set(userId, { 
          action: 'waiting_keys', 
          gameId, 
          gameName: game.name, 
          duration 
        });

        await global.bot.sendMessage(chatId, 
          `🔑 *Add Keys*\n\n📦 Product: ${game.name}\n⏱️ Duration: ${duration} day${duration > 1 ? 's' : ''}\n\nPaste your keys (one per line):`, {
          parse_mode: 'Markdown',
          ...backToAdmin
        });
      }
      
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'games_edit_pricing') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gamesRef = ref(global.db, 'games');
      const gamesSnapshot = await get(gamesRef);

      if (!gamesSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '📋 No products available to edit pricing.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const buttons = [];
      const gamesData = gamesSnapshot.val();
      for (const gameId in gamesData) {
        const game = gamesData[gameId];
        const pricingInfo = game.pricing ? Object.keys(game.pricing).length + ' tiers' : 'No pricing';
        buttons.push([{
          text: `📦 ${game.name} (${pricingInfo})`,
          callback_data: `edit_game_pricing_${gameId}`
        }]);
      }
      buttons.push([{ text: '🔙 Back', callback_data: 'admin_games' }]);

      await global.bot.sendMessage(chatId, '💰 *Edit Product Pricing*\n\nSelect a product to edit its pricing:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('edit_game_pricing_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gameId = data.replace('edit_game_pricing_', '');
      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);

      if (!gameSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ Product not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const game = gameSnapshot.val();
      let pricingText = 'No pricing configured';
      
      if (game.pricing && Object.keys(game.pricing).length > 0) {
        const sortedPricing = Object.entries(game.pricing)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .map(([key, cost]) => `• ${key.replace('day', ' Day(s)')}: ${cost} points`)
          .join('\n');
        pricingText = sortedPricing;
      }

      pendingActions.set(userId, { action: 'update_game_pricing', gameId, gameName: game.name });

      await global.bot.sendMessage(chatId, 
        `💰 *Edit Pricing for ${game.name}*\n\n` +
        `📊 *Current Pricing:*\n${pricingText}\n\n` +
        `Enter new pricing (this will replace existing):\n\n` +
        `Format: \`<days>d <cost>\`\n` +
        `Example:\n\`\`\`\n1d 5\n3d 10\n7d 15\n30d 25\`\`\``, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'games_remove') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gamesRef = ref(global.db, 'games');
      const gamesSnapshot = await get(gamesRef);

      if (!gamesSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '📋 No games to remove.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const buttons = [];
      const gamesData = gamesSnapshot.val();
      for (const gameId in gamesData) {
        buttons.push([{
          text: `🎮 ${gamesData[gameId].name}`,
          callback_data: `remove_game_${gameId}`
        }]);
      }
      buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

      await global.bot.sendMessage(chatId, '🎮 *Remove Game*\n\nSelect a game to remove:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('remove_game_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const gameId = data.replace('remove_game_', '');

      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);

      if (gameSnapshot.exists()) {
        await update(gameRef, { isActive: false });
        await global.bot.sendMessage(chatId, `✅ Game "${gameSnapshot.val().name}" has been deactivated.`, backToAdmin);
      }
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Key management
    if (data === 'keys_add') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const gamesRef = ref(global.db, 'games');
      const gamesSnapshot = await get(gamesRef);

      if (!gamesSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ No games found. Add a game first.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const buttons = [];
      const gamesData = gamesSnapshot.val();
      for (const gameId in gamesData) {
        if (gamesData[gameId].isActive) {
          buttons.push([{
            text: `🎮 ${gamesData[gameId].name}`,
            callback_data: `add_keys_game_${gameId}`
          }]);
        }
      }

      if (buttons.length === 0) {
        await global.bot.sendMessage(chatId, '❌ No active games. Add a game first.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

      await global.bot.sendMessage(chatId, '🔑 *Add Keys*\n\nSelect a game to add keys for:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('add_keys_game_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const gameId = data.replace('add_keys_game_', '');

      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();

      if (!game) {
        await global.bot.sendMessage(chatId, '❌ Game not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      pendingActions.set(userId, { action: 'add_keys_duration', gameId, gameName: game.name });

      // Build buttons dynamically based on product's pricing
      const buttons = [];
      if (game.pricing && Object.keys(game.pricing).length > 0) {
        const sortedDurations = Object.keys(game.pricing)
          .map(key => parseInt(key.replace('day', '')))
          .sort((a, b) => a - b);
        
        for (const days of sortedDurations) {
          const cost = game.pricing[`${days}day`];
          buttons.push([{ 
            text: `${days} Day${days > 1 ? 's' : ''} - ${cost} pts`, 
            callback_data: `keys_duration_${days}_${gameId}` 
          }]);
        }
      } else {
        // Fallback for products without pricing (legacy products)
        buttons.push(
          [{ text: '1 Day', callback_data: `keys_duration_1_${gameId}` }],
          [{ text: '3 Days', callback_data: `keys_duration_3_${gameId}` }],
          [{ text: '7 Days', callback_data: `keys_duration_7_${gameId}` }],
          [{ text: '15 Days', callback_data: `keys_duration_15_${gameId}` }],
          [{ text: '30 Days', callback_data: `keys_duration_30_${gameId}` }]
        );
      }
      buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

      await global.bot.sendMessage(chatId, `🔑 *Add Keys for ${game.name}*\n\nSelect key duration:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('keys_duration_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const parts = data.split('_');
      const duration = parseInt(parts[2]);
      const gameId = parts[3];

      const gameRef = ref(global.db, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      const game = gameSnapshot.val();

      if (!game) {
        await global.bot.sendMessage(chatId, '❌ Game not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      pendingActions.set(userId, { 
        action: 'waiting_keys', 
        gameId, 
        gameName: game.name, 
        duration 
      });

      await global.bot.sendMessage(chatId, 
        `🔑 *Add Keys*\n\nGame: ${game.name}\nDuration: ${duration} day${duration > 1 ? 's' : ''}\n\nSend keys (one per line):`, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'keys_remove' || data === 'keys_by_game') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      await global.bot.sendMessage(chatId, '🚧 This feature is coming soon!', backToAdmin);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // User point management
    if (data === 'users_add_points' || data === 'users_deduct_points') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      let actionType = data === 'users_add_points' ? 'add_points' : 'deduct_points';
      pendingActions.set(userId, { action: actionType });

      await global.bot.sendMessage(chatId, '👤 Enter User ID or @username:', {
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Quick point actions
    if (data.startsWith('quick_add_') || data.startsWith('quick_deduct_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const targetUserId = data.replace('quick_add_', '').replace('quick_deduct_', '');
      const isAdd = data.startsWith('quick_add_');
      pendingActions.set(userId, { 
        action: isAdd ? 'confirm_add_points' : 'confirm_deduct_points',
        targetUserId: targetUserId,
        targetUser: { balance: 0 }
      });

      await global.bot.sendMessage(chatId, `👤 Enter amount to ${isAdd ? 'add' : 'deduct'}:`, {
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // VIP toggling
    if (data.startsWith('toggle_vip_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const targetUserId = data.replace('toggle_vip_', '');
      const userRef = ref(global.db, `users/${targetUserId}`);
      const userSnapshot = await get(userRef);
      const user = userSnapshot.val();

      if (!user) {
        await global.bot.sendMessage(chatId, '❌ User not found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      if (user.vipTier) {
        await update(userRef, { vipTier: null });
        await global.bot.sendMessage(chatId, `✅ Removed VIP status from user.`, backToAdmin);
      } else {
        await update(userRef, { vipTier: 'Gold' });
        await global.bot.sendMessage(chatId, `✅ Granted VIP Gold status to user.`, backToAdmin);
      }
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Ban/unban confirmations
    if (data.startsWith('confirm_ban_') || data.startsWith('confirm_unban_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      const targetUserId = data.replace('confirm_ban_', '').replace('confirm_unban_', '');
      const isBan = data.startsWith('confirm_ban_');

      const userRef = ref(global.db, `users/${targetUserId}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists() && isBan) {
        // Preemptive ban - create user record
        await set(userRef, {
          name: 'User',
          username: '',
          balance: 0,
          totalReferrals: 0,
          joinedAt: Date.now(),
          isBanned: true,
          isBlocked: false,
          channelJoined: false
        });
        await global.bot.sendMessage(chatId, `✅ User ${targetUserId} has been preemptively banned.`, backToAdmin);
      } else if (userSnapshot.exists()) {
        await update(userRef, { isBanned: isBan });
        await global.bot.sendMessage(chatId, `✅ User ${isBan ? 'banned' : 'unbanned'} successfully.`, backToAdmin);
      }
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'close_admin') {
      await global.bot.sendMessage(chatId, '📱 Main Menu:', mainMenu);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'broadcast_text') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      pendingActions.set(userId, { action: 'broadcast_text' });
      await global.bot.sendMessage(chatId, '📝 *Send Text Message*\n\nEnter the message you want to broadcast:', {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'broadcast_photo') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      pendingActions.set(userId, { action: 'broadcast_photo' });
      await global.bot.sendMessage(chatId, '🖼️ *Send Photo + Text*\n\nSend a photo with a caption to broadcast:', {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Broadcast target selection
    if (data.startsWith('broadcast_target_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const pending = pendingActions.get(userId);
      if (!pending || !pending.messageText) {
        await global.bot.sendMessage(chatId, '❌ No message to broadcast.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const target = data.replace('broadcast_target_', '');
      pendingActions.delete(userId);

      const usersRef = ref(global.db, 'users');
      const usersSnapshot = await get(usersRef);

      if (!usersSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ No users found.', backToAdmin);
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const progressMsg = await global.bot.sendMessage(chatId, '📤 *Broadcasting...*', {
        parse_mode: 'Markdown'
      });

      const usersData = usersSnapshot.val();
      let sent = 0;
      let failed = 0;
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      for (const recipientId in usersData) {
        const userData = usersData[recipientId];
        
        // Filter based on target
        if (target === 'active' && (!userData.lastActive || userData.lastActive < sevenDaysAgo)) {
          continue;
        }

        try {
          if (pending.photoFileId) {
            await global.bot.sendPhoto(recipientId, pending.photoFileId, {
              caption: pending.messageText,
              parse_mode: 'Markdown'
            });
          } else {
            await global.bot.sendMessage(recipientId, pending.messageText, {
              parse_mode: 'Markdown'
            });
          }
          sent++;
        } catch (e) {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const finalReport = `✅ *Broadcast Complete*\n\n` +
        `📨 Sent: ${sent}\n` +
        `❌ Failed: ${failed}\n` +
        `📅 Time: ${new Date().toLocaleString()}`;

      await global.bot.editMessageText(finalReport, {
        chat_id: chatId,
        message_id: progressMsg.message_id,
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data.startsWith('settings_edit_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      await global.bot.sendMessage(chatId, '🚧 This settings option is coming soon!', backToAdmin);
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    // Broadcast actions
    if (data.startsWith('broadcast_')) {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }

      const target = data.replace('broadcast_', '');
      if (target === 'confirm_all') {
        const { messageText } = pendingActions.get(userId)?.data || {};
        if (!messageText) {
          await global.bot.sendMessage(chatId, '❌ No message to broadcast.', backToAdmin);
          await global.bot.answerCallbackQuery(query.id);
          return;
        }

        global.broadcastState = { 
          target: 'all', 
          messageText, 
          cancelled: false,
          sent: 0,
          failed: 0
        };

        const progressMsg = await global.bot.sendMessage(chatId, '📤 *Broadcasting to all users...*', {
          parse_mode: 'Markdown'
        });
        global.broadcastState.progressMsgId = progressMsg.message_id;

        const usersRef = ref(global.db, 'users');
        const usersSnapshot = await get(usersRef);

        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          for (const userId in usersData) {
            if (global.broadcastState.cancelled) break;
            
            try {
              await global.bot.sendMessage(userId, messageText, {
                parse_mode: 'Markdown'
              });
              global.broadcastState.sent++;
            } catch (e) {
              global.broadcastState.failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const finalReport = `✅ *Broadcast Complete*\n\n` +
          `📨 Sent: ${global.broadcastState.sent}\n` +
          `❌ Failed: ${global.broadcastState.failed}\n` +
          `📅 Time: ${new Date().toLocaleString()}\n\n` +
          `🎊 Message delivered successfully!`;

        await global.bot.editMessageText(finalReport, {
          chat_id: chatId,
          message_id: progressMsg.message_id,
          parse_mode: 'Markdown',
          ...backToAdmin
        });

        delete global.broadcastState;
      }
      await global.bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'cancel_broadcast') {
      if (!isAdmin(userId)) {
        await global.bot.answerCallbackQuery(query.id);
        return;
      }
      if (global.broadcastState) {
        global.broadcastState.cancelled = true;
      }
      await global.bot.answerCallbackQuery(query.id, { text: 'Cancelling broadcast...' });
      return;
    }

    await global.bot.answerCallbackQuery(query.id);

  } catch (error) {
    console.error('Error in handleCallback:', error);
    await global.bot.answerCallbackQuery(query.id, {
      text: '❌ Something went wrong. Please try again.',
      show_alert: true
    });
  }
};

const handleAdminTextInput = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!isAdmin(userId)) return false;

  const pending = pendingActions.get(userId);
  if (!pending) return false;

  try {
    if (pending.action === 'edit_product_name') {
      pendingActions.delete(userId);
      
      const newName = text.trim();
      if (!newName) {
        await global.bot.sendMessage(chatId, '❌ Invalid name. Please try again.', backToAdmin);
        return true;
      }

      const gameRef = ref(global.db, `games/${pending.gameId}`);
      await update(gameRef, { name: newName });

      // Also update the name in all keys for this product
      const keysRef = ref(global.db, 'keys');
      const keysSnapshot = await get(keysRef);
      if (keysSnapshot.exists()) {
        const keysData = keysSnapshot.val();
        for (const keyId in keysData) {
          if (keysData[keyId].gameId === pending.gameId) {
            await update(ref(global.db, `keys/${keyId}`), { gameName: newName });
          }
        }
      }

      await global.bot.sendMessage(chatId, 
        `✅ Product name updated!\n\n*${pending.currentName}* → *${newName}*`, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
      return true;
    }

    if (pending.action === 'add_game') {
      pendingActions.set(userId, { action: 'add_game_pricing', gameName: text });
      
      await global.bot.sendMessage(chatId, 
        `📦 *Product Name:* ${text}\n\n` +
        `💰 *Enter Pricing*\n\n` +
        `Enter pricing for each duration in format:\n` +
        `\`<days>d <cost>\`\n\n` +
        `Example:\n` +
        `\`\`\`\n1d 5\n3d 10\n7d 15\n30d 25\`\`\`\n\n` +
        `Enter one pricing per line:`, {
        parse_mode: 'Markdown',
        ...require('../utils/keyboards').backToAdmin
      });
      return true;
    }

    else if (pending.action === 'add_game_pricing') {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const pricing = {};
      const errors = [];

      for (const line of lines) {
        const match = line.match(/^(\d+)d\s+(\d+)$/i);
        if (match) {
          const days = parseInt(match[1]);
          const cost = parseInt(match[2]);
          pricing[`${days}day`] = cost;
        } else {
          errors.push(line);
        }
      }

      if (Object.keys(pricing).length === 0) {
        await global.bot.sendMessage(chatId, 
          `❌ *Invalid Format*\n\nNo valid pricing entries found.\n\n` +
          `Please use format: \`<days>d <cost>\`\n` +
          `Example: \`1d 5\` means 1 day costs 5 points`, {
          parse_mode: 'Markdown',
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      pendingActions.set(userId, { action: 'add_game_apk', gameName: pending.gameName, pricing: pricing, errors: errors });
      
      await global.bot.sendMessage(chatId, 
        `📦 *Product:* ${pending.gameName}\n` +
        `💰 *Pricing configured!*\n\n` +
        `📥 *APK Link (Optional)*\n\n` +
        `Enter the APK download link for this product.\n\n` +
        `Send the link or type \`skip\` to skip this step:`, {
        parse_mode: 'Markdown',
        ...require('../utils/keyboards').backToAdmin
      });
      return true;
    }

    else if (pending.action === 'add_game_apk') {
      pendingActions.delete(userId);

      const apkLink = text.toLowerCase() === 'skip' ? null : text.trim();

      const gamesRef = ref(global.db, 'games');
      const newGameRef = push(gamesRef);

      await set(newGameRef, {
        name: pending.gameName,
        isActive: true,
        addedAt: Date.now(),
        totalKeys: 0,
        claimedKeys: 0,
        unclaimedKeys: 0,
        pricing: pending.pricing,
        apkLink: apkLink
      });

      const pricingList = Object.entries(pending.pricing)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([key, cost]) => `• ${key.replace('day', ' Day(s)')}: ${cost} points`)
        .join('\n');

      let message = `✅ Product "${pending.gameName}" added successfully!\n\n💰 *Pricing:*\n${pricingList}`;
      
      if (apkLink) {
        message += `\n\n📥 *APK Link:* ${apkLink}`;
      }
      
      if (pending.errors && pending.errors.length > 0) {
        message += `\n\n⚠️ Skipped invalid entries: ${pending.errors.join(', ')}`;
      }

      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...require('../utils/keyboards').backToAdmin
      });
      return true;
    }

    else if (pending.action === 'update_game_pricing') {
      pendingActions.delete(userId);

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const pricing = {};
      const errors = [];

      for (const line of lines) {
        const match = line.match(/^(\d+)d\s+(\d+)$/i);
        if (match) {
          const days = parseInt(match[1]);
          const cost = parseInt(match[2]);
          pricing[`${days}day`] = cost;
        } else {
          errors.push(line);
        }
      }

      if (Object.keys(pricing).length === 0) {
        await global.bot.sendMessage(chatId, 
          `❌ *Invalid Format*\n\nNo valid pricing entries found.\n\n` +
          `Please use format: \`<days>d <cost>\`\n` +
          `Example: \`1d 5\` means 1 day costs 5 points`, {
          parse_mode: 'Markdown',
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      const gameRef = ref(global.db, `games/${pending.gameId}`);
      await update(gameRef, { pricing: pricing });

      const pricingList = Object.entries(pricing)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([key, cost]) => `• ${key.replace('day', ' Day(s)')}: ${cost} points`)
        .join('\n');

      let message = `✅ Pricing updated for "${pending.gameName}"!\n\n💰 *New Pricing:*\n${pricingList}`;
      
      if (errors.length > 0) {
        message += `\n\n⚠️ Skipped invalid entries: ${errors.join(', ')}`;
      }

      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...require('../utils/keyboards').backToAdmin
      });
      return true;
    }

    else if (pending.action === 'waiting_keys') {
      pendingActions.delete(userId);

      const keys = text.split('\n').map(k => k.trim()).filter(k => k.length > 0);

      if (keys.length === 0) {
        await global.bot.sendMessage(chatId, '❌ No valid keys found.', {
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      const keysRef = ref(global.db, 'keys');
      let addedCount = 0;

      for (const keyCode of keys) {
        const newKeyRef = push(keysRef);
        await set(newKeyRef, {
          key: keyCode,
          gameId: pending.gameId,
          gameName: pending.gameName,
          duration: pending.duration,
          userId: null,
          claimedAt: null,
          expiresAt: null,
          status: 'unclaimed',
          addedAt: Date.now()
        });
        addedCount++;
      }

      // Update product stats
      const gameRef = ref(global.db, `games/${pending.gameId}`);
      const gameSnapshot = await get(gameRef);
      if (gameSnapshot.exists()) {
        const gameData = gameSnapshot.val();
        await update(gameRef, {
          totalKeys: (gameData.totalKeys || 0) + addedCount,
          unclaimedKeys: (gameData.unclaimedKeys || 0) + addedCount
        });
      }

      await global.bot.sendMessage(chatId, 
        `✅ Added ${addedCount} key${addedCount > 1 ? 's' : ''} for ${pending.gameName} (${pending.duration} day${pending.duration > 1 ? 's' : ''})`, {
        ...require('../utils/keyboards').backToAdmin
      });
      return true;
    }

    else if (pending.action === 'edit_apk_link') {
      pendingActions.delete(userId);
      const newLink = text.toLowerCase() === 'none' ? null : text.trim();
      
      const gameRef = ref(global.db, `games/${pending.gameId}`);
      await update(gameRef, { apkLink: newLink });

      await global.bot.sendMessage(chatId, `✅ APK link updated successfully!`, backToAdmin);
      return true;
    }

    else if (pending.action === 'search_user' || pending.action === 'add_points' || pending.action === 'deduct_points') {
      let targetUserId = text.replace('@', '');

      const usersRef = ref(global.db, 'users');
      const usersSnapshot = await get(usersRef);
      let userSnapshot = null;
      let foundUser = null;

      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();

        if (/^\d+$/.test(targetUserId) && usersData[targetUserId]) {
          foundUser = usersData[targetUserId];
        } else {
          for (const id in usersData) {
            if (usersData[id].username === targetUserId) {
              foundUser = usersData[id];
              targetUserId = id;
              break;
            }
          }
        }
      }

      if (!foundUser) {
        await global.bot.sendMessage(chatId, '❌ User not found.', {
          ...require('../utils/keyboards').backToAdmin
        });
        pendingActions.delete(userId);
        return true;
      }

      if (pending.action === 'search_user') {
        pendingActions.delete(userId);

        const vipStatus = foundUser.vipTier ? `⭐ ${foundUser.vipTier}` : 'Regular';
        const message = `👤 *User Details*\n\n` +
          `Name: ${foundUser.name}\n` +
          `Username: ${foundUser.username ? '@' + foundUser.username : 'Not set'}\n` +
          `ID: \`${targetUserId}\`\n\n` +
          `💰 Balance: ${foundUser.balance || 0} points\n` +
          `👥 Referrals: ${foundUser.totalReferrals || 0}\n` +
          `📅 Joined: ${formatDate(foundUser.joinedAt)}\n` +
          `VIP Status: ${vipStatus}\n` +
          `Status: ${foundUser.isBanned ? '🚫 Banned' : '✅ Active'}`;

        await global.bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Add Points', callback_data: `quick_add_${targetUserId}` }, 
               { text: '➖ Deduct Points', callback_data: `quick_deduct_${targetUserId}` }],
              [{ text: foundUser.vipTier ? '👑 Remove VIP' : '👑 Make VIP', callback_data: `toggle_vip_${targetUserId}` }],
              [{ text: foundUser.isBanned ? '✅ Unban' : '🚫 Ban', callback_data: foundUser.isBanned ? `confirm_unban_${targetUserId}` : `confirm_ban_${targetUserId}` }],
              [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
            ]
          }
        });
        return true;
      }

      if (pending.action === 'add_points' || pending.action === 'deduct_points') {
        pendingActions.set(userId, { 
          action: pending.action === 'add_points' ? 'confirm_add_points' : 'confirm_deduct_points',
          targetUserId: targetUserId,
          targetUser: foundUser
        });

        await global.bot.sendMessage(chatId, `👤 User: ${foundUser.name} (${foundUser.balance || 0} points)\n\nEnter amount:`, {
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }
    }

    else if (pending.action === 'confirm_add_points' || pending.action === 'confirm_deduct_points') {
      pendingActions.delete(userId);

      const amount = parseInt(text);
      if (isNaN(amount) || amount <= 0) {
        await global.bot.sendMessage(chatId, '❌ Invalid amount.', {
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      const userRef = ref(global.db, `users/${pending.targetUserId}`);
      const currentBalance = pending.targetUser.balance || 0;

      let newBalance;
      if (pending.action === 'confirm_add_points') {
        newBalance = currentBalance + amount;
        await update(userRef, { 
          balance: newBalance,
          totalPointsEarned: (pending.targetUser.totalPointsEarned || 0) + amount
        });
        await global.bot.sendMessage(chatId, `✅ Added ${amount} points to ${pending.targetUser.name}. New balance: ${newBalance}`, {
          ...require('../utils/keyboards').backToAdmin
        });
      } else {
        newBalance = Math.max(0, currentBalance - amount);
        await update(userRef, { balance: newBalance });
        await global.bot.sendMessage(chatId, `✅ Deducted ${amount} points from ${pending.targetUser.name}. New balance: ${newBalance}`, {
          ...require('../utils/keyboards').backToAdmin
        });
      }
      return true;
    }

    else if (pending.action === 'ban_user' || pending.action === 'unban_user') {
      pendingActions.delete(userId);

      let targetUserId = text.replace('@', '');
      const usersRef = ref(global.db, 'users');
      const usersSnapshot = await get(usersRef);
      let foundUser = null;
      let isExistingUser = false;

      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();

        if (/^\d+$/.test(targetUserId) && usersData[targetUserId]) {
          foundUser = usersData[targetUserId];
          isExistingUser = true;
        } else {
          for (const id in usersData) {
            if (usersData[id].username === targetUserId) {
              foundUser = usersData[id];
              targetUserId = id;
              isExistingUser = true;
              break;
            }
          }
        }
      }

      if (!foundUser) {
        if (pending.action === 'unban_user') {
          await global.bot.sendMessage(chatId, '❌ User not found in database. Cannot unban a user that was never banned.', {
            ...require('../utils/keyboards').backToAdmin
          });
          return true;
        }

        if (!/^\d+$/.test(targetUserId)) {
          await global.bot.sendMessage(chatId, '❌ Please provide a valid numeric User ID for preemptive bans.', {
            ...require('../utils/keyboards').backToAdmin
          });
          return true;
        }

        await global.bot.sendMessage(chatId, 
          `⚠️ *Preemptive Ban*\n\nUser ID \`${targetUserId}\` is not in the database yet.\n\nThis user will be immediately banned when they try to start the bot.\n\nConfirm preemptive ban?`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Confirm Preemptive Ban', callback_data: `confirm_ban_${targetUserId}` }],
              [{ text: '❌ Cancel', callback_data: 'back_to_admin' }]
            ]
          }
        });
        return true;
      }

      const actionText = pending.action === 'ban_user' ? 'ban' : 'unban';
      const userName = foundUser.name || 'User';

      await global.bot.sendMessage(chatId, 
        `⚠️ Are you sure you want to ${actionText} ${userName}${foundUser.username ? ` (@${foundUser.username})` : ''}?\n\nUser ID: \`${targetUserId}\``, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirm', callback_data: pending.action === 'ban_user' ? `confirm_ban_${targetUserId}` : `confirm_unban_${targetUserId}` }],
            [{ text: '❌ Cancel', callback_data: 'back_to_admin' }]
          ]
        }
      });
      return true;
    }

    else if (pending.action === 'send_feedback') {
      pendingActions.delete(userId);

      const feedbackRef = push(ref(global.db, 'feedback'));
      const userRef = ref(global.db, `users/${userId}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();

      await set(feedbackRef, {
        userId: userId.toString(),
        userName: msg.from.first_name || 'User',
        feedback: text,
        timestamp: Date.now(),
        status: 'new'
      });

      const feedbackMessage = 
        `📬 NEW FEEDBACK RECEIVED\n\n` +
        `User Details:\n` +
        `Name: ${msg.from.first_name || 'User'} ${msg.from.last_name || ''}\n` +
        `Username: @${userData?.username || 'Not set'}\n` +
        `User ID: ${userId}\n` +
        `VIP Status: ${userData?.vipTier ? `${userData.vipTier}` : 'Regular'}\n` +
        `Time: ${new Date().toLocaleString()}\n` +
        `Account Age: ${userData?.joinedAt ? Math.floor((Date.now() - userData.joinedAt) / (1000 * 60 * 60 * 24)) : 0} days\n\n` +
        `Feedback Message:\n` +
        `${text}`;

      const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
      const staffRef = ref(global.db, 'staff');
      const staffSnapshot = await get(staffRef);
      const staffData = staffSnapshot.exists() ? staffSnapshot.val() : {};
      
      const recipientIds = new Set(adminIds.filter(id => id));
      for (const staffId in staffData) {
        if (staffData[staffId].isActive) {
          recipientIds.add(staffId);
        }
      }

      for (const recipientId of recipientIds) {
        try {
          await global.bot.sendMessage(recipientId, feedbackMessage);
        } catch (e) {
          console.log(`Could not notify recipient ${recipientId}:`, e.message);
        }
      }

      await global.bot.sendMessage(chatId, 
        `✅ *Feedback Received!*\n\nThank you for your feedback! We appreciate your input.\n\nOur team will review it shortly.\n\n💚 We're always working to improve!`, {
        parse_mode: 'Markdown',
        ...backToMenu
      });
      return true;
    }

    else if (pending.action === 'broadcast_text') {
      pendingActions.set(userId, { action: 'broadcast_target', messageText: text });

      const { getBroadcastTargetKeyboard } = require('../utils/keyboards');
      await global.bot.sendMessage(chatId, '✅ *Message Received*\n\nChoose broadcast target:', {
        parse_mode: 'Markdown',
        ...getBroadcastTargetKeyboard()
      });
      return true;
    }

    else if (pending.action === 'edit_pricing') {
      pendingActions.delete(userId);

      const newPrice = parseInt(text);
      if (isNaN(newPrice) || newPrice <= 0) {
        await global.bot.sendMessage(chatId, '❌ Invalid price. Please enter a positive number.', {
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      const { updateKeyPrice } = require('./adminHandler');
      await updateKeyPrice(chatId, pending.days, newPrice);
      return true;
    }

    else if (pending.action === 'add_staff') {
      pendingActions.delete(userId);

      const staffId = text.trim();
      
      if (!/^\d+$/.test(staffId)) {
        await global.bot.sendMessage(chatId, '❌ Invalid User ID. Please provide a numeric User ID.', {
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      const userRef = ref(global.db, `users/${staffId}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists()) {
        await global.bot.sendMessage(chatId, '❌ User not found. The user must start the bot first.', {
          ...require('../utils/keyboards').backToAdmin
        });
        return true;
      }

      const user = userSnapshot.val();
      const staffRef = ref(global.db, `staff/${staffId}`);
      
      await set(staffRef, {
        name: user.name,
        username: user.username || '',
        addedAt: Date.now(),
        addedBy: userId.toString(),
        isActive: true
      });

      await global.bot.sendMessage(chatId, `✅ ${user.name} has been added as a staff member!`, {
        ...require('../utils/keyboards').backToAdmin
      });

      try {
        await global.bot.sendMessage(staffId, 
          `🎉 *Congratulations!*\n\nYou have been added as a Support Staff member!\n\n✨ You can now:\n• Accept support requests from users\n• Provide assistance and help\n• End conversations using /end\n\n🔔 You will receive notifications when users request support.`, {
          parse_mode: 'Markdown'
        });
      } catch (e) {
        console.log('Could not notify new staff member:', e.message);
      }

      return true;
    }

  } catch (error) {
    console.error('Error in handleAdminTextInput:', error);
    pendingActions.delete(userId);
    await global.bot.sendMessage(chatId, '❌ Failed to process your input. Please try again.', {
      ...require('../utils/keyboards').backToAdmin
    });
    return true;
  }

  return false;
};

module.exports = { handleCallback, handleAdminTextInput, pendingActions };
