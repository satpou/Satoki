# Satoki Bot

🤖 Bot messaging WhatsApp dengan berbagai fitur utilitas dan permainan.

## 🚀 Fitur

### 🔥 Umum
- `!ping` — Uji koneksi bot
- `!halo / !hai` — Sapa bot
- `!jam` — Cek waktu & tanggal WIB
- `!info` — Info & uptime bot
- `!menu / !bantuan` — Tampilkan semua perintah
- `!dev <pesan>` — Kirim pesan ke developer

### 🎲 Hiburan
- `!dadu` — Lempar dadu (1-6)
- `!koin` — Lempar koin (Kepala/Ekor)
- `!random <min> <max>` — Angka acak

### 🛠️ Utilitas
- `!echo <teks>` — Ulangi teks
- `!calc <ekspresi>` — Kalkulator
- `!qr <teks>` — Buat QR Code
- `!short <url>` — Pendekkan URL
- `!translate <bahasa> <teks>` — Terjemahkan teks

### 📝 To-Do
- `!todo add <tugas>` — Tambah tugas ke daftar
- `!todo list` — Lihat daftar tugas aktif & selesai
- `!todo done <id>` — Tandai tugas selesai (CEK ONE LAGI)

### 💌 Menfess (Anonymous Chat)
- `!menfess <nomor> <pesan>` — Kirim pesan anonim ke nomor
- `!balas <pesan>` — Balas menfess dalam sesi aktif
- `!stopmenfess` — Tutup sesi menfess

### 🖼️ Stiker
- `!stiker` / `!sticker` — Ubah gambar/video jadi stiker WA
   (kirim gambar + caption, atau reply gambar)

## 🌐 Cara Menginstal & Menjalankan

1. Clone repository:
   ```bash
   git clone https://github.com/satpou/satpou-bot.git
   cd whatsapp-chatbot
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Set up .env file (contoh):
   ```bash
   DEVELOPER_NUMBER=6281234567890
   PUPPETEER_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
   ```

4. Jalankan bot:
   ```bash
   npm start
   ```

   Atau gunakan PM2 untuk production:
   ```bash
   pm2 start bot.js --name satoki-bot
   pm2 startup
   pm2 save
   ```

## 📄 Catatan

- Untuk rate limiting menfess: maksimal 5 pesan per menit per user
- Batasan panjang pesan: 500 karakter
- Sesi timeout: 1 jam (menfess)
- Bot menggunakan WhatsApp Web.js dengan LocalAuth

## 🔗 Tautan

- Repository: [satpou-bot](https://github.com/satpou/satpou-bot)

## 📋 Lisensi

MIT
