import React from 'react';
import { View } from 'react-native';

// Không tự động chuyển hướng nữa, việc kiểm tra đăng nhập 
// và điều hướng phù hợp sẽ được xử lý bởi _layout.tsx
export default function Home() {
  return <View style={{ flex: 1 }} />;
} 