const {
  ref,
  get,
  set,
  update,
  push,
  query,
  orderByChild,
  equalTo,
} = require("firebase/database");
const {
  mainMenu,
  backToMenu,
  getGameSelectionKeyboard,
} = require("../utils/keyboards");
const { formatDate } = require("../utils/helpers");

const REQUIRED_CHANNELS = [
  { name: "TeamQuantumCH", id: -1002751435508, url: "https://t.me/TeamQuantumCH" },
  { name: "QuantXTools", id: -1003540055086, url: "https://t.me/QuantXTools" },
  { name: "QuantXBotStore", id: -1003834333532, url: "https://t.me/QuantXBotStore" },
];

const checkChannelMembership = async (userId) => {
  try {
    for (const channel of REQUIRED_CHANNELS) {
      const member = await global.bot.getChatMember(channel.id, userId);
      if (!["member", "administrator", "creator"].includes(member.status)) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error checking channel membership:", error.message);
    return false;
  }
};

const handleDailyReward = async (chatId, userId) => {
  try {
    const dailyRewardRef = ref(global.db, "settings/dailyRewardEnabled");
    const dailyRewardSnapshot = await get(dailyRewardRef);
    const dailyRewardEnabled = dailyRewardSnapshot.exists()
      ? dailyRewardSnapshot.val()
      : true;

    if (!dailyRewardEnabled) {
      await global.bot.sendMessage(
        chatId,
        "❌ Daily rewards are currently disabled.",
        backToMenu,
      );
      return;
    }

    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      await global.bot.sendMessage(
        chatId,
        "❌ Please use /start first to register.",
        backToMenu,
      );
      return;
    }

    const now = Date.now();
    const lastClaim = user.lastDailyReward || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const timeSinceLastClaim = now - lastClaim;

    if (timeSinceLastClaim < oneDayMs) {
      const hoursLeft = Math.ceil(
        (oneDayMs - timeSinceLastClaim) / (60 * 60 * 1000),
      );
      await global.bot.sendMessage(
        chatId,
        `⏰ You already claimed your daily reward!\n\nCome back in ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""}.`,
        backToMenu,
      );
      return;
    }

    const streak =
      timeSinceLastClaim < oneDayMs * 2 ? (user.dailyStreak || 0) + 1 : 1;
    const baseReward = 2;
    const bonusReward = Math.min(Math.floor(streak / 7), 3);
    let totalReward = baseReward + bonusReward;

    // Apply VIP points multiplier if user is VIP
    if (user.isVIP) {
      const vipMultiplierRef = ref(global.db, "settings/vipPointsMultiplier");
      const vipMultiplierSnapshot = await get(vipMultiplierRef);
      const vipMultiplier = vipMultiplierSnapshot.exists()
        ? vipMultiplierSnapshot.val()
        : 1;
      totalReward = Math.floor(totalReward * vipMultiplier);
    }

    await update(userRef, {
      balance: (user.balance || 0) + totalReward,
      totalPointsEarned: (user.totalPointsEarned || 0) + totalReward,
      lastDailyReward: now,
      dailyStreak: streak,
    });

    const vipBonus = user.isVIP
      ? ` (${user.isVIP ? user.vipTier || "🥉 SILVER" : ""})`
      : "";
    const message =
      `🎁 *Daily Reward Claimed!*\n\n` +
      `✅ +${totalReward} points${vipBonus}\n` +
      `🔥 Streak: ${streak} day${streak > 1 ? "s" : ""}\n` +
      `💰 New Balance: ${(user.balance || 0) + totalReward} points\n\n` +
      `${streak >= 7 ? "🎉 Week streak bonus applied!\n\n" : ""}` +
      `💡 Come back tomorrow to keep your streak!`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...backToMenu,
    });
  } catch (error) {
    console.error("Error in handleDailyReward:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to claim daily reward. Please try again later.",
      backToMenu,
    );
  }
};

const sendSafeMessage = async (chatId, message, options = {}) => {
  try {
    return await global.bot.sendMessage(chatId, message, options);
  } catch (error) {
    if (error.response && error.response.body.error_code === 403) {
      const userRef = ref(global.db, `users/${chatId}`);
      await update(userRef, {
        isBlocked: true,
        blockedAt: Date.now(),
      });
      console.log(`User ${chatId} has blocked the bot`);
    }
    throw error;
  }
};

const handleStart = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name;
  const username = msg.from.username;
  const referralCode = match && match[1] ? match[1].trim() : "";

  try {
    // Check maintenance mode (admins bypass)
    const { isAdmin } = require("../utils/helpers");
    if (!isAdmin(userId)) {
      const maintenanceRef = ref(global.db, "settings/maintenanceMode");
      const maintenanceSnapshot = await get(maintenanceRef);
      if (maintenanceSnapshot.exists() && maintenanceSnapshot.val() === true) {
        await global.bot.sendMessage(
          chatId,
          "🔧 *Bot Maintenance*\n\n" +
            "━━━━━━━━━━━━━━━━━━━━\n\n" +
            "⚙️ We are currently performing scheduled maintenance to improve your experience.\n\n" +
            "⏰ The bot will be back online shortly.\n\n" +
            "💫 Thank you for your patience!\n\n" +
            "━━━━━━━━━━━━━━━━━━━━\n\n" +
            "✨ _Stay tuned for exciting updates!_",
          { parse_mode: "Markdown" },
        );
        return;
      }
    }

    const isMember = await checkChannelMembership(userId);

    if (!isMember) {
      const channelNames = REQUIRED_CHANNELS.map(c => c.name).join(", ");
      const joinMessage = `⚠️ *You must join our channels to use this bot*\n\nPlease join all channels below, then click "✅ Verify Membership"`;

      const channelButtons = REQUIRED_CHANNELS.map(channel => [
        { text: `📢 Join ${channel.name}`, url: channel.url }
      ]);

      await global.bot.sendMessage(chatId, joinMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            ...channelButtons,
            [
              {
                text: "✅ Verify Membership",
                callback_data: "verify_membership",
              },
            ],
          ],
        },
      });
      return;
    }

    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const existingUser = userSnapshot.val();

    if (existingUser && existingUser.isBanned) {
      await global.bot.sendMessage(
        chatId,
        "❌ You are banned from using this bot.",
      );
      return;
    }

    if (referralCode && referralCode.startsWith("ref_")) {
      const referrerId = referralCode.replace("ref_", "");

      if (referrerId !== userId.toString() && !existingUser) {
        const referrerRef = ref(global.db, `users/${referrerId}`);
        const referrerSnapshot = await get(referrerRef);

        if (referrerSnapshot.exists()) {
          // Notify referrer about the potential referral
          const referralNotifyMessage = `👤 *New Referral!*\n\n` +
            `User ${firstName}${username ? ` (@${username})` : ""} has joined using your referral link.\n\n` +
            `💰 *Points will be added* only if they join all required channels and restart the bot.`;
          
          try {
            await global.bot.sendMessage(referrerId, referralNotifyMessage, { parse_mode: "Markdown" });
          } catch (e) {
            console.log(`Could not notify referrer ${referrerId}:`, e.message);
          }
        }
      }
    }

    if (!existingUser) {
      const referredBy = referralCode.startsWith("ref_") ? referralCode.replace("ref_", "") : null;
      
      await set(userRef, {
        name: firstName,
        username: username,
        balance: 0,
        totalReferrals: 0,
        referredBy: referredBy,
        referralClaimed: false,
        joinedAt: Date.now(),
        isBlocked: false,
        isBanned: false,
        channelJoined: isMember,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
      });

      // If user joined via referral link AND is already a member, award points immediately
      if (referredBy && isMember) {
        const referrerRef = ref(global.db, `users/${referredBy}`);
        const referrerSnapshot = await get(referrerRef);
        if (referrerSnapshot.exists()) {
          const referrerData = referrerSnapshot.val();
          let referralReward = 1;

          if (referrerData.isVIP) {
            const vipMultiplierRef = ref(global.db, "settings/vipPointsMultiplier");
            const vipMultiplierSnapshot = await get(vipMultiplierRef);
            const vipMultiplier = vipMultiplierSnapshot.exists() ? vipMultiplierSnapshot.val() : 1;
            referralReward = Math.floor(referralReward * vipMultiplier);
          }

          await update(referrerRef, {
            balance: (referrerData.balance || 0) + referralReward,
            totalReferrals: (referrerData.totalReferrals || 0) + 1,
            totalPointsEarned: (referrerData.totalPointsEarned || 0) + referralReward,
          });

          await update(userRef, { referralClaimed: true });

          try {
            const notifyMsg = `🎉 *Referral Successful!*\n\n` +
              `User ${firstName} joined the channels using your referral link.\n` +
              `💰 ${referralReward} point is added to balance.`;
            await global.bot.sendMessage(referredBy, notifyMsg, { parse_mode: "Markdown" });
          } catch (e) {
            console.log(`Could not notify referrer ${referredBy}:`, e.message);
          }
        }
      }
    } else {
      // Existing user: check if they are restarting and points haven't been awarded yet
      // BUT ONLY if they came with a referral link in this start command
      if (isMember && referralCode.startsWith("ref_") && !existingUser.referralClaimed) {
        const referrerId = referralCode.replace("ref_", "");
        if (referrerId !== userId.toString()) {
          const referrerRef = ref(global.db, `users/${referrerId}`);
          const referrerSnapshot = await get(referrerRef);

          if (referrerSnapshot.exists()) {
            const referrerData = referrerSnapshot.val();
            let referralReward = 1;

            if (referrerData.isVIP) {
              const vipMultiplierRef = ref(global.db, "settings/vipPointsMultiplier");
              const vipMultiplierSnapshot = await get(vipMultiplierRef);
              const vipMultiplier = vipMultiplierSnapshot.exists() ? vipMultiplierSnapshot.val() : 1;
              referralReward = Math.floor(referralReward * vipMultiplier);
            }

            await update(referrerRef, {
              balance: (referrerData.balance || 0) + referralReward,
              totalReferrals: (referrerData.totalReferrals || 0) + 1,
              totalPointsEarned: (referrerData.totalPointsEarned || 0) + referralReward,
            });

            await update(userRef, { 
              referralClaimed: true, 
              channelJoined: true,
              referredBy: referrerId // Track who actually referred them
            });

            try {
              const notifyMsg = `🎉 *Referral Successful!*\n\n` +
                `User ${existingUser.name} joined the channels using your referral link.\n` +
                `💰 ${referralReward} point is added to balance.`;
              await global.bot.sendMessage(referrerId, notifyMsg, { parse_mode: "Markdown" });
            } catch (e) {
              console.log(`Could not notify referrer ${referrerId}:`, e.message);
            }
          }
        }
      } else if (isMember && existingUser.referredBy && !existingUser.referralClaimed) {
        // Fallback for when they join channels and just click "Verify" or /start without link again
        const referrerId = existingUser.referredBy;
        const referrerRef = ref(global.db, `users/${referrerId}`);
        const referrerSnapshot = await get(referrerRef);

        if (referrerSnapshot.exists()) {
          const referrerData = referrerSnapshot.val();
          let referralReward = 1;

          if (referrerData.isVIP) {
            const vipMultiplierRef = ref(global.db, "settings/vipPointsMultiplier");
            const vipMultiplierSnapshot = await get(vipMultiplierRef);
            const vipMultiplier = vipMultiplierSnapshot.exists() ? vipMultiplierSnapshot.val() : 1;
            referralReward = Math.floor(referralReward * vipMultiplier);
          }

          await update(referrerRef, {
            balance: (referrerData.balance || 0) + referralReward,
            totalReferrals: (referrerData.totalReferrals || 0) + 1,
            totalPointsEarned: (referrerData.totalPointsEarned || 0) + referralReward,
          });

          await update(userRef, { referralClaimed: true, channelJoined: true });

          try {
            const notifyMsg = `🎉 *Referral Successful!*\n\n` +
              `User ${existingUser.name} joined the channels using your referral link.\n` +
              `💰 ${referralReward} point is added to balance.`;
            await global.bot.sendMessage(referrerId, notifyMsg, { parse_mode: "Markdown" });
          } catch (e) {
            console.log(`Could not notify referrer ${referrerId}:`, e.message);
          }
        }
      }
    }

    const welcome =
      `👋 *Welcome to Quantum Key Generator Bot!*\n\n` +
      `Claim gaming keys and earn points!\n\n` +
      `🎮 *Features:*\n` +
      `• 🔑 Claim Game Keys\n` +
      `• 🔗 Refer Friends (1 point per referral)\n` +
      `• 📊 Track Your Stats\n` +
      `• 🏆 Join Leaderboard\n` +
      `• 🎁 Daily Rewards\n` +
      `• ❓ Get Help & Support`;

    await sendSafeMessage(chatId, welcome, {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          [{ text: "🔗 Refer Users" }, { text: "👤 My Profile" }],
          [{ text: "🔑 Claim Key" }, { text: "📊 My Stats" }],
          [{ text: "🎁 Daily Reward" }, { text: "🏆 Leaderboard" }],
          [{ text: "📜 Key History" }, { text: "❓ Help & Support" }],
        ],
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Error in handleStart:", error);
    try {
      await sendSafeMessage(chatId, "❌ Failed to start. Please try /start again.");
    } catch (e) {
      console.log("Could not send error message:", e.message);
    }
  }
};

const handleReferUsers = async (chatId, userId) => {
  try {
    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      await global.bot.sendMessage(
        chatId,
        "❌ Please use /start first to register.",
        backToMenu,
      );
      return;
    }

    const botInfo = await global.bot.getMe();
    const referralLink = `https://t.me/${botInfo.username}?start=ref_${userId}`;

    const message =
      `📢 *Referral Program*\n\n` +
      `Share your unique link to earn points!\n\n` +
      `🔗 *Your Referral Link:*\n\`${referralLink}\`\n\n` +
      `💡 *How it works:*\n` +
      `• Share your link with friends\n` +
      `• They must join our channels\n` +
      `• You earn 1 point per valid referral\n\n` +
      `📊 *Your Stats:*\n` +
      `👥 Total Referrals: ${user.totalReferrals || 0}\n` +
      `💰 Points Earned from Referrals: ${user.totalReferrals || 0}`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...backToMenu,
    });
  } catch (error) {
    console.error("Error in handleReferUsers:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load referral info. Please try again.",
      backToMenu,
    );
  }
};

const handleLeaderboard = async (chatId, userId) => {
  try {
    const usersRef = ref(global.db, "users");
    const usersSnapshot = await get(usersRef);

    if (!usersSnapshot.exists()) {
      await global.bot.sendMessage(chatId, "📋 No users found.", backToMenu);
      return;
    }

    const users = [];
    const usersData = usersSnapshot.val();
    for (const id in usersData) {
      if (!usersData[id].isBanned) {
        users.push({
          id,
          name: usersData[id].name,
          username: usersData[id].username,
          points: usersData[id].totalPointsEarned || 0,
          referrals: usersData[id].totalReferrals || 0,
        });
      }
    }

    users.sort((a, b) => b.points - a.points);
    const top3 = users.slice(0, 3);

    const medals = ["🥇", "🥈", "🥉"];
    let message = `🏆 *TOP EARNERS*\n\n`;

    top3.forEach((user, idx) => {
      const displayName = user.name.replace(/_/g, "\\_");
      message += `${medals[idx]} ${displayName}\n`;
    });

    message += `\n💡 Keep earning to climb the rankings!`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔄 Refresh Leaderboard",
              callback_data: "refresh_leaderboard",
            },
          ],
          [{ text: "🔙 Back to Menu", callback_data: "back_to_menu" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleLeaderboard:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load leaderboard. Please try again.",
      backToMenu,
    );
  }
};

const handleKeyHistory = async (chatId, userId) => {
  try {
    const keysRef = ref(global.db, "keys");
    const keysSnapshot = await get(keysRef);

    if (!keysSnapshot.exists()) {
      await global.bot.sendMessage(chatId, "📋 No keys found.", backToMenu);
      return;
    }

    const userKeys = [];
    const keysData = keysSnapshot.val();
    const now = Date.now();

    for (const keyId in keysData) {
      if (keysData[keyId].userId === userId.toString()) {
        userKeys.push({ id: keyId, ...keysData[keyId] });
      }
    }

    if (userKeys.length === 0) {
      await global.bot.sendMessage(
        chatId,
        "📋 You haven't claimed any keys yet.",
        backToMenu,
      );
      return;
    }

    userKeys.sort((a, b) => b.claimedAt - a.claimedAt);
    const recent = userKeys.slice(0, 10);

    let message = `🔑 *YOUR KEY HISTORY*\n\n`;

    recent.forEach((key, idx) => {
      const isExpired = key.expiresAt && key.expiresAt < now;
      const status = isExpired ? "❌ Expired" : "✅ Active";

      message += `${idx + 1}. 🎮 ${key.gameName}\n`;
      message += `   📅 Claimed: ${formatDate(key.claimedAt)}\n`;
      message += `   ⏰ ${isExpired ? "Expired" : "Expires"}: ${formatDate(key.expiresAt)}\n`;
      message += `   ${status}\n\n`;
    });

    if (userKeys.length > 10) {
      message += `_Showing 10 most recent keys (${userKeys.length} total)_`;
    }

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...backToMenu,
    });
  } catch (error) {
    console.error("Error in handleKeyHistory:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load key history. Please try again.",
      backToMenu,
    );
  }
};

const handleProfile = async (chatId, userId) => {
  try {
    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      await global.bot.sendMessage(
        chatId,
        "❌ Please use /start first to register.",
        backToMenu,
      );
      return;
    }

    const keysRef = ref(global.db, "keys");
    const keysSnapshot = await get(keysRef);

    let totalKeysClaimed = 0;
    if (keysSnapshot.exists()) {
      const keys = keysSnapshot.val();
      for (const keyId in keys) {
        if (keys[keyId].userId === userId) {
          totalKeysClaimed++;
        }
      }
    }

    const escapedUsername = user.username
      ? user.username.replace(/_/g, "\\_")
      : "Not set";
    const message =
      `👤 *Your Profile*\n\n` +
      `*Name:* ${user.name.replace(/_/g, "\\_")}\n` +
      `*Username:* @${escapedUsername}\n` +
      `*User ID:* \`${userId}\`\n\n` +
      `💰 *Balance:* ${user.balance || 0} points\n` +
      `🔑 *Total Keys Claimed:* ${totalKeysClaimed}\n` +
      `👥 *Total Referrals:* ${user.totalReferrals || 0}\n` +
      `📅 *Member Since:* ${formatDate(user.joinedAt)}\n\n` +
      `📈 *Points Summary:*\n` +
      `• Total Earned: ${user.totalPointsEarned || 0} points\n` +
      `• Total Spent: ${user.totalPointsSpent || 0} points`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...backToMenu,
    });
  } catch (error) {
    console.error("Error in handleProfile:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load profile. Please try again.",
      backToMenu,
    );
  }
};

const handleClaimKey = async (chatId, userId) => {
  try {
    const settingsRef = ref(global.db, "settings/claimingEnabled");
    const settingsSnapshot = await get(settingsRef);
    const claimingEnabled = settingsSnapshot.val() !== false;

    if (!claimingEnabled) {
      await global.bot.sendMessage(
        chatId,
        "❌ No keys available at the moment. Please try again later.",
        backToMenu,
      );
      return;
    }

    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      await global.bot.sendMessage(
        chatId,
        "❌ Please use /start first to register.",
        backToMenu,
      );
      return;
    }

    if (user.isBanned) {
      await global.bot.sendMessage(
        chatId,
        "❌ You are banned from using this bot.",
        backToMenu,
      );
      return;
    }

    const gamesRef = ref(global.db, "games");
    const gamesSnapshot = await get(gamesRef);

    if (!gamesSnapshot.exists()) {
      await global.bot.sendMessage(
        chatId,
        "❌ No games available at the moment. Please try again later.",
        backToMenu,
      );
      return;
    }

    const games = [];
    const gamesData = gamesSnapshot.val();
    for (const gameId in gamesData) {
      if (gamesData[gameId].isActive) {
        games.push({ id: gameId, ...gamesData[gameId] });
      }
    }

    if (games.length === 0) {
      await global.bot.sendMessage(
        chatId,
        "❌ No games available at the moment. Please try again later.",
        backToMenu,
      );
      return;
    }

    const message =
      `🎮 *Choose a Game*\n\n` +
      `Your Balance: ${user.balance || 0} points\n\n` +
      `Select the game you want to claim a key for:`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...getGameSelectionKeyboard(games),
    });
  } catch (error) {
    console.error("Error in handleClaimKey:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load available games. Please try again.",
      backToMenu,
    );
  }
};

const handleStats = async (chatId, userId) => {
  try {
    const userRef = ref(global.db, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      await global.bot.sendMessage(
        chatId,
        "❌ Please use /start first to register.",
        backToMenu,
      );
      return;
    }

    const keysRef = ref(global.db, "keys");
    const keysSnapshot = await get(keysRef);

    let activeKeys = 0;
    let expiredKeys = 0;
    let totalClaimed = 0;
    const now = Date.now();

    if (keysSnapshot.exists()) {
      const keys = keysSnapshot.val();
      for (const keyId in keys) {
        const key = keys[keyId];
        if (key.userId === userId) {
          totalClaimed++;
          if (key.expiresAt && key.expiresAt > now) {
            activeKeys++;
          } else if (key.expiresAt) {
            expiredKeys++;
          }
        }
      }
    }

    const message =
      `📊 *Your Statistics*\n\n` +
      `👥 *Referrals:*\n` +
      `• Total Referrals: ${user.totalReferrals || 0}\n\n` +
      `🔑 *Keys:*\n` +
      `• Total Claimed: ${totalClaimed}\n` +
      `• Active Keys: ${activeKeys}\n` +
      `• Expired Keys: ${expiredKeys}\n\n` +
      `💰 *Points:*\n` +
      `• Total Earned: ${user.totalPointsEarned || 0}\n` +
      `• Total Spent: ${user.totalPointsSpent || 0}\n` +
      `• Current Balance: ${user.balance || 0}\n\n` +
      `📅 *Member Since:* ${formatDate(user.joinedAt)}`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...backToMenu,
    });
  } catch (error) {
    console.error("Error in handleStats:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load statistics. Please try again.",
      backToMenu,
    );
  }
};

const handleHelp = async (chatId, userId) => {
  try {
    const message =
      `❓ *Help & Information*\n\n` +
      `🎮 *About Quantum Key Generator Bot*\n` +
      `Easily claim gaming keys and earn points through referrals!\n\n` +
      `📋 *Available Features:*\n` +
      `🔑 *Claim Keys* - Get gaming keys for various games\n` +
      `🔗 *Referral Program* - Earn 1 point per friend referral\n` +
      `📊 *Statistics* - Track your progress and earnings\n` +
      `🏆 *Leaderboard* - Compete with other users\n` +
      `🎁 *Daily Rewards* - Claim points every day\n` +
      `📜 *Key History* - View your claimed keys\n\n` +
      `❓ *Need Assistance?*\n` +
      `Click the button below to contact our support team!`;

    await global.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📞 Contact Support", callback_data: "contact_support" }],
          [{ text: "🔙 Back to Menu", callback_data: "back_to_menu" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleHelp:", error);
    await global.bot.sendMessage(
      chatId,
      "❌ Failed to load help. Please try again.",
      backToMenu,
    );
  }
};

const checkAndAwardAchievements = async (userId, type) => {
  // Achievement system placeholder
};

module.exports = {
  handleStart,
  handleReferUsers,
  handleProfile,
  handleClaimKey,
  handleStats,
  handleHelp,
  checkChannelMembership,
  handleDailyReward,
  handleLeaderboard,
  handleKeyHistory,
  checkAndAwardAchievements,
  sendSafeMessage,
};
