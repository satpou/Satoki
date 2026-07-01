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
const todoList = [];

const MENFESS_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  RATE_LIMIT_MESSAGES: 5,
  RATE_LIMIT_WINDOW: 60000,
  SESSION_TIMEOUT: 3600000,
  MAX_HISTORY: 50
};

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

function normalizeId(id) {
  return id.replace(/\D/g, '');
}

function findMenfessSession(userId) {
  const normalizedUserId = normalizeId(userId);
  for (const [sessionId, session] of menfessSessions.entries()) {
    const senderDigits = normalizeId(session.sender);
    const receiverDigits = normalizeId(session.receiver);
    if (session.active && (senderDigits === normalizedUserId || receiverDigits === normalizedUserId)) {
      return sessionId;
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

client.on('message', async msg => {
  try {
    if (!msg.body) return;
    const cmd = msg.body.toLowerCase();
    const args = msg.body.split(' ');

    /* PING */
    if (cmd === '!ping') {
      msg.reply('🏓 Pong!');

    /* SAPA */
    } else if (cmd === '!halo' || cmd === '!hai' || cmd === '!hi') {
      msg.reply('👋 Halo! Ada yang bisa dibantu?\nKetik *!menu* untuk melihat daftar perintah.');

    /* JAM */
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

    /* ECHO */
    } else if (cmd.startsWith('!echo ')) {
      const text = msg.body.substring(6).trim();
      msg.reply(`🔁 ${text}`);

    /* RANDOM */
    } else if (cmd.startsWith('!random ')) {
      const min = parseInt(args[1]) || 1;
      const max = parseInt(args[2]) || 100;
      if (min >= max) {
        msg.reply('⚠️ Angka minimum harus lebih kecil dari maksimum.');
      } else {
        const random = Math.floor(Math.random() * (max - min + 1)) + min;
        msg.reply(`🎰 Angka acak antara *${min}* dan *${max}*: *${random}*`);
      }

    /* KALKULATOR */
    } else if (cmd.startsWith('!calc ')) {
      try {
        const expr = msg.body.substring(6).trim();
        const cleaned = expr.replace(/[^0-9+\-*/().\s]/g, '');
        const result = eval(cleaned);
        msg.reply(`🧮 *Kalkulator*\n📝 ${expr}\n✅ Hasil: *${result}*`);
      } catch (e) {
        msg.reply('⚠️ Format salah. Contoh: *!calc 10 * 5 + 2*');
      }

    /* QR CODE */
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

    /* SHORT URL */
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

    /* TRANSLATE */
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
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          const translated = data[0][0][0];
          const detectedLang = data[2] || '?';
          msg.reply(`🌐 *Terjemahan*\n━━━━━━━━━━━━━━\n📝 Asli: ${textToTranslate}\n🌍 Hasil (${targetLang}): ${translated}\n🔍 Bahasa terdeteksi: ${detectedLang}\n━━━━━━━━━━━━━━`);
        } else {
          msg.reply('❌ Terjemahan gagal. Coba lagi atau format salah.');
        }
      } catch (e) {
        console.error('Translate error:', e);
        msg.reply('❌ Gagal menerjemahkan. Coba lagi.');
      }

    /* DADU */
    } else if (cmd === '!dadu') {
      const hasil = Math.floor(Math.random() * 6) + 1;
      const emoji = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
      msg.reply(`🎲 *Lempar Dadu*\nHasil: ${emoji[hasil]} (*${hasil}*)`);

    /* KOIN */
    } else if (cmd === '!koin') {
      const hasil = Math.random() < 0.5 ? '👑 Kepala' : '🪙 Ekor';
      msg.reply(`🪙 *Lempar Koin*\nHasil: *${hasil}*`);

    /* INFO */
    } else if (cmd === '!info') {
      const uptime = process.uptime();
      const jam = Math.floor(uptime / 3600);
      const menit = Math.floor((uptime % 3600) / 60);
      const detik = Math.floor(uptime % 60);
      msg.reply(`🤖 *Info Bot*\n━━━━━━━━━━━━━━\n📌 Nama: ${BOT_NAME} Bot\n📌 Versi: 1.5.0\n⏱️ Uptime: ${jam}j ${menit}m ${detik}d\n━━━━━━━━━━━━━━`);

    /* TODO ADD */
    } else if (cmd.startsWith('!todo add ')) {
      const task = msg.body.substring(10).trim();
      if (!task) {
        msg.reply('⚠️ Format: *!todo add <tugas>*\nContoh: *!todo add Kerjakan laporan*');
        return;
      }
      const id = todoList.length + 1;
      todoList.push({ id, task, done: false, createdAt: Date.now() });
      msg.reply(`✅ *Tugas Ditambahkan*\n━━━━━━━━━━━━━━\n📝 ${id}. ${task}\n━━━━━━━━━━━━━━`);

    /* TODO LIST */
    } else if (cmd === '!todo list') {
      if (todoList.length === 0) {
        msg.reply('📋 *Daftar Tugas*\n━━━━━━━━━━━━━━\nBelum ada tugas.\n━━━━━━━━━━━━━━');
      } else {
        const active = todoList.filter(t => !t.done);
        const completed = todoList.filter(t => t.done);
        let response = '📋 *Daftar Tugas*\n━━━━━━━━━━━━━━\n';
        if (active.length > 0) {
          response += '📌 Aktif:\n';
          active.forEach(t => { response += `${t.id}. ${t.task}\n`; });
        }
        if (completed.length > 0) {
          response += '\n✅ Selesai:\n';
          completed.forEach(t => { response += `${t.id}. ~~${t.task}~~\n`; });
        }
        response += '━━━━━━━━━━━━━━';
        msg.reply(response);
      }

    /* TODO DONE */
    } else if (cmd.startsWith('!todo done ')) {
      const id = parseInt(msg.body.substring(11).trim());
      const task = todoList.find(t => t.id === id);
      if (!task) {
        msg.reply(`⚠️ Tugas dengan ID *${id}* tidak ditemukan.`);
        return;
      }
      task.done = true;
      msg.reply(`✅ *Tugas Selesai*\n━━━━━━━━━━━━━━\n📝 ${task.task}\n━━━━━━━━━━━━━━`);

    /* STIKER */
    } else if (cmd === '!stiker' || cmd === '!sticker') {
      let mediaMsg = null;
      if (msg.hasQuotedMsg) {
        const quoted = await msg.getQuotedMessage();
        if (quoted.hasMedia) mediaMsg = quoted;
      } else if (msg.hasMedia) {
        mediaMsg = msg;
      }
      if (!mediaMsg) {
        msg.reply('📎 *Cara membuat stiker:*\n━━━━━━━━━━━━━━\n1️⃣ Kirim gambar dengan caption *!stiker*\n   — atau —\n2️⃣ Reply gambar/video dengan *!stiker*\n━━━━━━━━━━━━━━\n✅ Format didukung: JPG, PNG, GIF, WebP, MP4');
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
        const chat = await msg.getChat();
        await chat.sendMessage(media, {
          sendMediaAsSticker: true,
          stickerAuthor: `${BOT_NAME} Bot`,
          stickerName: `${BOT_NAME} Sticker'`
        });
      } catch (e) {
        console.error('Stiker error:', e);
        msg.reply('❌ Gagal membuat stiker. Pastikan gambar valid dan coba lagi.');
      }

    /* MENFESS */
    } else if (cmd.startsWith('!menfess ')) {
      if (!checkRateLimit(msg.from)) {
        msg.reply('⏱️ *Rate limit*\nKamu sudah mengirim banyak menfess. Tunggu sebentar.');
        return;
      }
      const menfessArgs = msg.body.split(' ');
      if (menfessArgs.length < 3) {
        msg.reply('📨 *Format Menfess*\n━━━━━━━━━━━━━━\n!menfess <nomor> <pesan>\n\nContoh:\n!menfess 6281234567890 Halo, semangat kuliah!\n━━━━━━━━━━━━━━\n⚠️ Nomor harus valid (62xxx)');
        return;
      }
      const receiverNumber = formatPhoneNumber(menfessArgs[1]);
      const menfessText = msg.body.substring(msg.body.indexOf(menfessArgs[2])).trim();
      if (menfessText.length > MENFESS_CONFIG.MAX_MESSAGE_LENGTH) {
        msg.reply(`⚠️ Pesan terlalu panjang. Maksimal ${MENFESS_CONFIG.MAX_MESSAGE_LENGTH} karakter.`);
        return;
      }
      if (findMenfessSession(msg.from)) {
        msg.reply('❌ Kamu masih dalam sesi menfess sebelumnya.\nGunakan *!stopmenfess* untuk keluar terlebih dahulu.');
        return;
      }
      if (findMenfessSession(receiverNumber)) {
        msg.reply('❌ Penerima sedang dalam sesi menfess lain. Coba lagi nanti.');
        return;
      }
      const sessionId = generateSessionId();
      menfessSessions.set(sessionId, {
        sender: msg.from,
        receiver: receiverNumber,
        createdAt: Date.now(),
        active: true
      });
      msg.reply('✅ *Menfess terkirim!*\n⏳ Menunggu balasan dari penerima...');
      try {
        await client.sendMessage(
          receiverNumber,
          `📨 *Menfess Baru*\n━━━━━━━━━━━━━━\n💌 ${menfessText}\n\n❓ Pengirim disembunyikan.\n\n📤 Balas dengan:\n*!balas <pesan>*\n━━━━━━━━━━━━━━`
        );
      } catch (e) {
        console.error('Menfess send error:', e);
        msg.reply('⚠️ Gagal mengirim menfess. Nomor tujuan mungkin tidak valid.');
        menfessSessions.delete(sessionId);
      }

    /* BALAS MENFESS */
    } else if (cmd.startsWith('!balas ')) {
      const sessionId = findMenfessSession(msg.from);
      if (!sessionId) {
        msg.reply('⚠️ Kamu tidak memiliki sesi menfess aktif.\nGunakan *!menfess <nomor> <pesan>* untuk memulai.');
        return;
      }
      const replyText = msg.body.substring(7).trim();
      if (!replyText) {
        msg.reply('⚠️ Tulis balasan setelah perintah.\nContoh: *!balas Makasih, semangat juga!*');
        return;
      }
      if (replyText.length > MENFESS_CONFIG.MAX_MESSAGE_LENGTH) {
        msg.reply(`⚠️ Balasan terlalu panjang. Maksimal ${MENFESS_CONFIG.MAX_MESSAGE_LENGTH} karakter.`);
        return;
      }
      addMessageToHistory(sessionId, msg.from, replyText);
      const session = menfessSessions.get(sessionId);
      const otherUser = msg.from === session.sender ? session.receiver : session.sender;
      msg.reply('✅ *Balasan terkirim!*');
      try {
        await client.sendMessage(
          otherUser,
          `📩 *Balasan Menfess*\n━━━━━━━━━━━━━━\n💬 ${replyText}\n━━━━━━━━━━━━━━`
        );
      } catch (e) {
        console.error('Balas menfess error:', e);
        msg.reply('⚠️ Gagal mengirim balasan.');
      }

    /* STOP MENFESS */
    } else if (cmd === '!stopmenfess') {
      const sessionId = findMenfessSession(msg.from);
      if (!sessionId) {
        msg.reply('⚠️ Kamu tidak memiliki sesi menfess aktif.');
        return;
      }
      const session = menfessSessions.get(sessionId);
      const otherUser = msg.from === session.sender ? session.receiver : session.sender;
      menfessSessions.delete(sessionId);
      messageHistory.delete(sessionId);
      msg.reply('✅ *Sesi menfess ditutup.*\n👋 Terima kasih telah menggunakan layanan menfess!');
      try {
        await client.sendMessage(
          otherUser,
          `❌ *Sesi Menfess Berakhir*\nPengguna lain telah menutup sesi. Sampai jumpa!`
        );
      } catch (e) {
        console.error('Stop menfess notify error:', e);
      }

    /* HUBUNGI DEVELOPER */
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

    /* MENU */
    } else if (cmd === '!menu' || cmd === '!bantuan') {
      msg.reply(
        '🤖 *Satoki Bot v1.5*\n━━━━━━━━━━━━━━\n\n' +
        '🔧 *Umum*\n!ping — Test koneksi bot\n!halo / !hai — Sapa bot\n!jam — Cek waktu & tanggal\n!info — Info & uptime bot\n\n' +
        '🎲 *Hiburan*\n!dadu — Lempar dadu\n!koin — Lempar koin\n!random <min> <max> — Angka acak\n\n' +
        '🛠️ *Utilitas*\n!echo <teks> — Ulangi teks\n!calc <ekspresi> — Kalkulator\n!qr <teks> — Buat QR Code\n!short <url> — Pendekkan URL\n!translate <bahasa> <teks> — Terjemahkan\n\n' +
        '📝 *To-Do*\n!todo add <tugas> — Tambah tugas\n!todo list — Lihat daftar tugas\n!todo done <id> — Tandai tugas selesai\n\n' +
        '🖼️ *Stiker*\n!stiker — Ubah gambar jadi stiker WA\n\n' +
        '💌 *Menfess*\n!menfess <nomor> <pesan> — Kirim pesan anonim\n!balas <pesan> — Balas menfess\n!stopmenfess — Tutup sesi menfess\n\n' +
        '📩 *Kontak*\n!dev <pesan> — Kirim pesan ke developer\n\n' +
        '━━━━━━━━━━━━━━\n💡 Contoh: !calc 10*5 | !qr https://github.com | !translate en Halo dunia'
      );
    }

  } catch (error) {
    console.error('Bot error:', error);
    if (msg && msg.reply) {
      msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }
});

client.initialize();
