import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { SplashScreen as CustomSplashScreen } from '@/components/SplashScreen';
import { UserProvider } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    // SF Pro Display
    'SF-Pro-Display-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
    'SF-Pro-Display-Medium': require('../assets/fonts/SF-Pro-Display-Medium.otf'),
    'SF-Pro-Display-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
    'SF-Pro-Display-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    
    // SF Pro Text
    'SF-Pro-Text-Regular': require('../assets/fonts/SF-Pro-Text-Regular.otf'),
    'SF-Pro-Text-Medium': require('../assets/fonts/SF-Pro-Text-Medium.otf'),
    'SF-Pro-Text-Semibold': require('../assets/fonts/SF-Pro-Text-Semibold.otf'),
    'SF-Pro-Text-Bold': require('../assets/fonts/SF-Pro-Text-Bold.otf'),
  });
   
  const [showSplash, setShowSplash] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const onLayoutRootView = useCallback(async () => {
    if (loaded) {
      // Hide the native splash screen
      await SplashScreen.hideAsync();
    }
  }, [loaded]);
  
  // Kiểm tra trạng thái đăng nhập khi khởi động
  const checkAuthState = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      const rememberMe = await AsyncStorage.getItem('@vnipet_remember_me');
      
      // Nếu có token và người dùng đã chọn "Remember me"
      if (token && rememberMe === 'true') {
        // Chuyển hướng đến trang chính sau khi splash screen đóng
        console.log('Phát hiện phiên đăng nhập đã lưu, tự động đăng nhập');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        // Nếu không có token hoặc không chọn "Remember me", chuyển đến trang login
        setTimeout(() => {
          router.replace('/login');
        }, 100);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái đăng nhập:', error);
      // Nếu có lỗi, dẫn đến trang đăng nhập
      router.replace('/login');
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      onLayoutRootView();
    }
  }, [loaded, onLayoutRootView]);

  // Khi splash screen kết thúc, kiểm tra trạng thái đăng nhập
  const handleSplashFinish = () => {
    setShowSplash(false);
    checkAuthState();
  };

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (showSplash) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <UserProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
