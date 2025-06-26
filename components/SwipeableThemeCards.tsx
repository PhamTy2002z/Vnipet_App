import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40; // 20px padding on each side
const CARD_HEIGHT = 180;
const VISIBLE_ITEMS = 3;

export default function SwipeableThemeCards() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const subTextColor = isDark ? Colors.dark.icon : Colors.light.icon;

  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  
  // Xử lý khi người dùng vuốt
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );
  
  // Xử lý khi người dùng kết thúc vuốt
  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      // Nếu vuốt đủ xa, chuyển đến thẻ tiếp theo hoặc trước đó
      if (translationX < -50 && currentIndex < themes.length - 1) {
        // Vuốt sang trái -> thẻ tiếp theo
        setCurrentIndex(currentIndex + 1);
      } else if (translationX > 50 && currentIndex > 0) {
        // Vuốt sang phải -> thẻ trước đó
        setCurrentIndex(currentIndex - 1);
      }
      
      // Reset vị trí
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };
  
  // Hiển thị các thẻ theme
  const renderCards = () => {
    const cards = [];
    
    // Hiển thị tối đa VISIBLE_ITEMS thẻ, bắt đầu từ currentIndex
    for (let i = 0; i < VISIBLE_ITEMS; i++) {
      const dataIndex = currentIndex + i;
      
      // Nếu vượt quá số lượng theme có sẵn, dừng lại
      if (dataIndex >= themes.length) break;
      
      const theme = themes[dataIndex];
      const isFirst = i === 0;
      
      // Tính toán style cho từng thẻ
      const cardStyle = {
        transform: [
          {
            translateX: isFirst
              ? translateX
              : new Animated.Value(0),
          },
          {
            scale: isFirst ? 1 : 0.9 - i * 0.05,
          },
        ],
        top: i * 10,
        zIndex: VISIBLE_ITEMS - i,
        opacity: isFirst ? 1 : 0.7 - i * 0.2,
      };
      
      cards.push(
        <Animated.View key={theme.id} style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={theme.gradientColors}
            style={styles.cardContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.themeName}>{theme.name}</Text>
            <Text style={styles.themeDescription}>{theme.description}</Text>
            
            <View style={styles.cardIndicator}>
              {themes.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    currentIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      );
    }
    
    return cards;
  };
  
  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={styles.cardsContainer}>
          {renderCards()}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + 20, // Extra space for stacked cards
    width: '100%',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  themeName: {
    color: 'white',
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 16,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  themeDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Fonts.SFProText.regular,
    fontSize: 12,
    marginBottom: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cardIndicator: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  indicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 5,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 15,
    height: 5,
  },
}); 