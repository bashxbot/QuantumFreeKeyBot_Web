const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '🔗 Refer Users' }, { text: '👤 My Profile' }],
      [{ text: '🔑 Claim Key' }, { text: '📊 My Stats' }],
      [{ text: '🎁 Daily Reward' }, { text: '🏆 Leaderboard' }],
      [{ text: '📜 Key History' }, { text: '❓ Help & Support' }]
    ],
    resize_keyboard: true
  }
};

const adminPanel = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔑 Manage Keys', callback_data: 'admin_keys' }, { text: '👥 Manage Users', callback_data: 'admin_users' }],
      [{ text: '📦 Manage Products', callback_data: 'admin_games' }, { text: '🚫 Ban/Unban Users', callback_data: 'admin_ban' }],
      [{ text: '📈 Statistics', callback_data: 'admin_stats' }, { text: '📢 Broadcast', callback_data: 'admin_broadcast' }],
      [{ text: '👥 Support & Staff', callback_data: 'admin_support' }, { text: '⚙️ Settings', callback_data: 'admin_settings' }],
      [{ text: '🔙 Close Admin Panel', callback_data: 'close_admin' }]
    ]
  }
};

const backToMenu = {
  reply_markup: {
    inline_keyboard: [[{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]]
  }
};

const backToAdmin = {
  reply_markup: {
    inline_keyboard: [[{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]]
  }
};

const getGameSelectionKeyboard = (games) => {
  const buttons = games.map(game => ([{
    text: `📦 ${game.name}`,
    callback_data: `select_game_${game.id}`
  }]));
  buttons.push([{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]);
  return { reply_markup: { inline_keyboard: buttons } };
};

const getDurationKeyboard = (gameId, balance, pricing = null) => {
  let buttons = [];
  
  if (pricing && Object.keys(pricing).length > 0) {
    const sortedDurations = Object.keys(pricing)
      .map(key => ({
        days: parseInt(key.replace('day', '')),
        points: pricing[key]
      }))
      .sort((a, b) => a.days - b.days);
    
    buttons = sortedDurations.map(d => ([{
      text: `${d.days} Day${d.days > 1 ? 's' : ''} - ${d.points} Points ${balance >= d.points ? '✅' : '❌'}`,
      callback_data: `duration_${d.days}_${gameId}_${d.points}`
    }]));
  } else {
    const defaultDurations = [
      { days: 1, points: 3 },
      { days: 3, points: 6 },
      { days: 7, points: 10 },
      { days: 15, points: 15 },
      { days: 30, points: 20 }
    ];
    
    buttons = defaultDurations.map(d => ([{
      text: `${d.days} Day${d.days > 1 ? 's' : ''} - ${d.points} Points ${balance >= d.points ? '✅' : '❌'}`,
      callback_data: `duration_${d.days}_${gameId}_${d.points}`
    }]));
  }

  buttons.push([{ text: '🔙 Back to Products', callback_data: 'claim_key' }]);
  buttons.push([{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]);

  return { reply_markup: { inline_keyboard: buttons } };
};

const getConfirmClaimKeyboard = (gameId, duration, points) => {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Confirm', callback_data: `confirm_claim_${gameId}_${duration}_${points}` }],
        [{ text: '❌ Cancel', callback_data: 'claim_key' }],
        [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
      ]
    }
  };
};

const keyManagementMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '➕ Add Keys', callback_data: 'keys_add' }, { text: '➖ Remove Keys', callback_data: 'keys_remove' }],
      [{ text: '📋 All Keys', callback_data: 'keys_all' }, { text: '✅ Claimed Keys', callback_data: 'keys_claimed' }],
      [{ text: '⭕ Unclaimed Keys', callback_data: 'keys_unclaimed' }, { text: '📦 Keys by Product', callback_data: 'keys_by_game' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

const userManagementMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📋 All Users', callback_data: 'users_all' }],
      [{ text: '🔍 Search User', callback_data: 'users_search' }],
      [{ text: '📊 Top Referrers', callback_data: 'users_top_referrers' }],
      [{ text: '💰 Top Point Earners', callback_data: 'users_top_earners' }],
      [{ text: '🔑 Most Keys Claimed', callback_data: 'users_most_keys' }],
      [{ text: '📅 Recent Joiners', callback_data: 'users_recent' }],
      [{ text: '🚫 Banned Users', callback_data: 'banned_list' }],
      [{ text: '🚷 Blocked Users', callback_data: 'blocked_list' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

const gameManagementMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '➕ Add New Product', callback_data: 'games_add' }],
      [{ text: '💰 Edit Product Pricing', callback_data: 'games_edit_pricing' }],
      [{ text: '📊 Product Stats Dashboard', callback_data: 'games_stats' }],
      [{ text: '📋 All Products', callback_data: 'games_all' }],
      [{ text: '➖ Remove Product', callback_data: 'games_remove' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

const pricingMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📋 View Current Prices', callback_data: 'pricing_view' }],
      [{ text: '✏️ Edit 1 Day Price', callback_data: 'pricing_edit_1' }],
      [{ text: '✏️ Edit 3 Days Price', callback_data: 'pricing_edit_3' }],
      [{ text: '✏️ Edit 7 Days Price', callback_data: 'pricing_edit_7' }],
      [{ text: '✏️ Edit 15 Days Price', callback_data: 'pricing_edit_15' }],
      [{ text: '✏️ Edit 30 Days Price', callback_data: 'pricing_edit_30' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

const banManagementMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🚫 Ban User', callback_data: 'ban_user' }, { text: '✅ Unban User', callback_data: 'unban_user' }],
      [{ text: '📋 Banned Users List', callback_data: 'banned_list' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

const broadcastMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📝 Send Text Message', callback_data: 'broadcast_text' }],
      [{ text: '🖼️ Send Photo + Text', callback_data: 'broadcast_photo' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

const getBroadcastTargetKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👥 All Users', callback_data: 'broadcast_target_all_users' }],
      [{ text: '✅ Active Users Only', callback_data: 'broadcast_target_active' }],
      [{ text: '📢 Channels', callback_data: 'broadcast_target_channels' }],
      [{ text: '💬 Groups', callback_data: 'broadcast_target_groups' }],
      [{ text: '🌐 Everywhere', callback_data: 'broadcast_target_everywhere' }],
      [{ text: '❌ Cancel', callback_data: 'back_to_admin' }]
    ]
  }
});

const settingsMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔑 Key Claiming', callback_data: 'settings_toggle_claiming' }],
      [{ text: '✏️ Edit Channel', callback_data: 'settings_edit_channel' }],
      [{ text: '✏️ Edit Referral Reward', callback_data: 'settings_edit_referral' }],
      [{ text: '✏️ Edit Key Prices', callback_data: 'settings_edit_prices' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'back_to_admin' }]
    ]
  }
};

module.exports = {
  mainMenu,
  adminPanel,
  backToMenu,
  backToAdmin,
  getGameSelectionKeyboard,
  getDurationKeyboard,
  getConfirmClaimKeyboard,
  keyManagementMenu,
  userManagementMenu,
  gameManagementMenu,
  banManagementMenu,
  broadcastMenu,
  getBroadcastTargetKeyboard,
  settingsMenu
};