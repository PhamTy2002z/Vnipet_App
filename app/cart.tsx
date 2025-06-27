import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Định nghĩa kiểu dữ liệu cho theme trong giỏ hàng
interface CartTheme {
  _id: string;
  themeId: string | {
    _id: string;
    name: string;
    price: number;
    imageUrl?: string;
    isPremium: boolean;
    inStore: boolean;
    isActive: boolean;
    description?: string;
  };
  addedAt: string;
  imageUrl?: string;
  theme?: {
    _id: string;
    name: string;
    price: number;
    imageUrl?: string;
    isPremium: boolean;
    inStore: boolean;
    isActive: boolean;
    description?: string;
  };
}

// Định nghĩa kiểu dữ liệu cho giỏ hàng
interface Cart {
  items: CartTheme[];
  totalPrice: number;
}

export default function ShoppingCart() {
  const [cart, setCart] = useState<Cart>({ items: [], totalPrice: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState<boolean>(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState<boolean>(false);
  
  // Lấy params từ URL để biết có cần làm mới dữ liệu không
  const params = useLocalSearchParams<{ ts: string; forceRefresh: string }>();
  const forceRefresh = params.forceRefresh === 'true';
  const timestamp = params.ts; // Sử dụng để phát hiện khi nào trang được mở mới

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000/api/v1';

  // Lấy token khi component mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('@vnipet_access_token');
        console.log('[CART] Token loaded:', token ? `${token.substring(0, 15)}...` : 'null');
        setAuthToken(token);
        setTokenReady(true);
      } catch (err) {
        console.error('[CART] Error loading token:', err);
        setTokenReady(true); // Vẫn đánh dấu là đã sẵn sàng để tiếp tục
      }
    };
    
    loadToken();
  }, []);

  // Hàm lấy giỏ hàng từ API
  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sử dụng token đã lưu trong state
      const token = authToken;
      console.log('[CART] Fetching cart with token:', token ? `${token.substring(0, 15)}...` : 'null');
      console.log('[CART] Timestamp:', timestamp, 'ForceRefresh:', forceRefresh);
      
      if (!token) {
        console.log('[CART] No token, redirecting to login');
        router.replace('/login');
        return;
      }

      // Sử dụng API refresh giỏ hàng mới
      const response = await axios.get(`${API_URL}/cart/refresh`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'device-id': 'vnipet-mobile-app',
          'app-version': '1.0.0',
          'platform': 'ios', 
          'os-version': '14.0',
          'device-type': 'mobile',
          'User-Agent': 'VnipetApp/1.0 iOS/14.0',
          // Thêm cache buster para
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Ngăn chặn cache ở client bằng cách thêm tham số ngẫu nhiên
        params: { _nocache: new Date().getTime() }
      });

      console.log('[CART] API Response:', JSON.stringify(response.data, null, 2));
      console.log('[CART] Items count:', response.data?.data?.items?.length || 0);
      if (response.data?.data?.items?.length > 0) {
        console.log('[CART] First item:', JSON.stringify(response.data?.data?.items[0], null, 2));
      }

      if (response.data && response.data.success) {
        console.log('[CART] Setting cart data with', response.data.data.items.length, 'items');
        setCart(response.data.data);
      } else {
        console.log('[CART] API returned success=false or invalid data');
        setError('Không thể tải thông tin giỏ hàng');
      }
    } catch (err: any) {
      console.error('[CART] Error fetching cart:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = async (themeId: string) => {
    try {
      setRemovingItemId(themeId);
      console.log('[CART] Removing item:', themeId);

      // Sử dụng token đã lưu trong state
      const token = authToken;
      
      if (!token) {
        console.log('[CART] No token for remove, redirecting to login');
        router.replace('/login');
        return;
      }

      const response = await axios.delete(`${API_URL}/cart/theme/${themeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'device-id': 'vnipet-mobile-app',
          'app-version': '1.0.0',
          'platform': 'ios', 
          'os-version': '14.0',
          'device-type': 'mobile',
          'User-Agent': 'VnipetApp/1.0 iOS/14.0',
          // Thêm cache control headers
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        params: { _nocache: new Date().getTime() }
      });

      console.log('[CART] Remove response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        // Cập nhật giỏ hàng ngay lập tức
        console.log('[CART] Item removed successfully, updating cart');
        setCart(response.data.data);
        
        // Gọi lại fetchCart ngay lập tức để đồng bộ giỏ hàng
        setTimeout(() => {
          fetchCart();
        }, 300);
      } else {
        console.log('[CART] Failed to remove item:', response.data?.message);
        Alert.alert('Lỗi', response.data.message || 'Không thể xóa theme khỏi giỏ hàng');
      }
    } catch (err: any) {
      console.error('[CART] Error removing item:', err);
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra khi xóa theme khỏi giỏ hàng');
    } finally {
      setRemovingItemId(null);
    }
  };

  // Hàm thanh toán
  const checkout = async () => {
    try {
      setProcessingCheckout(true);
      console.log('[CART] Processing checkout');

      // Sử dụng token đã lưu trong state
      const token = authToken;
      
      if (!token) {
        console.log('[CART] No token for checkout, redirecting to login');
        router.replace('/login');
        return;
      }

      const response = await axios.post(`${API_URL}/cart/checkout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'device-id': 'vnipet-mobile-app',
          'app-version': '1.0.0',
          'platform': 'ios', 
          'os-version': '14.0',
          'device-type': 'mobile',
          'User-Agent': 'VnipetApp/1.0 iOS/14.0',
        }
      });

      console.log('[CART] Checkout response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        console.log('[CART] Checkout successful');
        Alert.alert(
          'Thanh toán thành công',
          'Cảm ơn bạn đã mua theme!',
          [
            {
              text: 'Xem lịch sử mua hàng',
              onPress: () => router.push('/(tabs)/purchasehistory'),
            },
            {
              text: 'Tiếp tục mua sắm',
              onPress: () => router.push('/(tabs)/store'),
              style: 'cancel',
            },
          ]
        );
        // Refresh cart after checkout
        fetchCart();
      } else {
        console.log('[CART] Checkout failed:', response.data?.message);
        Alert.alert('Lỗi', response.data.message || 'Không thể hoàn tất thanh toán');
      }
    } catch (err: any) {
      console.error('[CART] Checkout error:', err);
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi thanh toán');
    } finally {
      setProcessingCheckout(false);
    }
  };

  // Hàm lấy tên theme
  const getThemeName = (item: CartTheme): string => {
    if (typeof item.themeId === 'object' && item.themeId?.name) {
      return item.themeId.name;
    }
    
    if (item.theme && item.theme.name) {
      return item.theme.name;
    }
    
    return 'Theme không xác định';
  };

  // Hàm lấy giá theme
  const getThemePrice = (item: CartTheme): number => {
    if (typeof item.themeId === 'object' && item.themeId?.price) {
      return item.themeId.price;
    }
    
    if (item.theme && item.theme.price) {
      return item.theme.price;
    }
    
    return 0;
  };

  // Hàm lấy hình ảnh theme
  const getThemeImage = (item: CartTheme): string => {
    if (item.imageUrl) {
      return item.imageUrl;
    }
    
    if (item.theme && item.theme.imageUrl) {
      return item.theme.imageUrl;
    }
    
    if (typeof item.themeId === 'object' && item.themeId?.imageUrl) {
      return item.themeId.imageUrl;
    }
    
    return 'https://picsum.photos/200';
  };

  // Hàm lấy ID của theme
  const getThemeId = (item: CartTheme): string => {
    if (typeof item.themeId === 'object' && item.themeId?._id) {
      return item.themeId._id;
    }
    
    if (typeof item.themeId === 'string') {
      return item.themeId;
    }
    
    return '';
  };

  // Hàm định dạng giá tiền theo VND
  const formatPrice = (price: number): string => {
    if (price === 0) return 'MIỄN PHÍ';
    return `${price.toLocaleString('vi-VN')}đ`;
  };

  // Chỉ fetch khi token đã sẵn sàng
  useEffect(() => {
    if (tokenReady) {
      console.log('[CART] Token ready, fetching cart');
      fetchCart();
    }
  }, [tokenReady]);

  // Luôn làm mới giỏ hàng mỗi khi màn hình được focus hoặc khi timestamp/forceRefresh thay đổi
  useFocusEffect(
    React.useCallback(() => {
      // Chỉ fetch khi token đã sẵn sàng
      if (tokenReady) {
        console.log('[CART] Screen focused or params changed, refreshing cart');
        console.log('[CART] Timestamp:', timestamp, 'ForceRefresh:', forceRefresh);
        fetchCart();
      }
      
      return () => {
        // Cleanup nếu cần
      };
    }, [tokenReady, timestamp, forceRefresh]) // Phụ thuộc vào timestamp và forceRefresh
  );

  // Tổng số sản phẩm
  const totalItems = cart.items.length;

  // UI khi đang tải
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // UI khi có lỗi
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchCart}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // UI khi giỏ hàng trống
  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Ẩn header mặc định */}
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptyText}>
            Bạn chưa có theme nào trong giỏ hàng. Hãy khám phá và thêm theme yêu thích!
          </Text>
          <TouchableOpacity 
            style={styles.continueShoppingButton}
            onPress={() => router.push('/(tabs)/store')}
          >
            <Text style={styles.continueShoppingText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // UI khi giỏ hàng có sản phẩm
  return (
    <SafeAreaView style={styles.container}>
      {/* Ẩn header mặc định */}
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          <Text style={styles.headerSubtitle}>{totalItems} theme</Text>
        </View>
      </View>

      {/* Phần scrollable chỉ chứa danh sách sản phẩm */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Cart Items */}
        <View style={styles.cartItemsContainer}>
          {cart.items.map((item) => (
            <View key={item._id} style={styles.cartItem}>
              <View style={styles.itemContent}>
                {/* Theme Card Image */}
                <View style={styles.themeCardContainer}>
                  <Image
                    source={{ uri: getThemeImage(item) }}
                    style={styles.themeCardImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Theme Info */}
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {getThemeName(item)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFromCart(getThemeId(item))}
                      style={styles.removeButton}
                      disabled={!!removingItemId}
                    >
                      {removingItemId === getThemeId(item) ? (
                        <ActivityIndicator size="small" color="#9CA3AF" />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Price */}
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{formatPrice(getThemePrice(item))}</Text>
                    {typeof item.themeId === 'object' && item.themeId?.isPremium || item.theme?.isPremium ? (
                      <View style={styles.premiumBadge}>
                        <Ionicons name="diamond" size={12} color="#FFF" />
                        <Text style={styles.premiumText}>Premium</Text>
                      </View>
                    ) : (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeText}>Miễn phí</Text>
                      </View>
                    )}
                  </View>

                  {/* Item Total */}
                  <View style={styles.itemTotalContainer}>
                    <Text style={styles.itemTotalLabel}>Thành tiền:</Text>
                    <Text style={styles.itemTotal}>
                      {formatPrice(getThemePrice(item))}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
        
        {/* Thêm khoảng trống để không bị che khuất bởi phần tóm tắt đơn hàng */}
        <View style={{ height: 220 }} />
      </ScrollView>
      
      {/* Order Summary - Cố định ở dưới cùng */}
      <View style={styles.orderSummaryFixed}>
        <View style={styles.orderSummaryContainer}>
          <View style={styles.orderSummaryContent}>
            <View style={styles.orderSummaryHeader}>
              <Ionicons name="receipt-outline" size={20} color="#333" />
              <Text style={styles.orderSummaryTitle}>Tóm tắt đơn hàng</Text>
            </View>

            <View style={styles.orderSummaryItems}>
              <View style={styles.orderSummaryRow}>
                <Text style={styles.orderSummaryLabel}>
                  Tạm tính ({totalItems} theme)
                </Text>
                <Text style={styles.orderSummaryValue}>
                  {formatPrice(cart.totalPrice)}
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.orderSummaryRow}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalValue}>{formatPrice(cart.totalPrice)}</Text>
              </View>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={checkout}
              disabled={processingCheckout}
            >
              {processingCheckout ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  Thanh toán • {formatPrice(cart.totalPrice)}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              Bằng cách thanh toán, bạn đồng ý với{' '}
              <Text style={styles.termsLink}>Điều khoản dịch vụ</Text>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 18,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
    fontFamily: Fonts.SFProText.regular,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: Fonts.SFProText.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#F5F7FA',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    height: 40,
    width: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  cartItemsContainer: {
    marginBottom: 16,
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeCardContainer: {
    width: 100,
    height: 145,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    padding: 2,
  },
  themeCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontFamily: Fonts.SFProText.semibold,
    fontSize: 16,
    color: '#3B82F6',
    marginRight: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 10,
    color: '#FFF',
  },
  freeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  freeText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 10,
    color: '#FFF',
  },
  itemTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTotalLabel: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  itemTotal: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 16,
    color: '#3B82F6',
  },
  // Phần tóm tắt đơn hàng cố định ở dưới
  orderSummaryFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  orderSummaryContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  orderSummaryContent: {
    padding: 16,
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderSummaryTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  orderSummaryItems: {
    marginBottom: 16,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderSummaryLabel: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
  },
  orderSummaryValue: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 14,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 16,
    color: '#333',
  },
  totalValue: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 16,
    color: '#3B82F6',
  },
  checkoutButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutButtonText: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 16,
    color: 'white',
  },
  termsText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  termsLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 20,
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: '80%',
  },
  continueShoppingButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  continueShoppingText: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 16,
    color: 'white',
  },
});