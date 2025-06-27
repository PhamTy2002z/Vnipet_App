import { API_BASE_URL } from '@/api/config/apiConfig';
import AllergiesModal from '@/components/modals/AllergiesModal';
import BasicInfoModal from '@/components/modals/BasicInfoModal';
import CheckupScheduleModal from '@/components/modals/CheckupScheduleModal';
import PreferencesModal from '@/components/modals/PreferencesModal';
import VaccinationHistoryModal from '@/components/modals/VaccinationHistoryModal';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AntDesign, Entypo, Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, InteractionManager, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// Định nghĩa interface cho dữ liệu Pet
interface PetData {
  id: string;
  name: string;
  species: string;
  birthDate: Date | null;
  description: string;
  preferences: {
    favoriteFoods: string[];
    favoriteShampoo: string;
    dailyRoutine: string;
  };
  vaccinationHistory: {
    id: string;
    name: string;
    date: Date;
  }[];
  checkupSchedule: {
    id: string;
    note: string;
    date: Date;
  }[];
  allergies: {
    id: string;
    name: string;
    notes: string;
  }[];
  avatarUrl: string | null;
}

// Dữ liệu mẫu cho thông tin thú cưng
const petDetailsData = [
  {
    id: 1,
    title: 'Thông tin cơ bản',
    icon: <Ionicons name="information-circle-outline" size={28} color="#403572" />,
    description: 'Thông tin chung về thú cưng của bạn',
    color: '#F6F5FB',
    textColor: '#403572',
  },
  {
    id: 2,
    title: 'Sở thích',
    icon: <MaterialIcons name="favorite-outline" size={28} color="#FF5648" />,
    description: 'Những điều thú cưng của bạn thích',
    color: '#FFF4F4',
    textColor: '#FF5648',
  },
  {
    id: 3,
    title: 'Lịch sử tiêm chủng',
    icon: <MaterialCommunityIcons name="history" size={28} color="#4338CA" />,
    description: 'Lịch sử tiêm chủng của thú cưng',
    color: '#F5F5FF',
    textColor: '#4338CA',
  },
  {
    id: 4,
    title: 'Lịch tái khám',
    icon: <AntDesign name="calendar" size={28} color="#479696" />,
    description: 'Quản lý lịch tái khám của thú cưng',
    color: '#F5F9F9',
    textColor: '#479696',
  },
  {
    id: 5,
    title: 'Dị ứng',
    icon: <FontAwesome5 name="allergies" size={28} color="#C93F8D" />,
    description: 'Thông tin về dị ứng của thú cưng',
    color: '#FDF9FB',
    textColor: '#C93F8D',
  },
];

// Dữ liệu mẫu cho lịch tái khám sắp tới và chất dị ứng
const petTraitsData = [
  // Lịch tái khám sắp tới
  { id: 1, name: 'Khám tổng quát - 20/12/2023', category: 'upcoming', color: '#F5F9F9', textColor: '#479696' },
  { id: 2, name: 'Tiêm phòng - 15/01/2024', category: 'upcoming', color: '#F5F9F9', textColor: '#479696' },
  { id: 3, name: 'Khám răng - 05/02/2024', category: 'upcoming', color: '#F5F9F9', textColor: '#479696' },
  // Chất dị ứng
  { id: 4, name: 'Thịt bò', category: 'allergies', color: '#FFF4F4', textColor: '#FF7E73' },
  { id: 5, name: 'Sữa', category: 'allergies', color: '#FFF4F4', textColor: '#FF7E73' },
];

// API config
// Tạo request headers cho API
const API_HEADERS = {
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

// API functions
// Cập nhật thông tin cơ bản cho thú cưng
const updatePetBasicInfo = async (petId: string, data: any) => {
  try {
    const token = await AsyncStorage.getItem('@vnipet_access_token');
    if (!token) {
      throw new Error('Không tìm thấy token đăng nhập');
    }

    // Chuẩn bị dữ liệu để gửi đến API
    const updateData = {
      info: {
        name: data.name || '',
        species: data.species || '',
        birthDate: data.birthDate || null,
        description: data.description || ''
      }
    };
    
    console.log('Cập nhật thông tin cơ bản cho thú cưng:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${petId}`, {
      method: 'PUT',
      headers: {
        ...API_HEADERS,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const responseData = await response.json();
    console.log('Kết quả cập nhật thông tin cơ bản:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Không thể cập nhật thông tin thú cưng');
    }

    return responseData;
  } catch (error: any) {
    console.error('Lỗi khi cập nhật thông tin cơ bản:', error);
    throw error;
  }
};

// Cập nhật sở thích cho thú cưng
const updatePetPreferences = async (petId: string, data: any) => {
  try {
    const token = await AsyncStorage.getItem('@vnipet_access_token');
    if (!token) {
      throw new Error('Không tìm thấy token đăng nhập');
    }

    const updateData = {
      preferences: {
        favoriteFoods: data.preferences.favoriteFoods || [],
        favoriteShampoo: data.preferences.favoriteShampoo || '',
        dailyRoutine: data.preferences.dailyRoutine || ''
      }
    };
    
    console.log('Cập nhật sở thích cho thú cưng:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${petId}/preferences`, {
      method: 'PUT',
      headers: {
        ...API_HEADERS,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData.preferences)
    });

    const responseData = await response.json();
    console.log('Kết quả cập nhật sở thích:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Không thể cập nhật sở thích thú cưng');
    }

    return responseData;
  } catch (error: any) {
    console.error('Lỗi khi cập nhật sở thích:', error);
    throw error;
  }
};

// Cập nhật lịch sử tiêm chủng cho thú cưng
const updatePetVaccinationHistory = async (petId: string, data: any) => {
  try {
    const token = await AsyncStorage.getItem('@vnipet_access_token');
    if (!token) {
      throw new Error('Không tìm thấy token đăng nhập');
    }

    // Xử lý dữ liệu để gửi đến API
    const vaccinations = data.vaccinationHistory.map((item: any) => ({
      name: item.name,
      date: item.date
    }));
    
    const updateData = {
      vaccinations: vaccinations
    };
    
    console.log('Cập nhật lịch sử tiêm chủng:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${petId}`, {
      method: 'PUT',
      headers: {
        ...API_HEADERS,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const responseData = await response.json();
    console.log('Kết quả cập nhật lịch sử tiêm chủng:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Không thể cập nhật lịch sử tiêm chủng');
    }

    return responseData;
  } catch (error: any) {
    console.error('Lỗi khi cập nhật lịch sử tiêm chủng:', error);
    throw error;
  }
};

// Cập nhật lịch tái khám cho thú cưng
const updatePetCheckupSchedule = async (petId: string, data: any) => {
  try {
    const token = await AsyncStorage.getItem('@vnipet_access_token');
    if (!token) {
      throw new Error('Không tìm thấy token đăng nhập');
    }

    // Xử lý dữ liệu để gửi đến API
    const reExaminations = data.checkupSchedule.map((item: any) => ({
      note: item.note,
      date: item.date
    }));
    
    const updateData = {
      reExaminations: reExaminations
    };
    
    console.log('Cập nhật lịch tái khám:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${petId}`, {
      method: 'PUT',
      headers: {
        ...API_HEADERS,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const responseData = await response.json();
    console.log('Kết quả cập nhật lịch tái khám:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Không thể cập nhật lịch tái khám');
    }

    return responseData;
  } catch (error: any) {
    console.error('Lỗi khi cập nhật lịch tái khám:', error);
    throw error;
  }
};

// Cập nhật thông tin dị ứng cho thú cưng
const updatePetAllergies = async (petId: string, data: any) => {
  try {
    const token = await AsyncStorage.getItem('@vnipet_access_token');
    if (!token) {
      throw new Error('Không tìm thấy token đăng nhập');
    }

    // Xử lý dữ liệu để gửi đến API
    const substances = data.allergies.map((item: any) => item.name);
    const notes = data.allergies.map((item: any) => item.notes).join(", ");
    
    const updateData = {
      allergicInfo: {
        substances: substances,
        note: notes
      }
    };
    
    console.log('Cập nhật thông tin dị ứng:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${petId}`, {
      method: 'PUT',
      headers: {
        ...API_HEADERS,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const responseData = await response.json();
    console.log('Kết quả cập nhật thông tin dị ứng:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Không thể cập nhật thông tin dị ứng');
    }

    return responseData;
  } catch (error: any) {
    console.error('Lỗi khi cập nhật thông tin dị ứng:', error);
    throw error;
  }
};

export default function PetScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const subTextColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const accentColor = '#595085';
  
  // Sử dụng hook để xử lý quyền truy cập thư viện ảnh
  const [mediaLibraryPermission, requestMediaLibraryPermissionFn] = ImagePicker.useMediaLibraryPermissions();
  
  // Lấy tham số từ URL
  const params = useLocalSearchParams();
  const urlPetId = params.petId as string;
  const samplePetId = params.samplePetId as string;

  // State cho pet selector modal
  const [isPetSelectorVisible, setIsPetSelectorVisible] = useState(false);

  // State cho modal
  const [isBasicInfoModalVisible, setBasicInfoModalVisible] = useState(false);
  const [isPreferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [isVaccinationHistoryModalVisible, setVaccinationHistoryModalVisible] = useState(false);
  const [isCheckupScheduleModalVisible, setCheckupScheduleModalVisible] = useState(false);
  const [isAllergiesModalVisible, setAllergiesModalVisible] = useState(false);
  
  // State cho danh sách thú cưng của user
  const [userPets, setUserPets] = useState<any[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(false);
  const [isLoadingCurrentPet, setIsLoadingCurrentPet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPetData, setCurrentPetData] = useState<PetData>({
    id: '1',
    name: "Buddy",
    species: "Golden Retriever",
    birthDate: new Date(2020, 2, 15), // 15/03/2020 
    description: "Buddy là một chú chó rất thân thiện và năng động. Thích chơi đùa và rất trung thành với gia đình.",
    preferences: {
      favoriteFoods: ["Thịt gà", "Pate chó", "Xương gặm"],
      favoriteShampoo: "Shampoo hữu cơ cho chó",
      dailyRoutine: "Buổi sáng: ăn và chơi đùa. Buổi chiều: ngủ. Buổi tối: đi dạo và ăn."
    },
    vaccinationHistory: [
      {
        id: '1',
        name: 'Vắc xin 5 bệnh',
        date: new Date(2020, 4, 15) // 15/05/2020
      },
      {
        id: '2',
        name: 'Vắc xin dại',
        date: new Date(2020, 5, 10) // 10/06/2020
      }
    ],
    checkupSchedule: [
      {
        id: '1',
        note: 'Khám sức khỏe định kỳ',
        date: new Date(2023, 11, 25) // 25/12/2023
      }
    ],
    allergies: [
      {
        id: '1',
        name: 'Thịt bò',
        notes: 'Gây ngứa và phát ban nhẹ'
      }
    ],
    avatarUrl: null
  });

  const { pets: userContextPets, updatePets } = useUser();

  // Hàm để lấy token từ AsyncStorage
  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      console.log('Token hiện tại:', token ? 'Có token' : 'Không có token');
      return token;
    } catch (error) {
      console.error('Lỗi khi lấy token:', error);
      return null;
    }
  };

  // Hàm để lấy danh sách thú cưng từ API
  const fetchUserPets = async () => {
    setIsLoadingPets(true);
    setError(null);
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Không tìm thấy token đăng nhập');
      }
      
      console.log('Đang gọi API lấy danh sách thú cưng...');
      console.log('API URL:', `${API_BASE_URL}/pet-owner/optimized-pets`);
      
      const response = await fetch(`${API_BASE_URL}/pet-owner/optimized-pets`, {
        method: 'GET',
        headers: {
          ...API_HEADERS,
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Kết quả API thú cưng:', data);
      
      // In chi tiết một pet để xem cấu trúc
      if (data.data && data.data.length > 0) {
        console.log('Cấu trúc dữ liệu pet đầu tiên:', JSON.stringify(data.data[0], null, 2));
      } else if (data.pets && data.pets.length > 0) {
        console.log('Cấu trúc dữ liệu pet đầu tiên:', JSON.stringify(data.pets[0], null, 2));
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi lấy danh sách thú cưng');
      }
      
      // API mới có thể có cấu trúc dữ liệu khác, xử lý phù hợp
      let userPetsData = [];
      if (Array.isArray(data)) {
        // Nếu API trả về trực tiếp là array
        userPetsData = data;
      } else if (data.data && Array.isArray(data.data)) {
        // Nếu API trả về trong data.data
        userPetsData = data.data;
      } else if (data.pets && Array.isArray(data.pets)) {
        // Nếu API trả về trong data.pets
        userPetsData = data.pets;
      } else {
        console.warn('Không tìm thấy dữ liệu thú cưng trong API response');
      }
      
      console.log(`Tìm thấy ${userPetsData.length} thú cưng`);
      setUserPets(userPetsData);
      
      // Nếu có thú cưng và không có petId từ URL, tự động chọn thú cưng đầu tiên
      if (userPetsData.length > 0 && !urlPetId) {
        console.log('Tự động chọn thú cưng đầu tiên');
        await handleSelectPet(userPetsData[0]);
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách thú cưng:', error);
      setError(error.message);
      Alert.alert('Lỗi', error.message);
    } finally {
      setIsLoadingPets(false);
    }
  };

  // Hàm để lấy chi tiết thú cưng dựa trên ID
  const fetchPetDetails = async (petId: string): Promise<PetData | null> => {
    setIsLoadingCurrentPet(true);
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Không tìm thấy token đăng nhập');
      }
      
      console.log('Đang gọi API lấy chi tiết thú cưng...');
      console.log('API URL:', `${API_BASE_URL}/pet-owner/pets/${petId}`);
      
      const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${petId}`, {
        method: 'GET',
        headers: {
          ...API_HEADERS,
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Kết quả API chi tiết thú cưng:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi lấy thông tin thú cưng');
      }
      
      // In ra toàn bộ cấu trúc API để debug
      console.log('Cấu trúc chi tiết của API response:', JSON.stringify(data, null, 2));
      
      // Chuyển đổi dữ liệu từ API để phù hợp với định dạng hiện tại
      const petData: PetData = {
        id: data._id || data.id,
        name: data.info?.name || data.name || "Không có tên",
        species: data.info?.species || data.species || "Chưa cập nhật",
        birthDate: data.info?.birthDate ? new Date(data.info.birthDate) : 
                  data.birthDate ? new Date(data.birthDate) : null,
        description: data.info?.description || data.description || "",
        preferences: data.preferences || {
          favoriteFoods: [],
          favoriteShampoo: "",
          dailyRoutine: ""
        },
        vaccinationHistory: Array.isArray(data.vaccinations) 
          ? data.vaccinations.map((vac: any) => ({
              id: vac._id || vac.id || String(Math.random()),
              name: vac.name || "",
              date: new Date(vac.date || Date.now())
            }))
          : [],
        checkupSchedule: Array.isArray(data.reExaminations)
          ? data.reExaminations.map((exam: any) => ({
              id: exam._id || exam.id || String(Math.random()),
              note: exam.note || "",
              date: new Date(exam.date || Date.now())
            }))
          : [],
        allergies: Array.isArray(data.allergicInfo?.substances)
          ? data.allergicInfo.substances.map((substance: string, index: number) => ({
              id: index.toString(),
              name: substance || "",
              notes: data.allergicInfo?.note || ""
            }))
          : [],
        avatarUrl: data.avatarUrl || data.avatar?.publicUrl || data.petImage || null
      };
      
      return petData;
    } catch (error: any) {
      console.error('Lỗi khi lấy chi tiết thú cưng:', error);
      Alert.alert('Lỗi', error.message);
      return null;
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Xử lý khi chọn pet từ danh sách
  const handleSelectPet = async (selectedPet: any) => {
    try {
      // Xác định ID của thú cưng từ dữ liệu trả về (API mới có thể khác cấu trúc)
      const petId = selectedPet._id || selectedPet.id;
      
      if (!petId) {
        console.error('Không tìm thấy ID thú cưng:', selectedPet);
        Alert.alert('Lỗi', 'Không thể xác định thông tin thú cưng. Vui lòng thử lại sau.');
        return;
      }
      
      console.log(`Chọn thú cưng với ID: ${petId}`);
      
      // Đóng modal trước để tạo trải nghiệm mượt mà hơn
      setIsPetSelectorVisible(false);
      setIsLoadingCurrentPet(true);
      
      // Tạo dữ liệu dự phòng từ selectedPet để đề phòng API chi tiết thất bại
      const fallbackPetData: PetData = {
        id: petId,
        name: selectedPet.info?.name || selectedPet.name || "Không có tên",
        species: selectedPet.info?.species || selectedPet.species || "Chưa cập nhật",
        birthDate: null,
        description: selectedPet.info?.description || selectedPet.description || "",
        preferences: {
          favoriteFoods: [],
          favoriteShampoo: "",
          dailyRoutine: ""
        },
        vaccinationHistory: [],
        checkupSchedule: [],
        allergies: [],
        avatarUrl: selectedPet.avatarUrl || selectedPet.avatar?.publicUrl || selectedPet.petImage || null
      };
      
      try {
        const petDetails = await fetchPetDetails(petId);
        if (petDetails) {
          setCurrentPetData(petDetails);
          console.log('Đã chuyển sang thú cưng mới thành công với đầy đủ dữ liệu');
        } else {
          // Nếu không lấy được chi tiết, sử dụng dữ liệu dự phòng
          console.log('Sử dụng dữ liệu dự phòng khi không lấy được chi tiết');
          setCurrentPetData(fallbackPetData);
          Alert.alert(
            'Thông báo',
            'Đã chuyển thú cưng nhưng có thể thiếu một số thông tin chi tiết.'
          );
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết thú cưng, sử dụng dữ liệu dự phòng:', error);
        // Khi có lỗi, vẫn chuyển sang thú cưng mới nhưng với dữ liệu tối thiểu
        setCurrentPetData(fallbackPetData);
        Alert.alert(
          'Thông báo',
          'Đã chuyển thú cưng nhưng có thể thiếu một số thông tin chi tiết.'
        );
      }
    } catch (error) {
      console.error('Lỗi khi chọn thú cưng:', error);
      Alert.alert('Lỗi', 'Không thể chuyển sang thú cưng này. Vui lòng thử lại sau.');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Xử lý khi lưu dữ liệu pet
  const handleSavePetData = async (data: Partial<PetData>) => {
    try {
      setIsLoadingCurrentPet(true);
      console.log('Đang lưu thông tin cơ bản:', data);
      
      await updatePetBasicInfo(currentPetData.id, data);
      
      // Cập nhật state sau khi lưu thành công
      setCurrentPetData({...currentPetData, ...data});
      
      // Cập nhật danh sách thú cưng trong state
      const updatedPets = userPets.map(pet => {
        if (pet._id === currentPetData.id) {
          return {
            ...pet,
            info: {
              ...pet.info,
              name: data.name || pet.info?.name,
              species: data.species || pet.info?.species,
              description: data.description || pet.info?.description,
              birthDate: data.birthDate || pet.info?.birthDate
            }
          };
        }
        return pet;
      });
      
      // Cập nhật state local
      setUserPets(updatedPets);
      
      // Cập nhật user context để đồng bộ trên toàn ứng dụng
      updatePets(updatedPets);
      
      // Tải lại danh sách thú cưng
      fetchUserPets();
      
      Alert.alert('Thành công', 'Đã cập nhật thông tin cơ bản thành công');
    } catch (error: any) {
      console.error('Lỗi khi lưu thông tin cơ bản:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin thú cưng');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Xử lý khi lưu dữ liệu sở thích
  const handleSavePreferences = async (data: Partial<PetData>) => {
    try {
      setIsLoadingCurrentPet(true);
      console.log('Đang lưu thông tin sở thích:', data);
      
      await updatePetPreferences(currentPetData.id, data);
      
      // Cập nhật state sau khi lưu thành công
      setCurrentPetData({...currentPetData, ...data});
      
      Alert.alert('Thành công', 'Đã cập nhật sở thích thành công');
    } catch (error: any) {
      console.error('Lỗi khi lưu thông tin sở thích:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật sở thích thú cưng');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Xử lý khi lưu dữ liệu lịch sử tiêm chủng
  const handleSaveVaccinationHistory = async (data: Partial<PetData>) => {
    try {
      setIsLoadingCurrentPet(true);
      console.log('Đang lưu lịch sử tiêm chủng:', data);
      
      await updatePetVaccinationHistory(currentPetData.id, data);
      
      // Cập nhật state sau khi lưu thành công
      setCurrentPetData({...currentPetData, ...data});
      
      Alert.alert('Thành công', 'Đã cập nhật lịch sử tiêm chủng thành công');
    } catch (error: any) {
      console.error('Lỗi khi lưu lịch sử tiêm chủng:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật lịch sử tiêm chủng');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Xử lý khi lưu dữ liệu lịch tái khám
  const handleSaveCheckupSchedule = async (data: Partial<PetData>) => {
    try {
      setIsLoadingCurrentPet(true);
      console.log('Đang lưu lịch tái khám:', data);
      
      await updatePetCheckupSchedule(currentPetData.id, data);
      
      // Cập nhật state sau khi lưu thành công
      setCurrentPetData({...currentPetData, ...data});
      
      Alert.alert('Thành công', 'Đã cập nhật lịch tái khám thành công');
    } catch (error: any) {
      console.error('Lỗi khi lưu lịch tái khám:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật lịch tái khám');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Xử lý khi lưu dữ liệu dị ứng
  const handleSaveAllergies = async (data: Partial<PetData>) => {
    try {
      setIsLoadingCurrentPet(true);
      console.log('Đang lưu thông tin dị ứng:', data);
      
      await updatePetAllergies(currentPetData.id, data);
      
      // Cập nhật state sau khi lưu thành công
      setCurrentPetData({...currentPetData, ...data});
      
      Alert.alert('Thành công', 'Đã cập nhật thông tin dị ứng thành công');
    } catch (error: any) {
      console.error('Lỗi khi lưu thông tin dị ứng:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin dị ứng');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // State cho avatar options modal
  const [isAvatarOptionsVisible, setAvatarOptionsVisible] = useState(false);
  const [isAvatarHovered, setAvatarHovered] = useState(false);

  // Hàm để chọn ảnh từ thư viện
  const pickImage = async () => {
    console.log('Bắt đầu quá trình chọn ảnh...');
    
    // Đóng modal trước
    setAvatarOptionsVisible(false);
    
    // Đợi animation của modal hoàn tất để tránh xung đột UI (đặc biệt trên iOS)
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Kiểm tra quyền trước
        if (!mediaLibraryPermission?.granted) {
          console.log('Chưa có quyền, yêu cầu quyền truy cập thư viện ảnh...');
          const permissionResult = await requestMediaLibraryPermissionFn();
          console.log('Kết quả yêu cầu quyền:', permissionResult);
          
          if (!permissionResult.granted) {
            console.log('Quyền bị từ chối sau khi yêu cầu');
            Alert.alert(
              'Cần quyền truy cập',
              'Ứng dụng cần quyền truy cập thư viện ảnh để chọn avatar. Vui lòng cấp quyền trong Cài đặt.',
              [{ text: 'Đã hiểu' }]
            );
            return;
          }
        } else {
          console.log('Đã có quyền truy cập thư viện ảnh');
        }
        
        console.log('Mở thư viện ảnh...');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          legacy: true
        });
        
        console.log('Kết quả chọn ảnh:', result);
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedAsset = result.assets[0];
          console.log('Ảnh đã chọn:', selectedAsset.uri);
          uploadAvatar(selectedAsset.uri);
        } else {
          console.log('Người dùng đã hủy chọn ảnh');
        }
      } catch (error) {
        console.error('Lỗi khi chọn ảnh:', error);
        Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
      }
    });
  };

  // Hàm để upload avatar
  const uploadAvatar = async (imageUri: string) => {
    try {
      setIsLoadingCurrentPet(true);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Không tìm thấy token đăng nhập');
      }
      
      // Tạo FormData
      const formData = new FormData();
      
      // Lấy tên file từ URI
      const fileName = imageUri.split('/').pop() || `pet_avatar_${Date.now()}.jpg`;
      
      // Kiểm tra kiểu MIME
      const mimeType = imageUri.match(/\.(\w+)$/i)?.[1].toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
      
      // Thêm file vào form data
      formData.append('avatar', {
        uri: imageUri,
        name: fileName,
        type: mimeType,
      } as any);
      
      console.log('Đang upload avatar...');
      console.log('API URL:', `${API_BASE_URL}/pet-owner/pets/${currentPetData.id}/avatar`);
      
      const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${currentPetData.id}/avatar`, {
        method: 'POST',
        headers: {
          ...API_HEADERS,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      const data = await response.json();
      console.log('Kết quả upload avatar:', data);
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Không thể upload avatar');
      }
      
      const newAvatarUrl = data.avatar?.publicUrl || data.avatarUrl;
      
      // Cập nhật avatar URL trong state
      setCurrentPetData(prev => ({
        ...prev,
        avatarUrl: newAvatarUrl,
      }));
      
      // Cập nhật danh sách thú cưng trong userPets
      const updatedPets = userPets.map(pet => {
        if (pet._id === currentPetData.id || pet.id === currentPetData.id) {
          return {
            ...pet,
            avatarUrl: newAvatarUrl,
            avatar: {
              ...pet.avatar,
              publicUrl: newAvatarUrl
            }
          };
        }
        return pet;
      });
      setUserPets(updatedPets);
      
      // Cập nhật trong UserContext để đồng bộ với các màn hình khác
      if (updatePets) {
        updatePets(updatedPets);
      }
      
      Alert.alert('Thành công', 'Đã cập nhật avatar thú cưng thành công');
      
    } catch (error: any) {
      console.error('Lỗi khi upload avatar:', error);
      Alert.alert('Lỗi', error.message || 'Không thể upload avatar. Vui lòng thử lại.');
    } finally {
      setIsLoadingCurrentPet(false);
    }
  };

  // Hàm để xóa avatar
  const deleteAvatar = async () => {
    // Đóng modal trước
    setAvatarOptionsVisible(false);
    
    // Xác nhận trước khi xóa
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa avatar của thú cưng?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoadingCurrentPet(true);
              
              const token = await getAuthToken();
              if (!token) {
                throw new Error('Không tìm thấy token đăng nhập');
              }
              
              console.log('Đang xóa avatar...');
              console.log('API URL:', `${API_BASE_URL}/pet-owner/pets/${currentPetData.id}/avatar`);
              
              const response = await fetch(`${API_BASE_URL}/pet-owner/pets/${currentPetData.id}/avatar`, {
                method: 'DELETE',
                headers: {
                  ...API_HEADERS,
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              const data = await response.json();
              console.log('Kết quả xóa avatar:', data);
              
              if (!response.ok) {
                throw new Error(data.message || data.error || 'Không thể xóa avatar');
              }
              
              // Cập nhật avatar URL trong state
              setCurrentPetData(prev => ({
                ...prev,
                avatarUrl: null,
              }));
              
              // Cập nhật danh sách thú cưng trong userPets
              const updatedPets = userPets.map(pet => {
                if (pet._id === currentPetData.id || pet.id === currentPetData.id) {
                  return {
                    ...pet,
                    avatarUrl: null,
                    avatar: {
                      ...pet.avatar,
                      publicUrl: null
                    }
                  };
                }
                return pet;
              });
              setUserPets(updatedPets);
              
              // Cập nhật trong UserContext để đồng bộ với các màn hình khác
              if (updatePets) {
                updatePets(updatedPets);
              }
              
              Alert.alert('Thành công', 'Đã xóa avatar thú cưng thành công');
              
            } catch (error: any) {
              console.error('Lỗi khi xóa avatar:', error);
              Alert.alert('Lỗi', error.message || 'Không thể xóa avatar. Vui lòng thử lại.');
            } finally {
              setIsLoadingCurrentPet(false);
            }
          },
        },
      ],
    );
  };

  // Hiển thị modal tùy chọn avatar
  const showAvatarOptions = () => {
    setAvatarOptionsVisible(true);
  };

  // Lọc đặc điểm theo danh mục
  // Lấy dữ liệu từ thú cưng hiện tại thay vì dữ liệu mẫu
  const formatCheckupDate = (date: Date): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Tạo dữ liệu cho lịch tái khám từ dữ liệu thú cưng hiện tại
  const petUpcomingCheckups = currentPetData.checkupSchedule
    ? currentPetData.checkupSchedule.map((checkup, index) => ({
        id: checkup.id || index.toString(),
        name: `${checkup.note} - ${formatCheckupDate(new Date(checkup.date))}`,
        category: 'upcoming',
        color: '#F5F9F9',
        textColor: '#479696'
      }))
    : [];

  // Tạo dữ liệu cho dị ứng từ dữ liệu thú cưng hiện tại
  const petAllergies = currentPetData.allergies
    ? currentPetData.allergies.map((allergy, index) => ({
        id: allergy.id || index.toString(),
        name: allergy.name,
        category: 'allergies',
        color: '#FFF4F4',
        textColor: '#FF7E73'
      }))
    : [];

  // Sử dụng dữ liệu mẫu làm dữ liệu dự phòng khi không có dữ liệu thật
  const upcomingCheckups = petUpcomingCheckups.length > 0 
    ? petUpcomingCheckups 
    : petTraitsData.filter(trait => trait.category === 'upcoming');
    
  const allergies = petAllergies.length > 0 
    ? petAllergies 
    : petTraitsData.filter(trait => trait.category === 'allergies');

  // Xử lý khi click vào tab
  const handleTabPress = (tabId: number) => {
    switch(tabId) {
      case 1: // Thông tin cơ bản
        setBasicInfoModalVisible(true);
        break;
      case 2: // Sở thích
        setPreferencesModalVisible(true);
        break;
      case 3: // Lịch sử tiêm chủng
        setVaccinationHistoryModalVisible(true);
        break;
      case 4: // Lịch tái khám
        setCheckupScheduleModalVisible(true);
        break;
      case 5: // Dị ứng
        setAllergiesModalVisible(true);
        break;
      // Các trường hợp khác sẽ thêm sau
      default:
        console.log(`Tab ${tabId} pressed`);
        break;
    }
  };

  // Fetch danh sách thú cưng khi mở modal
  const handleOpenPetSelector = async () => {
    // Hiển thị modal trước để có trải nghiệm UI mượt mà
    setIsPetSelectorVisible(true);
    
    // Sau đó mới tải danh sách thú cưng
    try {
      // Debug token
      const token = await getAuthToken();
      console.log('Token hiện tại:', token ? 'Có token' : 'Không có token');
      
      // Tải danh sách thú cưng mới
      fetchUserPets();
    } catch (error) {
      console.error('Lỗi khi mở pet selector:', error);
    }
  };
  
  // Tải dữ liệu khi component được mount hoặc có petId từ URL
  useEffect(() => {
    // Hàm khởi tạo dữ liệu
    const initializePetData = async () => {
      // Nếu có petId từ URL, lấy thông tin thú cưng đó
      if (urlPetId) {
        console.log('Lấy thông tin thú cưng từ URL petId:', urlPetId);
        const petDetails = await fetchPetDetails(urlPetId);
        if (petDetails) {
          setCurrentPetData(petDetails);
        }
      } else {
        // Nếu không có petId, lấy danh sách thú cưng và chọn thú cưng đầu tiên
        fetchUserPets();
      }
    };
    
    initializePetData();
  }, [urlPetId]); // Cập nhật khi urlPetId thay đổi

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Loading indicator khi đang tải thông tin thú cưng */}
      {isLoadingCurrentPet && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Đang tải thông tin thú cưng...</Text>
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="paw" size={24} color="#333" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Định danh thú cưng</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={handleOpenPetSelector}
        >
          <Entypo name="menu" size={22} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar và Thông tin */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.avatarTouchable}
              onPress={showAvatarOptions}
              onPressIn={() => setAvatarHovered(true)}
              onPressOut={() => setAvatarHovered(false)}
            >
              <Image 
                source={currentPetData.avatarUrl 
                  ? { uri: currentPetData.avatarUrl } 
                  : { uri: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=162&auto=format&fit=crop' }} 
                style={styles.avatar} 
                resizeMode="cover"
              />
              <View style={[
                styles.editAvatarOverlay,
                isAvatarHovered && styles.editAvatarOverlayVisible
              ]}>
                <Feather name="camera" size={28} color="#FFFFFF" />
                <Text style={styles.editAvatarText}>Chỉnh sửa</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.petTypeTag}>
              <Feather name="tag" size={16} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.petName, { color: textColor }]}>{currentPetData.name}</Text>
            <Text style={[styles.petBreed, { color: subTextColor }]}>{currentPetData.species}</Text>
            <TouchableOpacity onPress={() => setBasicInfoModalVisible(true)}>
              <Text style={[styles.changeProfileButton, { color: accentColor }]}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Traits Section */}
        <View style={styles.traitsSection}>
          <Text style={[styles.traitTitle, { color: textColor }]}>Lịch tái khám sắp tới:</Text>
          <View style={styles.traitsRow}>
            {upcomingCheckups.map(trait => (
              <View 
                key={trait.id} 
                style={[styles.traitTag, { backgroundColor: trait.color }]}
              >
                <Text style={[styles.traitText, { color: trait.textColor }]}>{trait.name}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.traitsSection}>
          <Text style={[styles.traitTitle, { color: textColor }]}>Chất dị ứng:</Text>
          <View style={styles.traitsRow}>
            {allergies.map(trait => (
              <View 
                key={trait.id} 
                style={[styles.traitTag, { backgroundColor: trait.color }]}
              >
                <Text style={[styles.traitText, { color: trait.textColor }]}>{trait.name}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Pet Details */}
        <Text style={[styles.detailsTitle, { color: textColor }]}>Thông tin thú cưng:</Text>
        <View style={styles.detailsContainer}>
          {petDetailsData.map(detail => (
            <View key={detail.id} style={styles.detailCardWrapper}>
              <TouchableOpacity 
                style={[styles.detailCard, { backgroundColor: detail.color }]}
                activeOpacity={0.7}
                onPress={() => handleTabPress(detail.id)}
              >
                <View style={styles.detailCardIcon}>
                  {detail.icon}
                </View>
                <Text style={[styles.detailCardTitle, { color: detail.textColor }]}>{detail.title}</Text>
                <Text style={[styles.detailCardDescription, { color: detail.textColor, opacity: 0.7 }]}>
                  {detail.description}
                </Text>
                <View style={styles.bookmarkIcon}>
                  <Feather name="bookmark" size={18} color={detail.textColor} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Pet Selector Bottom Sheet */}
      <Modal
        visible={isPetSelectorVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPetSelectorVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPetSelectorVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContent}>
                <View style={styles.bottomSheetHandle}></View>
                
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Danh sách thú cưng</Text>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={() => {
                      console.log('Đang làm mới danh sách thú cưng');
                      fetchUserPets();
                    }}
                  >
                    <Ionicons name="refresh" size={20} color="#595085" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setIsPetSelectorVisible(false)}
                  >
                    <AntDesign name="close" size={22} color="#999" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.petsScrollView}>
                  {isLoadingPets ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={accentColor} />
                      <Text style={styles.loadingText}>Đang tải danh sách thú cưng...</Text>
                    </View>
                  ) : error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                      <TouchableOpacity 
                        style={styles.retryButton} 
                        onPress={fetchUserPets}
                      >
                        <Text style={styles.retryButtonText}>Thử lại</Text>
                      </TouchableOpacity>
                    </View>
                  ) : userPets.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <MaterialIcons name="pets" size={48} color="#CCCCCC" />
                      <Text style={styles.emptyText}>Bạn chưa có thú cưng nào</Text>
                    </View>
                  ) : (
                    userPets.map((pet, index) => {
                      // Xác định ID của thú cưng
                      const petId = pet._id || pet.id;
                      // Log để debug
                      console.log(`Pet #${index}: ID=${petId}, Name=${pet.info?.name || pet.name || 'N/A'}`);
                      // Kiểm tra pet này có phải là thú cưng đang được chọn không
                      const isSelected = petId === currentPetData.id;
                      
                      return (
                        <TouchableOpacity
                          key={petId || index}
                          style={[
                            styles.petSelectorItem,
                            isSelected ? styles.activePetItem : {}
                          ]}
                          onPress={() => handleSelectPet(pet)}
                        >
                          <View style={styles.petAvatarContainer}>
                            <Image 
                              source={pet.avatarUrl || pet.avatar?.publicUrl || pet.petImage
                                ? { uri: pet.avatarUrl || pet.avatar?.publicUrl || pet.petImage } 
                                : { uri: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=162&auto=format&fit=crop' }}
                              style={styles.petAvatarImage}
                              resizeMode="cover"
                            />
                            {isSelected && (
                              <View style={styles.activeCheckIcon}>
                                <MaterialIcons name="check-circle" size={18} color="#FFF" />
                              </View>
                            )}
                          </View>
                          <View style={styles.petSelectorDetails}>
                            <Text style={styles.petSelectorName}>{pet.info?.name || pet.name || "Không có tên"}</Text>
                            <Text style={styles.petSelectorType}>{pet.info?.species || pet.species || "Chưa cập nhật"}</Text>
                          </View>
                          <View style={styles.petSelectorArrow}>
                            <AntDesign 
                              name="right" 
                              size={16} 
                              color={isSelected ? accentColor : "#CCCCCC"} 
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Other Modals */}
      <BasicInfoModal
        isVisible={isBasicInfoModalVisible}
        onClose={() => setBasicInfoModalVisible(false)}
        petData={currentPetData}
        onSave={handleSavePetData}
      />
      
      <PreferencesModal
        isVisible={isPreferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
        petData={currentPetData}
        onSave={handleSavePreferences}
      />

      <VaccinationHistoryModal
        isVisible={isVaccinationHistoryModalVisible}
        onClose={() => setVaccinationHistoryModalVisible(false)}
        petData={currentPetData}
        onSave={handleSaveVaccinationHistory}
      />

      <CheckupScheduleModal
        isVisible={isCheckupScheduleModalVisible}
        onClose={() => setCheckupScheduleModalVisible(false)}
        petData={currentPetData}
        onSave={handleSaveCheckupSchedule}
      />

      <AllergiesModal
        isVisible={isAllergiesModalVisible}
        onClose={() => setAllergiesModalVisible(false)}
        petData={currentPetData}
        onSave={handleSaveAllergies}
      />

      {/* Avatar Options Modal */}
      <Modal
        visible={isAvatarOptionsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAvatarOptionsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setAvatarOptionsVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContent}>
                <View style={styles.bottomSheetHandle}></View>
                
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Ảnh đại diện thú cưng</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setAvatarOptionsVisible(false)}
                  >
                    <AntDesign name="close" size={22} color="#999" />
                  </TouchableOpacity>
                </View>

                <View style={styles.avatarOptionsContainer}>
                  <TouchableOpacity 
                    style={styles.avatarOptionButton}
                    onPress={pickImage}
                  >
                    <Ionicons name="image-outline" size={24} color="#595085" style={styles.avatarOptionIcon} />
                    <Text style={styles.avatarOptionText}>Chọn từ thư viện</Text>
                  </TouchableOpacity>

                  {currentPetData.avatarUrl && (
                    <TouchableOpacity 
                      style={[styles.avatarOptionButton, styles.deleteAvatarButton]}
                      onPress={deleteAvatar}
                    >
                      <Ionicons name="trash-outline" size={24} color="#FF3B30" style={styles.avatarOptionIcon} />
                      <Text style={[styles.avatarOptionText, styles.deleteAvatarText]}>Xóa ảnh hiện tại</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 18,
    color: '#333',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(89, 80, 133, 0.1)',
    borderRadius: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra space for bottom navbar
  },
  profileSection: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  editAvatarOverlayVisible: {
    opacity: 1,
  },
  editAvatarText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 5,
  },
  petTypeTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF5648',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    justifyContent: 'center',
  },
  petName: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 18,
    marginBottom: 4,
  },
  petBreed: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    marginBottom: 16,
  },
  changeProfileButton: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  traitsSection: {
    marginBottom: 20,
  },
  traitTitle: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 13,
    marginBottom: 10,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  traitTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  traitText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 11,
  },
  detailsTitle: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 22,
    marginBottom: 20,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  detailCardWrapper: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailCard: {
    padding: 20,
    borderRadius: 15,
    height: 140, // Chiều cao phù hợp với 2 tab trên 1 dòng
  },
  detailCardIcon: {
    marginBottom: 12,
  },
  detailCardTitle: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  detailCardDescription: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetTitle: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  refreshButton: {
    padding: 5,
    marginRight: 10,
  },
  petsScrollView: {
    maxHeight: '70%',
  },
  petSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activePetItem: {
    backgroundColor: 'rgba(89, 80, 133, 0.05)',
  },
  petAvatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  petAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
  },
  activeCheckIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#595085',
    borderRadius: 10,
    padding: 2,
  },
  petSelectorDetails: {
    flex: 1,
  },
  petSelectorName: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 15,
    color: '#333333',
    marginBottom: 3,
  },
  petSelectorType: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#666666',
  },
  petSelectorArrow: {
    paddingHorizontal: 5,
  },
  
  // Loading styles
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.SFProText.medium,
    marginTop: 10,
    color: '#333333',
  },
  
  // Error styles
  errorContainer: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.SFProText.medium,
    color: '#FF3B30',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.SFProText.medium,
  },
  
  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 10,
  },
  avatarOptionsContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 20,
  },
  avatarOptionButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  avatarOptionIcon: {
    marginRight: 10,
  },
  avatarOptionText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 16,
    color: '#333333',
  },
  deleteAvatarButton: {
    borderColor: '#FFDDDD',
    backgroundColor: '#FFF5F5',
  },
  deleteAvatarText: {
    color: '#FF3B30',
  },
}); 

