import { Redirect } from 'expo-router';
 
export default function Home() {
  // Chuyển hướng trực tiếp đến trang login
  return <Redirect href="/login" />;
} 