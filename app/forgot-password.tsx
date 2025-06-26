import { AntDesign, Feather } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000/api/v1';

type ForgotPasswordStep = 'email' | 'verify' | 'reset';

const getMobileHeaders = () => ({
  'platform': Platform.OS,
  'device-type': 'mobile',
  'app-version': Device.osBuildId ? Device.osBuildId.toString() : '1.0.0',
  'device-id': Device.deviceName ? encodeURIComponent(Device.deviceName) : 'expo-device',
});

export default function ForgotPasswordScreen() {
  // Không cần useEffect để thiết lập StatusBar vì chúng ta sẽ sử dụng StatusBar component
  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Refs for OTP input fields
  const otpInputRefs = useRef<(TextInput | null)[]>([null, null, null, null]);

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const response = await fetch(`${API_URL}/pet-owner/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getMobileHeaders(),
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.');
      }
      
      setIsLoading(false);
      Alert.alert('Thành công', 'Mã xác thực đã được gửi đến email của bạn');
      setCurrentStep('verify');
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
      Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  };

  const handleVerifyCode = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 4) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã xác thực');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const response = await fetch(`${API_URL}/pet-owner/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getMobileHeaders(),
        },
        body: JSON.stringify({ 
          email,
          otp: otpValue
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Mã xác thực không đúng. Vui lòng thử lại.');
      }
      
      setIsLoading(false);
      setResetToken(data.resetToken);
      
      // Hiển thị thông báo trước khi chuyển sang bước tiếp theo
      Alert.alert(
        'Xác thực thành công', 
        'Mã OTP đúng. Bạn có thể thiết lập mật khẩu mới.',
        [{ text: 'Tiếp tục', onPress: () => setCurrentStep('reset') }]
      );
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
      Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const response = await fetch(`${API_URL}/pet-owner/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getMobileHeaders(),
        },
        body: JSON.stringify({ 
          email,
          resetToken,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.');
      }
      
      setIsLoading(false);
      setResetToken(data.resetToken);
      Alert.alert(
        'Thành công', 
        'Mật khẩu đã được đặt lại thành công', 
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
      Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    // Kiểm tra text có phải là số
    const isValid = /^[0-9]*$/.test(text);
    if (!isValid && text !== '') return;

    // Cập nhật giá trị OTP
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Chuyển focus sang ô tiếp theo nếu có nhập và không phải ô cuối
    if (text && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    // Xử lý khi nhấn phím backspace và ô hiện tại trống
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Không thể xác định email. Vui lòng thử lại từ đầu.');
      setCurrentStep('email');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const response = await fetch(`${API_URL}/pet-owner/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getMobileHeaders(),
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
      }
      
      setIsLoading(false);
      Alert.alert('Thông báo', 'Mã xác thực mới đã được gửi đến email của bạn');
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
      Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  };

  const navigateBack = () => {
    if (currentStep === 'email') {
      router.back();
    } else if (currentStep === 'verify') {
      setCurrentStep('email');
    } else if (currentStep === 'reset') {
      setCurrentStep('verify');
    }
  };

  const renderEmailStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we&apos;ll send you a link to reset your password.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View style={styles.inputWithIcon}>
          <AntDesign name="mail" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.disabledButton]} 
        onPress={handleSendResetLink}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.linkButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <Feather name="shield" size={30} color="#FFF" />
      </View>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We&apos;ve sent a 4-digit verification code to your email address. Please enter it below.
      </Text>

      <View style={styles.otpContainer}>
        {[0, 1, 2, 3].map((index) => (
          <TextInput
            key={index}
            ref={(input) => {
              otpInputRefs.current[index] = input;
              return undefined;
            }}
            style={styles.otpInput}
            value={otp[index]}
            onChangeText={(text) => handleOtpChange(text, index)}
            onKeyPress={(e) => handleOtpKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Text style={styles.resendText}>
        Didn&apos;t receive the code?
      </Text>
      <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
        <Text style={styles.resendLink}>Resend Code</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.disabledButton]} 
        onPress={handleVerifyCode}
        disabled={isLoading || otp.join('').length !== 4}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.linkButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResetStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Create a new password for your account. Make sure it&apos;s strong and secure.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>New Password</Text>
        <View style={styles.inputWithIcon}>
          <Feather name="lock" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#999"
          />
          <Pressable 
            style={styles.passwordToggle}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Feather name={showNewPassword ? "eye" : "eye-off"} size={20} color="#888" />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <View style={styles.inputWithIcon}>
          <Feather name="lock" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
          />
          <Pressable 
            style={styles.passwordToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#888" />
          </Pressable>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Text style={styles.passwordRequirement}>
        Password must be at least 8 characters long
      </Text>

      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.disabledButton]} 
        onPress={handleResetPassword}
        disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkButton} 
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.linkButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'email':
        return renderEmailStep();
      case 'verify':
        return renderVerifyStep();
      case 'reset':
        return renderResetStep();
      default:
        return renderEmailStep();
    }
  };

  return (
    <>
      {/* Thiết lập StatusBar và ẩn header mặc định */}
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient 
        colors={['#1CE6DA', '#2567E8']} 
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidView}
          >
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="white" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              
              <View style={styles.logoSection}>
                <Text style={styles.logoText}>VNIPET</Text>
              </View>

              {renderCurrentStep()}

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  {currentStep === 'verify' 
                    ? 'Having trouble? ' 
                    : 'Remember your password? '}
                  <Text 
                    style={styles.footerLink}
                    onPress={() => router.replace('/login')}
                  >
                    {currentStep === 'verify' ? 'Contact Support' : 'Sign In'}
                  </Text>
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 40, // Tăng padding top trên Android
    marginBottom: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 10,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2567E8',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#444',
    fontWeight: '500',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 15,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 15,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resendLink: {
    fontSize: 14,
    color: '#2567E8',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2567E8',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#9CB2E5',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#2567E8',
    fontSize: 16,
    fontWeight: '500',
  },
  passwordRequirement: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  footerContainer: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  footerLink: {
    color: 'white',
    fontWeight: '500',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
}); 