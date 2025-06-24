/**
 * Auth Service
 * Dịch vụ xử lý các API liên quan đến xác thực người dùng
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, DEFAULT_HEADERS, ENDPOINTS, REQUEST_TIMEOUT } from '../config/apiConfig';
import { getDeviceInfo } from '../utils/deviceUtils';

// Lưu thông tin token
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@vnipet_access_token',
  REFRESH_TOKEN: '@vnipet_refresh_token',
  USER_DATA: '@vnipet_user_data',
  DEVICE_ID: '@vnipet_device_id',
};

// Tạo instance axios với cấu hình mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: DEFAULT_HEADERS,
});

/**
 * Tải thông tin dashboard người dùng sau khi đăng nhập
 * @returns {Promise} - Kết quả từ API
 */
const fetchUserDashboard = async () => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      throw new Error('Token không tồn tại');
    }
    
    const response = await apiClient.get('/user/dashboard', {
      headers: {
        ...DEFAULT_HEADERS,
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.success && response.data.data?.user) {
      const userData = response.data.data.user;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('Fetch user dashboard error:', error);
    return null;
  }
};

/**
 * Đăng nhập 
 * @param {string} email - Email người dùng
 * @param {string} password - Mật khẩu người dùng
 * @returns {Promise} - Kết quả đăng nhập
 */
export const login = async (email, password) => {
  try {
    // Lấy deviceId từ storage hoặc tạo mới
    let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    
    // Lấy thông tin thiết bị
    const deviceInfo = await getDeviceInfo();
    
    // Gọi API đăng nhập
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
      deviceId,
      deviceInfo,
    });
    
    // Nếu đăng nhập thành công, lưu token và thông tin người dùng
    if (response.data && response.data.success) {
      const { tokens, user, device } = response.data;
      
      // Lưu token
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      
      // Lưu thông tin user
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      
      // Lưu deviceId nếu chưa có
      if (!deviceId && device && device.deviceId) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, device.deviceId);
      }
      
      // Cấu hình header cho các request tiếp theo
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      
      // Tải thông tin dashboard để có thêm chi tiết về người dùng
      await fetchUserDashboard();
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    
    // Xử lý và trả về lỗi theo định dạng chuẩn
    return {
      success: false,
      message: error.response?.data?.message || 'Đăng nhập thất bại',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500,
    };
  }
};

/**
 * Đăng ký người dùng mới
 * @param {Object} userData - Thông tin đăng ký người dùng
 * @returns {Promise} - Kết quả đăng ký
 */
export const register = async (userData) => {
  try {
    // Lấy deviceId từ storage hoặc tạo mới
    let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    
    // Lấy thông tin thiết bị
    const deviceInfo = await getDeviceInfo();
    
    // Gọi API đăng ký
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, {
      ...userData,
      deviceId,
      deviceInfo,
    });
    
    // Nếu đăng ký thành công, lưu token và thông tin người dùng
    if (response.data && response.data.success) {
      const { tokens, user, device } = response.data;
      
      // Lưu token
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      
      // Lưu thông tin user
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      
      // Lưu deviceId nếu chưa có
      if (!deviceId && device && device.deviceId) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, device.deviceId);
      }
      
      // Cấu hình header cho các request tiếp theo
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      
      // Tải thông tin dashboard để có thêm chi tiết về người dùng
      await fetchUserDashboard();
    }
    
    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    
    // Xử lý và trả về lỗi theo định dạng chuẩn
    return {
      success: false,
      message: error.response?.data?.message || 'Đăng ký thất bại',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500,
    };
  }
};

/**
 * Làm mới access token sử dụng refresh token
 * @returns {Promise} - Kết quả làm mới token
 */
export const refreshToken = async () => {
  try {
    // Lấy refresh token từ storage
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    
    if (!refreshToken || !deviceId) {
      throw new Error('Không tìm thấy refresh token hoặc deviceId');
    }
    
    // Gọi API làm mới token
    const response = await axios.post(
      `${API_BASE_URL}${ENDPOINTS.AUTH.REFRESH_TOKEN}`, 
      { 
        refreshToken, 
        deviceId 
      }, 
      { 
        headers: DEFAULT_HEADERS 
      }
    );
    
    // Nếu làm mới thành công, cập nhật token
    if (response.data && response.data.success) {
      const { tokens } = response.data;
      
      // Lưu token mới
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      
      // Cập nhật header cho các request tiếp theo
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
    
    return response.data;
  } catch (error) {
    console.error('Refresh token error:', error);
    
    // Nếu làm mới token thất bại, đăng xuất người dùng
    await logout(false); // false để không gọi API logout
    
    return {
      success: false,
      message: error.response?.data?.message || 'Làm mới token thất bại',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500,
    };
  }
};

/**
 * Đăng xuất người dùng
 * @param {boolean} callApi - Có gọi API đăng xuất hay không
 * @returns {Promise} - Kết quả đăng xuất
 */
export const logout = async (callApi = true) => {
  try {
    // Lấy thông tin token và deviceId
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    
    // Gọi API đăng xuất nếu cần
    if (callApi && refreshToken && deviceId) {
      // Lấy access token để xác thực
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      // Gọi API đăng xuất
      await axios.post(
        `${API_BASE_URL}${ENDPOINTS.AUTH.LOGOUT}`, 
        { refreshToken, deviceId }, 
        {
          headers: {
            ...DEFAULT_HEADERS,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    }
    
    // Xóa token và thông tin người dùng khỏi storage
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Xóa header authorization
    delete apiClient.defaults.headers.common['Authorization'];
    
    return { success: true, message: 'Đăng xuất thành công' };
  } catch (error) {
    console.error('Logout error:', error);
    
    // Xóa token và thông tin người dùng khỏi storage dù có lỗi
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Xóa header authorization
    delete apiClient.defaults.headers.common['Authorization'];
    
    return {
      success: false,
      message: error.response?.data?.message || 'Đăng xuất thất bại',
      error: error.response?.data?.error || error.message,
    };
  }
};

/**
 * Đăng ký thiết bị mới
 * @param {Object} deviceInfo - Thông tin thiết bị
 * @returns {Promise} - Kết quả đăng ký thiết bị
 */
export const registerDevice = async (deviceInfo) => {
  try {
    // Gọi API đăng ký thiết bị
    const response = await apiClient.post(ENDPOINTS.AUTH.DEVICE_REGISTER, deviceInfo);
    
    // Nếu đăng ký thành công, lưu deviceId
    if (response.data && response.data.success) {
      const { deviceId } = response.data;
      
      if (deviceId) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Device registration error:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Đăng ký thiết bị thất bại',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500,
    };
  }
};

/**
 * Kiểm tra trạng thái đăng nhập
 * @returns {Promise<boolean>} - Trạng thái đăng nhập
 */
export const isLoggedIn = async () => {
  try {
    const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    
    return !!(accessToken && userData);
  } catch (error) {
    console.error('Check login status error:', error);
    return false;
  }
};

/**
 * Lấy thông tin người dùng từ storage
 * @returns {Promise<Object|null>} - Thông tin người dùng
 */
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Lấy access token từ storage
 * @returns {Promise<string|null>} - Access token
 */
export const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Get access token error:', error);
    return null;
  }
};

// Interceptor để xử lý refresh token tự động
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Nếu lỗi là 401 (Unauthorized) và chưa thử refresh token trước đó
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Thử refresh token
        const refreshResult = await refreshToken();
        
        if (refreshResult.success) {
          // Cập nhật header cho request ban đầu
          originalRequest.headers['Authorization'] = `Bearer ${await getAccessToken()}`;
          
          // Thử lại request ban đầu
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Nếu refresh token cũng thất bại, đăng xuất người dùng
        await logout(false);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  login,
  register,
  refreshToken,
  logout,
  registerDevice,
  isLoggedIn,
  getCurrentUser,
  getAccessToken,
  STORAGE_KEYS,
};

export default authService; 