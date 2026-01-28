/**
 * Global Button Configuration
 * Centralized configuration for all inline button callbacks
 * Automatically handles message editing for all buttons
 * Usage: const buttonConfig = getButtonConfig(data, { chatId, userId, messageId });
 */

const { isAdmin } = require('./helpers');
const { mainMenu, adminPanel } = require('./keyboards');

const getButtonConfig = (data) => {
  const config = {
    // Simple navigation - static messages
    'back_to_menu': {
      type: 'static',
      text: '📱 Main Menu:',
      keyboard: mainMenu,
      editMessage: true
    },
    'back_to_admin': {
      type: 'static',
      text: '🔐 *Admin Panel*\n\nChoose an option:',
      keyboard: adminPanel,
      editMessage: true,
      parseMode: 'Markdown',
      requireAdmin: true
    },

    // Admin handlers - dynamic messages (call show* functions)
    'admin_keys': {
      type: 'handler',
      handler: 'showKeyManagement',
      requireAdmin: true,
      editMessage: true
    },
    'admin_users': {
      type: 'handler',
      handler: 'showUserManagement',
      requireAdmin: true,
      editMessage: true
    },
    'admin_games': {
      type: 'handler',
      handler: 'showGameManagement',
      requireAdmin: true,
      editMessage: true
    },
    'admin_ban': {
      type: 'handler',
      handler: 'showBanManagement',
      requireAdmin: true,
      editMessage: true
    },
    'admin_stats': {
      type: 'handler',
      handler: 'showStatistics',
      requireAdmin: true,
      editMessage: true
    },
    'admin_broadcast': {
      type: 'handler',
      handler: 'showBroadcastMenu',
      requireAdmin: true,
      editMessage: true
    },
    'admin_settings': {
      type: 'handler',
      handler: 'showSettings',
      requireAdmin: true,
      editMessage: true
    },
    'admin_support': {
      type: 'handler',
      handler: 'showStaffManagement',
      handlerModule: 'supportHandler',
      requireAdmin: true,
      editMessage: true
    },

    // List views - all edit messages
    'games_all': {
      type: 'handler',
      handler: 'showAllGames',
      requireAdmin: true,
      editMessage: true
    },
    'keys_all': {
      type: 'handler',
      handler: 'showAllKeys',
      requireAdmin: true,
      editMessage: true,
      params: [0]
    },
    'keys_page_prefix': {
      type: 'custom',
      requireAdmin: true,
      editMessage: true
    },
    'keys_unclaimed': {
      type: 'handler',
      handler: 'showUnclaimedKeys',
      requireAdmin: true,
      editMessage: true,
      params: [0]
    },
    'unclaimed_page_prefix': {
      type: 'custom',
      requireAdmin: true,
      editMessage: true
    },
    'keys_claimed': {
      type: 'handler',
      handler: 'showClaimedKeys',
      requireAdmin: true,
      editMessage: true,
      params: [0]
    },
    'claimed_page_prefix': {
      type: 'custom',
      requireAdmin: true,
      editMessage: true
    },
    'users_all': {
      type: 'handler',
      handler: 'showAllUsers',
      requireAdmin: true,
      editMessage: true,
      params: [0]
    },
    'users_page_prefix': {
      type: 'custom',
      requireAdmin: true,
      editMessage: true
    },
    'banned_list': {
      type: 'handler',
      handler: 'showBannedUsers',
      requireAdmin: true,
      editMessage: true
    },
    'users_top_referrers': {
      type: 'handler',
      handler: 'showTopReferrers',
      requireAdmin: true,
      editMessage: true
    },
    'users_top_earners': {
      type: 'handler',
      handler: 'showTopEarners',
      requireAdmin: true,
      editMessage: true
    },
    'users_most_keys': {
      type: 'handler',
      handler: 'showMostKeysClaimed',
      requireAdmin: true,
      editMessage: true
    },
    'users_recent': {
      type: 'handler',
      handler: 'showRecentJoiners',
      requireAdmin: true,
      editMessage: true
    },
    'blocked_list': {
      type: 'handler',
      handler: 'showBlockedUsers',
      requireAdmin: true,
      editMessage: true
    },
    'games_stats': {
      type: 'handler',
      handler: 'showGameStats',
      requireAdmin: true,
      editMessage: true
    },
    'users_search': {
      type: 'handler',
      handler: 'showUserSearchPrompt',
      requireAdmin: true,
      editMessage: true
    }
  };

  // Handle dynamic view_user_{userId} buttons
  if (data.startsWith('view_user_')) {
    const userId = data.replace('view_user_', '');
    return {
      type: 'handler',
      handler: 'showUserDetails',
      requireAdmin: true,
      editMessage: true,
      params: [userId]
    };
  }

  return config[data];
};

/**
 * Execute button action with automatic message editing
 * @param {string} data - Button callback data
 * @param {object} context - { chatId, userId, messageId, query }
 * @returns {Promise}
 */
const executeButtonAction = async (data, context) => {
  const { chatId, userId, messageId, query } = context;
  const config = getButtonConfig(data);

  if (!config) return null;

  // Check admin requirement
  if (config.requireAdmin && !isAdmin(userId)) {
    return { error: 'Not admin' };
  }

  // Static message response - ALWAYS edit if messageId exists
  if (config.type === 'static') {
    const editOptions = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: config.parseMode || undefined,
      reply_markup: config.keyboard.reply_markup
    };

    if (messageId) {
      // Always try to edit first
      try {
        await global.bot.editMessageText(config.text, editOptions);
      } catch (error) {
        // If edit fails (message unchanged, too old, etc.), send new message
        if (error.message.includes('message is not modified') || error.message.includes('message to edit not found')) {
          await global.bot.sendMessage(chatId, config.text, { 
            parse_mode: config.parseMode,
            reply_markup: config.keyboard.reply_markup 
          });
        }
      }
    } else {
      await global.bot.sendMessage(chatId, config.text, { 
        parse_mode: config.parseMode,
        reply_markup: config.keyboard.reply_markup 
      });
    }
    return { success: true };
  }

  // Handler function call - ALWAYS pass messageId for editing
  if (config.type === 'handler') {
    try {
      const handlerModule = config.handlerModule || 'adminHandler';
      const handlers = require(`../handlers/${handlerModule}`);
      const handler = handlers[config.handler];
      
      if (!handler) {
        console.error(`[ERROR] Handler not found: ${config.handler} in module ${handlerModule}`);
        return { error: 'Handler not found' };
      }
      
      const params = config.params || [];
      // Always pass messageId as the last parameter for handlers to use
      await handler(chatId, ...params, messageId);
      return { success: true };
    } catch (error) {
      console.error(`[ERROR] Handler execution failed:`, error);
      return { error: error.message };
    }
  }

  // Custom handling for pagination
  if (config.type === 'custom') {
    return { custom: true, data };
  }

  return null;
};

module.exports = {
  getButtonConfig,
  executeButtonAction
};
