import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AntDesign, Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    title: 'Lịch tiêm chủng',
    icon: <AntDesign name="calendar" size={28} color="#479696" />,
    description: 'Quản lý lịch tiêm chủng của thú cưng',
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

// Dữ liệu mẫu cho đặc điểm thú cưng
const petTraitsData = [
  { id: 1, name: 'Thân thiện', category: 'strength', color: '#F5F9F9', textColor: '#479696' },
  { id: 2, name: 'Thông minh', category: 'strength', color: '#F5F9F9', textColor: '#479696' },
  { id: 3, name: 'Hoạt bát', category: 'strength', color: '#F5F9F9', textColor: '#479696' },
  { id: 4, name: 'Sợ người lạ', category: 'weakness', color: '#FFF4F4', textColor: '#FF7E73' },
  { id: 5, name: 'Kén ăn', category: 'weakness', color: '#FFF4F4', textColor: '#FF7E73' },
];

export default function PetScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const subTextColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const accentColor = '#595085';

  // Lọc đặc điểm theo danh mục
  const strengthTraits = petTraitsData.filter(trait => trait.category === 'strength');
  const weaknessTraits = petTraitsData.filter(trait => trait.category === 'weakness');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: accentColor }]}>Profile</Text>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar và Thông tin */}
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=162&auto=format&fit=crop' }} 
              style={styles.avatar} 
              resizeMode="cover"
            />
            <View style={styles.petTypeTag}>
              <Feather name="tag" size={16} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.petName, { color: textColor }]}>Buddy</Text>
            <Text style={[styles.petBreed, { color: subTextColor }]}>Golden Retriever</Text>
            <TouchableOpacity>
              <Text style={[styles.changeProfileButton, { color: accentColor }]}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Traits Section */}
        <View style={styles.traitsSection}>
          <Text style={[styles.traitTitle, { color: textColor }]}>Đặc điểm nổi bật:</Text>
          <View style={styles.traitsRow}>
            {strengthTraits.map(trait => (
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
          <Text style={[styles.traitTitle, { color: textColor }]}>Điểm yếu:</Text>
          <View style={styles.traitsRow}>
            {weaknessTraits.map(trait => (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 16,
    textAlign: 'center',
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 20,
    marginBottom: 4,
  },
  petBreed: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    marginBottom: 16,
  },
  changeProfileButton: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  traitsSection: {
    marginBottom: 20,
  },
  traitTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 14,
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
    fontFamily: Fonts.SFProText.medium,
    fontSize: 12,
  },
  detailsTitle: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 24,
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
    fontFamily: Fonts.SFProText.semibold,
    fontSize: 14,
    marginBottom: 6,
  },
  detailCardDescription: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
}); 