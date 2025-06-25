/**
 * API Configuration
 * Cấu hình API cho Vnipet App
 */

// Lấy URL từ biến môi trường và đảm bảo không có ký tự '@'
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL 
  ? process.env.EXPO_PUBLIC_API_URL.replace('@', '') 
  : 'http://192.168.1.5:8000/api/v1';

// Các endpoints
const ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/mobile-register',
    DEVICE_REGISTER: '/auth/device-register',
    LOGIN: '/auth/mobile-login',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
  },
  USER: {
    DASHBOARD: '/account/dashboard',
    ACTIVITY: '/user/activity',
    PROFILE: '/user/profile',
  },
  PET: {
    GET_PETS: '/user/pets',
    PET_DETAILS: '/user/pets/:petId',
  },
  THEME: {
    GET_THEMES: '/user/themes',
    PURCHASE_THEME: '/user/themes/:themeId/purchase',
    APPLY_THEME: '/user/themes/:themeId/apply',
  }
};

// Cấu hình request headers theo yêu cầu của middleware mobileCors
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'device-id': 'vnipet-mobile-app',
  'app-version': '1.0.0',
  'platform': 'ios',
  'os-version': '14.0',
  'device-type': 'mobile',
  'User-Agent': 'VnipetApp/1.0 iOS/14.0',
  // Thêm các headers theo yêu cầu của mobileCors middleware
  'x-device-id': 'vnipet-mobile-app',
  'x-app-version': '1.0.0'
};

// Cấu hình timeout
const REQUEST_TIMEOUT = 30000; // 30 seconds

module.exports = {
  API_BASE_URL,
  ENDPOINTS,
  DEFAULT_HEADERS,
  REQUEST_TIMEOUT,
}; 