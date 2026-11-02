# 🚀 Hướng Dẫn Đóng Gói & Deploy Máy Chủ (Git & Docker)

Tài liệu này hướng dẫn chi tiết từng bước để đẩy mã nguồn dự án **Kiếm Xu (Shopee & TikTok Cashback Affiliate)** lên Git và triển khai tự động bằng Docker & Docker Compose trên máy chủ VPS cho tên miền chính **`kiemxu.vn`** (và **`www.kiemxu.vn`**).

---

## 🛠️ Kiến Trúc Hệ Thống Trong Docker (3 Service)

Dự án đã được đặt tên riêng biệt với tiền tố **`thanhle_`** để hoàn toàn không bị xung đột với các website hoặc container khác đang chạy trên VPS:
1. **Database Container (`thanhle_mysql`)**: Chạy cơ sở dữ liệu **MariaDB 10.11 / MySQL 8.0** độc lập. Toàn bộ dữ liệu tài khoản, đơn hàng và số dư được lưu trữ bền vững vào Docker Volume (`thanhle_mysql_data`).
2. **Backend Container (`thanhle_backend`)**: Chạy Node.js API (Cổng ánh xạ `5001:5000`), kết nối trực tiếp với Database Container (`db:3306`).
3. **Frontend Container (`thanhle_frontend`)**: Chạy React Nginx Web Server (Cổng ánh xạ `8388:80`), phục vụ tên miền **`kiemxu.vn`** và Reverse Proxy tất cả yêu cầu `/api/` về Backend.

---

## 🌐 BƯỚC 0: Cấu Hình DNS Tên Miền (Trỏ kiemxu.vn Về VPS)

Trước khi cấu hình trên VPS, bạn vào trang quản trị DNS của tên miền **`kiemxu.vn`** (trên Cloudflare, iNET, PA Vietnam, Mat Bao, Tenten...):

1. **Bản ghi 1 (Tên miền chính - Root domain)**:
   - **Type**: `A`
   - **Name (Host)**: `@` *(hoặc để trống tùy nhà cung cấp)*
   - **Value (IPv4)**: `[Địa chỉ IP VPS của bạn]` (Ví dụ: `161.248.4.83`)
   - **TTL**: `Auto` hoặc `300s`

2. **Bản ghi 2 (Tên miền có www)**:
   - **Type**: `A` *(hoặc CNAME)*
   - **Name (Host)**: `www`
   - **Value (IPv4)**: `[Địa chỉ IP VPS của bạn]` *(nếu CNAME thì điền `kiemxu.vn`)*
   - **TTL**: `Auto` hoặc `300s`

> ⚠️ *(Lưu ý: Nếu dùng Cloudflare, tạm thời để **DNS Only** - tắt đám mây màu cam để chạy lệnh cấp chứng chỉ SSL Certbot ở Bước 6 không bị lỗi xác thực).*

---

## 📝 BƯỚC 1: Đẩy Mã Nguồn Lên Git (Máy Local)

Thực hiện các lệnh sau trên terminal máy tính cá nhân của bạn để đẩy toàn bộ code mới nhất lên GitHub:

```powershell
git add .
git commit -m "Configure domain kiemxu.vn"
git push origin redesign/affiliateshoppe:main
```

---

## 💻 BƯỚC 2: Chuẩn Bị Máy Chủ VPS (Server Linux)

Đăng nhập vào VPS qua SSH:
```bash
ssh root@<IP_VPS_CUA_BAN>
```

### 2.1 Cài đặt Docker & Docker Compose Plugin (nếu VPS mới):
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt Docker Compose Plugin
sudo apt install -y docker-compose-plugin

# Kiểm tra cài đặt
docker --version
docker compose version
```

### 2.2 Tạo bộ nhớ ảo Swap (Khuyên dùng cho VPS 1GB - 2GB RAM):
Tránh bị tràn bộ nhớ (Out of Memory - exit code 1) khi build Frontend:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📥 BƯỚC 3: Tải Mã Nguồn Về Server & Cấu Hình

### 3.1 Vào thư mục mã nguồn trên VPS:
```bash
cd /var/www/thanhle
git pull origin main
```

*(Nếu là server mới chưa clone repo: `cd /var/www && git clone https://github.com/Hungmai06/thanhle.git thanhle && cd thanhle`)*

---

## 🚀 BƯỚC 4: Khởi Chạy Hệ Thống Docker

Thực hiện lệnh sau trên VPS tại thư mục `/var/www/thanhle` để build và chạy 3 containers:

```bash
docker compose up -d --build
```

> ⚡ **Kết quả mong đợi:**
> - MariaDB/MySQL khởi chạy trong container `thanhle_mysql` và tự động khởi tạo Database `affiliateshoppe`.
> - Node.js Backend khởi chạy trong container `thanhle_backend`, tự động chạy Migrations/Seeds.
> - Frontend Nginx khởi chạy trong container `thanhle_frontend`, mở cổng `8388`.

---

## 🔍 BƯỚC 5: Kiểm Tra Trạng Thái Container

```bash
docker compose ps
```
Xem log nếu cần kiểm tra chi tiết:
```bash
docker compose logs -f backend
```

---

## 🔒 BƯỚC 6: Cấu Hình Nginx Host & SSL HTTPS Cho `kiemxu.vn`

Vì VPS đang chạy Web Server chính (Nginx) đón cổng 80 & 443 ngoài Internet, ta sẽ cấu hình Host Nginx chuyển tiếp (Reverse Proxy) vào Container Frontend (cổng 8388).

### 6.1 Cài đặt Nginx & Certbot trên VPS (nếu chưa có):
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 6.2 Tạo file cấu hình Nginx:
```bash
sudo nano /etc/nginx/sites-available/kiemxu.vn
```

Dán nội dung cấu hình sau vào (lưu ý cổng **`8388`**):

```nginx
server {
    listen 80;
    server_name kiemxu.vn www.kiemxu.vn;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 256;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8388;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Performance & WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffers 8 16k;
        proxy_buffer_size 32k;
        proxy_read_timeout 90s;
    }
}
```

### 6.3 Kích hoạt cấu hình Nginx:
```bash
# Xoá liên kết cũ nếu trước đó từng tạo subdomain cũ
sudo rm -f /etc/nginx/sites-enabled/thanhle.hutailoc.shop

# Kích hoạt tên miền mới kiemxu.vn
sudo ln -sf /etc/nginx/sites-available/kiemxu.vn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.4 Cài đặt SSL HTTPS miễn phí với Certbot:
```bash
sudo certbot --nginx -d kiemxu.vn -d www.kiemxu.vn
```
*(Certbot sẽ tự động cấp chứng chỉ HTTPS SSL cho cả `kiemxu.vn` và `www.kiemxu.vn` đồng thời tự gia hạn khi hết hạn).*

---

## 🔄 BƯỚC 7: Cập Nhật Code Mỗi Khi Có Thay Đổi

Khi bạn sửa code và push lên GitHub từ máy cá nhân (`git push origin redesign/affiliateshoppe:main`), bạn chỉ cần chạy 2 lệnh sau trên VPS:

```bash
cd /var/www/thanhle
git pull origin main
docker compose up -d --build
```
*Toàn bộ dữ liệu tài khoản, số dư, đơn hàng trong MySQL được bảo toàn tuyệt đối không bị mất.*

---

## 🔑 BƯỚC 8: Cấu Hình Đăng Nhập Bằng Google Cho Tên Miền kiemxu.vn

Để tính năng **"Đăng nhập bằng Google"** hoạt động trơn tru trên `https://kiemxu.vn`:

1. Truy cập [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Nhấp vào **OAuth 2.0 Client ID** mà dự án đang dùng (Web Client).
3. Tại mục **Authorized JavaScript origins**, thêm:
   - `https://kiemxu.vn`
   - `https://www.kiemxu.vn`
   - `http://localhost:5173` *(cho máy local test)*
4. Tại mục **Authorized redirect URIs**, thêm:
   - `https://kiemxu.vn`
   - `https://www.kiemxu.vn`
   - `http://localhost:5173`
5. Bấm **Save (Lưu)**.

---

## 🗄️ BƯỚC 9: Lệnh Sao Lưu & Khôi Phục Database (Nếu Cần)

- **Sao lưu Database**:
  ```bash
  docker exec thanhle_mysql mysqldump -u root -proot_secure_password_123 affiliateshoppe > /var/www/backup_$(date +%F).sql
  ```
- **Khôi phục Database**:
  ```bash
  docker exec -i thanhle_mysql mysql -u root -proot_secure_password_123 affiliateshoppe < /var/www/backup_xxx.sql
  ```
