
const { ref, get, set, update, push } = require('firebase/database');
const { backToAdmin, adminPanel } = require('../utils/keyboards');
const { formatDate, isAdmin } = require('../utils/helpers');

const handleAdmin = async (chatId, userId) => {
  if (!isAdmin(userId)) {
    try {
      await global.bot.sendMessage(chatId, '❌ You do not have admin permissions.');
    } catch (error) {
      if (error.response && error.response.body.error_code === 403) {
        console.log(`Admin user ${userId} has blocked the bot`);
      }
    }
    return;
  }
  
  try {
    await global.bot.sendMessage(chatId, '🔐 *Admin Panel*\n\nChoose an option:', {
      parse_mode: 'Markdown',
      ...adminPanel
    });
  } catch (error) {
    if (error.response && error.response.body.error_code === 403) {
      console.log(`Admin user ${userId} has blocked the bot`);
    }
  }
};

const showKeyManagement = async (chatId, messageId = null) => {
  const { keyManagementMenu } = require('../utils/keyboards');
  const message = `🔑 *Key Management*\n\nChoose an option:`;
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyManagementMenu.reply_markup
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...keyManagementMenu
    });
  }
};

const showUserManagement = async (chatId, messageId = null) => {
  const { userManagementMenu } = require('../utils/keyboards');
  const message = `👥 *User Management*\n\nChoose an option:`;
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: userManagementMenu.reply_markup
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...userManagementMenu
    });
  }
};

const showGameManagement = async (chatId, messageId = null) => {
  const gamesRef = ref(global.db, 'games');
  const gamesSnapshot = await get(gamesRef);
  
  const buttons = [];
  let productList = '';
  
  if (gamesSnapshot.exists()) {
    const gamesData = gamesSnapshot.val();
    let index = 1;
    for (const gameId in gamesData) {
      const game = gamesData[gameId];
      const pricingCount = game.pricing ? Object.keys(game.pricing).length : 0;
      const keysInfo = `${game.unclaimedKeys || 0}/${game.totalKeys || 0} keys`;
      productList += `${index}. *${game.name}* - ${keysInfo} (${pricingCount} price tiers)\n`;
      buttons.push([{
        text: `📦 ${game.name}`,
        callback_data: `manage_product_${gameId}`
      }]);
      index++;
    }
  }
  
  if (!productList) {
    productList = '_No products added yet_';
  }
  
  buttons.push([{ text: '➕ Add New Product', callback_data: 'games_add' }]);
  buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);
  
  const message = `📦 *Product Management*\n\n${productList}\n\nSelect a product to manage or add a new one:`;
  
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
};

const showBanManagement = async (chatId, messageId = null) => {
  const { banManagementMenu } = require('../utils/keyboards');
  const message = `🚫 *Ban/Unban Users*\n\nChoose an option:`;
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: banManagementMenu.reply_markup
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...banManagementMenu
    });
  }
};

const showBroadcastMenu = async (chatId, messageId = null) => {
  const { broadcastMenu } = require('../utils/keyboards');
  const message = `📢 *Broadcast*\n\nChoose an option:`;
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: broadcastMenu.reply_markup
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...broadcastMenu
    });
  }
};

const showSettings = async (chatId, messageId = null) => {
  try {
    const claimingRef = ref(global.db, 'settings/claimingEnabled');
    const claimingSnapshot = await get(claimingRef);
    const claimingEnabled = claimingSnapshot.exists() ? claimingSnapshot.val() : true;

    const dailyRewardRef = ref(global.db, 'settings/dailyRewardEnabled');
    const dailyRewardSnapshot = await get(dailyRewardRef);
    const dailyRewardEnabled = dailyRewardSnapshot.exists() ? dailyRewardSnapshot.val() : true;

    const referralMultiplierRef = ref(global.db, 'settings/referralMultiplier');
    const referralMultiplierSnapshot = await get(referralMultiplierRef);
    const referralMultiplier = referralMultiplierSnapshot.exists() ? referralMultiplierSnapshot.val() : 1;

    const maxKeysPerDayRef = ref(global.db, 'settings/maxKeysPerDay');
    const maxKeysPerDaySnapshot = await get(maxKeysPerDayRef);
    const maxKeysPerDay = maxKeysPerDaySnapshot.exists() ? maxKeysPerDaySnapshot.val() : 'unlimited';

    const vipPointsMultiplierRef = ref(global.db, 'settings/vipPointsMultiplier');
    const vipPointsMultiplierSnapshot = await get(vipPointsMultiplierRef);
    const vipPointsMultiplier = vipPointsMultiplierSnapshot.exists() ? vipPointsMultiplierSnapshot.val() : 1;

    const autoExpiryWarningsRef = ref(global.db, 'settings/autoExpiryWarnings');
    const autoExpiryWarningsSnapshot = await get(autoExpiryWarningsRef);
    const autoExpiryWarnings = autoExpiryWarningsSnapshot.exists() ? autoExpiryWarningsSnapshot.val() : true;

    const weeklyBonusRef = ref(global.db, 'settings/weeklyBonusMultiplier');
    const weeklyBonusSnapshot = await get(weeklyBonusRef);
    const weeklyBonus = weeklyBonusSnapshot.exists() ? weeklyBonusSnapshot.val() : 1;

    const message = `⚙️ *BOT SETTINGS*\n\n` +
      `🔑 Key Claiming: ${claimingEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `🎁 Daily Rewards: ${dailyRewardEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `👥 Referral Multiplier: ${referralMultiplier}x\n` +
      `📊 Max Keys/Day: ${maxKeysPerDay === 'unlimited' ? '∞ Unlimited' : maxKeysPerDay}\n` +
      `💎 VIP Points Bonus: ${vipPointsMultiplier}x\n` +
      `⏰ Auto-Expiry Warnings: ${autoExpiryWarnings ? '✅ On' : '❌ Off'}\n` +
      `🔥 Weekly Bonus: ${weeklyBonus}x`;

    const keyboard = {
      inline_keyboard: [
        [{ text: claimingEnabled ? '❌ Disable Claiming' : '✅ Enable Claiming', callback_data: 'settings_toggle_claiming' }],
        [{ text: dailyRewardEnabled ? '❌ Disable Rewards' : '✅ Enable Rewards', callback_data: 'settings_toggle_daily_reward' }],
        [{ text: `👥 Referral: ${referralMultiplier}x`, callback_data: 'settings_referral_multiplier' }],
        [{ text: `📊 Keys/Day: ${maxKeysPerDay}`, callback_data: 'settings_max_keys_per_day' }],
        [{ text: `💎 VIP Points: ${vipPointsMultiplier}x`, callback_data: 'settings_vip_points_multiplier' }],
        [{ text: autoExpiryWarnings ? '⏰ Disable Warnings' : '⏰ Enable Warnings', callback_data: 'settings_toggle_expiry_warnings' }],
        [{ text: `🔥 Weekly: ${weeklyBonus}x`, callback_data: 'settings_weekly_bonus' }],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
      ]
    };

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  } catch (error) {
    console.error('Error in showSettings:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading settings.', backToAdmin);
  }
};

const toggleClaiming = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/claimingEnabled');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : true;
    
    await set(settingsRef, !currentValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in toggleClaiming:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const toggleDailyReward = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/dailyRewardEnabled');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : true;
    
    await set(settingsRef, !currentValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in toggleDailyReward:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const toggleAutoExpiryWarnings = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/autoExpiryWarnings');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : true;
    
    await set(settingsRef, !currentValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in toggleAutoExpiryWarnings:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const cycleReferralMultiplier = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/referralMultiplier');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : 1;
    const multipliers = [1, 2, 3];
    const currentIndex = multipliers.indexOf(currentValue);
    const nextValue = multipliers[(currentIndex + 1) % multipliers.length];
    
    await set(settingsRef, nextValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in cycleReferralMultiplier:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const cycleMaxKeysPerDay = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/maxKeysPerDay');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : 'unlimited';
    const options = ['unlimited', 1, 3, 5];
    const currentIndex = options.indexOf(currentValue);
    const nextValue = options[(currentIndex + 1) % options.length];
    
    await set(settingsRef, nextValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in cycleMaxKeysPerDay:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const cycleVipPointsMultiplier = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/vipPointsMultiplier');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : 1;
    const multipliers = [1, 1.5, 2];
    const currentIndex = multipliers.indexOf(currentValue);
    const nextValue = multipliers[(currentIndex + 1) % multipliers.length];
    
    await set(settingsRef, nextValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in cycleVipPointsMultiplier:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const cycleWeeklyBonus = async (chatId) => {
  try {
    const settingsRef = ref(global.db, 'settings/weeklyBonusMultiplier');
    const settingsSnapshot = await get(settingsRef);
    const currentValue = settingsSnapshot.exists() ? settingsSnapshot.val() : 1;
    const bonuses = [1, 1.5, 2];
    const currentIndex = bonuses.indexOf(currentValue);
    const nextValue = bonuses[(currentIndex + 1) % bonuses.length];
    
    await set(settingsRef, nextValue);
    await showSettings(chatId);
  } catch (error) {
    console.error('Error in cycleWeeklyBonus:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating settings.', backToAdmin);
  }
};

const showExpiredKeys = async (chatId) => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No keys found.', backToAdmin);
      return;
    }

    const now = Date.now();
    let expiredKeys = [];
    const keysData = keysSnapshot.val();
    
    for (const keyId in keysData) {
      const key = keysData[keyId];
      if (key.userId && key.expiresAt && key.expiresAt < now) {
        expiredKeys.push({
          id: keyId,
          game: key.gameName,
          user: key.userId,
          expiredAt: key.expiresAt
        });
      }
    }

    if (expiredKeys.length === 0) {
      await global.bot.sendMessage(chatId, '✅ No expired keys found!', backToAdmin);
      return;
    }

    expiredKeys.sort((a, b) => b.expiredAt - a.expiredAt);
    const recent = expiredKeys.slice(0, 20);

    let message = `⏰ *EXPIRED KEYS* (${expiredKeys.length} total)\n\n`;
    recent.forEach((key, idx) => {
      message += `${idx + 1}. 🎮 ${key.game}\n   👤 User: ${key.user}\n`;
    });

    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...backToAdmin
    });
  } catch (error) {
    console.error('Error in showExpiredKeys:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading expired keys.', backToAdmin);
  }
};

const showCompetitions = async (chatId) => {
  const message = `🏆 *WEEKLY COMPETITIONS*\n\n` +
    `🥇 TOP EARNERS - 100 bonus points\n` +
    `👥 REFERRAL KINGS - VIP membership\n` +
    `🔑 KEY COLLECTOR - 50 bonus points\n\n` +
    `Compete weekly and win rewards!`;

  await global.bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏆 View Rankings', callback_data: 'competition_rankings' }],
        [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
      ]
    }
  });
};

const showStatistics = async (chatId, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    let totalUsers = 0;
    let bannedUsers = 0;
    let blockedUsers = 0;
    let todayUsers = 0;
    let weekUsers = 0;
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      for (const id in users) {
        totalUsers++;
        if (users[id].isBanned) bannedUsers++;
        if (users[id].isBlocked) blockedUsers++;
        if (users[id].joinedAt > dayAgo) todayUsers++;
        if (users[id].joinedAt > weekAgo) weekUsers++;
      }
    }

    const activeUsers = totalUsers - blockedUsers - bannedUsers;
    const activePercent = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
    const blockedPercent = totalUsers > 0 ? Math.round((blockedUsers / totalUsers) * 100) : 0;
    const bannedPercent = totalUsers > 0 ? Math.round((bannedUsers / totalUsers) * 100) : 0;

    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    let totalKeys = 0;
    let claimedKeys = 0;
    let unclaimedKeys = 0;
    let expiredKeys = 0;
    let todayKeys = 0;
    
    if (keysSnapshot.exists()) {
      const keys = keysSnapshot.val();
      for (const id in keys) {
        totalKeys++;
        if (keys[id].userId) {
          claimedKeys++;
          if (keys[id].claimedAt > dayAgo) todayKeys++;
          if (keys[id].expiresAt && keys[id].expiresAt < now) expiredKeys++;
        } else {
          unclaimedKeys++;
        }
      }
    }

    const claimedPercent = totalKeys > 0 ? Math.round((claimedKeys / totalKeys) * 100) : 0;
    const unclaimedPercent = totalKeys > 0 ? Math.round((unclaimedKeys / totalKeys) * 100) : 0;

    const gamesRef = ref(global.db, 'games');
    const gamesSnapshot = await get(gamesRef);
    let totalGames = 0;
    if (gamesSnapshot.exists()) {
      totalGames = Object.keys(gamesSnapshot.val()).length;
    }

    const channelsRef = ref(global.db, 'channels');
    const channelsSnapshot = await get(channelsRef);
    const totalChannels = channelsSnapshot.exists() ? Object.keys(channelsSnapshot.val()).length : 0;

    const groupsRef = ref(global.db, 'groups');
    const groupsSnapshot = await get(groupsRef);
    const totalGroups = groupsSnapshot.exists() ? Object.keys(groupsSnapshot.val()).length : 0;

    const message = `📈 *BOT STATISTICS*\n` +
      `Last Updated: ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n` +
      `╔════════════════════════════╗\n` +
      `║        👥 USERS             ║\n` +
      `╠════════════════════════════╣\n` +
      `║ Total: ${totalUsers.toLocaleString()}               \n` +
      `║ Active: ${activeUsers.toLocaleString()} (${activePercent}%)        \n` +
      `║ Blocked: ${blockedUsers} (${blockedPercent}%)           \n` +
      `║ Banned: ${bannedUsers} (${bannedPercent}%)            \n` +
      `║ Today: +${todayUsers} users          \n` +
      `║ This Week: +${weekUsers} users      \n` +
      `╚════════════════════════════╝\n\n` +
      `╔════════════════════════════╗\n` +
      `║        🔑 KEYS              ║\n` +
      `╠════════════════════════════╣\n` +
      `║ Total Added: ${totalKeys}           \n` +
      `║ Claimed: ${claimedKeys} (${claimedPercent}%)         \n` +
      `║ Unclaimed: ${unclaimedKeys} (${unclaimedPercent}%)       \n` +
      `║ Expired: ${expiredKeys}                \n` +
      `║ Today: ${todayKeys} claimed          \n` +
      `╚════════════════════════════╝\n\n` +
      `╔════════════════════════════╗\n` +
      `║        🎮 GAMES             ║\n` +
      `╠════════════════════════════╣\n` +
      `║ Total Games: ${totalGames}             \n` +
      `╚════════════════════════════╝\n\n` +
      `╔════════════════════════════╗\n` +
      `║      📢 BROADCASTS          ║\n` +
      `╠════════════════════════════╣\n` +
      `║ Channels: ${totalChannels}                \n` +
      `║ Groups: ${totalGroups}                  \n` +
      `╚════════════════════════════╝`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Refresh', callback_data: 'admin_stats' }],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
      ]
    };

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  } catch (error) {
    console.error('Error in showStatistics:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading statistics.', backToAdmin);
  }
};

const showTopReferrers = async (chatId, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const users = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      if ((usersData[id].totalReferrals || 0) > 0) {
        users.push({ 
          id, 
          name: usersData[id].name, 
          username: usersData[id].username,
          referrals: usersData[id].totalReferrals || 0 
        });
      }
    }

    users.sort((a, b) => b.referrals - a.referrals);
    const top10 = users.slice(0, 10);

    if (top10.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No referrers found yet.', backToAdmin);
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let message = `🏆 *Top Referrers*\n\n`;
    
    top10.forEach((user, idx) => {
      const displayName = user.username ? `@${user.username}` : user.name;
      message += `${medals[idx]} ${displayName} - ${user.referrals} referrals\n`;
    });

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showTopReferrers:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading top referrers.', backToAdmin);
  }
};

const showTopEarners = async (chatId, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const users = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      if ((usersData[id].totalPointsEarned || 0) > 0) {
        users.push({ 
          id, 
          name: usersData[id].name, 
          username: usersData[id].username,
          points: usersData[id].totalPointsEarned || 0 
        });
      }
    }

    users.sort((a, b) => b.points - a.points);
    const top10 = users.slice(0, 10);

    if (top10.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No point earners found yet.', backToAdmin);
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let message = `💰 *Top Point Earners*\n\n`;
    
    top10.forEach((user, idx) => {
      const displayName = user.username ? `@${user.username}` : user.name;
      message += `${medals[idx]} ${displayName} - ${user.points} points\n`;
    });

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showTopEarners:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading top earners.', backToAdmin);
  }
};

const showMostKeysClaimed = async (chatId, messageId = null) => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No keys found.', backToAdmin);
      return;
    }

    const userKeys = {};
    const keysData = keysSnapshot.val();
    for (const keyId in keysData) {
      if (keysData[keyId].userId) {
        const userId = keysData[keyId].userId;
        userKeys[userId] = (userKeys[userId] || 0) + 1;
      }
    }

    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const usersData = usersSnapshot.val();
    const users = [];
    
    for (const userId in userKeys) {
      if (usersData[userId]) {
        users.push({
          id: userId,
          name: usersData[userId].name,
          username: usersData[userId].username,
          keysCount: userKeys[userId]
        });
      }
    }

    users.sort((a, b) => b.keysCount - a.keysCount);
    const top10 = users.slice(0, 10);

    if (top10.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No keys claimed yet.', backToAdmin);
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let message = `🔑 *Most Keys Claimed*\n\n`;
    
    top10.forEach((user, idx) => {
      const displayName = user.username ? `@${user.username}` : user.name;
      message += `${medals[idx]} ${displayName} - ${user.keysCount} keys\n`;
    });

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showMostKeysClaimed:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading key statistics.', backToAdmin);
  }
};

const showRecentJoiners = async (chatId, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const users = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      users.push({ 
        id, 
        name: usersData[id].name, 
        username: usersData[id].username,
        joinedAt: usersData[id].joinedAt 
      });
    }

    users.sort((a, b) => b.joinedAt - a.joinedAt);
    const recent20 = users.slice(0, 20);

    let message = `📅 *Recent Joiners* (Last 20)\n\n`;
    
    recent20.forEach((user, idx) => {
      const displayName = user.username ? `@${user.username}` : user.name;
      message += `${idx + 1}. ${displayName}\n`;
      message += `   Joined: ${formatDate(user.joinedAt)}\n\n`;
    });

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showRecentJoiners:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading recent joiners.', backToAdmin);
  }
};

const showBlockedUsers = async (chatId, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const blockedUsers = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      if (usersData[id].isBlocked) {
        blockedUsers.push({ id, ...usersData[id] });
      }
    }

    if (blockedUsers.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No blocked users found.', backToAdmin);
      return;
    }

    let message = `🚷 *Blocked Users*\n\n`;
    
    blockedUsers.forEach((user, idx) => {
      message += `${idx + 1}. ${user.name}`;
      if (user.username) message += ` (@${user.username})`;
      message += `\n   ID: \`${user.id}\`\n\n`;
    });

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showBlockedUsers:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading blocked users.', backToAdmin);
  }
};

const showGameStats = async (chatId, messageId = null) => {
  try {
    const gamesRef = ref(global.db, 'games');
    const gamesSnapshot = await get(gamesRef);
    
    if (!gamesSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No games found.', backToAdmin);
      return;
    }

    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    const gamesData = gamesSnapshot.val();
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    let message = `🎮 *GAME STATISTICS DASHBOARD*\n\n`;

    for (const gameId in gamesData) {
      const game = gamesData[gameId];
      if (!game.isActive) continue;

      let totalKeys = 0;
      let claimedKeys = 0;
      let unclaimedKeys = 0;
      const durationStats = {};
      let todayKeys = 0;
      let weekKeys = 0;
      let monthKeys = 0;
      let lastClaimedTime = 0;

      if (keysSnapshot.exists()) {
        const keysData = keysSnapshot.val();
        for (const keyId in keysData) {
          const key = keysData[keyId];
          if (key.gameId === gameId) {
            totalKeys++;
            
            if (key.userId) {
              claimedKeys++;
              if (key.claimedAt > dayAgo) todayKeys++;
              if (key.claimedAt > weekAgo) weekKeys++;
              if (key.claimedAt > monthAgo) monthKeys++;
              if (key.claimedAt > lastClaimedTime) lastClaimedTime = key.claimedAt;
            } else {
              unclaimedKeys++;
            }

            const duration = key.duration;
            if (!durationStats[duration]) {
              durationStats[duration] = { claimed: 0, total: 0 };
            }
            durationStats[duration].total++;
            if (key.userId) durationStats[duration].claimed++;
          }
        }
      }

      const claimedPercent = totalKeys > 0 ? Math.round((claimedKeys / totalKeys) * 100) : 0;
      const unclaimedPercent = totalKeys > 0 ? Math.round((unclaimedKeys / totalKeys) * 100) : 0;

      let mostPopularDuration = null;
      let mostPopularCount = 0;
      for (const duration in durationStats) {
        if (durationStats[duration].claimed > mostPopularCount) {
          mostPopularCount = durationStats[duration].claimed;
          mostPopularDuration = duration;
        }
      }

      const lastClaimedText = lastClaimedTime > 0 
        ? `${Math.floor((now - lastClaimedTime) / 60000)} min ago` 
        : 'Never';

      message += `╔════════════════════════════╗\n`;
      message += `║   🎮 ${game.name}           \n`;
      message += `╠════════════════════════════╣\n`;
      message += `║ Total Keys: ${totalKeys}            \n`;
      message += `║ Claimed: ${claimedKeys} (${claimedPercent}%)          \n`;
      message += `║ Unclaimed: ${unclaimedKeys} (${unclaimedPercent}%)        \n`;
      if (mostPopularDuration) {
        message += `║ Popular: ${mostPopularDuration} days           \n`;
      }
      message += `║ Last Claimed: ${lastClaimedText}    \n`;
      message += `╚════════════════════════════╝\n\n`;

      if (Object.keys(durationStats).length > 0) {
        message += `📊 Duration Breakdown:\n`;
        const sortedDurations = Object.keys(durationStats).sort((a, b) => parseInt(a) - parseInt(b));
        sortedDurations.forEach(duration => {
          const stats = durationStats[duration];
          const popular = duration === mostPopularDuration ? ' ⭐ Most Popular' : '';
          message += `• ${duration} Day${duration > 1 ? 's' : ''}: ${stats.claimed} claimed / ${stats.total} total${popular}\n`;
        });
        message += `\n`;
      }

      message += `📈 Claiming Trend:\n`;
      message += `• Today: ${todayKeys} keys\n`;
      message += `• This Week: ${weekKeys} keys\n`;
      message += `• This Month: ${monthKeys} keys\n\n`;
      message += `───────────────────────────\n\n`;
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Refresh Stats', callback_data: 'games_stats' }],
        [{ text: '🔙 Back to Game Management', callback_data: 'admin_games' }]
      ]
    };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  } catch (error) {
    console.error('Error in showGameStats:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading game statistics.', backToAdmin);
  }
};

const showAllGames = async (chatId, messageId = null) => {
  try {
    const gamesRef = ref(global.db, 'games');
    const gamesSnapshot = await get(gamesRef);
    
    if (!gamesSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No games found.', backToAdmin);
      return;
    }

    let message = `🎮 *All Games*\n\n`;
    const gamesData = gamesSnapshot.val();
    let index = 1;
    
    for (const gameId in gamesData) {
      const game = gamesData[gameId];
      const status = game.isActive ? '✅' : '❌';
      message += `${index}. ${status} ${game.name}\n`;
      message += `   ID: \`${gameId}\`\n`;
      message += `   Added: ${formatDate(game.addedAt)}\n\n`;
      index++;
    }

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showAllGames:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading games.', backToAdmin);
  }
};

const showAllKeys = async (chatId, page = 0, messageId = null) => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No keys found.', backToAdmin);
      return;
    }

    const allKeys = [];
    const keysData = keysSnapshot.val();
    for (const id in keysData) {
      allKeys.push({ id, ...keysData[id] });
    }

    const pageSize = 10;
    const totalPages = Math.ceil(allKeys.length / pageSize);
    const startIdx = page * pageSize;
    const pageKeys = allKeys.slice(startIdx, startIdx + pageSize);

    let message = `🔑 *All Keys* (Page ${page + 1}/${totalPages})\n`;
    message += `Total: ${allKeys.length} keys\n\n`;
    
    pageKeys.forEach((key, idx) => {
      const status = key.userId ? '✅ Claimed' : '⏳ Unclaimed';
      message += `${startIdx + idx + 1}. ${key.gameName} - ${key.duration}D\n`;
      message += `   Status: ${status}\n`;
      if (key.userId) {
        message += `   Claimed: ${formatDate(key.claimedAt)}\n`;
      }
      message += `\n`;
    });

    const buttons = [];
    const navButtons = [];
    
    if (page > 0) {
      navButtons.push({ text: '⬅️ Previous', callback_data: `keys_page_${page - 1}` });
    }
    if (page < totalPages - 1) {
      navButtons.push({ text: 'Next ➡️', callback_data: `keys_page_${page + 1}` });
    }
    
    if (navButtons.length > 0) buttons.push(navButtons);
    buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    console.error('Error in showAllKeys:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading keys.', backToAdmin);
  }
};

const showUnclaimedKeys = async (chatId, page = 0, messageId = null) => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No keys found.', backToAdmin);
      return;
    }

    const unclaimedKeys = [];
    const keysData = keysSnapshot.val();
    for (const id in keysData) {
      if (!keysData[id].userId) {
        unclaimedKeys.push({ id, ...keysData[id] });
      }
    }

    if (unclaimedKeys.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No unclaimed keys found.', backToAdmin);
      return;
    }

    const pageSize = 10;
    const totalPages = Math.ceil(unclaimedKeys.length / pageSize);
    const startIdx = page * pageSize;
    const pageKeys = unclaimedKeys.slice(startIdx, startIdx + pageSize);

    let message = `⏳ *Unclaimed Keys* (Page ${page + 1}/${totalPages})\n`;
    message += `Total: ${unclaimedKeys.length} keys\n\n`;
    
    pageKeys.forEach((key, idx) => {
      message += `${startIdx + idx + 1}. ${key.gameName} - ${key.duration}D\n`;
      message += `   Added: ${formatDate(key.addedAt)}\n\n`;
    });

    const buttons = [];
    const navButtons = [];
    
    if (page > 0) {
      navButtons.push({ text: '⬅️ Previous', callback_data: `unclaimed_page_${page - 1}` });
    }
    if (page < totalPages - 1) {
      navButtons.push({ text: 'Next ➡️', callback_data: `unclaimed_page_${page + 1}` });
    }
    
    if (navButtons.length > 0) buttons.push(navButtons);
    buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    console.error('Error in showUnclaimedKeys:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading keys.', backToAdmin);
  }
};

const showClaimedKeys = async (chatId, page = 0, messageId = null) => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No keys found.', backToAdmin);
      return;
    }

    const claimedKeys = [];
    const keysData = keysSnapshot.val();
    for (const id in keysData) {
      if (keysData[id].userId) {
        claimedKeys.push({ id, ...keysData[id] });
      }
    }

    if (claimedKeys.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No claimed keys found.', backToAdmin);
      return;
    }

    const pageSize = 10;
    const totalPages = Math.ceil(claimedKeys.length / pageSize);
    const startIdx = page * pageSize;
    const pageKeys = claimedKeys.slice(startIdx, startIdx + pageSize);

    let message = `✅ *Claimed Keys* (Page ${page + 1}/${totalPages})\n`;
    message += `Total: ${claimedKeys.length} keys\n\n`;
    
    pageKeys.forEach((key, idx) => {
      message += `${startIdx + idx + 1}. ${key.gameName} - ${key.duration}D\n`;
      message += `   Claimed: ${formatDate(key.claimedAt)}\n`;
      message += `   User ID: \`${key.userId}\`\n\n`;
    });

    const buttons = [];
    const navButtons = [];
    
    if (page > 0) {
      navButtons.push({ text: '⬅️ Previous', callback_data: `claimed_page_${page - 1}` });
    }
    if (page < totalPages - 1) {
      navButtons.push({ text: 'Next ➡️', callback_data: `claimed_page_${page + 1}` });
    }
    
    if (navButtons.length > 0) buttons.push(navButtons);
    buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    console.error('Error in showClaimedKeys:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading keys.', backToAdmin);
  }
};

const showAllUsers = async (chatId, page = 0, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const allUsers = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      allUsers.push({ id, ...usersData[id] });
    }

    const pageSize = 10;
    const totalPages = Math.ceil(allUsers.length / pageSize);
    const startIdx = page * pageSize;
    const pageUsers = allUsers.slice(startIdx, startIdx + pageSize);

    let message = `👥 *All Users* (Page ${page + 1}/${totalPages})\n`;
    message += `Total: ${allUsers.length} users\n\n`;
    
    pageUsers.forEach((user, idx) => {
      const status = user.isBanned ? '🚫 Banned' : '✅ Active';
      message += `${startIdx + idx + 1}. ${user.name}`;
      if (user.username) message += ` (@${user.username})`;
      message += `\n   Status: ${status}\n`;
      message += `   Balance: ${user.balance || 0} pts\n\n`;
    });

    const buttons = [];
    const navButtons = [];
    
    if (page > 0) {
      navButtons.push({ text: '⬅️ Previous', callback_data: `users_page_${page - 1}` });
    }
    if (page < totalPages - 1) {
      navButtons.push({ text: 'Next ➡️', callback_data: `users_page_${page + 1}` });
    }
    
    if (navButtons.length > 0) buttons.push(navButtons);
    buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]);

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    console.error('Error in showAllUsers:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading users.', backToAdmin);
  }
};

const showBannedUsers = async (chatId, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const bannedUsers = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      if (usersData[id].isBanned) {
        bannedUsers.push({ id, ...usersData[id] });
      }
    }

    if (bannedUsers.length === 0) {
      await global.bot.sendMessage(chatId, '📋 No banned users found.', backToAdmin);
      return;
    }

    let message = `🚫 *Banned Users*\n\n`;
    
    bannedUsers.forEach((user, idx) => {
      message += `${idx + 1}. ${user.name}`;
      if (user.username) message += ` (@${user.username})`;
      message += `\n`;
      message += `   ID: \`${user.id}\`\n`;
      if (user.preemptiveBan) message += `   ⚠️ Preemptive Ban\n`;
      message += `\n`;
    });

    const keyboard = { ...backToAdmin };
    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    console.error('Error in showBannedUsers:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading banned users.', backToAdmin);
  }
};

const exportUserDataToCSV = async (chatId) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users to export.', backToAdmin);
      return;
    }

    let csv = 'User ID,Name,Username,Balance,Total Referrals,Total Points Earned,Total Points Spent,Member Since,Status\n';
    const usersData = usersSnapshot.val();
    let count = 0;
    
    for (const userId in usersData) {
      const user = usersData[userId];
      const status = user.isBanned ? 'Banned' : user.isBlocked ? 'Blocked' : 'Active';
      csv += `${userId},"${user.name || ''}","${user.username || ''}",${user.balance || 0},${user.totalReferrals || 0},${user.totalPointsEarned || 0},${user.totalPointsSpent || 0},${new Date(user.joinedAt).toISOString()},"${status}"\n`;
      count++;
    }

    await global.bot.sendMessage(chatId, `📊 *User Data Export*\n\n✅ Successfully exported ${count} users\n\n_CSV data generated and logged_`, {
      parse_mode: 'Markdown',
      ...backToAdmin
    });
    
    console.log('📊 USER CSV EXPORT:\n' + csv);
  } catch (error) {
    console.error('Error exporting user data:', error);
    await global.bot.sendMessage(chatId, '❌ Error exporting data.', backToAdmin);
  }
};

const exportKeyDataToCSV = async (chatId) => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No keys to export.', backToAdmin);
      return;
    }

    let csv = 'Key ID,Game,Duration,Key,Status,Claimed By,Claimed At,Expires At,Points Cost\n';
    const keysData = keysSnapshot.val();
    let count = 0;
    
    for (const keyId in keysData) {
      const key = keysData[keyId];
      const status = key.userId ? 'Claimed' : 'Unclaimed';
      csv += `${keyId},"${key.gameName || ''}",${key.duration || 0},"${key.key || ''}","${status}",${key.userId || 'N/A'},${key.claimedAt ? new Date(key.claimedAt).toISOString() : 'N/A'},${key.expiresAt ? new Date(key.expiresAt).toISOString() : 'N/A'},${key.pointsCost || 0}\n`;
      count++;
    }

    await global.bot.sendMessage(chatId, `📊 *Key Data Export*\n\n✅ Successfully exported ${count} keys\n\n_CSV data generated and logged_`, {
      parse_mode: 'Markdown',
      ...backToAdmin
    });
    
    console.log('📊 KEY CSV EXPORT:\n' + csv);
  } catch (error) {
    console.error('Error exporting key data:', error);
    await global.bot.sendMessage(chatId, '❌ Error exporting data.', backToAdmin);
  }
};

const showVIPTierMenu = async (chatId) => {
  const message = `💎 *VIP/Premium Membership Tiers*\n\n` +
    `Unlock exclusive benefits and boost your earning potential!\n\n` +
    `╔══════════════════════════════════╗\n` +
    `║  🥉 *SILVER* - Free Tier         ║\n` +
    `║  • Base earning rate             ║\n` +
    `║  • Standard support              ║\n` +
    `╚══════════════════════════════════╝\n\n` +
    `╔══════════════════════════════════╗\n` +
    `║  🥈 *GOLD* - 50 Points/Month    ║\n` +
    `║  ✨ 1.5x points multiplier       ║\n` +
    `║  ⚡ Priority support            ║\n` +
    `║  🎁 Exclusive daily bonus        ║\n` +
    `║  📊 Advanced stats               ║\n` +
    `╚══════════════════════════════════╝\n\n` +
    `╔══════════════════════════════════╗\n` +
    `║  🥇 *PLATINUM* - 150 Points/Month║\n` +
    `║  ✨ 2x points multiplier         ║\n` +
    `║  ⚡ VIP support (24/7)           ║\n` +
    `║  🎁 Premium daily bonus          ║\n` +
    `║  👑 Exclusive keys access        ║\n` +
    `║  🎊 Monthly reward               ║\n` +
    `╚══════════════════════════════════╝\n\n` +
    `Your Current Tier: 🥉 SILVER`;

  await global.bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🥈 Upgrade to GOLD', callback_data: 'vip_upgrade_gold' }],
        [{ text: '🥇 Upgrade to PLATINUM', callback_data: 'vip_upgrade_platinum' }],
        [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
      ]
    }
  });
};

const showUserSearchPrompt = async (chatId, messageId = null) => {
  const message = `🔍 *Search User*\n\nEnter the user ID or username to search:`;
  
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: backToAdmin.reply_markup
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...backToAdmin
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...backToAdmin
    });
  }
  
  // Mark this chat as waiting for user search input
  const userStateRef = ref(global.db, `adminStates/${chatId}`);
  await set(userStateRef, { action: 'searching_user', timestamp: Date.now() });
};

const showUserDetails = async (chatId, targetUserId, messageId = null) => {
  try {
    const userRef = ref(global.db, `users/${targetUserId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '❌ User not found.', backToAdmin);
      return;
    }

    const foundUser = userSnapshot.val();
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

    const buttons = [
      [{ text: '➕ Add Points', callback_data: `quick_add_${targetUserId}` }, 
       { text: '➖ Deduct Points', callback_data: `quick_deduct_${targetUserId}` }],
      [{ text: foundUser.vipTier ? '👑 Remove VIP' : '👑 Make VIP', callback_data: `toggle_vip_${targetUserId}` }],
      [{ text: foundUser.isBanned ? '✅ Unban' : '🚫 Ban', callback_data: foundUser.isBanned ? `confirm_unban_${targetUserId}` : `confirm_ban_${targetUserId}` }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ];

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }).catch(async (error) => {
        console.error(`Edit message error:`, error.message);
        await global.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    console.error('Error in showUserDetails:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading user details.', backToAdmin);
  }
};

const searchUserByQuery = async (chatId, query, messageId = null) => {
  try {
    const usersRef = ref(global.db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, '📋 No users found.', backToAdmin);
      return;
    }

    const usersData = usersSnapshot.val();
    
    // Strip @ from query if present
    const cleanQuery = query.replace(/^@/, '').toLowerCase();
    
    // Find user by ID or username
    let foundUserId = null;
    for (const userId in usersData) {
      const user = usersData[userId];
      if (userId.includes(cleanQuery) || 
          (user.username && user.username.toLowerCase().includes(cleanQuery)) || 
          (user.name && user.name.toLowerCase().includes(cleanQuery))) {
        foundUserId = userId;
        break;
      }
    }

    if (!foundUserId) {
      await global.bot.sendMessage(chatId, `❌ No users found matching "${query}"`, backToAdmin);
      return;
    }

    // Directly show user details
    await showUserDetails(chatId, foundUserId, messageId);
    
    // Clear admin state
    const userStateRef = ref(global.db, `adminStates/${chatId}`);
    await set(userStateRef, { action: null, timestamp: Date.now() });
  } catch (error) {
    console.error('Error in searchUserByQuery:', error);
    await global.bot.sendMessage(chatId, '❌ Error searching users.', backToAdmin);
  }
};

const showPricingMenu = async (chatId, messageId = null) => {
  const { pricingMenu } = require('../utils/keyboards');
  const message = `💰 *Key Pricing Management*\n\nManage the point costs for different key durations:`;
  if (messageId) {
    await global.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: pricingMenu.reply_markup
    }).catch(async (error) => {
      console.error(`Edit message error:`, error.message);
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...pricingMenu
      });
    });
  } else {
    await global.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...pricingMenu
    });
  }
};

const showCurrentPrices = async (chatId, messageId = null) => {
  try {
    const pricesRef = ref(global.db, 'settings/pointsConfig');
    const pricesSnapshot = await get(pricesRef);
    const prices = pricesSnapshot.exists() ? pricesSnapshot.val() : {
      '1day': 3,
      '3days': 6,
      '7days': 10,
      '15days': 15,
      '30days': 20
    };

    const message = `💰 *Current Key Prices*\n\n` +
      `📅 1 Day: ${prices['1day'] || 3} points\n` +
      `📅 3 Days: ${prices['3days'] || 6} points\n` +
      `📅 7 Days: ${prices['7days'] || 10} points\n` +
      `📅 15 Days: ${prices['15days'] || 15} points\n` +
      `📅 30 Days: ${prices['30days'] || 20} points`;

    const { pricingMenu } = require('../utils/keyboards');

    if (messageId) {
      await global.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: pricingMenu.reply_markup
      }).catch(() => {});
    } else {
      await global.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...pricingMenu
      });
    }
  } catch (error) {
    console.error('Error in showCurrentPrices:', error);
    await global.bot.sendMessage(chatId, '❌ Error loading prices.', backToAdmin);
  }
};

const updateKeyPrice = async (chatId, days, newPrice) => {
  try {
    const key = `${days}day${days > 1 ? 's' : ''}`;
    const priceRef = ref(global.db, `settings/pointsConfig/${key}`);
    await set(priceRef, newPrice);

    await global.bot.sendMessage(chatId, `✅ Price for ${days} day key updated to ${newPrice} points!`, {
      ...backToAdmin
    });
  } catch (error) {
    console.error('Error in updateKeyPrice:', error);
    await global.bot.sendMessage(chatId, '❌ Error updating price.', backToAdmin);
  }
};

module.exports = {
  handleAdmin,
  showKeyManagement,
  showUserManagement,
  showGameManagement,
  showBanManagement,
  showStatistics,
  showBroadcastMenu,
  showSettings,
  toggleClaiming,
  toggleDailyReward,
  toggleAutoExpiryWarnings,
  cycleReferralMultiplier,
  cycleMaxKeysPerDay,
  cycleVipPointsMultiplier,
  cycleWeeklyBonus,
  showExpiredKeys,
  showCompetitions,
  showAllGames,
  showAllKeys,
  showUnclaimedKeys,
  showClaimedKeys,
  showAllUsers,
  showBannedUsers,
  showTopReferrers,
  showTopEarners,
  showMostKeysClaimed,
  showRecentJoiners,
  showBlockedUsers,
  showUserDetails,
  showGameStats,
  exportUserDataToCSV,
  exportKeyDataToCSV,
  showVIPTierMenu,
  showUserSearchPrompt,
  searchUserByQuery,
  showPricingMenu,
  showCurrentPrices,
  updateKeyPrice
};
