import dashboardService from '@/api/services/dashboardService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Định nghĩa kiểu dữ liệu cho pet
export interface PetData {
  _id: string;
  info: {
    name: string;
    species: string;
    breed?: string;
  };
  avatar?: {
    publicUrl?: string;
    r2Key?: string;
    bucket?: string;
    originalName?: string;
    mimetype?: string;
    size?: number;
    uploadedAt?: Date;
  } | string;  // Cho phép cả object phức tạp hoặc string URL trực tiếp
  petImage?: string; // URL hình ảnh thú cưng
  status: string;
  qrToken?: string;
  themeId?: any;
  linking?: any;
  visibility?: string;
}

// Định nghĩa kiểu dữ liệu cho user
export interface UserData {
  id: string;
  name: string;
  email: string;
  accountTier?: string;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    language?: string;
  };
}

// Định nghĩa kiểu dữ liệu cho dashboard
interface DashboardData {
  user: UserData;
  pets: PetData[];
  stats: {
    totalPets: number;
    activePets: number;
    linkedPets: number;
    totalThemes: number;
    appliedThemes: number;
  };
  purchasedThemes: any[];
  canAddMorePets: boolean;
}

// Định nghĩa kiểu dữ liệu cho context
interface UserContextProps {
  user: UserData | null;
  pets: PetData[];
  dashboardData: DashboardData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loadUserData: () => Promise<void>;
  clearUserData: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => void;
}

// Tạo context
const UserContext = createContext<UserContextProps | undefined>(undefined);

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [pets, setPets] = useState<PetData[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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
          accountTier: response.data.user?.accountTier || '',
          preferences: response.data.user?.preferences,
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

  // Khởi tạo: kiểm tra xem đã có dữ liệu người dùng trong AsyncStorage chưa
  useEffect(() => {
    const initializeUser = async () => {
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
        
        // Lấy dữ liệu người dùng từ AsyncStorage trước
        const userData = await AsyncStorage.getItem('@vnipet_user_data');
        
        if (userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
        
        // Gọi API để lấy dữ liệu mới nhất
        loadUserData();
      } catch (error) {
        console.error('Initialize user error:', error);
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const value = {
    user,
    pets,
    dashboardData,
    isLoading,
    isAuthenticated,
    loadUserData,
    clearUserData,
    updateUserData,
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