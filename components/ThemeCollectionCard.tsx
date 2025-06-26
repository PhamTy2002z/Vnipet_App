import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ThemeItem {
  id: number;
  name: string;
  image?: string;
  isPremium: boolean;
  gradientColors?: [string, string, string];
}

interface ThemeCollectionCardProps {
  theme: ThemeItem;
  onPress?: () => void;
}

export default function ThemeCollectionCard({ theme, onPress }: ThemeCollectionCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {theme.image ? (
          <Image
            source={{ uri: theme.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={theme.gradientColors || ['#9ca3af', '#6b7280', '#4b5563'] as [string, string, string]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        
        {theme.isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={10} color="#fff" />
          </View>
        )}
      </View>
      
      <Text style={[
        styles.themeName,
        { color: isDark ? Colors.dark.text : Colors.light.text }
      ]} numberOfLines={1}>
        {theme.name}
      </Text>
      
      {theme.isPremium && (
        <View style={[
          styles.premiumTag,
          { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)' }
        ]}>
          <Text style={styles.premiumText}>
            Premium
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    padding: 10,
  },
  imageContainer: {
    position: 'relative',
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
  },
  themeName: {
    fontSize: 12,
    fontFamily: Fonts.SFProDisplay.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTag: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'center',
  },
  premiumText: {
    fontSize: 8,
    fontFamily: Fonts.SFProText.regular,
    color: '#b45309',
    textAlign: 'center',
  },
}); 