# API Themes cho Mobile App

## Giới thiệu

Tài liệu này mô tả các API endpoints liên quan đến theme (chủ đề) cho ứng dụng di động Flutter. Các API này cho phép người dùng xem các theme có sẵn, mua và áp dụng theme cho thú cưng của họ.

## Tổng quan API

Tất cả các endpoints sử dụng cơ sở `/api/v1` và đều trả về phản hồi JSON.

### Cấu trúc phản hồi chuẩn

```json
{
  "success": boolean,
  "data": object | array,
  "message": string (optional)
}
```

### Error Responses

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error" (only in development)
}
```

## Theme Store APIs

### 1. Xem tất cả theme trong store

```
GET /api/v1/pet-owner/store/themes
```

**Mô tả**: Lấy danh sách tất cả theme có sẵn trong store.

**Yêu cầu xác thực**: Không (nhưng nếu có xác thực sẽ hiển thị theme người dùng đã sở hữu)

**Phản hồi**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "theme_id",
      "name": "Theme name",
      "description": "Theme description",
      "price": 0,
      "isPremium": false,
      "isOwned": false,
      "previewUrl": "https://example.com/theme-image.png",
      "appliedToPets": []
    },
    ...
  ]
}
```

### 2. Xem chi tiết của một theme

```
GET /api/v1/pet-owner/store/themes/:theme_id
```

**Mô tả**: Lấy chi tiết về một theme cụ thể.

**Yêu cầu xác thực**: Không (nhưng nếu có xác thực sẽ hiển thị trạng thái sở hữu)

**Phản hồi**:
```json
{
  "success": true,
  "data": {
    "_id": "theme_id",
    "name": "Theme name",
    "description": "Theme description",
    "price": 0,
    "isPremium": false,
    "isActive": true,
    "inStore": true,
    "isOwned": false,
    "previewUrl": "https://example.com/theme-image.png",
    "presetKey": "theme-preset-1"
  }
}
```

### 3. Mua một theme

```
POST /api/v1/pet-owner/themes/purchase
```

**Mô tả**: Mua theme cho tài khoản người dùng.

**Yêu cầu xác thực**: Có

**Request Body**:
```json
{
  "themeId": "theme_id"
}
```

**Phản hồi**:
```json
{
  "success": true,
  "message": "Theme purchased successfully",
  "data": {
    "transactionId": "tx_123456789",
    "theme": {
      "id": "theme_id",
      "name": "Theme name",
      "price": 0,
      "imageUrl": "https://example.com/theme-image.png"
    },
    "purchaseDate": "2023-01-01T00:00:00.000Z"
  }
}
```

### 4. Xem theme collection của người dùng

```
GET /api/v1/pet-owner/themes/collection
```

**Mô tả**: Lấy danh sách các theme người dùng đã mua.

**Yêu cầu xác thực**: Có

**Phản hồi**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "theme_id",
      "name": "Theme name",
      "description": "Theme description",
      "price": 0,
      "isPremium": false,
      "presetKey": "theme-preset-1",
      "purchaseDate": "2023-01-01T00:00:00.000Z",
      "transactionId": "tx_123456789",
      "isActive": true,
      "previewUrl": "https://example.com/theme-image.png",
      "appliedToPets": [
        {
          "petId": "pet_id",
          "appliedAt": "2023-01-01T00:00:00.000Z"
        }
      ]
    },
    ...
  ]
}
```

## Theme Application APIs

### 1. Áp dụng theme cho pet

```
POST /api/v1/theme/:themeId/apply
```

**Mô tả**: Áp dụng theme đã mua cho một thú cưng.

**Yêu cầu xác thực**: Có

**Request Body**:
```json
{
  "petId": "pet_id"
}
```

**Phản hồi**:
```json
{
  "success": true,
  "message": "Theme successfully applied to pet",
  "data": {
    "petId": "pet_id",
    "themeId": "theme_id",
    "appliedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 2. Xóa theme khỏi pet

```
POST /api/v1/theme/:themeId/remove
```

**Mô tả**: Xóa theme khỏi một thú cưng.

**Yêu cầu xác thực**: Có

**Request Body**:
```json
{
  "petId": "pet_id"
}
```

**Phản hồi**:
```json
{
  "success": true,
  "message": "Theme successfully removed from pet"
}
```

## Theme Preview APIs

### 1. Xem theme cho pet

```
GET /api/v1/pet-owner/pets/:petId/preview-theme/:themeId
```

**Mô tả**: Xem trước theme cho một thú cưng cụ thể.

**Yêu cầu xác thực**: Có

**Phản hồi**:
```json
{
  "success": true,
  "data": {
    "theme": {
      "_id": "theme_id",
      "name": "Theme name",
      "presetKey": "theme-preset-1",
      "previewUrl": "https://example.com/theme-image.png"
    },
    "pet": {
      "_id": "pet_id",
      "name": "Pet Name",
      "avatarUrl": "https://example.com/pet-avatar.png"
    },
    "preview": {
      "url": "https://example.com/preview.png"
    }
  }
}
```

## Lưu ý quan trọng

1. Tất cả các API liên quan đến sở hữu và áp dụng theme đều yêu cầu xác thực.
2. Các theme không khả dụng (isActive=false) sẽ không hiển thị trong store.
3. Khi áp dụng theme cho một pet, nếu pet đã có theme trước đó, theme cũ sẽ tự động bị xóa.
4. Theme images và preview được lưu trữ trong R2 storage và được truy cập thông qua public URL. 