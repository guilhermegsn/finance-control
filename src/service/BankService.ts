// Interface para o banco com informações de logo
export interface BankWithLogo {
  id: string;
  name: string;
  displayName: string;
  code: string | null;
  logoUrl: any; // require() retorna um número/objeto
}

// Base de dados local dos bancos com logos
const BANKS_DATA: Record<string, { name: string; displayName: string; code: string | null; logo: any }> = {
  // Bancos Brasileiros
  itau: {
    name: 'Itaú Unibanco',
    displayName: 'Itaú',
    code: '341',
    logo: require('../../assets/logos/itau.png'),
  },
  nubank: {
    name: 'Nu Pagamentos',
    displayName: 'Nubank',
    code: '260',
    logo: require('../../assets/logos/nubank.png'),
  },
  bradesco: {
    name: 'Banco Bradesco',
    displayName: 'Bradesco',
    code: '237',
    logo: require('../../assets/logos/bradesco.png'),
  },
  bb: {
    name: 'Banco do Brasil',
    displayName: 'Banco do Brasil',
    code: '001',
    logo: require('../../assets/logos/bb.png'),
  },
  caixa: {
    name: 'Caixa Econômica Federal',
    displayName: 'Caixa',
    code: '104',
    logo: require('../../assets/logos/caixa.png'),
  },
  santander: {
    name: 'Banco Santander',
    displayName: 'Santander',
    code: '033',
    logo: require('../../assets/logos/santander.png'),
  },
  inter: {
    name: 'Banco Inter',
    displayName: 'Inter',
    code: '077',
    logo: require('../../assets/logos/inter.png'),
  },
  btg: {
    name: 'BTG Pactual',
    displayName: 'BTG',
    code: '208',
    logo: require('../../assets/logos/btg.png'),
  },
  c6: {
    name: 'C6 Bank',
    displayName: 'C6 Bank',
    code: '336',
    logo: require('../../assets/logos/c6.png'),
  },
  xp: {
    name: 'XP Investimentos',
    displayName: 'XP',
    code: '102',
    logo: require('../../assets/logos/xp.png'),
  },
  mercadopago: {
    name: 'Mercado Pago',
    displayName: 'Mercado Pago',
    code: '323',
    logo: require('../../assets/logos/mercadopago.png'),
  },

  // Bancos Internacionais
  chase: {
    name: 'JPMorgan Chase',
    displayName: 'Chase',
    code: null,
    logo: require('../../assets/logos/chase.png'),
  },
  bofa: {
    name: 'Bank of America',
    displayName: 'Bank of America',
    code: null,
    logo: require('../../assets/logos/bofa.png'),
  },
  wellsfargo: {
    name: 'Wells Fargo',
    displayName: 'Wells Fargo',
    code: null,
    logo: require('../../assets/logos/wellsfargo.png'),
  },
  hsbc: {
    name: 'HSBC',
    displayName: 'HSBC',
    code: null,
    logo: require('../../assets/logos/hsbc.png'),
  },
  barclays: {
    name: 'Barclays',
    displayName: 'Barclays',
    code: null,
    logo: require('../../assets/logos/barclays.png'),
  },
  revolut: {
    name: 'Revolut',
    displayName: 'Revolut',
    code: null,
    logo: require('../../assets/logos/revolut.png'),
  },
  monzo: {
    name: 'Monzo',
    displayName: 'Monzo',
    code: null,
    logo: require('../../assets/logos/monzo.png'),
  },
  wise: {
    name: 'Wise',
    displayName: 'Wise',
    code: null,
    logo: require('../../assets/logos/wise.png'),
  },
  paypal: {
    name: 'PayPal',
    displayName: 'PayPal',
    code: null,
    logo: require('../../assets/logos/paypal.png'),
  },
};

// Converter dados para array de BankWithLogo
const getAllBanks = (): BankWithLogo[] => {
  return Object.entries(BANKS_DATA).map(([id, data]) => ({
    id,
    name: data.name,
    displayName: data.displayName,
    code: data.code,
    logoUrl: data.logo,
  }));
};

export const BankService = {
  // Buscar todos os bancos
  fetchAllBanks: (): BankWithLogo[] => {
    return getAllBanks();
  },

  // Buscar bancos com filtro por nome
  searchBanks: (searchTerm: string): BankWithLogo[] => {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const banks = getAllBanks();
    const searchLower = searchTerm.toLowerCase();

    return banks.filter(bank => {
      const nameMatch = bank.name.toLowerCase().includes(searchLower);
      const displayNameMatch = bank.displayName.toLowerCase().includes(searchLower);
      const idMatch = bank.id.toLowerCase().includes(searchLower);
      const codeMatch = bank.code ? bank.code.includes(searchTerm) : false;

      return nameMatch || displayNameMatch || idMatch || codeMatch;
    });
  },

  // Buscar banco por ID
  getBankById: (id: string): BankWithLogo | null => {
    const bankData = BANKS_DATA[id.toLowerCase()];
    if (!bankData) return null;

    return {
      id: id.toLowerCase(),
      name: bankData.name,
      displayName: bankData.displayName,
      code: bankData.code,
      logoUrl: bankData.logo,
    };
  },

  // Buscar banco por código
  getBankByCode: (code: string): BankWithLogo | null => {
    const entry = Object.entries(BANKS_DATA).find(([_, data]) => data.code === code);
    if (!entry) return null;

    const [id, data] = entry;
    return {
      id,
      name: data.name,
      displayName: data.displayName,
      code: data.code,
      logoUrl: data.logo,
    };
  },

  // Buscar banco por nome
  getBankByName: (name: string): BankWithLogo | null => {
    const searchLower = name.toLowerCase();
    const entry = Object.entries(BANKS_DATA).find(([id, data]) =>
      data.name.toLowerCase() === searchLower ||
      data.displayName.toLowerCase() === searchLower ||
      id === searchLower
    );

    if (!entry) return null;

    const [id, data] = entry;
    return {
      id,
      name: data.name,
      displayName: data.displayName,
      code: data.code,
      logoUrl: data.logo,
    };
  },

  // Obter logo do banco pelo ID
  getBankLogo: (bankId: string): any => {
    const bankData = BANKS_DATA[bankId.toLowerCase()];
    return bankData?.logo || null;
  },
};

export default BankService;
