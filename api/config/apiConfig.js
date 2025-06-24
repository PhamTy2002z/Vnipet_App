/**
 * API Configuration
 * Cấu hình API cho Vnipet App
 */

// Lấy URL từ biến môi trường
const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.1.5:8000/api/v1';

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

// Cấu hình request
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Cấu hình timeout
const REQUEST_TIMEOUT = 30000; // 30 seconds

module.exports = {
  API_BASE_URL,
  ENDPOINTS,
  DEFAULT_HEADERS,
  REQUEST_TIMEOUT,
}; 