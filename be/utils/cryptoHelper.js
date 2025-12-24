const crypto = require('crypto');

// Generate random token
exports.generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
