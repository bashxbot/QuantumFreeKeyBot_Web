
const { ref, get } = require('firebase/database');

const checkExpiringKeys = async () => {
  try {
    const keysRef = ref(global.db, 'keys');
    const keysSnapshot = await get(keysRef);
    
    if (!keysSnapshot.exists()) return;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const keysData = keysSnapshot.val();

    for (const keyId in keysData) {
      const key = keysData[keyId];
      if (key.userId && key.expiresAt) {
        const timeUntilExpiry = key.expiresAt - now;
        
        if (timeUntilExpiry > 0 && timeUntilExpiry <= oneDayMs && !key.expiryNotified) {
          const hoursLeft = Math.ceil(timeUntilExpiry / (60 * 60 * 1000));
          
          try {
            await global.bot.sendMessage(key.userId, 
              `⚠️ *Key Expiring Soon!*\n\n` +
              `🎮 Game: ${key.gameName}\n` +
              `⏰ Expires in: ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}\n\n` +
              `💡 Claim a new key before this one expires!`, {
              parse_mode: 'Markdown'
            });
            
            await update(ref(global.db, `keys/${keyId}`), { expiryNotified: true });
          } catch (e) {
            console.log(`Could not notify user ${key.userId}:`, e.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in checkExpiringKeys:', error);
  }
};

const startNotificationService = () => {
  setInterval(checkExpiringKeys, 60 * 60 * 1000);
};

module.exports = { startNotificationService, checkExpiringKeys };
