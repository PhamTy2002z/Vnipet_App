import dashboardService from '@/api/services/dashboardService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Định nghĩa kiểu dữ liệu cho người dùng
interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountTier?: string;
  hasCompletedInitialSetup?: boolean;
}

// Định nghĩa kiểu dữ liệu cho pet
interface PetData {
  _id: string;
  name: string;
  species: string;
  birthDate: string | null;
  ownerName: string;
  avatarUrl?: string;
  status: string;
}

// Định nghĩa kiểu dữ liệu cho dashboard
interface DashboardData {
  totalPets: number;
  totalScans: number;
  recentScans: any[];
  petsData: any[];
  canAddMorePets: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresAt: Date;
}

interface Cart {
  items: any[];
  totalPrice: number;
}

// Định nghĩa kiểu dữ liệu cho context
interface UserContextProps {
  user: UserData | null;
  pets: PetData[];
  dashboardData: DashboardData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  cart: Cart | null;
  signIn: (email: string, password: string, deviceId: string) => Promise<any>;
  signUp: (name: string, email: string, phone: string, password: string, confirmPassword: string, deviceId: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshCart: () => Promise<Cart | null>;
  loadUserData: () => Promise<void>;
  clearUserData: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => void;
  updatePets: (pets: PetData[]) => void;
  getDeviceId: () => Promise<string>;
}

// Tạo context
const UserContext = createContext<UserContextProps | undefined>(undefined);

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000/api/v1';

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [pets, setPets] = useState<PetData[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  // Kiểm tra token và lấy dữ liệu người dùng
  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Kiểm tra token
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Gọi API lấy dữ liệu dashboard
      const response = await dashboardService.getUserDashboard();
      
      console.log('Fetch user dashboard response:', response);
      
      if (response.success && response.data) {
        // Lưu toàn bộ dữ liệu dashboard
        setDashboardData(response.data);
        
        // Lưu danh sách thú cưng
        if (Array.isArray(response.data.pets)) {
          console.log('Pet data from API:', JSON.stringify(response.data.pets, null, 2));
          setPets(response.data.pets);
        }
        
        // Kiểm tra cấu trúc phản hồi từ API
        const userData: UserData = {
          id: response.data.user?.id || '',
          name: response.data.user?.name || '',
          email: response.data.user?.email || '',
          phone: response.data.user?.phone || '',
          accountTier: response.data.user?.accountTier || '',
          hasCompletedInitialSetup: response.data.user?.hasCompletedInitialSetup || false,
        };
        
        console.log('Parsed user data:', userData);
        
        setUser(userData);
        setIsAuthenticated(true);
        
        // Lưu thông tin user vào AsyncStorage
        await AsyncStorage.setItem('@vnipet_user_data', JSON.stringify(userData));
      } else {
        // Nếu có lỗi, xóa token và thông tin người dùng
        await clearUserData();
      }
    } catch (error) {
      console.error('Load user data error:', error);
      // Nếu có lỗi, xóa token và thông tin người dùng
      await clearUserData();
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa dữ liệu người dùng khi đăng xuất
  const clearUserData = async () => {
    try {
      await AsyncStorage.removeItem('@vnipet_access_token');
      await AsyncStorage.removeItem('@vnipet_refresh_token');
      await AsyncStorage.removeItem('@vnipet_user_data');
      // Xóa thêm thông tin Remember me khi đăng xuất
      await AsyncStorage.removeItem('@vnipet_remember_me');
      setUser(null);
      setPets([]);
      setDashboardData(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Clear user data error:', error);
    }
  };

  // Cập nhật thông tin người dùng
  const updateUserData = (data: Partial<UserData>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...data };
      
      // Lưu cập nhật vào AsyncStorage
      AsyncStorage.setItem('@vnipet_user_data', JSON.stringify(updatedUser))
        .catch(err => console.error('Error saving updated user data:', err));
        
      return updatedUser;
    });
  };

  // Cập nhật danh sách pets từ bên ngoài
  const updatePets = (updatedPets: PetData[]) => {
    setPets(updatedPets);
    
    // Cập nhật trong dashboardData nếu có
    if (dashboardData) {
      setDashboardData({
        ...dashboardData,
        petsData: updatedPets.map(pet => ({
          _id: pet._id,
          name: pet.name,
          species: pet.species,
          birthDate: pet.birthDate,
          ownerName: pet.ownerName,
          avatarUrl: pet.avatarUrl,
          status: pet.status
        }))
      });
    }
  };

  // Tự động kiểm tra trạng thái đăng nhập khi component mount
  useEffect(() => {
    const loadUserAndTokens = async () => {
      try {
        setIsLoading(true);
        
        const userString = await AsyncStorage.getItem('@vnipet_user');
        const accessToken = await AsyncStorage.getItem('@vnipet_access_token');
        const refreshToken = await AsyncStorage.getItem('@vnipet_refresh_token');
        
        if (userString && accessToken) {
          const userData = JSON.parse(userString);
          setUser(userData);
          
          // Nếu có refresh token, lưu vào state để sử dụng sau
          if (refreshToken) {
            setTokens({
              accessToken,
              refreshToken,
              expiresIn: '1d', // Mặc định
              refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Mặc định 30 ngày
            });
          }
          
          // Tự động lấy thông tin giỏ hàng
          await refreshCart();
        }
      } catch (error) {
        console.error('Lỗi khi tải thông tin người dùng:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserAndTokens();
  }, []);
  
  // Lấy device ID cho API calls
  const getDeviceId = async (): Promise<string> => {
    try {
      let deviceId = await AsyncStorage.getItem('@vnipet_device_id');
      
      // Nếu chưa có, tạo device ID mới
      if (!deviceId) {
        deviceId = `vnipet_mobile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem('@vnipet_device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Lỗi khi lấy/tạo device ID:', error);
      return 'vnipet-mobile-fallback';
    }
  };
  
  // Làm mới giỏ hàng từ API
  const refreshCart = async (): Promise<Cart | null> => {
    try {
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      
      if (!token) {
        return null;
      }
      
      const deviceId = await getDeviceId();
      
      const response = await axios.get(`${API_URL}/cart/refresh`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'device-id': deviceId,
          'app-version': '1.0.0',
          'platform': 'ios', 
          'os-version': '14.0',
          'device-type': 'mobile',
          'User-Agent': 'VnipetApp/1.0 iOS/14.0',
          // Thêm cache control headers
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Thêm tham số ngăn cache
        params: { _nocache: new Date().getTime() }
      });
      
      console.log('[UserContext] RefreshCart response:', 
        response.data?.success,
        'items:', response.data?.data?.items?.length || 0
      );
      
      if (response.data && response.data.success && response.data.data) {
        const cartData = response.data.data;
        setCart(cartData);
        return cartData;
      }
      
      return null;
    } catch (error) {
      console.error('Lỗi khi làm mới giỏ hàng:', error);
      return null;
    }
  };
  
  // Tự động làm mới giỏ hàng định kỳ nếu người dùng đã đăng nhập
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    if (isAuthenticated && user) {
      // Làm mới giỏ hàng ngay lập tức
      refreshCart();
      
      // Thiết lập interval để làm mới giỏ hàng mỗi 30 giây
      intervalId = setInterval(() => {
        console.log('[UserContext] Auto refreshing cart...');
        refreshCart();
      }, 30000); // 30 giây
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, user?.id]);
  
  // Đăng nhập
  const signIn = async (email: string, password: string, deviceId: string) => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(`${API_URL}/auth/mobile-login`, {
        email,
        password,
        deviceId
      });
      
      if (response.data && response.data.success) {
        const { user: userData, tokens: authTokens, cart: cartData } = response.data;
        
        // Lưu thông tin người dùng và tokens
        await AsyncStorage.setItem('@vnipet_user', JSON.stringify(userData));
        await AsyncStorage.setItem('@vnipet_access_token', authTokens.accessToken);
        await AsyncStorage.setItem('@vnipet_refresh_token', authTokens.refreshToken);
        
        setUser(userData);
        setTokens({
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken,
          expiresIn: authTokens.expiresIn,
          refreshExpiresAt: new Date(authTokens.refreshExpiresAt)
        });
        
        // Cập nhật giỏ hàng nếu có
        if (cartData) {
          setCart(cartData);
        }
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Đăng nhập thất bại');
      }
    } catch (error: any) {
      console.error('Lỗi khi đăng nhập:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Đăng ký
  const signUp = async (name: string, email: string, phone: string, password: string, confirmPassword: string, deviceId: string) => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(`${API_URL}/auth/mobile-register`, {
        name,
        email,
        phone,
        password,
        confirmPassword,
        deviceId
      });
      
      if (response.data && response.data.success) {
        const { user: userData, tokens: authTokens } = response.data;
        
        // Lưu thông tin người dùng và tokens
        await AsyncStorage.setItem('@vnipet_user', JSON.stringify(userData));
        await AsyncStorage.setItem('@vnipet_access_token', authTokens.accessToken);
        await AsyncStorage.setItem('@vnipet_refresh_token', authTokens.refreshToken);
        
        setUser(userData);
        setTokens({
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken,
          expiresIn: authTokens.expiresIn,
          refreshExpiresAt: new Date(authTokens.refreshExpiresAt)
        });
        
        // Khởi tạo giỏ hàng rỗng
        setCart({ items: [], totalPrice: 0 });
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Đăng ký thất bại');
      }
    } catch (error: any) {
      console.error('Lỗi khi đăng ký:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Đăng xuất
  const signOut = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('@vnipet_refresh_token');
      const deviceId = await getDeviceId();
      
      // Gọi API đăng xuất nếu có refresh token
      if (refreshToken && deviceId) {
        try {
          await axios.post(`${API_URL}/auth/logout`, {
            refreshToken,
            deviceId
          });
        } catch (error) {
          console.error('Lỗi khi gọi API đăng xuất:', error);
          // Tiếp tục xóa dữ liệu local ngay cả khi API thất bại
        }
      }
      
      // Xóa thông tin local
      await AsyncStorage.removeItem('@vnipet_user');
      await AsyncStorage.removeItem('@vnipet_access_token');
      await AsyncStorage.removeItem('@vnipet_refresh_token');
      
      // Reset state
      setUser(null);
      setTokens(null);
      setCart(null);
      
      // Chuyển hướng về trang đăng nhập
      router.replace('/login');
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    }
  };

  const value = {
    user,
    pets,
    dashboardData,
    isLoading,
    isAuthenticated,
    cart,
    signIn,
    signUp,
    signOut,
    refreshCart,
    loadUserData,
    clearUserData,
    updateUserData,
    updatePets,
    getDeviceId
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook để sử dụng context
export const useUser = (): UserContextProps => {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};

export default UserContext; 