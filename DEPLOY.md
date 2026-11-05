# 🚀 Hướng Dẫn Triển Khai Toàn Diện Lên Server Mới (kiemxu.vn)

Tài liệu này hướng dẫn chi tiết từng bước từ A đến Z để triển khai mã nguồn **Kiếm Xu (Shopee & TikTok Affiliate Cashback System)** lên một máy chủ Linux VPS hoàn toàn mới (Ubuntu 20.04 / 22.04 / 24.04 hoặc Debian) sử dụng **Docker & Docker Compose**.

---

## 📌 BẢNG THÔNG TIN HỆ THỐNG

| Thông tin | Giá trị triển khai |
| :--- | :--- |
| **Tên miền chính** | `https://kiemxu.vn` và `https://www.kiemxu.vn` |
| **Cổng SSH** | Port `22` (Mặc định) |
| **Thư mục dự án** | `/var/www/thanhle` |
| **Database Container** | `thanhle_mysql` (MariaDB 10.11 / MySQL 8.0, Port nội bộ `3306`) |
| **Backend Container** | `thanhle_backend` (Node.js API, Port nội bộ `5000`) |
| **Frontend Container** | `thanhle_frontend` (Nginx React SPA, Port ngoài Host `8388`) |
| **Reverse Proxy Host** | Nginx cài trực tiếp trên VPS nhận cổng `80` / `443` chuyển tiếp vào `8388` |
| **Webhook TikTok (RioHub)** | `https://kiemxu.vn/api/tiktok/webhook` |

---

## 🌐 BƯỚC 1: Cấu Hình DNS Tên Miền (Trỏ Về IP Server Mới)

Trước khi cấu hình trên VPS, truy cập bảng quản lý DNS tên miền **`kiemxu.vn`** (Cloudflare, iNET, PA Vietnam, Mắt Bão, Tenten...):

1. **Bản ghi A cho tên miền chính (Root domain)**:
   * **Type**: `A`
   * **Name**: `@` *(hoặc để trống tùy nhà cung cấp)*
   * **IPv4 Address**: `[Địa chỉ IP VPS mới]` *(ví dụ: `161.248.4.83`)*
   * **TTL**: `Auto` hoặc `300s`

2. **Bản ghi A cho www**:
   * **Type**: `A` *(hoặc CNAME)*
   * **Name**: `www`
   * **IPv4 Address**: `[Địa chỉ IP VPS mới]` *(hoặc CNAME trỏ về `kiemxu.vn`)*
   * **TTL**: `Auto` hoặc `300s`

> ⚠️ **Lưu ý quan trọng nếu dùng Cloudflare:**
> Tạm thời chuyển đám mây sang **DNS Only** (màu xám, tắt Proxy màu cam) để bước cấp chứng chỉ SSL Let's Encrypt bằng Certbot không bị lỗi xác thực. Sau khi cấp SSL thành công có thể bật lại nếu muốn.

---

## 💻 BƯỚC 2: Chuẩn Bị & Cài Đặt Môi Trường Trên Server Mới

Đăng nhập vào VPS qua SSH bằng quyền `root` (cổng mặc định 22):
```bash
ssh root@<IP_SERVER_CUA_BAN>
```

### 2.1 Cập nhật hệ điều hành:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nano htop
```

### 2.2 Tạo bộ nhớ ảo Swap 2GB (BẮT BUỘC cho VPS 1GB - 2GB RAM):
> Quá trình build Frontend React Vite tốn RAM, nếu VPS không có Swap sẽ bị lỗi `Killed` hoặc `exit code 1 / Out of Memory`.
```bash
# Kiểm tra nếu chưa có swap thì tạo mới 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Kiểm tra lại
free -h
```

### 2.3 Cài đặt Docker & Docker Compose Plugin:
Chạy lệnh cài đặt Docker chính hãng mới nhất:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin

# Bật Docker tự khởi động cùng VPS
sudo systemctl enable docker
sudo systemctl start docker

# Kiểm tra phiên bản
docker --version
docker compose version
```

### 2.4 Mở tường lửa (Firewall UFW):
> ⚠️ **Lưu ý:** Bắt buộc phải mở cổng SSH (port 22) trước khi kích hoạt UFW để không bị khóa quyền truy cập VPS:
```bash
# Mở cổng SSH mặc định (port 22)
sudo ufw allow 22/tcp

# Mở cổng Web HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Kích hoạt tường lửa
sudo ufw --force enable
sudo ufw status
```

---

## 📥 BƯỚC 3: Tải Mã Nguồn & Thiết Lập Cấu Hình

### 3.1 Clone mã nguồn về thư mục `/var/www/thanhle`:
```bash
sudo mkdir -p /var/www
cd /var/www
git clone https://github.com/Hungmai06/thanhle.git thanhle
cd /var/www/thanhle
```

> 💡 *Nếu bạn đang làm việc trên branch khác `main` (ví dụ `redesign/affiliateshoppe`), hãy checkout branch đó:*
> ```bash
> git checkout redesign/affiliateshoppe
> ```

### 3.2 Tạo thư mục lưu trữ uploads:
```bash
mkdir -p /var/www/thanhle/Backend/uploads
chmod -R 777 /var/www/thanhle/Backend/uploads
```

### 3.3 (Tùy chọn) Cấu hình API Key trong file `.env`:
Tạo hoặc kiểm tra file `.env` ở thư mục gốc `/var/www/thanhle/.env` nếu cần truyền API Key cho TikTok/Shopee:
```bash
cat << 'EOF' > /var/www/thanhle/.env
# API Key tra cứu Shopee (AddLiveTag)
ADDLIVETAG_API_KEY=

# API Key TikTok Shop (RioHub)
RIOHUB_API_KEY=
RIOHUB_CREATOR_USERNAME=hungrevieweverything
RIOHUB_WEBHOOK_SECRET=

# Google OAuth Client ID
GOOGLE_CLIENT_ID=335312329426-br7u9qiohc9c8a5aqu7e3k4jlrrbptr6.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=335312329426-br7u9qiohc9c8a5aqu7e3k4jlrrbptr6.apps.googleusercontent.com
EOF
```

---

## 🚀 BƯỚC 4: Khởi Chạy Hệ Thống Docker

Tại thư mục `/var/www/thanhle`, chạy lệnh build và khởi động tất cả container:

```bash
cd /var/www/thanhle
docker compose up -d --build
```

### Kiểm tra trạng thái các container:
```bash
docker compose ps
```
Cả 3 container phải có trạng thái **Up / Running**:
* `thanhle_mysql` (MariaDB)
* `thanhle_backend` (Node.js API)
* `thanhle_frontend` (React Nginx - Cổng `8388`)

### Xem log kiểm tra Backend kết nối Database thành công:
```bash
docker compose logs -f backend
```
*(Bấm `Ctrl + C` để thoát màn hình xem log)*

---

## 🔒 BƯỚC 5: Cấu Hình Nginx Host & Chứng Chỉ SSL HTTPS

Chúng ta cài đặt Nginx trực tiếp trên máy chủ VPS để đón các truy cập từ bên ngoài Internet qua cổng `80` (HTTP) & `443` (HTTPS) và chuyển tiếp vào container Frontend (cổng `8388`).

### 5.1 Cài đặt Nginx & Certbot:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 Tạo file cấu hình Virtual Host cho `kiemxu.vn`:
```bash
sudo nano /etc/nginx/sites-available/kiemxu.vn
```

Dán toàn bộ nội dung cấu hình sau vào:

```nginx
server {
    listen 80;
    server_name kiemxu.vn www.kiemxu.vn;

    # Tối ưu nén Gzip tăng tốc độ tải trang
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

        # WebSocket & Performance
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffers 8 16k;
        proxy_buffer_size 32k;
        proxy_read_timeout 90s;
    }
}
```

### 5.3 Kích hoạt Virtual Host & Tải lại Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/kiemxu.vn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.4 Cấp chứng chỉ SSL HTTPS miễn phí (Certbot):
```bash
sudo certbot --nginx -d kiemxu.vn -d www.kiemxu.vn
```
* Nhập Email của bạn khi được hỏi để nhận thông báo gia hạn SSL.
* Nhập `Y` đồng ý điều khoản.
* Certbot sẽ tự động cấu hình HTTPS SSL và thiết lập tự động gia hạn khi chứng chỉ sắp hết hạn.

---

## 🔑 BƯỚC 6: Cấu Hình Google OAuth (Tránh lỗi 400 redirect_uri_mismatch)

Để tính năng **"Đăng nhập bằng Google"** hoạt động trơn tru trên tên miền mới `https://kiemxu.vn`:

1. Truy cập [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Chọn đúng Project và nhấp vào **OAuth 2.0 Client ID** đang dùng (Web Client).
3. Tại mục **Authorized JavaScript origins (Nguồn gốc JavaScript được phép)**, nhấn **Add URI** và thêm:
   * `https://kiemxu.vn`
   * `https://www.kiemxu.vn`
   * `http://localhost:5173` *(cho máy local test)*
4. Tại mục **Authorized redirect URIs (URI chuyển hướng được phép)**, nhấn **Add URI** và thêm:
   * `https://kiemxu.vn`
   * `https://www.kiemxu.vn`
   * `http://localhost:5173` *(cho máy local test)*
5. Bấm nút **Save (Lưu)** ở cuối trang. *(Google sẽ mất khoảng 1 - 5 phút để cập nhật cấu hình toàn cầu).*

---

## 📱 BƯỚC 7: Cấu Hình Webhook RioHub (TikTok Shop)

Nếu bạn có sử dụng đồng bộ đơn hàng tự động từ **RioHub (riohub.vn)**:
1. Đăng nhập vào trang quản trị RioHub của bạn.
2. Đi tới phần **Webhook Settings**.
3. Điền **Webhook URL**:
   ```
   https://kiemxu.vn/api/tiktok/webhook
   ```
4. Chọn các sự kiện: `order.created`, `order.settled`, `order.refunded`.
5. Bấm **Lưu cài đặt**.

---

## 🔄 BƯỚC 8: Quy Trình Cập Nhật Code Mỗi Khi Có Bản Mới

Mỗi khi bạn sửa code ở máy tính cá nhân và push lên GitHub, để cập nhật lên server, chỉ cần SSH vào VPS và chạy cụm lệnh sau:

```bash
cd /var/www/thanhle
git pull
docker compose up -d --build
```
> 🛡️ **Bảo toàn dữ liệu:**
> Toàn bộ dữ liệu thành viên, mật khẩu, số dư ví, lịch sử đơn hàng và lượt click được lưu trữ an toàn trong Docker Volume `thanhle_mysql_data`, hoàn toàn **không bị ảnh hưởng hay mất dữ liệu** khi rebuild code!

---

## 🗄️ BƯỚC 9: Hướng Dẫn Di Chuyển / Khôi Phục Dữ Liệu Database Cũ

Nếu bạn có file backup cơ sở dữ liệu từ server cũ và muốn chuyển sang server mới này:

### 1. Xuất Database từ server cũ (nếu cần):
```bash
docker exec thanhle_mysql mysqldump -u root -proot_secure_password_123 affiliateshoppe > /root/backup_affiliateshoppe.sql
```

### 2. Copy file sang server mới:
```bash
scp /root/backup_affiliateshoppe.sql root@<IP_SERVER_MOI>:/var/www/thanhle/
```

### 3. Nhập dữ liệu vào Database trên server mới:
```bash
docker exec -i thanhle_mysql mysql -u root -proot_secure_password_123 affiliateshoppe < /var/www/thanhle/backup_affiliateshoppe.sql
```

### 4. Đồng bộ lại số dư người dùng theo dữ liệu vừa khôi phục:
Đăng nhập vào tài khoản Admin trên web (`https://kiemxu.vn`), vào mục **Quản lý thành viên** bấm nút **"Đồng bộ tất cả số dư"** để hệ thống tính toán lại chính xác 100%.

---

## 🛠️ BƯỚC 10: Lệnh Tiện Ích & Xử Lý Sự Cố Thường Gặp

* **Xem log thời gian thực của Backend:**
  ```bash
  docker logs -f thanhle_backend --tail 100
  ```
* **Khởi động lại toàn bộ hệ thống:**
  ```bash
  cd /var/www/thanhle && docker compose restart
  ```
* **Dừng toàn bộ hệ thống:**
  ```bash
  cd /var/www/thanhle && docker compose down
  ```
* **Kiểm tra dung lượng ổ đĩa và RAM:**
  ```bash
  df -h
  free -h
  ```
* **Nếu Nginx báo lỗi 502 Bad Gateway:**
  Kiểm tra xem container frontend có đang chạy cổng 8388 không:
  ```bash
  docker compose ps
  curl -I http://127.0.0.1:8388
  ```
