import { API_BASE_URL, DEFAULT_HEADERS } from '@/api/config/apiConfig';
import { Fonts } from '@/constants/Fonts';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Screen dimensions
const { width, height } = Dimensions.get('window');
const itemWidth = (width - 60) / 2;

// Modern color palette
const Colors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#F1F5F9',
  accent: '#10B981',
  background: '#FAFBFC',
  surface: '#FFFFFF',
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  border: '#E2E8F0',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  gradient: {
    primary: ['#6366F1', '#8B5CF6'] as const,
    secondary: ['#F8FAFC', '#F1F5F9'] as const,
    accent: ['#10B981', '#059669'] as const,
  }
};

// Sample data for popular cards
const popularCards = [
  {
    id: '1',
    name: 'Ocean Theme',
    price: 302000,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/35a6f47c-19d1-4226-a30d-c4a74db5a6d7/air-jordan-1-low-shoes-6Q1tFM.png',
    tag: 'BEST SELLER',
    isFavorite: false,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '2',
    name: 'Mountain Theme',
    price: 752000,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/756d9f2b-9330-42a0-83bd-823279774574/air-max-excee-shoes-lPbXqt.png',
    tag: 'PREMIUM',
    isFavorite: true,
    rating: 4.9,
    reviews: 89,
  },
];

// Categories data
const categories = [
  { id: '1', title: 'Tất cả', isActive: true, icon: 'grid-outline' },
  { id: '2', title: 'Miễn phí', isActive: false, icon: 'gift-outline' },
  { id: '3', title: 'Premium', isActive: false, icon: 'diamond-outline' },
  { id: '4', title: 'Bán chạy', isActive: false, icon: 'trending-up-outline' },
];

// All cards data
const allCards = [
  {
    id: '1',
    name: 'Ocean Theme',
    price: 302000,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/35a6f47c-19d1-4226-a30d-c4a74db5a6d7/air-jordan-1-low-shoes-6Q1tFM.png',
    tag: 'BEST SELLER',
    isFavorite: false,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '2',
    name: 'Mountain Theme',
    price: 752000,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/756d9f2b-9330-42a0-83bd-823279774574/air-max-excee-shoes-lPbXqt.png',
    tag: 'PREMIUM',
    isFavorite: true,
    rating: 4.9,
    reviews: 89,
  },
  {
    id: '3',
    name: 'Forest Theme',
    price: 450000,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/4f685abe-3cc4-4d43-8c31-71b4fd93d5cd/city-rep-tr-training-shoes-kvsXrM.png',
    tag: 'PREMIUM',
    isFavorite: false,
    rating: 4.7,
    reviews: 67,
  },
  {
    id: '4',
    name: 'Sunset Theme',
    price: 0,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/fa4a93c9-6968-4e0d-8b96-f9eae0bfdba2/dunk-low-shoes-69h36n.png',
    tag: 'FREE',
    isFavorite: false,
    rating: 4.5,
    reviews: 203,
  },
];

// Price formatting function
const formatPriceVND = (price: number): string => {
  if (price === 0) return 'MIỄN PHÍ';
  return `${price.toLocaleString('vi-VN')}₫`;
};

export default function StoreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('1');
  const [favorites, setFavorites] = useState<string[]>(['2']);
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [ownedThemeIds, setOwnedThemeIds] = useState<string[]>([]);
  
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000/api/v1';

  // Lấy danh sách theme đã sở hữu
  const fetchOwnedThemes = async () => {
    try {
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      
      if (!token) {
        return; // Không cần làm gì nếu chưa đăng nhập
      }
      
      const response = await axios.get(`${API_URL}/pet-owner/themes/collection`, {
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
      
      // Kiểm tra định dạng response và trích xuất danh sách theme
      if (response.data && response.data.success) {
        let themesList = [];
        
        // Kiểm tra cấu trúc response
        if (Array.isArray(response.data.data)) {
          themesList = response.data.data;
        } else if (response.data.data && Array.isArray(response.data.data.themes)) {
          themesList = response.data.data.themes;
        } else if (response.data.data && Array.isArray(response.data.data.items)) {
          themesList = response.data.data.items;
        }
        
        // Lưu danh sách ID theme đã sở hữu
        const themeIds = themesList.map((theme: any) => {
          if (theme.themeId) {
            return typeof theme.themeId === 'object' ? theme.themeId._id : theme.themeId;
          }
          return theme._id || '';
        }).filter(Boolean);
        
        setOwnedThemeIds(themeIds);
        console.log('Đã sở hữu themes:', themeIds.length);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách theme đã sở hữu:', error);
    }
  };

  // Lấy danh sách theme đã sở hữu và giỏ hàng
  useEffect(() => {
    // Tắt lỗi cảnh báo khi gọi API không thành công
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Lọc bỏ log cho các lỗi khi gọi API theme collection
      if (
        args[0] && 
        typeof args[0] === 'string' && 
        args[0].includes('Lỗi khi lấy danh sách theme đã sở hữu')
      ) {
        return;
      }
      originalConsoleError(...args);
    };

    // Gọi API
    refreshCartBadge();
    fetchOwnedThemes();

    // Khôi phục console.error khi unmount
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Tự động làm mới giỏ hàng mỗi khi screen được focus
  useFocusEffect(
    useCallback(() => {
      console.log('[STORE] Screen focused, refreshing cart badge');
      refreshCartBadge();
    }, [])
  );

  // Hàm thêm theme vào giỏ hàng
  const addToCart = async (themeId: string) => {
    try {
      setAddingToCart(themeId);
      
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      console.log('[ADD] Thêm theme vào giỏ hàng, themeId =', themeId);
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Kiểm tra đã sở hữu chưa
      if (ownedThemeIds.includes(themeId)) {
        // Hiển thị thông báo nhẹ nhàng
        Alert.alert(
          'Đã sở hữu',
          'Bạn đã sở hữu theme này rồi!',
          [{ text: 'Đã hiểu', style: 'default' }]
        );
        return;
      }
      
      const response = await axios.post(`${API_URL}/cart/theme/${themeId}`, {}, {
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
      
      console.log('[ADD] Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.success) {
        // Cập nhật lại badge giỏ hàng
        await refreshCartBadge();
        
        // Hiển thị thông báo thành công
        Alert.alert(
          'Thành công',
          'Đã thêm theme vào giỏ hàng!',
          [
            {
              text: 'Đi đến giỏ hàng',
              onPress: async () => {
                // Đảm bảo làm mới giỏ hàng trước khi chuyển hướng
                try {
                  // Gọi API refreshCart một lần nữa để đảm bảo dữ liệu mới nhất
                  const refreshResponse = await axios.get(`${API_URL}/cart/refresh`, {
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

                  console.log('[PRE-NAVIGATION] Cart refresh response:', 
                    refreshResponse.data?.success, 
                    'items:', refreshResponse.data?.data?.items?.length || 0
                  );
                } catch (err) {
                  console.error('[PRE-NAVIGATION] Error refreshing cart:', err);
                }
                
                // Thêm timestamp để đảm bảo Cart luôn được refresh khi mở
                const ts = new Date().getTime();
                router.push({ pathname: '/cart', params: { ts, forceRefresh: 'true' } });
              },
            },
            {
              text: 'Tiếp tục mua sắm',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể thêm theme vào giỏ hàng');
      }
    } catch (err: any) {
      console.error('Lỗi khi thêm vào giỏ hàng:', err);
      if (err.response?.data?.message === 'Theme đã có trong giỏ hàng') {
        Alert.alert('Thông báo', 'Theme đã có trong giỏ hàng!');
      } else {
        console.log('Lỗi:', err.response?.data?.message || err.message);
        // Chỉ hiện lỗi khi không phải theme đã sở hữu
        if (err.response?.data?.message !== 'Bạn đã sở hữu theme này') {
          Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
        }
      }
    } finally {
      setAddingToCart(null);
    }
  };

  // Fetch themes from backend
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API_BASE_URL}/pet-owner/store/themes`, {
          headers: {
            ...DEFAULT_HEADERS,
          },
        });

        /*
         * Backend trả về {
         *   success: true,
         *   data: [ { _id, name, price, imageUrl, image, isPremium, inStore, ... } ]
         * }
         */
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const transformed = response.data.data.map((item: any) => {
            // Ưu tiên image.publicUrl nếu có
            const imageUrl = item.image?.publicUrl || item.imageUrl || '';
            return {
              id: item._id,
              name: item.name,
              price: item.price || 0,
              image: imageUrl,
              tag: item.price === 0 ? 'FREE' : item.isPremium ? 'PREMIUM' : 'BEST SELLER',
              isFavorite: false,
              rating: 4.5 + Math.random() * 0.5,
              reviews: Math.floor(Math.random() * 200) + 50,
            };
          });
          setThemes(transformed);
        } else {
          console.log('fetchThemes: Response không hợp lệ', response.data);
          Alert.alert('Lỗi', 'Không thể tải danh sách theme. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('Lỗi tải theme:', error);
        Alert.alert('Lỗi', 'Không thể tải danh sách theme. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchThemes();
  }, []);

  const popularCardsData = themes.slice(0, 2);

  const filterThemesByCategory = () => {
    switch (activeCategory) {
      case '2':
        return themes.filter((t) => t.price === 0);
      case '3':
        return themes.filter((t) => t.price > 0);
      case '4':
        return themes.filter((t) => t.tag === 'BEST SELLER');
      default:
        return themes;
    }
  };

  const allCardsData = filterThemesByCategory();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(item => item !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const navigateToCart = async () => {
    // Làm mới giỏ hàng trước khi chuyển hướng
    const token = await AsyncStorage.getItem('@vnipet_access_token');
    if (token) {
      try {
        // Gọi API refreshCart để đảm bảo dữ liệu mới nhất
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
          }
        });

        console.log('[NAV TO CART] Cart refresh response:', 
          response.data?.success, 
          'items:', response.data?.data?.items?.length || 0
        );
      } catch (err) {
        console.error('[NAV TO CART] Error refreshing cart:', err);
      }
    }
    
    // Thêm timestamp để đảm bảo Cart luôn được refresh khi mở
    const ts = new Date().getTime();
    router.push({ pathname: '/cart', params: { ts, forceRefresh: 'true' } });
  };

  // Làm mới badge giỏ hàng
  async function refreshCartBadge() {
    try {
      const token = await AsyncStorage.getItem('@vnipet_access_token');
      
      if (!token) {
        return; // Không cần làm gì nếu chưa đăng nhập
      }
      
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
        }
      });
      
      if (response.data && response.data.success && response.data.data?.items) {
        console.log('Cart items length:', response.data.data.items.length);
        setCartCount(response.data.data.items.length);
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin giỏ hàng:', error);
    }
  }

  const renderProductCard = (card: any) => (
    <TouchableOpacity key={card.id} style={styles.productCard} activeOpacity={0.8}>
      <View style={styles.productImageContainer}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(card.id)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={favorites.includes(card.id) ? "heart" : "heart-outline"} 
            size={20} 
            color={favorites.includes(card.id) ? Colors.error : Colors.text.tertiary} 
          />
        </TouchableOpacity>
        
        {card.tag && (
          <View style={[
            styles.productTag,
            card.tag === 'FREE' && styles.freeTag,
            card.tag === 'PREMIUM' && styles.premiumTag,
            card.tag === 'BEST SELLER' && styles.bestSellerTag,
          ]}>
            <Text style={[
              styles.productTagText,
              card.tag === 'FREE' && styles.freeTagText,
              card.tag === 'PREMIUM' && styles.premiumTagText,
              card.tag === 'BEST SELLER' && styles.bestSellerTagText,
            ]}>
              {card.tag === 'FREE' ? 'MIỄN PHÍ' : card.tag}
            </Text>
          </View>
        )}
        

        
        <Image 
          source={{ uri: card.image }} 
          style={styles.productImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{card.name}</Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color={Colors.warning} />
          <Text style={styles.ratingText}>{card.rating?.toFixed(1)}</Text>
          <Text style={styles.reviewsText}>({card.reviews})</Text>
        </View>
        
        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>
            {formatPriceVND(card.price)}
          </Text>
          {ownedThemeIds.includes(card.id) ? (
            <View style={[styles.addToCartButton, styles.ownedButton]}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.addToCartGradient}
              >
                <Ionicons name="checkmark" size={20} color="white" />
              </LinearGradient>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addToCartButton} 
              activeOpacity={0.8}
              onPress={() => addToCart(card.id)}
              disabled={addingToCart === card.id}
            >
              <LinearGradient
                colors={Colors.gradient.primary}
                style={styles.addToCartGradient}
              >
                {addingToCart === card.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="add" size={20} color="white" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Modern Header */}
      <LinearGradient
        colors={Colors.gradient.secondary}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="storefront" size={24} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Cửa Hàng</Text>
              <Text style={styles.headerSubtitle}>Khám phá theme mới</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.cartButton} 
            onPress={navigateToCart}
            activeOpacity={0.7}
          >
            <View style={styles.cartIconContainer}>
              <Ionicons name="bag-outline" size={24} color={Colors.text.primary} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Enhanced Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theme..."
              placeholderTextColor={Colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <LinearGradient
              colors={Colors.gradient.primary}
              style={styles.filterGradient}
            >
              <MaterialIcons name="tune" size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Enhanced Categories */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map(category => (
              <TouchableOpacity 
                key={category.id}
                style={[
                  styles.categoryItem,
                  activeCategory === category.id && styles.activeCategoryItem
                ]}
                onPress={() => setActiveCategory(category.id)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={18} 
                  color={activeCategory === category.id ? 'white' : Colors.text.secondary}
                  style={styles.categoryIcon}
                />
                <Text style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText
                ]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Popular Cards */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Theme phổ biến</Text>
              <Text style={styles.sectionSubtitle}>Được yêu thích nhất</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsGrid}>
            {popularCardsData.length > 0 ? (
              popularCardsData.map(renderProductCard)
            ) : (
              <Text style={styles.noDataText}>Chưa có theme</Text>
            )}
          </View>
        </View>
        
        {/* Enhanced New Arrivals Banner */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Ưu đãi đặc biệt</Text>
              <Text style={styles.sectionSubtitle}>Chỉ trong tuần này</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.promotionBanner} activeOpacity={0.9}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promotionGradient}
            >
              <View style={styles.promotionContent}>
                <View style={styles.promotionTextContainer}>
                  <Text style={styles.promotionTitle}>Giảm giá mùa hè</Text>
                  <Text style={styles.promotionDiscount}>15% OFF</Text>
                  <Text style={styles.promotionDescription}>Cho tất cả theme premium</Text>
                </View>
                <View style={styles.promotionIconContainer}>
                  <Text style={styles.promotionEmoji}>🔥</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* All Cards */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Tất cả theme</Text>
              <Text style={styles.sectionSubtitle}>{allCardsData.length} sản phẩm</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsGrid}>
            {allCardsData.length > 0 ? (
              allCardsData.map(renderProductCard)
            ) : (
              <Text style={styles.noDataText}>Chưa có theme</Text>
            )}
          </View>
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 22,
    color: Colors.text.primary,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cartButton: {
    padding: 8,
  },
  cartIconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  cartBadgeText: {
    fontFamily: Fonts.SFProText.bold,
    fontSize: 10,
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.SFProText.regular,
    fontSize: 16,
    color: Colors.text.primary,
  },
  filterButton: {
    borderRadius: 26,
  },
  filterGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 20,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingRight: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeCategoryItem: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  activeCategoryText: {
    color: 'white',
  },
  productSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 14,
    color: Colors.primary,
    marginRight: 4,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: itemWidth,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  productImageContainer: {
    height: 160,
    backgroundColor: Colors.secondary,
    position: 'relative',
    padding: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  freeTag: {
    backgroundColor: Colors.success,
  },
  premiumTag: {
    backgroundColor: Colors.primary,
  },
  bestSellerTag: {
    backgroundColor: Colors.warning,
  },
  productTagText: {
    fontFamily: Fonts.SFProText.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freeTagText: {
    color: 'white',
  },
  premiumTagText: {
    color: 'white',
  },
  bestSellerTagText: {
    color: 'white',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 13,
    color: Colors.text.primary,
    marginLeft: 4,
  },
  reviewsText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginLeft: 4,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 18,
    color: Colors.text.primary,
  },
  addToCartButton: {
    borderRadius: 20,
  },
  addToCartGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionBanner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  promotionGradient: {
    padding: 24,
    minHeight: 120,
  },
  promotionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promotionTextContainer: {
    flex: 1,
  },
  promotionTitle: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  promotionDiscount: {
    fontFamily: Fonts.SFProDisplay.bold,
    fontSize: 32,
    color: 'white',
    marginBottom: 4,
  },
  promotionDescription: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  promotionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionEmoji: {
    fontSize: 28,
  },
  bottomSpacer: {
    height: 100,
  },
  noDataText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 20,
  },
  ownedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 0,
    borderRadius: 12,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  ownedButton: {
    opacity: 0.7,
  },
});