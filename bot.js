require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const DEVELOPER_NUMBER = process.env.DEVELOPER_NUMBER;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Scan QR code untuk login');
});

client.on('ready', () => {
  console.log('SatPou Bot siap!');
});

client.on('message', async msg => {
  const cmd = msg.body.toLowerCase();
  const args = msg.body.split(' ');

  // ─── PING ───────────────────────────────────────────
  if (cmd === '!ping') {
    msg.reply('🏓 Pong!');

  // ─── SAPA ───────────────────────────────────────────
  } else if (cmd === '!halo' || cmd === '!hai') {
    msg.reply('👋 Halo! Ada yang bisa dibantu?\nKetik *!menu* untuk melihat daftar perintah.');

  // ─── JAM ────────────────────────────────────────────
  } else if (cmd === '!jam') {
    const waktu = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const tanggal = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    msg.reply(`🕐 *Waktu Sekarang*\n⏰ ${waktu}\n📅 ${tanggal}`);

  // ─── ECHO ────────────────────────────────────────────
  } else if (cmd.startsWith('!echo ')) {
    const text = msg.body.substring(6).trim();
    msg.reply(`🔁 ${text}`);

  // ─── RANDOM ──────────────────────────────────────────
  } else if (cmd.startsWith('!random ')) {
    const min = parseInt(args[1]) || 1;
    const max = parseInt(args[2]) || 100;
    if (min >= max) {
      msg.reply('⚠️ Angka minimum harus lebih kecil dari maksimum.');
    } else {
      const random = Math.floor(Math.random() * (max - min + 1)) + min;
      msg.reply(`🎰 Angka acak antara *${min}* dan *${max}*: *${random}*`);
    }

  // ─── KALKULATOR ──────────────────────────────────────
  } else if (cmd.startsWith('!calc ')) {
    try {
      const expr = msg.body.substring(6).trim();
      const cleaned = expr.replace(/[^0-9+\-*/().\s]/g, '');
      const result = eval(cleaned);
      msg.reply(`🧮 *Kalkulator*\n📝 ${expr}\n✅ Hasil: *${result}*`);
    } catch (e) {
      msg.reply('⚠️ Format salah. Contoh: *!calc 10 * 5 + 2*');
    }

  // ─── DADU ────────────────────────────────────────────
  } else if (cmd === '!dadu') {
    const hasil = Math.floor(Math.random() * 6) + 1;
    const emoji = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    msg.reply(`🎲 *Lempar Dadu*\nHasil: ${emoji[hasil]} (*${hasil}*)`);

  // ─── KOIN ────────────────────────────────────────────
  } else if (cmd === '!koin') {
    const hasil = Math.random() < 0.5 ? '👑 Kepala' : '🪙 Ekor';
    msg.reply(`🪙 *Lempar Koin*\nHasil: *${hasil}*`);

  // ─── INFO ────────────────────────────────────────────
  } else if (cmd === '!info') {
    const uptime = process.uptime();
    const jam = Math.floor(uptime / 3600);
    const menit = Math.floor((uptime % 3600) / 60);
    const detik = Math.floor(uptime % 60);
    msg.reply(
      `🤖 *Info Bot*\n` +
      `━━━━━━━━━━━━━━\n` +
      `📌 Nama: SatPou Bot\n` +
      `📌 Versi: 1.0.0\n` +
      `⏱️ Uptime: ${jam}j ${menit}m ${detik}d\n` +
      `━━━━━━━━━━━━━━`
    );

  // ─── STIKER ──────────────────────────────────────────
  } else if (cmd === '!stiker' || cmd === '!sticker') {
    let mediaMsg = null;

    if (msg.hasQuotedMsg) {
      const quoted = await msg.getQuotedMessage();
      if (quoted.hasMedia) {
        mediaMsg = quoted;
      }
    } else if (msg.hasMedia) {
      mediaMsg = msg;
    }

    if (!mediaMsg) {
      msg.reply(
        '📎 *Cara membuat stiker:*\n' +
        '━━━━━━━━━━━━━━\n' +
        '1️⃣ Kirim gambar dengan caption *!stiker*\n' +
        '   — atau —\n' +
        '2️⃣ Reply gambar/video dengan *!stiker*\n' +
        '━━━━━━━━━━━━━━\n' +
        '✅ Format didukung: JPG, PNG, GIF, WebP, MP4'
      );
      return;
    }

    try {
      await msg.reply('⏳ Sedang membuat stiker...');
      const media = await mediaMsg.downloadMedia();

      if (!media) {
        msg.reply('❌ Gagal mengunduh media. Coba lagi.');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!allowedTypes.includes(media.mimetype)) {
        msg.reply('⚠️ Format tidak didukung.\nGunakan: JPG, PNG, GIF, WebP, atau MP4.');
        return;
      }

      // ✅ Perbaikan: await msg.getChat() bukan msg.chat.then()
      const chat = await msg.getChat();
      await chat.sendMessage(media, {
        sendMediaAsSticker: true,
        stickerAuthor: 'SatPou Bot',
        stickerName: 'SatPou Sticker'
      });

    } catch (e) {
      console.error('Stiker error:', e);
      msg.reply('❌ Gagal membuat stiker. Pastikan gambar valid dan coba lagi.');
    }

  // ─── HUBUNGI DEVELOPER ───────────────────────────────
  } else if (cmd.startsWith('!dev ')) {
    if (!DEVELOPER_NUMBER) {
      msg.reply('⚠️ Error: Nomor developer belum diset di file .env');
      return;
    }
    const pesan = msg.body.substring(5).trim();
    if (!pesan) {
      msg.reply('⚠️ Tulis pesanmu setelah perintah.\nContoh: *!dev Halo, saya mau lapor bug*');
      return;
    }
    try {
      const pengirim = msg.from;
      const waktu = new Date().toLocaleString('id-ID');
      await client.sendMessage(
        DEVELOPER_NUMBER,
        `📩 *Pesan dari Pengguna*\n━━━━━━━━━━━━━━\n👤 Dari: ${pengirim}\n🕐 Waktu: ${waktu}\n💬 Pesan:\n${pesan}\n━━━━━━━━━━━━━━`
      );
      msg.reply('✅ Pesanmu sudah terkirim ke developer! Terima kasih.');
    } catch (e) {
      console.error('Error kirim ke developer:', e);
      msg.reply('❌ Gagal mengirim pesan. Coba lagi nanti.');
    }

  // ─── MENU / BANTUAN ──────────────────────────────────
  } else if (cmd === '!menu' || cmd === '!bantuan') {
    const menu = [
      '🤖 *SatPou Bot v1.0*',
      '━━━━━━━━━━━━━━',
      '',
      '🔧 *Umum*',
      '!ping — Test koneksi bot',
      '!halo / !hai — Sapa bot',
      '!jam — Cek waktu & tanggal',
      '!info — Info & uptime bot',
      '',
      '🎲 *Hiburan*',
      '!dadu — Lempar dadu',
      '!koin — Lempar koin',
      '!random <min> <max> — Angka acak',
      '',
      '🛠️ *Utilitas*',
      '!echo <teks> — Ulangi teks',
      '!calc <ekspresi> — Kalkulator',
      '',
      '🖼️ *Stiker*',
      '!stiker — Ubah gambar jadi stiker WA',
      '         (kirim gambar + caption, atau reply gambar)',
      '',
      '📩 *Kontak*',
      '!dev <pesan> — Kirim pesan ke developer',
      '',
      '❓ *Bantuan*',
      '!menu / !bantuan — Tampilkan menu ini',
      '',
      '━━━━━━━━━━━━━━',
      '💡 Contoh: !calc 10*5 | !random 1 10',
    ].join('\n');
    msg.reply(menu);

  }
});

client.initialize();