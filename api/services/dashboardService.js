/**
 * Dashboard Service
 * Dịch vụ xử lý các API liên quan đến dashboard người dùng
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, DEFAULT_HEADERS, ENDPOINTS, REQUEST_TIMEOUT } from '../config/apiConfig';
import deviceUtils from '../utils/deviceUtils';

// Lấy token từ AsyncStorage
const getAccessToken = async () => {
  return await AsyncStorage.getItem('@vnipet_access_token');
};

// Tạo instance axios với cấu hình mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: DEFAULT_HEADERS,
});

/**
 * Lấy dữ liệu dashboard người dùng
 * @returns {Promise} - Kết quả từ API
 */
export const getUserDashboard = async () => {
  try {
    // Lấy access token
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('Access token không tồn tại');
    }
    
    // Lấy thông tin thiết bị
    const deviceId = await deviceUtils.getDeviceId();
    
    // Gọi API dashboard
    const response = await apiClient.get(ENDPOINTS.USER.DASHBOARD, {
      headers: {
        ...DEFAULT_HEADERS,
        'Authorization': `Bearer ${accessToken}`,
        'X-Mobile-App': 'true',
        'X-Device-ID': deviceId
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Dashboard error:', error);
    
    // Xử lý và trả về lỗi theo định dạng chuẩn
    return {
      success: false,
      message: error.response?.data?.message || 'Không thể tải dữ liệu dashboard',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500,
    };
  }
};

/**
 * Lấy thông tin hoạt động người dùng
 * @returns {Promise} - Kết quả từ API
 */
export const getUserActivity = async () => {
  try {
    // Lấy access token
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('Access token không tồn tại');
    }
    
    // Lấy thông tin thiết bị
    const deviceId = await deviceUtils.getDeviceId();
    
    // Gọi API hoạt động người dùng
    const response = await apiClient.get(ENDPOINTS.USER.ACTIVITY, {
      headers: {
        ...DEFAULT_HEADERS,
        'Authorization': `Bearer ${accessToken}`,
        'X-Mobile-App': 'true',
        'X-Device-ID': deviceId
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('User activity error:', error);
    
    // Xử lý và trả về lỗi theo định dạng chuẩn
    return {
      success: false,
      message: error.response?.data?.message || 'Không thể tải dữ liệu hoạt động người dùng',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500,
    };
  }
};

// Export các service
const dashboardService = {
  getUserDashboard,
  getUserActivity
};

export default dashboardService; 