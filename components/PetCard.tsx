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
  
  // Lấy thông tin pet tùy theo nguồn dữ liệu
  const petName = isApiPet ? pet.info.name : pet.name;
  const petSpecies = isApiPet ? pet.info.species || pet.info.breed || 'Không rõ' : pet.species;
  const petAvatar = isApiPet ? pet.avatar : pet.avatar;

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