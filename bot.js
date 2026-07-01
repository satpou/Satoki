const { execSync } = require('child_process');
try {
  console.log('=== FINDING CHROMIUM ===');
  console.log(execSync('which chromium 2>/dev/null || echo "not found"').toString());
  console.log(execSync('which chromium-browser 2>/dev/null || echo "not found"').toString());
  console.log(execSync('find /usr -name "chrom*" -type f 2>/dev/null | head -5 || echo "not found in /usr"').toString());
} catch(e) {}

require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCodeLib = require('qrcode');

const DEVELOPER_NUMBER = process.env.DEVELOPER_NUMBER;

const BOT_NAME = 'Satoki';

const menfessSessions = new Map();
const messageHistory = new Map();
const rateLimits = new Map();

const MENFESS_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  RATE_LIMIT_MESSAGES: 5,
  RATE_LIMIT_WINDOW: 60000,
  SESSION_TIMEOUT: 3600000,
  MAX_HISTORY: 50
};

const todoList = [];

function generateSessionId() {
  return `mfs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimits.get(userId) || { count: 0, timestamp: now };
  
  if (now - userLimit.timestamp > MENFESS_CONFIG.RATE_LIMIT_WINDOW) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return true;
  }
  
  if (userLimit.count >= MENFESS_CONFIG.RATE_LIMIT_MESSAGES) {
    return false;
  }
  
  userLimit.count++;
  rateLimits.set(userId, userLimit);
  return true;
}

function formatPhoneNumber(number) {
  let cleaned = number.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned + '@c.us';
}

function addMessageToHistory(sessionId, sender, message) {
  if (!messageHistory.has(sessionId)) {
    messageHistory.set(sessionId, []);
  }
  const history = messageHistory.get(sessionId);
  history.push({ sender, message, timestamp: Date.now() });
  if (history.length > MENFESS_CONFIG.MAX_HISTORY) {
    history.shift();
  }
}

function findMenfessSession(userId) {
  for (const [sessionId, session] of menfessSessions.entries()) {
    if (session.active) {
      if (session.sender === userId || session.receiver === userId) {
        return sessionId;
      }
    }
  }
  return null;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of menfessSessions.entries()) {
    if (now - session.createdAt > MENFESS_CONFIG.SESSION_TIMEOUT) {
      menfessSessions.delete(sessionId);
      messageHistory.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredSessions, 300000);

const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: chromiumPath,
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

/* QR Code Display */
client.on('qr', async qr => {
  qrcode.generate(qr, { small: true });
  try {
    const qrUrl = await QRCodeLib.toDataURL(qr);
    console.log('\n=== QR CODE URL (paste ke browser) ===');
    console.log(qrUrl);
    console.log('=======================================\n');
  } catch(e) {
    console.log('QR URL error:', e.message);
  }
});

client.on('ready', () => {
  console.log(`${BOT_NAME} Bot siap!`);
});

/* Message Handler */
client.on('message', async msg => {
  try {
    if (!msg.body) return;
    const cmd = msg.body.toLowerCase();
    const args = msg.body.split(' ');

    /* === COMMON COMMANDS === */
    if (cmd === '!ping') {
      msg.reply('🏓 Pong!');

    } else if (cmd === '!halo' || cmd === '!hai' || cmd === '!hi') {
      msg.reply('👋 Halo! Ada yang bisa dibantu?\nKetik *!menu* untuk melihat daftar perintah.');

    } else if (cmd === '!jam') {
      const options = { timeZone: 'Asia/Jakarta' };
      
      const waktu = new Date().toLocaleTimeString('id-ID', {
        ...options,
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const tanggal = new Date().toLocaleDateString('id-ID', {
        ...options,
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      msg.reply(`🕐 *Waktu Sekarang (WIB)*\n⏰ ${waktu}\n📅 ${tanggal}`);

    /* === UTILITIES === */
    else if (cmd.startsWith('!echo ')) {
      const text = msg.body.substring(6).trim();
      msg.reply(`🔁 ${text}`);

    } else if (cmd.startsWith('!random ')) {
      const min = parseInt(args[1]) || 1;
      const max = parseInt(args[2]) || 100;
      if (min >= max) {
        msg.reply('⚠️ Angka minimum harus lebih kecil dari maksimum.');
      } else {
        const random = Math.floor(Math.random() * (max - min + 1)) + min;
        msg.reply(`🎰 Angka acak antara *${min}* dan *${max}*: *${random}*`);
      }

    /* === CALCULATOR === */
    } else if (cmd.startsWith('!calc ')) {
      try {
        const expr = msg.body.substring(6).trim();
        const cleaned = expr.replace(/[^0-9+\-*/().\s]/g, '');
        const result = eval(cleaned);
        msg.reply(`🧮 *Kalkulator*\n📝 ${expr}\n✅ Hasil: *${result}*`);
      } catch (e) {
        msg.reply('⚠️ Format salah. Contoh: *!calc 10 * 5 + 2*');
      }

    /* === QR CODE === */
    } else if (cmd.startsWith('!qr ')) {
      const text = msg.body.substring(4).trim();
      if (!text) {
        msg.reply('⚠️ Format: *!qr <teks>*\nContoh: *!qr https://github.com*');
        return;
      }
      try {
        const qrDataUrl = await QRCodeLib.toDataURL(text, { width: 300, margin: 2 });
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const media = new MessageMedia('image/png', base64Data, 'qrcode.png');
        const chat = await msg.getChat();
        await chat.sendMessage(media, { caption: `📱 *QR Code*\n\`\`\`${text}\`\`\`` });
      } catch (e) {
        console.error('QR error:', e);
        msg.reply('❌ Gagal membuat QR Code.');
      }

    /* === SHORT URL === */
    } else if (cmd.startsWith('!short ')) {
      const url = msg.body.substring(7).trim();
      if (!url) {
        msg.reply('⚠️ Format: *!short <url>*\nContoh: *!short https://example.com/very/long/url*');
        return;
      }
      try {
        const regex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
        if (!regex.test(url)) {
          msg.reply('⚠️ URL tidak valid. Contoh: *!short https://example.com*');
          return;
        }
        const fullUrl = url.startsWith('http') ? url : 'https://' + url;
        const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(fullUrl)}`);
        const shortUrl = await response.text();
        if (shortUrl.startsWith('Error')) {
          msg.reply('❌ Gagal memperpendek URL.');
        } else {
          msg.reply(`🔗 *URL Dipendekkan*\n━━━━━━━━━━━━━━\n📎 Asli: ${fullUrl}\n✨ Pendek: ${shortUrl}\n━━━━━━━━━━━━━━`);
        }
      } catch (e) {
        console.error('Short URL error:', e);
        msg.reply('❌ Gagal memperpendek URL.');
      }

    /* === TRANSLATE === */
    } else if (cmd.startsWith('!translate ')) {
      const parts = msg.body.substring(11).split(' ');
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        msg.reply(
          '⚠️ *Format Translate*\n━━━━━━━━━━━━━━\n' +
          '!translate <kode_bahasa> <teks>\n\n' +
          'Contoh:\n' +
          '!translate en Halo dunia\n' +
          '!translate id Good morning\n' +
          '━━━━━━━━━━━━━━\n' +
          'Kode bahasa: en, id, es, fr, de, ja, ko, zh, ar, dll'
        );
        return;
      }
      const targetLang = parts[0];
      const textToTranslate = parts.slice(1).join(' ');
      
      msg.reply('⏳ Sedang menerjemahkan...');
      
      try {
        const url = `https://translate.googleapis.com/translate/a/single?client=gtx&sl=auto&tl=${targetLang}&q=${encodeURIComponent(textToTranslate)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          const translated = data[0][0][0];
          const detectedLang = data[2] || '?';
          msg.reply(
            `🌐 *Terjemahan*\n━━━━━━━━━━━━━━\n` +
            `📝 Asli: ${textToTranslate}\n` +
            `🌍 Hasil (${targetLang}): ${translated}\n` +
            `🔍 Bahasa terdeteksi: ${detectedLang}\n` +
            `━━━━━━━━━━━━━━`
          );
        } else {
          msg.reply('❌ Terjemahan gagal. Coba lagi atau format salah.');
        }
      } catch (e) {
        console.error('Translate error:', e);
        msg.reply('❌ Gagal menerjemahkan. Coba lagi.');
      }

    /* === DADU === */
    } else if (cmd === '!dadu') {
      const hasil = Math.floor(Math.random() * 6) + 1;
      const emoji = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
      msg.reply(`🎲 *Lempar Dadu*\nHasil: ${emoji[hasil]} (*${hasil}*)`);

    /* === KOI === */
    } else if (cmd === '!koin') {
      const hasil = Math.random() < 0.5 ? '👑 Kepala' : '🪙 Ekor';
      msg.reply(`🪙 *Lempar Koin*\nHasil: *${hasil}*`);

    /* === INFO === */
    } else if (cmd === '!info') {
      const uptime = process.uptime();
      const jam = Math.floor(uptime / 3600);
      const menit = Math.floor((uptime % 3600) / 60);
      const detik = Math.floor(uptime % 60);
      msg.reply(
        `🤖 *Info Bot*\n` +
        `━━━━━━━━━━━━━━\n` +
        `📌 Nama: ${BOT_NAME} Bot\n` +
        `📌 Versi: 1.5.0\n` +
        `⏱️ Uptime: ${jam}j ${menit}m ${detik}d\n` +
        `━━━━━━━━━━━━━━`
      );

    /* === MENU CREATION === */
    } else if (cmd.startsWith('!menu')) {
      const menu = [
        '🤖 *Satoki Bot v1.5*',
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
        '!qr <teks> — Buat QR Code',
        '!short <url> — Pendekkan URL',
        '!translate <bahasa> <teks> — Terjemahkan',
        '',
        '📝 *To-Do*',
        '!todo add <tugas> — Tambah tugas',
        '!todo list — Lihat daftar tugas',
        '!todo done <id> — Tandai tugas selesai',
        '',
        '🖼️ *Stiker*',
        '!stiker — Ubah gambar jadi stiker WA',
        '         (kirim gambar + caption, atau reply gambar)',
        '',
        '💌 *Menfess (Anonymous Chat)*',
        '!menfess <nomor> <pesan> — Kirim pesan anonim',
        '!balas <pesan> — Balas menfess',
        '!stopmenfess — Tutup sesi menfess',
        '',
        '📩 *Kontak*',
        '!dev <tes> — Kirim pesan ke developer',
        '',
        '❓ *Bantuan*',
        '!menu / !bantuan — Tampilkan menu ini',
        '',
        '━━━━━━━━━━━━━━',
        '💡 Contoh: !calc 10*5 | !qr https://github.com | !translate en Halo dunia',
      ].join('\n');
      msg.reply(menu);

    /* === BASIC HANDLER == */
    } else {
      // Handle unknown commands
      // Leave empty to ignore non-command messages
    }

  } catch (error) {
    console.error('Bot message handler error:', error);
    if (msg && msg.reply) {
      msg.reply('❌ Terjadi kesalahan internal. Silakan coba lagi nanti.');
    }
  }
});

client.initialize();