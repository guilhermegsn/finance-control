export const accountLogos: Record<string, any> = {
  // Bancos Brasileiros
  itau: require('../../assets/logos/itau.png'),
  nubank: require('../../assets/logos/nubank.png'),
  bradesco: require('../../assets/logos/bradesco.png'),
  bb: require('../../assets/logos/bb.png'),
  caixa: require('../../assets/logos/caixa.png'),
  santander: require('../../assets/logos/santander.png'),
  inter: require('../../assets/logos/inter.png'),
  btg: require('../../assets/logos/btg.png'),
  c6: require('../../assets/logos/c6.png'),
  xp: require('../../assets/logos/xp.png'),
  mercadopago: require('../../assets/logos/mercadopago.png'),
  
  // Bancos Internacionais
  chase: require('../../assets/logos/chase.png'),
  bofa: require('../../assets/logos/bofa.png'),
  wellsfargo: require('../../assets/logos/wellsfargo.png'),
  hsbc: require('../../assets/logos/hsbc.png'),
  barclays: require('../../assets/logos/barclays.png'),
  revolut: require('../../assets/logos/revolut.png'),
  monzo: require('../../assets/logos/monzo.png'),
  wise: require('../../assets/logos/wise.png'),
  paypal: require('../../assets/logos/paypal.png'),
  
  // Bandeiras de cartão (também podem ser usadas como logos de contas)
  visa: require('../../assets/logos/visa.png'),
  mastercard: require('../../assets/logos/mastercard.png'),
  amex: require('../../assets/logos/amex.png'),
  elo: require('../../assets/logos/elo.png'),
  hipercard: require('../../assets/logos/hipercard.png'),
  dinersclub: require('../../assets/logos/dinersclub.png'),
};

// Função auxiliar para obter logo por ID do banco
export const getAccountLogo = (bankId: string): any => {
  return accountLogos[bankId.toLowerCase()] || null;
};

// Função para obter logo por código do banco (usando mapeamento do BankService)
export const getAccountLogoByCode = (bankCode: string): any => {
  // Mapeamento de códigos de banco para IDs
  const codeToId: Record<string, string> = {
    '341': 'itau',
    '260': 'nubank',
    '237': 'bradesco',
    '001': 'bb',
    '104': 'caixa',
    '033': 'santander',
    '077': 'inter',
    '208': 'btg',
    '336': 'c6',
    '102': 'xp',
    '323': 'mercadopago',
  };
  
  const bankId = codeToId[bankCode];
  return bankId ? accountLogos[bankId] : null;
};