import { Colors } from '@/constants/Colors';
import { PetData } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Interface cho pet từ dữ liệu mẫu cũ
export interface Pet {
  id: number;
  name: string;
  species: string;
  avatar?: string;
  status: 'healthy' | 'checkup' | 'sick';
}

interface PetCardProps {
  pet: Pet | PetData;
  onPress?: () => void;
}

export default function PetCard({ pet, onPress }: PetCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Kiểm tra xem pet có phải là từ API không
  const isApiPet = '_id' in pet;
  
  // Debug thông tin pet
  console.log('Pet render data:', JSON.stringify(pet, null, 2));
  
  // Lấy thông tin pet tùy theo nguồn dữ liệu
  const petName = isApiPet ? pet.info.name : pet.name;
  const petSpecies = isApiPet ? pet.info.species || pet.info.breed || 'Không rõ' : pet.species;
  
  // Kiểm tra và sử dụng avatar nếu có
  let petAvatar = null;
  if (isApiPet) {
    const apiPet = pet as PetData;
    
    // Debug để xem cấu trúc avatar khi được trả về từ API
    console.log('API Pet Avatar structure:', apiPet.avatar, typeof apiPet.avatar);
    
    // Với pet từ API - kiểm tra cấu trúc avatar mới theo model
    if (apiPet.avatar) {
      if (typeof apiPet.avatar === 'string') {
        petAvatar = apiPet.avatar;
      } else {
        // Nếu avatar là object, truy cập các thuộc tính của nó
        const avatarObj = apiPet.avatar;
        // Thử lấy từ publicUrl trước theo cấu trúc trong model
        petAvatar = avatarObj.publicUrl || null;
        
        // Nếu không có publicUrl, thử lấy thông tin khác
        if (!petAvatar && avatarObj.r2Key && avatarObj.bucket) {
          // Có thể tạo URL từ bucket và key
          petAvatar = `https://${avatarObj.bucket}.r2.cloudflarestorage.com/${avatarObj.r2Key}`;
        }
      }
    }
    
    // Nếu không có avatar, thử lấy từ petImage
    if (!petAvatar && apiPet.petImage) {
      petAvatar = apiPet.petImage;
    }
    
    // Fallback nếu không có avatar
    if (!petAvatar) {
      petAvatar = `https://via.placeholder.com/100x100?text=${encodeURIComponent(apiPet.info.name.charAt(0))}`;
    }
    
    console.log('API Pet Avatar URL:', petAvatar);
  } else {
    // Với pet mẫu
    const samplePet = pet as Pet;
    petAvatar = samplePet.avatar;
  }

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {petAvatar ? (
            <Image 
              source={{ uri: petAvatar }} 
              style={styles.avatar} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
              <Text style={[styles.fallbackText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {petName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={[
            styles.name, 
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            {petName}
          </Text>
          <Text style={[
            styles.species, 
            { color: isDark ? Colors.dark.icon : Colors.light.icon }
          ]}>
            {petSpecies}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  fallbackText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  species: {
    fontSize: 14,
  }
}); 