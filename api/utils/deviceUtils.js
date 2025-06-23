/**
 * Device Utils
 * Công cụ hỗ trợ lấy thông tin thiết bị
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Key lưu trữ deviceId
const DEVICE_ID_KEY = '@vnipet_device_id';

/**
 * Lấy thông tin thiết bị
 * @returns {Promise<Object>} - Thông tin thiết bị
 */
export const getDeviceInfo = async () => {
  try {
    // Lấy deviceId từ storage hoặc tạo mới
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    // Tạo appSignature dựa trên platform
    const appSignature = Platform.OS === 'ios' ? 'com.vnipet.app' : 'com.vnipet.app';

    // Lấy thông tin thiết bị
    const deviceInfo = {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0',
      deviceModel: Device.modelName || 'Unknown',
      deviceName: Device.deviceName || 'Unknown Device',
      manufacturer: Device.manufacturer || 'Unknown',
      isTablet: Device.deviceType === Device.DeviceType.TABLET,
      appSignature,
      deviceFingerprint: deviceId,
      isJailbroken: __DEV__ ? false : Device.isRootedExperimentalAsync().catch(() => false),
      hasBiometric: false, // Implement later with expo-local-authentication
      biometricType: 'none',
    };

    return deviceInfo;
  } catch (error) {
    console.error('Error getting device info:', error);
    
    // Fallback device info
    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0',
      deviceModel: 'Unknown',
      deviceName: 'Unknown Device',
      manufacturer: 'Unknown',
      isTablet: false,
      appSignature: Platform.OS === 'ios' ? 'com.vnipet.app' : 'com.vnipet.app',
      deviceFingerprint: uuidv4(),
      isJailbroken: false,
      hasBiometric: false,
      biometricType: 'none',
    };
  }
};

/**
 * Lấy device ID
 * @returns {Promise<string>} - Device ID
 */
export const getDeviceId = async () => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    
    // Fallback: generate new ID if error
    const newDeviceId = uuidv4();
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    } catch (storageError) {
      console.error('Error saving device ID:', storageError);
    }
    
    return newDeviceId;
  }
};

export default {
  getDeviceInfo,
  getDeviceId
}; 