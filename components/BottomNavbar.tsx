import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

type IconName = 'home' | 'home-outline' | 'cart' | 'cart-outline' | 'scan' | 
               'reader' | 'reader-outline' | 'person' | 'person-outline';

interface NavItem {
  key: string;
  icon: IconName;
  label: string;
  route: string;
  isSpecial?: boolean;
}

const navItems: NavItem[] = [
  { key: 'home', icon: 'home', label: 'Home', route: '/(tabs)' },
  { key: 'store', icon: 'cart', label: 'Cửa Hàng', route: '/(tabs)/store' },
  { key: 'scan', icon: 'scan', label: 'Scan', route: '/scan', isSpecial: true },
  { key: 'orders', icon: 'reader', label: 'Đơn hàng', route: '/(tabs)/purchasehistory' },
  { key: 'profile', icon: 'person', label: 'Profile', route: '/(tabs)/profile' },
];

export default function BottomNavbar() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDarkMode = colorScheme === 'dark';
  
  // Determine which tab is active
  const getIsActive = (item: NavItem) => {
    if (item.key === 'home' && pathname === '/(tabs)') return true;
    return pathname.startsWith(item.route);
  };

  const handlePress = (item: NavItem) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Navigate to the route
    router.navigate(item.route as any);
  };

  // Generate container styles based on theme
  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDarkMode 
        ? (Platform.OS === 'ios' ? 'transparent' : Colors.dark.background) 
        : (Platform.OS === 'ios' ? 'transparent' : Colors.light.background),
      borderTopColor: isDarkMode ? '#333' : '#EEEEEE',
    }
  ];

  return (
    <View style={containerStyle}>
      {/* Background blur for iOS */}
      {Platform.OS === 'ios' && (
        <BlurView
          tint={isDarkMode ? 'dark' : 'light'}
          intensity={100}
          style={StyleSheet.absoluteFill}
        />
      )}
      
      {/* Navbar content */}
      <View style={styles.content}>
        {navItems.map((item) => {
          const isActive = getIsActive(item);
          const tintColor = isActive 
            ? Colors[colorScheme ?? 'light'].tabIconSelected 
            : Colors[colorScheme ?? 'light'].tabIconDefault;
            
          // Calculate width for each item
          const itemWidth = width / navItems.length;
            
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                { width: itemWidth },
                item.isSpecial && styles.specialNavItem
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              {item.isSpecial ? (
                <View style={styles.specialButton}>
                  <Ionicons name={item.icon} size={24} color="#fff" />
                </View>
              ) : (
                <>
                  <Ionicons 
                    name={`${item.icon}${isActive ? '' : '-outline'}` as IconName} 
                    size={24} 
                    color={tintColor} 
                  />
                  <Text 
                    style={[
                      styles.label, 
                      { color: tintColor }
                    ]}
                  >
                    {item.label}
                  </Text>
                </>
              )}
              
              {isActive && !item.isSpecial && (
                <View style={[styles.indicator, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Adjust for iOS safe area
    borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  specialNavItem: {
    justifyContent: 'flex-start',
    marginTop: -25,
  },
  specialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2567E8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    top: 12,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
}); 