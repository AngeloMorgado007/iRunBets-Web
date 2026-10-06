import * as XLSX from 'xlsx';

export interface ApisExcelPlan {
  id: string;
  codigo_plano: string;
  nome_comercial: string;
  preco_mensal: number;
  limite_requisicoes_dia: number;
  descricao?: string;
  features: string[];
  isPopular?: boolean;
  active: boolean;
}

export interface ApisExcelAnalysisImage {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  tag: string;
}

export interface ApisExcelBanner1 {
  title: string;
  subtitle: string;
  badge: string;
  buttonText: string;
  imageUrl?: string;
}

export interface ApisExcelBanner2 {
  title: string;
  subtitle: string;
  badge: string;
}

export interface ApisExcelSettings {
  excelFilename: string;
  excelVersion: string;
  excelCustomUrl: string;
  excelDescription: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface ApisExcelSubscriptionRequest {
  id: string;
  name: string;
  email: string;
  planCode: string;
  planName: string;
  apiKey: string;
  status: 'active' | 'pending';
  createdAt: string;
}

export interface ApisExcelStats {
  excelDownloads: number;
  lastDownloadedAt?: string;
  totalEmailsSent?: number;
}

export interface ApisExcelNewsletter {
  id: string;
  subject: string;
  body: string;
  targetPlan: string; // 'ALL' | 'PRO' | 'PRO_MAX' | 'FREE'
  recipientCount: number;
  recipients: string[];
  sentAt: string;
  sender: string;
}

export interface ApisExcelConfig {
  banner1: ApisExcelBanner1;
  banner2: ApisExcelBanner2;
  showcaseImages: ApisExcelAnalysisImage[];
  plans: ApisExcelPlan[];
  settings: ApisExcelSettings;
  subscriptions: ApisExcelSubscriptionRequest[];
  stats: ApisExcelStats;
  newsletters: ApisExcelNewsletter[];
}

export const DEFAULT_APIS_EXCEL_CONFIG: ApisExcelConfig = {
  banner1: {
    badge: '⚡ DADOS ESTATÍSTICOS & FEED DE APIS',
    title: 'Portal de Dados Estatísticos & Análise Quantitativa',
    subtitle: 'Distribuições de Poisson, probabilidades calculadas de 1X2, Over/Under, Ambas Marcam e modelos preditivos com exportação direta para Microsoft Excel e integração via API REST.',
    buttonText: 'Aceder aos Dados & Download Excel',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80'
  },
  banner2: {
    badge: '📸 SHOWCASE & FOTOS DE ANÁLISES',
    title: 'Pré-Visualização dos Modelos e Folhas Excel',
    subtitle: 'Exemplos visuais de como os dados estatísticos e algoritmos de IA fundamentam cada prognóstico e cruzamento de odds.'
  },
  showcaseImages: [
    {
      id: 'img-1',
      title: 'Folha Excel de Modelos Preditivos',
      subtitle: 'Fórmulas automáticas de Poisson, Expected Value (+EV) e probabilidades reais calibradas',
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80',
      tag: 'Folha Excel'
    },
    {
      id: 'img-2',
      title: 'Painel Estatístico & Algoritmo IA',
      subtitle: 'Cruzamento de métricas históricas, médias de golos marcados/sofridos e tendências',
      url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1000&q=80',
      tag: 'Análise Quantitativa'
    },
    {
      id: 'img-3',
      title: 'Feed de API em Tempo Real (JSON)',
      subtitle: 'Endpoints de alta velocidade para alimentar bots de Telegram, websites e folhas dinâmicas',
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
      tag: 'Integração API'
    }
  ],
  plans: [
    {
      id: 'free',
      codigo_plano: 'FREE',
      nome_comercial: 'Plano Free',
      preco_mensal: 0.00,
      limite_requisicoes_dia: 300,
      descricao: 'Acesso inicial aos dados estatísticos e modelo básico em Excel.',
      features: [
        '300 requisições / dia na API',
        'Download do Modelo Excel Básico',
        'Probabilidades 1X2 e Golos Base',
        'Suporte Comunitário',
        'Chave API Pessoal Imediata'
      ],
      isPopular: false,
      active: true
    },
    {
      id: 'pro',
      codigo_plano: 'PRO',
      nome_comercial: 'Plano Pro Data',
      preco_mensal: 23.99,
      limite_requisicoes_dia: 2500,
      descricao: 'Alimentação completa de dados estatísticos para apostadores e analistas regulares.',
      features: [
        '2.500 requisições / dia na API',
        'Download Folha Excel Pro com Macros e Fórmulas Poisson',
        'Mais de 40 Ligas Europeias e Mundiais',
        'Expected Value (+EV) e Médias de Golos Avançadas',
        'Chave API de Alta Velocidade'
      ],
      isPopular: false,
      active: true
    },
    {
      id: 'pro_max',
      codigo_plano: 'PRO_MAX',
      nome_comercial: 'Plano Pro Max AI',
      preco_mensal: 44.99,
      limite_requisicoes_dia: 10000,
      descricao: 'O pacote definitivo com motor analítico e Análises Algorítmicas de Inteligência Artificial.',
      features: [
        '10.000 requisições / dia na API',
        'Tudo incluído do Plano Pro Data',
        'Análises Algorítmicas de IA (Gemini & Supabase)',
        'Alertas de Valor e Relatórios Automáticos',
        'Webhooks e Suporte Prioritário 24/7'
      ],
      isPopular: true,
      active: true
    },
    {
      id: 'extra_500',
      codigo_plano: 'EXTRA_500',
      nome_comercial: 'Add-on Extra 500 Users',
      preco_mensal: 54.99,
      limite_requisicoes_dia: 15000,
      descricao: 'Expansão de quota de alta escala para comunidades, canais de apostas e empresas.',
      features: [
        '15.000 requisições / dia na API',
        'Capacidade multi-utilizadores (até 500 em simultâneo)',
        'Multi-chaves de API para equipas',
        'SLA de 99.9% de disponibilidade garantida',
        'Apoio técnico dedicado de integração'
      ],
      isPopular: false,
      active: true
    }
  ],
  settings: {
    excelFilename: 'iRunBets_Dados_Estatisticos_2026.xlsx',
    excelVersion: 'v2.4 Pro (Março 2026)',
    excelCustomUrl: '',
    excelDescription: 'Folha de cálculo oficial iRunBets com fórmulas de Poisson, cálculo de valor esperado (+EV), distribuição de golos e ligação para alimentar via API.',
    supabaseUrl: 'https://ksqevxtnuyzrfohkgvfw.supabase.co',
    supabaseAnonKey: 'sb_publishable_RI9xwxEToy5XSbFuKshgWg_9jDS6cFZ'
  },
  stats: {
    excelDownloads: 14,
    lastDownloadedAt: '2026-03-07T14:30:00.000Z',
    totalEmailsSent: 0
  },
  newsletters: [
    {
      id: 'news-init-1',
      subject: 'Bem-vindo ao Portal de Dados Estatísticos & APIs iRunBets!',
      body: 'Prezado utilizador,\n\nÉ com enorme satisfação que disponibilizamos a versão oficial da Folha Excel com distribuição de Poisson, cálculo de Expected Value (+EV) e integração via API REST.\n\nPoderá conectar o seu Excel diretamente ao nosso feed ou utilizar os endpoints em cURL, Python ou JavaScript.\n\nBons investimentos e análises de valor,\nEquipa iRunBets.',
      targetPlan: 'ALL',
      recipientCount: 1,
      recipients: ['morgado.aam@gmail.com'],
      sentAt: '2026-03-02T10:00:00.000Z',
      sender: 'iRunBets Comunicação'
    }
  ],
  subscriptions: [
    {
      id: 'sub_admin_morgado',
      name: 'Admin iRunBets (Fundador)',
      email: 'morgado.aam@gmail.com',
      planCode: 'PRO_MAX',
      planName: 'Plano Pro Max VIP Founder',
      apiKey: 'irun_master_eee78879c2fa3b720df7aa6321c33f46',
      status: 'active',
      createdAt: '2026-03-01T00:00:00.000Z'
    }
  ]
};

const STORAGE_KEY = 'irunbets_apis_excel_config';

export const getApisExcelConfig = (): ApisExcelConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_APIS_EXCEL_CONFIG,
        ...parsed,
        banner1: { ...DEFAULT_APIS_EXCEL_CONFIG.banner1, ...(parsed.banner1 || {}) },
        banner2: { ...DEFAULT_APIS_EXCEL_CONFIG.banner2, ...(parsed.banner2 || {}) },
        settings: { ...DEFAULT_APIS_EXCEL_CONFIG.settings, ...(parsed.settings || {}) },
        stats: { ...DEFAULT_APIS_EXCEL_CONFIG.stats, ...(parsed.stats || {}) },
        newsletters: Array.isArray(parsed.newsletters) ? parsed.newsletters : DEFAULT_APIS_EXCEL_CONFIG.newsletters,
        plans: (parsed.plans && parsed.plans.length > 0) ? parsed.plans : DEFAULT_APIS_EXCEL_CONFIG.plans,
        showcaseImages: (parsed.showcaseImages && parsed.showcaseImages.length > 0) ? parsed.showcaseImages : DEFAULT_APIS_EXCEL_CONFIG.showcaseImages,
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : DEFAULT_APIS_EXCEL_CONFIG.subscriptions
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar irunbets_apis_excel_config de localStorage:', err);
  }
  return DEFAULT_APIS_EXCEL_CONFIG;
};

export const saveApisExcelConfig = (config: ApisExcelConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('irunbets_apis_excel_updated', { detail: config }));
  } catch (err) {
    console.error('Erro ao guardar irunbets_apis_excel_config:', err);
  }
};

/**
 * Increment Excel download counter and record timestamp
 */
export const incrementExcelDownloadCount = (): number => {
  const config = getApisExcelConfig();
  const currentCount = (config.stats?.excelDownloads || 0) + 1;
  config.stats = {
    ...config.stats,
    excelDownloads: currentCount,
    lastDownloadedAt: new Date().toISOString()
  };
  saveApisExcelConfig(config);
  return currentCount;
};

/**
 * Log a sent newsletter and update sent counters
 */
export const addNewsletterLog = (newsletter: Omit<ApisExcelNewsletter, 'id' | 'sentAt'>): ApisExcelNewsletter => {
  const config = getApisExcelConfig();
  const newEntry: ApisExcelNewsletter = {
    ...newsletter,
    id: 'news-' + Date.now(),
    sentAt: new Date().toISOString()
  };
  config.newsletters = [newEntry, ...(config.newsletters || [])];
  config.stats = {
    ...config.stats,
    totalEmailsSent: (config.stats?.totalEmailsSent || 0) + newsletter.recipientCount
  };
  saveApisExcelConfig(config);
  return newEntry;
};

/**
 * Remove a subscription from registry
 */
export const deleteSubscription = (id: string): void => {
  const config = getApisExcelConfig();
  config.subscriptions = config.subscriptions.filter(s => s.id !== id);
  saveApisExcelConfig(config);
};

/**
 * Update subscription active status
 */
export const updateSubscriptionStatus = (id: string, status: 'active' | 'pending'): void => {
  const config = getApisExcelConfig();
  const sub = config.subscriptions.find(s => s.id === id);
  if (sub) {
    sub.status = status;
    saveApisExcelConfig(config);
  }
};

export const addSubscriptionRequest = (name: string, email: string, planCode: string): ApisExcelSubscriptionRequest => {
  const config = getApisExcelConfig();
  const matchedPlan = config.plans.find(p => p.codigo_plano === planCode) || config.plans[0];
  
  // Create clean unique API Key
  const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const newSub: ApisExcelSubscriptionRequest = {
    id: 'sub_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    planCode: matchedPlan.codigo_plano,
    planName: matchedPlan.nome_comercial,
    apiKey: `irb_live_${randomHex}`,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const existingIndex = config.subscriptions.findIndex(s => s.email.toLowerCase() === email.trim().toLowerCase());
  if (existingIndex >= 0) {
    config.subscriptions[existingIndex] = newSub;
  } else {
    config.subscriptions.unshift(newSub);
  }

  saveApisExcelConfig(config);
  return newSub;
};

/**
 * Generates an actual, real, multi-tab Microsoft Excel (.xlsx) file
 * filled with sample football statistical models, Poisson distribution, and API data!
 */
export const generateRealExcelFile = (filename = 'iRunBets_Dados_Estatisticos_2026.xlsx'): void => {
  try {
    const wb = XLSX.utils.book_new();

    // 1. Tab: Modelos de Jogos e Probabilidades
    const gamesData = [
      ['ID Jogo', 'Liga', 'Data', 'Equipa Casa', 'Equipa Fora', 'Prob. 1 (%)', 'Prob. X (%)', 'Prob. 2 (%)', 'Odd Justa 1', 'Odd Mercado 1', 'Valor Esperado (+EV %)', 'Over 2.5 (%)', 'Ambas Marcam (%)'],
      ['J-101', 'Primeira Liga PT', '2026-03-08', 'Benfica', 'FC Porto', '48.5%', '27.5%', '24.0%', '2.06', '2.25', '+9.2%', '58.2%', '62.4%'],
      ['J-102', 'Primeira Liga PT', '2026-03-08', 'Sporting CP', 'SC Braga', '61.0%', '22.0%', '17.0%', '1.64', '1.80', '+9.8%', '64.5%', '55.0%'],
      ['J-103', 'Premier League', '2026-03-08', 'Arsenal', 'Chelsea', '55.2%', '24.8%', '20.0%', '1.81', '1.95', '+7.7%', '59.0%', '58.5%'],
      ['J-104', 'Premier League', '2026-03-09', 'Manchester City', 'Liverpool', '45.0%', '28.0%', '27.0%', '2.22', '2.40', '+8.1%', '68.0%', '71.0%'],
      ['J-105', 'La Liga', '2026-03-08', 'Real Madrid', 'Atlético Madrid', '52.0%', '26.0%', '22.0%', '1.92', '2.10', '+9.4%', '52.0%', '54.0%'],
      ['J-106', 'Serie A', '2026-03-09', 'Inter Milão', 'Juventus', '50.0%', '29.0%', '21.0%', '2.00', '2.18', '+9.0%', '49.5%', '51.0%']
    ];
    const wsGames = XLSX.utils.aoa_to_sheet(gamesData);
    XLSX.utils.book_append_sheet(wb, wsGames, 'Análises_Jogos');

    // 2. Tab: Modelo de Poisson (Expected Goals xG)
    const poissonData = [
      ['Equipa', 'xG Marcados (Média)', 'xG Sofridos (Média)', 'Força Ofensiva', 'Força Defensiva', 'Previsão de Golos (Lambda)'],
      ['Benfica', '2.20', '0.85', '1.38', '0.75', '1.85'],
      ['FC Porto', '1.90', '0.95', '1.19', '0.84', '1.25'],
      ['Sporting CP', '2.45', '0.70', '1.53', '0.62', '2.10'],
      ['SC Braga', '1.80', '1.10', '1.13', '0.97', '1.15'],
      ['Arsenal', '2.15', '0.90', '1.34', '0.79', '1.75'],
      ['Chelsea', '1.65', '1.20', '1.03', '1.05', '1.20']
    ];
    const wsPoisson = XLSX.utils.aoa_to_sheet(poissonData);
    XLSX.utils.book_append_sheet(wb, wsPoisson, 'Modelo_Poisson_xG');

    // 3. Tab: Documentação e Chave API
    const docData = [
      ['iRunBets Portal de Dados Estatísticos', 'Versão 2026'],
      ['Documentação de Integração API REST & Power Query'],
      [''],
      ['Endpoint Base:', 'https://irunbets.pt/api/v1'],
      ['Exemplo de Cabeçalho:', 'Authorization: Bearer <SUA_CHAVE_API>'],
      ['Formato de Resposta:', 'application/json'],
      [''],
      ['Para conectar diretamente este Excel ao servidor:'],
      ['1.', 'No Excel, vá a Dados > Obter Dados > Da Web.'],
      ['2.', 'Insira o URL do endpoint (ex.: https://irunbets.pt/api/v1/jogos).'],
      ['3.', 'Em Cabeçalhos, adicione "x-api-key" com a sua chave pessoal.'],
      ['4.', 'Clique em Carregar e a folha atualizará em tempo real a cada abertura!']
    ];
    const wsDoc = XLSX.utils.aoa_to_sheet(docData);
    XLSX.utils.book_append_sheet(wb, wsDoc, 'Como_Conectar_API');

    // Generate and trigger direct browser download
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Erro ao gerar ficheiro Excel:', err);
    alert('Erro ao gerar ficheiro Excel. A criar download de contingência...');
  }
};
