import authService from '@/api/services/authService';
import { Colors } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Thêm kiểu dữ liệu cho response từ API
interface ScanResponse {
  success: boolean;
  message?: string;
  pet?: {
    info?: {
      name?: string;
    };
    _id?: string;
  };
  error?: any;
}

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loadUserData } = useUser();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // Kiểm tra nếu người dùng chưa đăng nhập
      if (!isAuthenticated) {
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Bạn cần đăng nhập để sử dụng tính năng này",
          [
            { text: "Hủy", style: "cancel", onPress: () => setScanned(false) },
            { text: "Đăng nhập", onPress: () => router.navigate('/login') }
          ]
        );
        setLoading(false);
        return;
      }
      
      // Trích xuất mã QR
      const qrToken = data;
      console.log('QR data scanned:', qrToken);
      
      // Gọi API để liên kết pet
      const response = await authService.scanAndLinkQR(qrToken) as ScanResponse;
      
      if (response.success) {
        Alert.alert(
          "Thành công!",
          `Đã liên kết thú cưng ${response.pet?.info?.name || 'mới'} vào tài khoản của bạn!`,
          [
            { 
              text: "OK", 
              onPress: async () => {
                // Tải lại dữ liệu user để cập nhật danh sách pet
                await loadUserData();
                router.navigate('/(tabs)/pet');
              } 
            }
          ]
        );
      } else {
        Alert.alert(
          "Không thể liên kết",
          response.message || "Có lỗi xảy ra khi liên kết thú cưng",
          [{ text: "OK", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        "Lỗi",
        "Có lỗi xảy ra khi xử lý mã QR",
        [{ text: "Thử lại", onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị khi đang yêu cầu quyền
  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors[colorScheme ?? 'light'].text }}>
          Đang yêu cầu quyền truy cập camera...
        </Text>
      </SafeAreaView>
    );
  }

  // Hiển thị khi bị từ chối quyền
  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: Colors[colorScheme ?? 'light'].text, textAlign: 'center', marginBottom: 20 }}>
          Bạn cần cấp quyền truy cập camera để sử dụng tính năng quét mã QR
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header với nút back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
      </View>
      
      {/* Scanner container */}
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Scanner overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            {/* Target lines */}
            <View style={[styles.targetCorner, styles.targetTopLeft]} />
            <View style={[styles.targetCorner, styles.targetTopRight]} />
            <View style={[styles.targetCorner, styles.targetBottomLeft]} />
            <View style={[styles.targetCorner, styles.targetBottomRight]} />
          </View>
        </View>
        
        {/* Scan text */}
        <View style={styles.scanTextContainer}>
          <Text style={styles.scanText}>
            Đặt mã QR vào khung để quét
          </Text>
          
          {loading && (
            <ActivityIndicator 
              size="large" 
              color={Colors[colorScheme ?? 'light'].tint} 
              style={{ marginTop: 20 }} 
            />
          )}
          
          {scanned && !loading && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.buttonText}>Quét lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  targetCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#2567E8',
    borderWidth: 4,
  },
  targetTopLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  targetTopRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  targetBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  targetBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanTextContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2567E8',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 