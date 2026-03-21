const fs = require('fs');
const https = require('https');
const path = require('path');

// Domínios oficiais para buscar os logos via Google Favicon
const brands = {
  "visa": "visa.com.br",
  "mastercard": "mastercard.com.br",
  "amex": "americanexpress.com.br",
  "elo": "elo.com.br",
  "hipercard": "hipercard.com.br",
  "diners": "dinersclub.com"
};

const folder = './assets/logos';
if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

const downloadImage = (url, name) => {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return downloadImage(res.headers.location, name);
    }

    if (res.statusCode === 200) {
      const filePath = path.join(folder, `${name}.png`);
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Bandeira baixada: ${name}`);
      });
    } else {
      console.error(`❌ Erro na bandeira ${name}: Status ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`❌ Erro de conexão (${name}): ${err.message}`);
  });
};

console.log("🚀 Baixando logos das bandeiras de cartão...");

Object.entries(brands).forEach(([name, domain]) => {
  // sz=128 garante uma resolução decente para ícones de lista
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  downloadImage(url, name);
});