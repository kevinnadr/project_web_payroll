# Panduan Deployment - Web Payroll (VPS Kosongan)

Dokumen ini berisi langkah-langkah untuk melakukan *deploy* aplikasi Web Payroll ke **VPS (Virtual Private Server) kosongan** yang belum terinstal apa pun (biasanya hanya OS Ubuntu/Debian bersih).

---

## Prasyarat VPS
- OS: **Ubuntu 22.04 LTS** (direkomendasikan)
- Akses SSH sebagai `root` atau user dengan `sudo`
- VPS minimal **1 GB RAM**, **1 vCPU**, **10 GB Disk**

---

## Tahap 1 — Koneksi ke VPS & Update Sistem

```bash
# Login ke VPS via SSH
ssh root@IP_VPS_ANDA

# Update & upgrade paket sistem
apt update && apt upgrade -y
```

---

## Tahap 2 — Install PHP & Composer (untuk Backend API)

### 2.1 Install PHP 8.2 + Ekstensi yang Dibutuhkan

```bash
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd
```

Verifikasi:
```bash
php -v
```

### 2.2 Install Composer

```bash
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer
```

Verifikasi:
```bash
composer --version
```

---

## Tahap 3 — Install Node.js & npm (untuk Frontend)

### 3.1 Install Node.js 20 LTS via NodeSource

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verifikasi:
```bash
node -v
npm -v
```

---

## Tahap 4 — Install MySQL Server

```bash
apt install -y mysql-server

# Amankan instalasi MySQL
mysql_secure_installation
```

Buat database & user untuk aplikasi:
```sql
-- Masuk ke MySQL
mysql -u root -p

-- Buat database
CREATE DATABASE payroll CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Buat user khusus (ganti 'password_aman' dengan password Anda)
CREATE USER 'payroll_user'@'localhost' IDENTIFIED BY 'password_aman';
GRANT ALL PRIVILEGES ON payroll.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Import file SQL database:
```bash
mysql -u payroll_user -p payroll < /path/ke/file_database.sql
```

---

## Tahap 5 — Install Web Server (Nginx)

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

## Tahap 6 — Deploy Backend API (PHP)

### 6.1 Clone / Upload Kode ke VPS

```bash
# Jika menggunakan Git
cd /var/www
git clone https://github.com/USERNAME/REPO_ANDA.git payroll

# Atau upload manual via SCP
# scp -r ./project_web_payroll root@IP_VPS:/var/www/payroll
```

### 6.2 Install Dependencies Composer

```bash
cd /var/www/payroll/backend-api
composer install --no-dev --optimize-autoloader
```

### 6.3 Konfigurasi Database Backend

Buka file `backend-api/config/database.php` dan ubah sesuai kredensial VPS:

```php
$host     = 'localhost';
$db_name  = 'payroll';
$username = 'payroll_user';
$password = 'password_aman';
```

### 6.4 Konfigurasi CORS

Buka `backend-api/config/cors.php`. Jika menggunakan IP, Anda bisa mengizinkan IP tersebut atau tetap menggunakan `*` sementara:
```php
header("Access-Control-Allow-Origin: *"); 
```

### 6.5 Konfigurasi Nginx (Opsi IP Tanpa Domain)

Jika Anda **tidak punya domain** dan ingin menggunakan IP VPS, gunakan konfigurasi Port (Frontend: 80, Backend: 8080).

Edit file: `nano /etc/nginx/sites-available/payroll`

```nginx
# FRONTEND (PORT 80)
server {
    listen 80;
    server_name _; # Mengandalkan IP VPS

    root /var/www/payroll/frontend-client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# BACKEND (PORT 8080)
server {
    listen 8080;
    server_name _; # Mengandalkan IP VPS

    root /var/www/payroll/backend-api;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
    }
}
```

Aktifkan & restart:
```bash
ln -s /etc/nginx/sites-available/payroll /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Tahap 7 — Deploy Frontend (React + Vite)

### 7.1 Ubah Base URL API

Sebelum build, ubah URL API di kode Frontend agar mengarah ke backend publik VPS.
Gunakan fitur **Search All** di VSCode, cari:
```
http://localhost/project_web_payroll/backend-api/
```
Ganti dengan:
```
http://api.perusahaan.com/  (atau IP VPS Anda)
```

### 7.2 Install Dependencies & Build di VPS

```bash
cd /var/www/payroll/frontend-client

# Install semua dependency npm
npm install

# Build untuk production
npm run build
```

Hasil build akan ada di folder `frontend-client/dist/`.

### 7.3 Konfigurasi Nginx untuk Frontend

```bash
nano /etc/nginx/sites-available/frontend-payroll
```

Isi dengan:
```nginx
server {
    listen 80;
    server_name payroll.perusahaan.com;  # Ganti dengan domain/IP Anda

    root /var/www/payroll/frontend-client/dist;
    index index.html;

    # Penting: agar routing React tidak 404 saat refresh
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Aktifkan & restart:
```bash
ln -s /etc/nginx/sites-available/frontend-payroll /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Tahap 8 — Set Permission Folder (Penting!)

```bash
chown -R www-data:www-data /var/www/payroll
chmod -R 755 /var/www/payroll
```

---

## Tahap 9 — (Opsional) HTTPS dengan Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx

# Ganti dengan domain Anda
certbot --nginx -d api.perusahaan.com -d payroll.perusahaan.com
```

Sertifikat akan otomatis diperbarui oleh Certbot.

---

## Ringkasan Perintah Penting

| Aksi | Perintah |
|------|----------|
| Update kode dari Git | `git pull origin main` |
| Install ulang Composer | `composer install` |
| Install ulang npm | `npm install` |
| Build ulang Frontend | `npm run build` |
| Reload Nginx | `systemctl reload nginx` |
| Cek log Nginx | `tail -f /var/log/nginx/error.log` |
| Cek status PHP-FPM | `systemctl status php8.2-fpm` |

---

Selesai! Aplikasi Web Payroll Anda sudah berjalan secara Live di VPS.
