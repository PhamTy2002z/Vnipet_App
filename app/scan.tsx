import authService from '@/api/services/authService';
import { Colors } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
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
  const [manualQrToken, setManualQrToken] = useState('');

  useEffect(() => {
    // Trong phiên bản thực tế, bạn sẽ yêu cầu quyền truy cập camera tại đây
    // Hiện tại chúng ta mô phỏng cho phép quyền camera để tiếp tục triển khai
    setHasPermission(true);
  }, []);

  const handleBack = () => {
    router.back();
  };

  // Khi quét QR tự động
  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    try {
      await processQrCode(data);
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

  // Xử lý QR code khi quét hoặc nhập thủ công
  const processQrCode = async (qrToken: string) => {
    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
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
      return;
    }
    
    console.log('QR Token:', qrToken);
    
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
  };

  // Xử lý khi người dùng nhập QR thủ công
  const handleManualQRInput = async () => {
    if (loading || !manualQrToken.trim()) return;
    
    setLoading(true);
    
    try {
      await processQrCode(manualQrToken.trim());
    } catch (error) {
      console.error('Manual QR input error:', error);
      Alert.alert(
        "Lỗi",
        "Có lỗi xảy ra khi xử lý mã QR thủ công",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Trong phiên bản thực tế, đây sẽ được gọi từ event onBarCodeScanned của Camera
  const handleManualQRScan = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      // Mô phỏng dữ liệu QR được quét
      const qrToken = "test-qr-token";
      await processQrCode(qrToken);
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
    <>
      {/* Ẩn thanh tiêu đề mặc định */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.container}>
          {/* Header với nút back */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Scanner container */}
          <View style={styles.scannerContainer}>
            {/* Camera giả lập */}
            <View style={StyleSheet.absoluteFillObject}>
              {/* Màn hình camera mô phỏng */}
              <View style={styles.mockCamera} />
            </View>
            
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
          </View>
          
          {/* Scan text và nút quét */}
          <View style={styles.actionContainer}>
            <Text style={styles.scanText}>
              Đặt mã QR vào khung để quét
            </Text>
            
            {loading ? (
              <ActivityIndicator 
                size="large" 
                color={Colors[colorScheme ?? 'light'].tint} 
                style={{ marginTop: 20 }} 
              />
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={handleManualQRScan}
              >
                <Text style={styles.buttonText}>{scanned ? "Quét lại" : "Quét mã thử nghiệm"}</Text>
              </TouchableOpacity>
            )}
            
            <Text style={styles.noteText}>
              Tính năng đang được phát triển. Vui lòng nhấn "Quét mã thử nghiệm" để xem quy trình liên kết.
            </Text>
          </View>
          
          {/* Manual QR Input Section */}
          <View style={styles.manualInputContainer}>
            <Text style={styles.manualInputTitle}>Nhập QR Token thủ công:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.qrInput}
                value={manualQrToken}
                onChangeText={setManualQrToken}
                placeholder="Nhập mã QR Token"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={[styles.linkButton, !manualQrToken.trim() && styles.disabledButton]} 
                onPress={handleManualQRInput}
                disabled={loading || !manualQrToken.trim()}
              >
                <Text style={styles.linkButtonText}>Liên kết</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.manualInputNote}>
              * Chỉ sử dụng trong quá trình phát triển. Nhập QR Token để liên kết thú cưng.
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
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
    flex: 0.6,  // Giảm kích thước phần camera xuống
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
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
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
  noteText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  mockCamera: {
    flex: 1,
    backgroundColor: '#222',
  },
  manualInputContainer: {
    backgroundColor: '#111',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  manualInputTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  qrInput: {
    flex: 1,
    backgroundColor: '#333',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
  },
  linkButton: {
    backgroundColor: '#2567E8',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  linkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  manualInputNote: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  }
}); 