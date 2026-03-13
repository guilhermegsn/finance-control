const fs = require('fs');
const https = require('https');
const path = require('path');

const banks = {
  "itau": "itau.com.br",
  "nubank": "nubank.com.br",
  "bradesco": "bradesco.com.br",
  "bb": "bb.com.br",
  "caixa": "caixa.gov.br",
  "santander": "santander.com.br",
  "inter": "bancointer.com.br",
  "btg": "btgpactual.com",
  "c6": "c6bank.com.br",
  "xp": "xpi.com.br",
  "chase": "chase.com",
  "bofa": "bankofamerica.com",
  "wellsfargo": "wellsfargo.com",
  "hsbc": "hsbc.com",
  "barclays": "barclays.com",
  "revolut": "revolut.com",
  "monzo": "monzo.com",
  "wise": "wise.com",
  "paypal": "paypal.com",
  "mercadopago": "mercadopago.com.br"
};

const folder = './assets/logos';
if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

const downloadImage = (url, name) => {
  https.get(url, (res) => {
    // Se for um redirecionamento (301 ou 302), chama a função novamente para a nova URL
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return downloadImage(res.headers.location, name);
    }

    if (res.statusCode === 200) {
      const filePath = path.join(folder, `${name}.png`);
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Sucesso: ${name}`);
      });
    } else {
      console.error(`❌ Erro no banco ${name}: Status ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`❌ Erro de conexão: ${err.message}`);
  });
};

console.log("🚀 Tentando baixar os logos com suporte a redirecionamento...");

Object.entries(banks).forEach(([name, domain]) => {
  // Usando a URL do Google que gera ícones maiores (sz=128)
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  downloadImage(url, name);
});