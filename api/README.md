# API Module cho Vnipet App

Module này xử lý tất cả các API calls giữa ứng dụng di động và backend server.

## Cấu trúc thư mục

```
api/
  ├── config/             # Cấu hình API
  │   └── apiConfig.js    # URL, endpoints, headers, timeout
  ├── controllers/        # Controllers xử lý logic
  │   └── authController.js
  ├── index.js            # Entry point
  ├── middleware/         # Middleware
  │   └── authMiddleware.js
  ├── models/             # Models định nghĩa cấu trúc dữ liệu
  ├── routes/             # Routes định nghĩa API endpoints
  │   └── authRoutes.js
  ├── services/           # Services xử lý API calls
  │   ├── authService.js
  │   └── dashboardService.js
  └── utils/              # Utilities
      ├── deviceUtils.js
      └── tokenManager.js
```

## Các Service Chính

### authService.js
Xử lý các API liên quan đến xác thực người dùng:
- `login()`: Đăng nhập
- `register()`: Đăng ký tài khoản mới
- `refreshToken()`: Làm mới access token
- `logout()`: Đăng xuất
- `isLoggedIn()`: Kiểm tra trạng thái đăng nhập
- `getCurrentUser()`: Lấy thông tin người dùng hiện tại

### dashboardService.js
Xử lý các API liên quan đến dashboard người dùng:
- `getUserDashboard()`: Lấy dữ liệu dashboard người dùng
- `getUserActivity()`: Lấy thông tin hoạt động người dùng

## Quản lý Token & Người dùng

1. **UserContext**: Dùng để quản lý trạng thái người dùng trong ứng dụng
   - `user`: Thông tin người dùng hiện tại
   - `isLoading`: Trạng thái loading
   - `isAuthenticated`: Trạng thái xác thực
   - `loadUserData()`: Tải dữ liệu người dùng
   - `clearUserData()`: Xóa dữ liệu người dùng
   - `updateUserData()`: Cập nhật thông tin người dùng

2. **AsyncStorage**: Lưu trữ thông tin token và người dùng
   - `@vnipet_access_token`: Access token
   - `@vnipet_refresh_token`: Refresh token
   - `@vnipet_user_data`: Thông tin người dùng
   - `@vnipet_device_id`: ID thiết bị

## Flow Xác thực

1. Người dùng đăng nhập/đăng ký
2. Lưu token và thông tin cơ bản vào AsyncStorage
3. Tải thông tin chi tiết từ API dashboard
4. Cập nhật UserContext với thông tin người dùng
5. Hiển thị thông tin người dùng trong ứng dụng

## Sử dụng

### Trong component

```javascript
import { useUser } from '@/contexts/UserContext';

export default function MyComponent() {
  const { user, isLoading, isAuthenticated } = useUser();

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <View>
      <Text>Welcome, {user.name}!</Text>
    </View>
  );
}
```

### Gọi API

```javascript
import dashboardService from '@/api/services/dashboardService';

const fetchDashboard = async () => {
  const response = await dashboardService.getUserDashboard();
  
  if (response.success) {
    // Xử lý dữ liệu thành công
    console.log(response.data);
  } else {
    // Xử lý lỗi
    console.error(response.message);
  }
};
``` 