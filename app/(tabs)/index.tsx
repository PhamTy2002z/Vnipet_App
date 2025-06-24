import PetCard, { Pet } from '@/components/PetCard';
import SwipeableThemeCards from '@/components/SwipeableThemeCards';
import ThemeCollectionCard, { ThemeItem } from '@/components/ThemeCollectionCard';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Sample data for pets (sẽ được thay thế bằng dữ liệu từ API)
const petsData: Pet[] = [
  {
    id: 1,
    name: "Buddy",
    species: "Golden Retriever",
    avatar: "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=162&auto=format&fit=crop",
    status: "healthy",
  },
  {
    id: 2,
    name: "Whiskers",
    species: "Mèo Ba Tư",
    avatar: "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?q=80&w=387&auto=format&fit=crop",
    status: "checkup",
  },
  {
    id: 3,
    name: "Charlie",
    species: "Beagle",
    avatar: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=871&auto=format&fit=crop",
    status: "healthy",
  },
];

// Sample data for theme collections
const themeCollectionData: ThemeItem[] = [
  {
    id: 1,
    name: "Ocean Breeze",
    gradientColors: ['#22d3ee', '#3b82f6', '#4338ca'] as [string, string, string],
    isPremium: true,
  },
  {
    id: 2,
    name: "Forest Green",
    gradientColors: ['#4ade80', '#10b981', '#0d9488'] as [string, string, string],
    isPremium: false,
  },
  {
    id: 3,
    name: "Sunset Glow",
    gradientColors: ['#fb923c', '#ef4444', '#ec4899'] as [string, string, string],
    isPremium: true,
  },
  {
    id: 4,
    name: "Minimalist",
    gradientColors: ['#9ca3af', '#6b7280', '#4b5563'] as [string, string, string],
    isPremium: false,
  },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const subTextColor = isDark ? Colors.dark.icon : Colors.light.icon;

  // Sử dụng context để lấy thông tin người dùng và thú cưng
  const { user, pets, dashboardData, isLoading, loadUserData } = useUser();

  // Tải dữ liệu người dùng khi trang được mở
  useEffect(() => {
    loadUserData();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: subTextColor }]}>Hello!</Text>
          <Text style={[styles.username, { color: textColor }]}>
            {user?.name || 'Khách'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={iconColor} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Theme Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Theme Preview</Text>
            <View style={[
              styles.badge, 
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9' }
            ]}>
              <Text style={[
                styles.badgeText, 
                { color: subTextColor }
              ]}>
                Vuốt để khám phá
              </Text>
            </View>
          </View>
          
          <SwipeableThemeCards />
        </View>
        
        {/* My Pets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>My Pets</Text>
            <Text style={[styles.sectionCount, { color: subTextColor }]}>
              {pets.length > 0 ? `${pets.length} pets` : `${petsData.length} pets`}
            </Text>
          </View>
          
          <View style={styles.petsContainer}>
            {pets.length > 0 ? (
              pets.map((pet) => (
                <PetCard 
                  key={pet._id} 
                  pet={pet} 
                  onPress={() => console.log(`Selected pet: ${pet.info.name}`)}
                />
              ))
            ) : (
              petsData.map((pet) => (
                <PetCard 
                  key={pet.id} 
                  pet={pet} 
                  onPress={() => console.log(`Selected pet: ${pet.name}`)}
                />
              ))
            )}
          </View>
        </View>
        
        {/* Theme Collection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Theme Collection</Text>
            <Text style={[styles.sectionCount, { color: subTextColor }]}>
              {dashboardData?.purchasedThemes?.length 
                ? `${dashboardData.purchasedThemes.length} themes` 
                : `${themeCollectionData.length} themes`}
            </Text>
          </View>
          
          <View style={styles.themeGrid}>
            {themeCollectionData.map((theme) => (
              <View style={styles.themeGridItem} key={theme.id}>
                <ThemeCollectionCard 
                  theme={theme}
                  onPress={() => console.log(`Selected theme: ${theme.name}`)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    marginBottom: 4,
  },
  username: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 20,
    marginBottom: 0,
  },
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra space for bottom navbar
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 18,
  },
  sectionCount: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 12,
  },
  petsContainer: {
    gap: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  themeGridItem: {
    width: '50%',
    padding: 6,
  },
});
