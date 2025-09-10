# API Quản lý Contact với Bitrix24

Ứng dụng NestJS tích hợp OAuth 2.0 với Bitrix24 để quản lý Contact bao gồm thông tin ngân hàng.

## 📋 Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Cấu hình Ngrok](#cấu-hình-ngrok)
- [Thiết lập OAuth Bitrix24](#thiết-lập-oauth-bitrix24)
- [API Endpoints](#api-endpoints)
- [Kiểm thử với cURL](#kiểm-thử-với-curl)
- [Unit Tests](#unit-tests)
- [Xử lý lỗi](#xử-lý-lỗi)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Scripts](#scripts)

## 🚀 Tính năng

- ✅ **Tích hợp OAuth 2.0 Bitrix24** - Quy trình OAuth hoàn chỉnh với quản lý token
- ✅ **CRUD Contact** - Tạo, đọc, cập nhật, xóa contact
- ✅ **Hỗ trợ thông tin ngân hàng** - Lưu thông tin ngân hàng bằng Bitrix24 Requisites & Bank Details API
- ✅ **Quản lý Token** - Tự động refresh token và lưu trữ SQLite với backup JSON
- ✅ **Validation dữ liệu** - Kiểm tra request bằng DTOs và class-validator
- ✅ **Tài liệu Swagger** - Tự động tạo tài liệu API
- ✅ **Xử lý lỗi** - Xử lý lỗi toàn diện với thông báo rõ ràng
- ✅ **Kiểm thử** - Unit tests và API testing scripts

## 🛠 Công nghệ sử dụng

- **Framework**: NestJS (Node.js)
- **Ngôn ngữ**: TypeScript
- **Cơ sở dữ liệu**: SQLite (lưu trữ token)
- **HTTP Client**: Axios (@nestjs/axios)
- **Validation**: class-validator, class-transformer
- **Tài liệu**: Swagger/OpenAPI
- **Kiểm thử**: Custom scripts
- **Tunneling**: ngrok/localtunnel
- **Code Quality**: ESLint, Prettier

## 📦 Cài đặt

### Yêu cầu

- Node.js (v16 trở lên)
- npm hoặc yarn
- Tài khoản ngrok (để tạo public webhook URL)
- Tài khoản Bitrix24 có quyền tạo ứng dụng

### Clone và cài đặt

```bash
# Clone repository
git clone <repository-url>
cd bitrix24-oauth-nestjs

# Cài đặt dependencies
npm install

# Build dự án
npm run build
```

## ⚙️ Cấu hình môi trường

Tạo file `.env` trong thư mục gốc:

```env
# Thông tin OAuth Bitrix24
BITRIX24_CLIENT_ID=your_app_id_here
BITRIX24_CLIENT_SECRET=your_app_secret_here

# Cấu hình Server
PORT=3000

# Cơ sở dữ liệu
DATABASE_PATH=./data/tokens.db
JSON_BACKUP_PATH=./data/tokens_backup.json
```

### Lấy thông tin đăng nhập Bitrix24

1. Vào portal Bitrix24 của bạn
2. Điều hướng đến **Ứng dụng** → **Tài nguyên nhà phát triển** → **Khác** → **Ứng dụng cục bộ**
3. Tạo ứng dụng mới với:
   - **Mã ứng dụng**: `bitrix24-contact-api`
   - **Tên ứng dụng**: `API Quản lý Contact`
   - **URL xử lý ứng dụng**: `https://your-ngrok-url.ngrok-free.app/install`
   - **Quyền**: Chọn scope `crm`

## 🌐 Cấu hình Ngrok

### Cài đặt và thiết lập ngrok

```bash
# Cài đặt ngrok
npm install -g ngrok

# Đăng ký tại https://ngrok.com và lấy auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Khởi động tunnel (terminal riêng)
ngrok http 3000
```

### Các lựa chọn tunneling khác

```bash
# Lựa chọn 1: localtunnel
npm install -g localtunnel
lt --port 3000

# Lựa chọn 2: serveo (không cần cài đặt)
ssh -R 80:localhost:3000 serveo.net
```

## 🔗 Thiết lập OAuth Bitrix24

1. **Khởi động ứng dụng**:
   ```bash
   npm run start:dev
   ```

2. **Khởi động ngrok** (terminal riêng):
   ```bash
   ngrok http 3000
   ```

3. **Cập nhật URL xử lý ứng dụng Bitrix24** với URL ngrok của bạn:
   ```
   https://your-ngrok-url.ngrok-free.app/install
   ```

4. **Cài đặt ứng dụng** trong portal Bitrix24 bằng cách nhấp "Cài đặt"

## 📡 API Endpoints

### Base URL
```
http://localhost:3000
```

### Tài liệu Swagger
```
http://localhost:3000/api
```

### OAuth Endpoints

#### Cài đặt ứng dụng
```http
POST /install
Content-Type: application/json

# Xử lý cài đặt OAuth Bitrix24 tự động
```

#### Refresh Token
```http
POST /bitrix24/refresh/:domain
```

### Contact Management Endpoints

#### 1. Lấy tất cả Contact
```http
GET /contacts?page=1&limit=10&search=John
```

**Query Parameters:**
- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item mỗi trang (mặc định: 10, tối đa: 50)
- `search` (tùy chọn): Tìm kiếm theo tên

#### 2. Lấy Contact theo ID
```http
GET /contacts/:id
```

#### 3. Tạo Contact
```http
POST /contacts
Content-Type: application/json

{
  "name": "Nguyễn Văn Test",
  "lastName": "Nguyễn",
  "email": "test@example.com",
  "phone": "+84901234567",
  "website": "https://example.com",
  "address": {
    "street": "123 Đường Test",
    "ward": "Phường Test",
    "district": "Quận Test", 
    "city": "TP.HCM"
  },
  "bankInfo": {
    "bankName": "Vietcombank",
    "accountNumber": "1234567890",
    "accountHolder": "Nguyễn Văn Test"
  },
  "comments": "Contact test"
}
```

#### 4. Cập nhật Contact
```http
PUT /contacts/:id
Content-Type: application/json

{
  "name": "Tên đã cập nhật",
  "email": "updated@example.com"
}
```

#### 5. Xóa Contact
```http
DELETE /contacts/:id
```

## 🧪 Kiểm thử với cURL

### Điều kiện để kiểm thử
```bash
# Khởi động server
npm run start:dev

# Đảm bảo OAuth đã được cấu hình và ứng dụng đã được cài đặt trong Bitrix24
```

### Kiểm tra sức khỏe
```bash
curl -X GET "http://localhost:3000/contacts" \
  -H "Content-Type: application/json"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": {
    "contacts": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

### Tạo Contact (cơ bản)
```bash
curl -X POST "http://localhost:3000/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Contact",
    "email": "test@example.com",
    "phone": "+84901234567"
  }'
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "message": "Contact được tạo thành công",
    "contact": {
      "id": "123",
      "name": "Test Contact",
      "lastName": null,
      "phone": "+84901234567",
      "email": "test@example.com",
      "comments": null,
      "dateCreate": "2025-09-10T14:05:52+03:00"
    }
  }
}
```

### Tạo Contact với thông tin ngân hàng
```bash
curl -X POST "http://localhost:3000/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn Test Full",
    "lastName": "Nguyễn", 
    "email": "fulltest@example.com",
    "phone": "+84901234567",
    "website": "https://test.example.com",
    "address": {
      "street": "123 Đường Test",
      "ward": "Phường Test",
      "district": "Quận Test",
      "city": "TP.HCM"
    },
    "bankInfo": {
      "bankName": "Vietcombank",
      "accountNumber": "1234567890", 
      "accountHolder": "Nguyễn Văn Test"
    },
    "comments": "Contact với đầy đủ thông tin ngân hàng"
  }'
```

### Lấy Contact theo ID
```bash
curl -X GET "http://localhost:3000/contacts/124" \
  -H "Content-Type: application/json"
```

### Cập nhật Contact
```bash
curl -X PUT "http://localhost:3000/contacts/124" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tên Test đã cập nhật",
    "phone": "+84909999999"
  }'
```

### Tìm kiếm Contact
```bash
curl -X GET "http://localhost:3000/contacts?search=Test&page=1&limit=5" \
  -H "Content-Type: application/json"
```

### Xóa Contact
```bash
curl -X DELETE "http://localhost:3000/contacts/124" \
  -H "Content-Type: application/json"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "message": "Contact đã được xóa thành công",
  "id": "124"
}
```

## 🔬 Unit Tests

### Chạy Tests

```bash
# Chạy unit tests
npm run test:unit

# Chạy API tests
npm run test:contacts

# Chạy health check test
npm run test:health
```

### Phạm vi kiểm thử

Dự án bao gồm unit tests toàn diện cho:

1. **ContactsService** (`scripts/run-unit-tests.js`):
   - ✅ Tạo contact không có thông tin ngân hàng
   - ✅ Tạo contact với thông tin ngân hàng (requisites + bank details)
   - ✅ Lấy danh sách contacts với tìm kiếm và phân trang
   - ✅ Lấy contact theo ID
   - ✅ Cập nhật contact
   - ✅ Xóa contact
   - ✅ Xử lý lỗi cho contacts không tồn tại

2. **Bitrix24Service** (service gọi API):
   - ✅ Gọi Bitrix24 API thành công
   - ✅ Xử lý token hết hạn và auto-refresh
   - ✅ Trao đổi OAuth code lấy tokens
   - ✅ Xử lý lỗi API và lỗi mạng
   - ✅ Validation và lưu trữ token

### Tóm tắt kết quả test

```
Test Suites: 2 passed
Tests: 14 passed
Coverage: ContactsService (100%), Bitrix24Service (100%)
```

## ⚠️ Xử lý lỗi

### Các lỗi phổ biến

#### 401 Unauthorized - Domain chưa được xác thực
```json
{
  "statusCode": 401,
  "message": "Domain chưa được xác thực. Vui lòng cài đặt ứng dụng trước."
}
```

**Giải pháp**: Cài đặt ứng dụng Bitrix24 bằng endpoint `/install`

#### 404 Not Found - Contact không tìm thấy
```json
{
  "statusCode": 404,
  "message": "Contact không tồn tại"
}
```

#### 400 Bad Request - Lỗi validation
```json
{
  "statusCode": 400,
  "message": [
    "name không được để trống",
    "email phải là email hợp lệ"
  ],
  "error": "Bad Request"
}
```

#### 500 Internal Server Error - Lỗi Bitrix24 API
```json
{
  "statusCode": 500,
  "message": "Bitrix24 API Error: Tham số request không hợp lệ"
}
```

### Khắc phục sự cố

1. **Vấn đề Token**:
   ```bash
   # Kiểm tra trạng thái token
   curl http://localhost:3000/bitrix24/domains
   
   # Refresh token thủ công
   curl -X POST http://localhost:3000/bitrix24/refresh/your-domain.bitrix24.vn
   ```

2. **Vấn đề Database**:
   ```bash
   # Kiểm tra database tokens có tồn tại không
   ls -la ./data/
   
   # Xem backup
   cat ./data/tokens_backup.json
   ```

3. **Kết nối Bitrix24**:
   ```bash
   # Test gọi Bitrix24 API trực tiếp
   curl http://localhost:3000/bitrix24/bitrix/contacts/your-domain.bitrix24.vn
   ```

## 📁 Cấu trúc dự án

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Entry point ứng dụng
├── bitrix24/                  # Tích hợp OAuth Bitrix24
│   ├── bitrix24.controller.ts # OAuth endpoints
│   ├── bitrix24.service.ts    # Service gọi API
│   ├── bitrix24.module.ts     # Định nghĩa module
│   ├── token.service.ts       # Quản lý token
│   └── dto/                   # Data Transfer Objects
├── contacts/                  # Quản lý contact
│   ├── contacts.controller.ts # REST API endpoints
│   ├── contacts.service.ts    # Business logic
│   ├── contacts.module.ts     # Định nghĩa module  
│   ├── dto/                   # Request/Response DTOs
│   └── interfaces/            # TypeScript interfaces
scripts/                       # Scripts kiểm thử và tiện ích
├── setup.js                  # Thiết lập môi trường
├── test-api.js               # Kiểm thử API cơ bản
├── test-contacts.js          # Kiểm thử Contact API
├── test-custom-fields.js     # Kiểm thử custom fields
└── run-unit-tests.js         # Unit tests đơn giản
data/                         # Lưu trữ dữ liệu
├── tokens.db                 # Lưu trữ token SQLite
└── tokens_backup.json       # JSON backup
```

## 📝 Scripts

```bash
# Development
npm run start:dev              # Khởi động ở chế độ development
npm run build                  # Build cho production
npm run start:prod            # Khởi động production server

# Code Quality
npm run format                 # Format code với Prettier

# Testing
npm run test:unit             # Chạy unit tests
npm run test:health           # Test sức khỏe server
npm run test:create           # Test tạo contact đơn giản
npm run test:contacts         # Chạy tất cả contact API tests
npm run test:fields           # Test tạo custom fields

# Setup
npm run setup                 # Thiết lập môi trường tương tác
```

## 🚀 Triển khai Production

### Build cho Production
```bash
npm run build
npm run start:prod
```

### Biến môi trường cho Production
```env
NODE_ENV=production
PORT=3000
BITRIX24_CLIENT_ID=your_production_app_id
BITRIX24_CLIENT_SECRET=your_production_app_secret
DATABASE_PATH=/app/data/tokens.db
JSON_BACKUP_PATH=/app/data/tokens_backup.json
```


---

**🎯 Sẵn sàng sử dụng! Bắt đầu với `npm run start:dev` và truy cập `http://localhost:3000/api` để xem tài liệu Swagger.**