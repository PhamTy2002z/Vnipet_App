import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Định nghĩa các interface cho dữ liệu
interface ThemeInfo {
  _id: string;
  name: string;
  price: number;
  isPremium: boolean;
  imageUrl?: string;
  description?: string;
  presetKey?: string;
}

interface OrderItem {
  _id: string;
  themeId: string | ThemeInfo;
  userThemeId: string;
  price: number;
  name: string;
  imageUrl?: string;
  theme?: ThemeInfo;
}

interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalPrice: number;
  transactionId: string;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
  status?: string; // Có thể không có trong API
}

interface ApiResponse {
  success: boolean;
  data: Order[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export default function PurchaseHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000/api/v1';
  
  // Fetch orders khi component được mount
  useEffect(() => {
    fetchOrders();
  }, [currentPage]);

  // Hàm lấy danh sách đơn hàng
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('@vnipet_access_token');
      
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/orders`, {
        params: {
          page: currentPage,
          limit: 5
        },
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

      // Log response để debug
      console.log('API Response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        // Kiểm tra cấu trúc dữ liệu
        if (response.data.data) {
          // Kiểm tra nếu data là mảng đơn hàng
          if (Array.isArray(response.data.data)) {
            setOrders(response.data.data);
            
            // Kiểm tra có pagination không
            if (response.data.pagination) {
              setTotalPages(response.data.pagination.pages || 1);
            } else {
              setTotalPages(1);
            }
          } else {
            console.error('Cấu trúc dữ liệu không như mong đợi:', response.data);
            setError('Định dạng dữ liệu không hợp lệ');
          }
        } else {
          console.error('Không tìm thấy trường data trong response:', response.data);
          setError('Không tìm thấy dữ liệu');
        }
      } else {
        console.error('API trả về lỗi:', response.data);
        setError(response.data?.message || 'Không thể tải danh sách đơn hàng');
      }
    } catch (err: any) {
      console.error('Lỗi khi tải đơn hàng:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Hàm lấy chi tiết đơn hàng
  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoadingDetails(true);
      setError(null);

      const token = await AsyncStorage.getItem('@vnipet_access_token');
      
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/orders/${orderId}`, {
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

      if (response.data && response.data.success) {
        setOrderDetails(response.data.data);
        setSelectedOrderId(orderId);
      } else {
        Alert.alert('Lỗi', 'Không thể tải chi tiết đơn hàng');
      }
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết đơn hàng:', err);
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra khi tải chi tiết đơn hàng');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Hàm định dạng giá tiền
  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  // Hàm định dạng ngày tháng từ chuỗi ISO
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Hàm hiển thị badge trạng thái
  const getStatusBadge = (status?: string) => {
    let backgroundColor, textColor, text;
    
    // Nếu status không tồn tại, mặc định là "Đã xử lý"
    if (!status) {
      backgroundColor = "#DCFCE7";
      textColor = "#166534";
      text = "Đã xử lý";
      return (
        <View style={[styles.badge, { backgroundColor }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>{text}</Text>
        </View>
      );
    }
    
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        backgroundColor = "#DCFCE7";
        textColor = "#166534";
        text = "Đã giao";
        break;
      case "shipping":
      case "shipped":
        backgroundColor = "#DBEAFE";
        textColor = "#1E40AF";
        text = "Đang giao";
        break;
      case "processing":
      case "pending":
        backgroundColor = "#FEF3C7";
        textColor = "#92400E";
        text = "Đang xử lý";
        break;
      case "cancelled":
        backgroundColor = "#FEE2E2";
        textColor = "#B91C1C";
        text = "Đã hủy";
        break;
      default:
        backgroundColor = "#F3F4F6";
        textColor = "#4B5563";
        text = status;
    }
    
    return (
      <View style={[styles.badge, { backgroundColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{text}</Text>
      </View>
    );
  };

  // Hàm lấy ảnh cho theme
  const getThemeImage = (item: OrderItem): string => {
    // Ưu tiên dùng imageUrl từ item trước
    if (item.imageUrl) {
      return item.imageUrl;
    }

    // Tiếp theo kiểm tra theme object
    if (item.theme && item.theme.imageUrl) {
      return item.theme.imageUrl;
    }

    // Kiểm tra xem themeId có phải là object không
    if (typeof item.themeId === 'object' && item.themeId !== null) {
      const theme = item.themeId as ThemeInfo;
      if (theme.imageUrl) {
        return theme.imageUrl;
      }
    }

    // Trả về placeholder nếu không có ảnh nào
    return 'https://picsum.photos/200';
  };

  // Hàm lấy tên theme
  const getThemeName = (item: OrderItem): string => {
    // Ưu tiên dùng name từ item trước
    if (item.name) {
      return item.name;
    }

    // Tiếp theo kiểm tra theme object
    if (item.theme && item.theme.name) {
      return item.theme.name;
    }

    // Kiểm tra xem themeId có phải là object không
    if (typeof item.themeId === 'object' && item.themeId !== null) {
      const theme = item.themeId as ThemeInfo;
      if (theme.name) {
        return theme.name;
      }
    }

    // Trả về placeholder nếu không có tên
    return 'Theme không xác định';
  };

  // Hiển thị loading khi đang tải danh sách đơn hàng
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top']}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </SafeAreaView>
    );
  }

  // Hiển thị thông báo lỗi
  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.errorContainer]} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="receipt-outline" size={24} color="#333" style={styles.headerIcon} />
          <Text style={styles.headerTitleText}>Lịch sử Mua Hàng</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Order List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {orders.map((order) => (
          <View key={order._id} style={styles.orderCard}>
            {/* Order Header */}
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderRow}>
                <View style={styles.orderIdContainer}>
                  <Ionicons name="code-sharp" size={16} color="#6B7280" />
                  <Text style={styles.orderId}>{order.transactionId || order._id}</Text>
                </View>
                {getStatusBadge(order.status)}
              </View>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.dateText}>{formatDate(order.purchaseDate || order.createdAt)}</Text>
              </View>
            </View>

            {/* Order Items */}
            <View style={styles.orderItems}>
              {order.items.map((item, index) => (
                <View key={item._id} style={[
                  styles.orderItem,
                  index < order.items.length - 1 && styles.borderBottom
                ]}>
                  <View style={styles.itemContent}>
                    {/* Theme Card Image - Hiển thị đầy đủ với viền */}
                    <View style={styles.themeCardContainer}>
                    <Image 
                        source={{ uri: getThemeImage(item) }} 
                        style={styles.themeCardImage}
                        resizeMode="contain"
                    />
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{getThemeName(item)}</Text>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Giá:</Text>
                        <Text style={styles.infoValue}>{formatPrice(item.price)}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Loại:</Text>
                        <View style={styles.tagContainer}>
                          <Ionicons 
                            name={
                              typeof item.themeId === 'object' && item.themeId?.isPremium || 
                              item.theme?.isPremium ? 
                              "diamond" : "checkmark-circle"
                            } 
                            size={14} 
                            color={
                              typeof item.themeId === 'object' && item.themeId?.isPremium || 
                              item.theme?.isPremium ? 
                              "#6366F1" : "#10B981"
                            }
                          />
                          <Text style={[
                            styles.tagText,
                            {
                              color: 
                                typeof item.themeId === 'object' && item.themeId?.isPremium || 
                                item.theme?.isPremium ? 
                                "#6366F1" : "#10B981"
                            }
                          ]}>
                            {
                              typeof item.themeId === 'object' && item.themeId?.isPremium || 
                              item.theme?.isPremium ? 
                              "Premium" : "Thường"
                            }
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Thành tiền:</Text>
                        <Text style={styles.subTotal}>{formatPrice(item.price)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Order Footer */}
            <View style={styles.orderFooter}>
              <View style={styles.totalContainer}>
                <View style={styles.totalLabelContainer}>
                  <Ionicons name="bag-outline" size={16} color="#6B7280" />
                  <Text style={styles.totalLabel}>
                    Tổng cộng ({order.items.length} sản phẩm)
                  </Text>
                </View>
                <Text style={styles.totalAmount}>{formatPrice(order.totalPrice)}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#9CA3AF" : "#3B82F6"} />
            </TouchableOpacity>
            
            <Text style={styles.paginationText}>Trang {currentPage} / {totalPages}</Text>
            
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#9CA3AF" : "#3B82F6"} />
            </TouchableOpacity>
          </View>
        )}

        {/* Add bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Empty State (if no orders) */}
      {orders.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bag-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm ngay!</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/store')}
          >
            <Text style={styles.browseButtonText}>Khám phá sản phẩm</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Fonts.SFProText.medium,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: Fonts.SFProDisplay.bold,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitleText: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 18,
    color: '#333',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: Fonts.SFProText.medium,
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Fonts.SFProText.medium,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Fonts.SFProText.regular,
  },
  orderItems: {
    backgroundColor: 'white',
  },
  orderItem: {
    padding: 16,
    backgroundColor: 'white',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  themeCardContainer: {
    width: 100,
    height: 145,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 2,
  },
  themeCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: Fonts.SFProText.medium,
    color: '#111827',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Fonts.SFProText.regular,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: Fonts.SFProText.medium,
    color: '#111827',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: Fonts.SFProText.medium,
  },
  subTotal: {
    fontSize: 13,
    fontFamily: Fonts.SFProText.semibold,
    color: '#3B82F6',
  },
  orderFooter: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Fonts.SFProText.regular,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: Fonts.SFProDisplay.bold,
    color: '#3B82F6',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.SFProDisplay.medium,
    marginBottom: 8,
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    fontFamily: Fonts.SFProText.regular,
  },
  browseButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButtonText: {
    fontSize: 14,
    fontFamily: Fonts.SFProText.medium,
    color: 'white',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paginationButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  paginationText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.SFProText.medium,
    color: '#374151',
  },
}); 