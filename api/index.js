/**
 * API Main Entry Point
 * Điểm vào chính của API
 */

// Import các routes và config
const apiRoutes = require('./routes');
const apiConfig = require('./config/apiConfig');

// Export các thành phần để sử dụng trong ứng dụng
module.exports = {
  routes: apiRoutes,
  config: apiConfig,
  // Services
  services: {
    authService: require('./services/authService')
  },
  // Utils
  utils: {
    deviceUtils: require('./utils/deviceUtils')
  },
  // Constants
  API_BASE_URL: apiConfig.API_BASE_URL,
  ENDPOINTS: apiConfig.ENDPOINTS
}; 