import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Theme {
  id: number;
  name: string;
  gradientColors: [string, string, string];
  description: string;
  isPremium: boolean;
}

const themes: Theme[] = [
  {
    id: 1,
    name: "Cosmic Dreams",
    gradientColors: ['#60a5fa', '#a855f7', '#f472b6'] as [string, string, string],
    description: "Giao diện vũ trụ mơ mộng với nhiều màu sắc rực rỡ",
    isPremium: true,
  },
  {
    id: 2,
    name: "Ocean Breeze",
    gradientColors: ['#22d3ee', '#3b82f6', '#4338ca'] as [string, string, string],
    description: "Thiết kế lấy cảm hứng từ đại dương, mát mẻ và tươi mới",
    isPremium: true,
  },
  {
    id: 3,
    name: "Forest Green",
    gradientColors: ['#4ade80', '#10b981', '#0d9488'] as [string, string, string],
    description: "Giao diện rừng xanh tự nhiên và bình yên",
    isPremium: false,
  },
  {
    id: 4,
    name: "Sunset Glow",
    gradientColors: ['#fb923c', '#ef4444', '#ec4899'] as [string, string, string],
    description: "Màu sắc ấm áp và dịu nhẹ của hoàng hôn",
    isPremium: true,
  },
  {
    id: 5,
    name: "Minimalist",
    gradientColors: ['#9ca3af', '#6b7280', '#4b5563'] as [string, string, string],
    description: "Thiết kế đơn giản và tối giản",
    isPremium: false,
  },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function SwipeableThemeCards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % themes.length);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const forceSwipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + themes.length) % themes.length);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      stiffness: 200,
      damping: 20,
      mass: 1,
      useNativeDriver: false,
    }).start();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      forceSwipeRight();
    } else {
      // Cycle to the end if at the beginning
      setCurrentIndex(themes.length - 1);
      position.setValue({ x: 0, y: 0 });
    }
  };

  const handleNext = () => {
    if (currentIndex < themes.length - 1) {
      forceSwipeLeft();
    } else {
      // Cycle to the beginning if at the end
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    }
  };

  const getVisibleThemes = () => {
    const visible = [];
    
    // Get current card
    visible.push({...themes[currentIndex], stackIndex: 0});
    
    // Get next card if available
    const nextIndex = (currentIndex + 1) % themes.length;
    if (nextIndex !== currentIndex) {
      visible.push({...themes[nextIndex], stackIndex: 1});
    }
    
    // Get one more card if available
    const nextNextIndex = (currentIndex + 2) % themes.length;
    if (nextNextIndex !== currentIndex && nextNextIndex !== nextIndex) {
      visible.push({...themes[nextNextIndex], stackIndex: 2});
    }
    
    return visible;
  };

  const getCardStyle = (stackIndex: number) => {
    const isTopCard = stackIndex === 0;
    
    if (isTopCard) {
      const rotate = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
        outputRange: ['-30deg', '0deg', '30deg'],
        extrapolate: 'clamp'
      });

      return {
        ...styles.card,
        zIndex: 10 - stackIndex,
        transform: [
          { translateX: position.x },
          { rotate },
          { scale: 1 }
        ],
        opacity: 1
      };
    }

    // Style for stacked cards
    const scale = 1 - stackIndex * 0.05;
    const translateY = stackIndex * 8;
    const opacity = 1 - stackIndex * 0.2;

    return {
      ...styles.card,
      zIndex: 10 - stackIndex,
      transform: [
        { translateY },
        { scale }
      ],
      opacity
    };
  };

  const renderThemeCards = () => {
    return getVisibleThemes().map((theme, index) => {
      const { id, name, gradientColors, description, isPremium, stackIndex } = theme;
      const isTopCard = stackIndex === 0;

      return (
        <Animated.View 
          key={id} 
          style={getCardStyle(stackIndex)}
          {...(isTopCard ? panResponder.panHandlers : {})}
        >
          <LinearGradient 
            colors={gradientColors} 
            style={styles.cardContent}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
          >
            {/* Header placeholders */}
            <View style={styles.cardHeader}>
              <View style={styles.avatarPlaceholder}>
                <View style={styles.innerPlaceholder}></View>
              </View>
              <View style={styles.menuPlaceholder}></View>
            </View>

            <View style={styles.contentPlaceholders}>
              <View style={styles.textPlaceholderLarge}></View>
              <View style={styles.textPlaceholderSmall}></View>
            </View>

            {/* Content placeholders */}
            <View style={styles.petsPlaceholder}>
              <View style={styles.petRow}>
                <View style={styles.petAvatar}></View>
                <View style={styles.petInfo}>
                  <View style={styles.petNamePlaceholder}></View>
                  <View style={styles.petSpeciesPlaceholder}></View>
                </View>
              </View>
              <View style={styles.petRow}>
                <View style={styles.petAvatar}></View>
                <View style={styles.petInfo}>
                  <View style={styles.petNamePlaceholder}></View>
                  <View style={styles.petSpeciesPlaceholder}></View>
                </View>
              </View>
            </View>

            {/* Theme info */}
            <View style={styles.themeInfo}>
              <Text style={styles.themeName}>{name}</Text>
              <Text style={styles.themeDescription}>{description}</Text>
              <View style={styles.themeFooter}>
                <View style={[
                  styles.badge,
                  isPremium ? styles.premiumBadge : styles.freeBadge
                ]}>
                  <Text style={[
                    styles.badgeText,
                    isPremium ? styles.premiumText : styles.freeText
                  ]}>
                    {isPremium ? 'Premium' : 'Miễn phí'}
                  </Text>
                </View>
                <Text style={styles.pageIndicator}>
                  {currentIndex + 1} / {themes.length}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Navigation buttons */}
      <TouchableOpacity
        onPress={handlePrevious}
        style={[styles.navButton, styles.leftButton]}
      >
        <Ionicons name="chevron-back" size={20} color={isDark ? '#FFF' : '#444'} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleNext}
        style={[styles.navButton, styles.rightButton]}
      >
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFF' : '#444'} />
      </TouchableOpacity>

      {/* Card stack */}
      <View style={styles.cardContainer}>
        {renderThemeCards()}
      </View>

      {/* Dots indicator */}
      <View style={styles.dotsContainer}>
        {themes.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.activeDot : null
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 480,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardContainer: {
    width: '100%',
    height: 450,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: '90%',
    height: 400,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  menuPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentPlaceholders: {
    marginBottom: 30,
  },
  textPlaceholderLarge: {
    width: 120,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 10,
  },
  textPlaceholderSmall: {
    width: 90,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  petsPlaceholder: {
    marginBottom: 20,
    gap: 12,
  },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 10,
  },
  petInfo: {
    flex: 1,
  },
  petNamePlaceholder: {
    width: 100,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 6,
  },
  petSpeciesPlaceholder: {
    width: 80,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  themeInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 15,
  },
  themeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  themeDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  themeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  premiumBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  freeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  premiumText: {
    color: '#FBBF24',
  },
  freeText: {
    color: '#FFFFFF',
  },
  pageIndicator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  navButton: {
    position: 'absolute',
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leftButton: {
    left: 10,
    top: '50%',
    marginTop: -20,
  },
  rightButton: {
    right: 10,
    top: '50%',
    marginTop: -20,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    backgroundColor: '#FFF',
  },
}); 