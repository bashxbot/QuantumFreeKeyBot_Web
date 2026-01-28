const isAdmin = (userId) => {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
  return adminIds.includes(userId.toString());
};

const generateKey = (gameAbbr, duration) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'KEY-';
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  key += `-${gameAbbr}-${duration}D`;
  return key;
};

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getGameAbbreviation = (gameName) => {
  const words = gameName.split(' ');
  if (words.length === 1) {
    return gameName.substring(0, 3).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
};

const getPointsCost = (duration) => {
  const costs = {
    1: 3,
    3: 6,
    7: 10,
    15: 15,
    30: 20
  };
  return costs[duration] || 0;
};

const escapeMarkdown = (text) => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

module.exports = {
  isAdmin,
  generateKey,
  formatDate,
  getGameAbbreviation,
  getPointsCost,
  escapeMarkdown
};
