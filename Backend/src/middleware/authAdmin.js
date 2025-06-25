// Authorization: Bearer <JWT>
const jwt = require('jsonwebtoken');
const tokenManager = require('../utils/tokenManager');

const authAdmin = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).json({ message: 'No token' });

  const token = authorization.split(' ')[1];
  try {
    // Use tokenManager to verify access token
    let payload;
    try {
      payload = tokenManager.verifyAccessToken(token);
    } catch (verifyError) {
      // Fallback to standard JWT verify for backward compatibility
      payload = jwt.verify(token, process.env.JWT_SECRET);
    }
    
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.admin = payload;          // { id, role, iat, exp }
    req.user = {
      id: payload.id,
      role: 'admin',
      deviceId: payload.deviceId || null
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authAdmin };
