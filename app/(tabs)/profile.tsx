import { authService } from '@/api/services/authService';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const { user, isLoading, clearUserData } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc muốn đăng xuất khỏi tài khoản?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              
              // Gọi API đăng xuất
              await authService.logout();
              
              // Xóa dữ liệu người dùng khỏi context và storage
              await clearUserData();
              
              // Chuyển hướng về trang đăng nhập
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Lỗi', 'Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại sau.');
            } finally {
              setLoggingOut(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: '#595085' }]}>Profile</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#595085" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarPlaceholder}>
              <FontAwesome name="user" size={50} color="#FFFFFF" />
            </View>
            <Text style={styles.userName}>{user?.name || "Người dùng"}</Text>
            <Text style={styles.userEmail}>{user?.email || "Email không có sẵn"}</Text>
          </View>
          
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="person-outline" size={24} color="#595085" />
              <Text style={styles.menuText}>Thông tin cá nhân</Text>
              <MaterialIcons name="keyboard-arrow-right" size={24} color="#CCCCCC" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="settings-outline" size={24} color="#595085" />
              <Text style={styles.menuText}>Cài đặt</Text>
              <MaterialIcons name="keyboard-arrow-right" size={24} color="#CCCCCC" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="help-circle-outline" size={24} color="#595085" />
              <Text style={styles.menuText}>Trợ giúp & Hỗ trợ</Text>
              <MaterialIcons name="keyboard-arrow-right" size={24} color="#CCCCCC" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={24} color="#FFFFFF" style={styles.logoutIcon} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#595085',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 24,
    color: '#333333',
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 16,
    color: '#666666',
  },
  menuSection: {
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontFamily: Fonts.SFProText.medium,
    fontSize: 16,
    color: '#333333',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontFamily: Fonts.SFProText.semibold,
    fontSize: 16,
    color: '#FFFFFF',
  }
}); 