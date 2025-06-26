import { API_BASE_URL, DEFAULT_HEADERS } from '@/api/config/apiConfig';
import { Fonts } from '@/constants/Fonts';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Kích thước màn hình
const { width } = Dimensions.get('window');
const itemWidth = (width - 60) / 2; // 2 items per row with padding

// Dữ liệu mẫu cho thẻ phổ biến
const popularCards = [
  {
    id: '1',
    name: 'Ocean Theme',
    price: 302.00,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/35a6f47c-19d1-4226-a30d-c4a74db5a6d7/air-jordan-1-low-shoes-6Q1tFM.png',
    tag: 'BEST SELLER',
    isFavorite: false,
  },
  {
    id: '2',
    name: 'Mountain Theme',
    price: 752.00,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/756d9f2b-9330-42a0-83bd-823279774574/air-max-excee-shoes-lPbXqt.png',
    tag: 'BEST SELLER',
    isFavorite: true,
  },
];

// Dữ liệu mẫu cho danh mục
const categories = [
  { id: '1', title: 'All Cards', isActive: true },
  { id: '2', title: 'Free', isActive: false },
  { id: '3', title: 'Premium', isActive: false },
  { id: '4', title: 'Best Seller', isActive: false },
];

// Dữ liệu mẫu cho tất cả các thẻ
const allCards = [
  {
    id: '1',
    name: 'Ocean Theme',
    price: 302.00,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/35a6f47c-19d1-4226-a30d-c4a74db5a6d7/air-jordan-1-low-shoes-6Q1tFM.png',
    tag: 'BEST SELLER',
    isFavorite: false,
  },
  {
    id: '2',
    name: 'Mountain Theme',
    price: 752.00,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/756d9f2b-9330-42a0-83bd-823279774574/air-max-excee-shoes-lPbXqt.png',
    tag: 'BEST SELLER',
    isFavorite: true,
  },
  {
    id: '3',
    name: 'Forest Theme',
    price: 450.00,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/4f685abe-3cc4-4d43-8c31-71b4fd93d5cd/city-rep-tr-training-shoes-kvsXrM.png',
    tag: 'PREMIUM',
    isFavorite: false,
  },
  {
    id: '4',
    name: 'Sunset Theme',
    price: 0.00,
    image: 'https://static.nike.com/a/images/c_limit,w_400,f_auto/t_product_v1/fa4a93c9-6968-4e0d-8b96-f9eae0bfdba2/dunk-low-shoes-69h36n.png',
    tag: 'FREE',
    isFavorite: false,
  },
];

// Hàm định dạng giá VND
const formatPriceVND = (price: number): string => {
  if (price === 0) return 'FREE';
  // Sử dụng toLocaleString để thêm dấu phẩy ngăn cách nghìn và ký hiệu đ ở cuối
  return `${price.toLocaleString('vi-VN')}đ`;
};

export default function StoreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('1');
  const [favorites, setFavorites] = useState<string[]>(['2']);

  // Danh sách theme và trạng thái tải
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch danh sách theme từ backend
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/store/themes`, {
          method: 'GET',
          headers: {
            ...DEFAULT_HEADERS,
          },
        });
        const data = await response.json();

        // Chuẩn hóa dữ liệu để phù hợp UI hiện tại
        const transformed = Array.isArray(data)
          ? data.map((item: any) => ({
              id: item._id,
              name: item.name,
              price: item.price || 0,
              image: item.imageUrl || '',
              tag: item.price === 0 ? 'FREE' : item.isPremium ? 'PREMIUM' : 'BEST SELLER',
              isFavorite: false,
            }))
          : [];

        setThemes(transformed);
      } catch (error) {
        console.error('Lỗi tải theme:', error);
        Alert.alert('Lỗi', 'Không thể tải danh sách theme. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchThemes();
  }, []);

  // Phân loại theme
  const popularCards = themes.slice(0, 2);

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

  const allCards = filterThemesByCategory();

  // Hiển thị loader khi đang tải dữ liệu
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header - Bỏ nút 3 gạch bên trái */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="storefront-outline" size={24} color="#333" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Cửa Hàng</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cartButton}>
            <Ionicons name="cart-outline" size={28} color="#333" />
            <View style={styles.cartBadge} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Looking for themes"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialIcons name="tune" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Categories - Đổi thành 4 mục mới */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Select Category</Text>
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
              >
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
        
        {/* Popular Cards - Đổi từ "Popular Shoes" sang "Popular Cards" */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Cards</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsGrid}>
            {popularCards.map(card => (
              <View key={card.id} style={styles.productCard}>
                <View style={styles.productImageContainer}>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => toggleFavorite(card.id)}
                  >
                    <Ionicons 
                      name={favorites.includes(card.id) ? "heart" : "heart-outline"} 
                      size={22} 
                      color={favorites.includes(card.id) ? "#FF6B6B" : "#777"} 
                    />
                  </TouchableOpacity>
                  <Image 
                    source={{ uri: card.image }} 
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>
                
                <View style={styles.productInfo}>
                  <Text style={styles.productTag}>{card.tag}</Text>
                  <Text style={styles.productName}>{card.name}</Text>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPrice}>
                      {formatPriceVND(card.price)}
                    </Text>
                    <TouchableOpacity style={styles.addToCartButton}>
                      <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* New Arrivals - Thay đổi hiển thị thành dạng dài liền nhau */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {/* Thay đổi hiển thị thành dạng dài theo hàng ngang */}
          <View style={styles.newArrivalBanner}>
            <View style={styles.sparkleContainer}>
              <Text style={styles.sparkleEmoji}>✨</Text>
            </View>
            <View style={styles.saleContent}>
              <Text style={styles.saleTitle}>Summer Sale</Text>
              <Text style={styles.saleDiscount}>15% OFF</Text>
            </View>
          </View>
        </View>
        
        {/* All Cards - Thêm mục mới */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Cards</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsGrid}>
            {allCards.map(card => (
              <View key={card.id} style={styles.productCard}>
                <View style={styles.productImageContainer}>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => toggleFavorite(card.id)}
                  >
                    <Ionicons 
                      name={favorites.includes(card.id) ? "heart" : "heart-outline"} 
                      size={22} 
                      color={favorites.includes(card.id) ? "#FF6B6B" : "#777"} 
                    />
                  </TouchableOpacity>
                  <Image 
                    source={{ uri: card.image }} 
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>
                
                <View style={styles.productInfo}>
                  <Text style={styles.productTag}>{card.tag}</Text>
                  <Text style={styles.productName}>{card.name}</Text>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPrice}>
                      {formatPriceVND(card.price)}
                    </Text>
                    <TouchableOpacity style={styles.addToCartButton}>
                      <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Bottom spacer for nav bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  headerTitle: {
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
  cartButton: {
    position: 'relative',
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  cartBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#FF3B30',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.SFProText.regular,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: '#3B82F6',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
  },
  categoriesContainer: {
    paddingRight: 20,
  },
  categoryItem: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
  },
  activeCategoryItem: {
    backgroundColor: '#3B82F6',
  },
  categoryText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 15,
    color: '#333',
  },
  activeCategoryText: {
    color: 'white',
  },
  productSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: '#3B82F6',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: itemWidth,
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  productImageContainer: {
    height: 150,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    paddingTop: 10,
  },
  productTag: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 11,
    color: '#3B82F6',
    marginBottom: 5,
  },
  productName: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 16,
    color: '#333',
  },
  addToCartButton: {
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Thay đổi style cho New Arrivals (dạng banner ngang) */
  newArrivalBanner: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  sparkleEmoji: {
    fontSize: 20,
  },
  saleContent: {
    flex: 1,
  },
  saleTitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 15,
    color: '#333',
  },
  saleDiscount: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 32,
    color: '#6366F1',
    marginTop: 10,
  },
  bottomSpacer: {
    height: 100,
  },
}); 