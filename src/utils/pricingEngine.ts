import {
  ChannelFee,
  PricingMatrixRow,
  ProductItem,
  ProductIngredient,
  StockMovement,
  CompetitorItem,
  FixedExpenses,
  UserProfile,
  WidgetItem,
  PushAlert,
  AlertTriggerConfig,
  PricingAuditResult,
} from '../types/pricing';

export const DEFAULT_PRODUCT: ProductItem = {
  id: 'prod-planilha-1',
  sku: 'HMB-001',
  name: 'Hambúrguer Artesanal Smash Duplo (Item da Planilha)',
  category: 'Lanches',
  cost: 6.89,
  currentPrice: 9.84, // Correspondente à margem de 30% na planilha
  targetNetMargin: 0.25,
  estimatedMonthlyUnits: 450,
  unit: 'un',
  currentStock: 68,
  minStock: 20,
  maxStock: 150,
  costMethod: 'recipe',
  description: 'Pão brioche selado na manteiga, 2x blend smash bovino 80g, queijo cheddar fatiado, molho especial e embalagem kraft térmica.',
  active: true,
  ingredients: [
    { id: 'ing-1', name: 'Pão Brioche Especial Artesanal', quantity: 1, unit: 'un', unitCost: 1.60, wastePercent: 0, subtotal: 1.60 },
    { id: 'ing-2', name: 'Blend Bovino Smash Angus (2x 80g)', quantity: 160, unit: 'g', unitCost: 0.024, wastePercent: 0, subtotal: 3.84 },
    { id: 'ing-3', name: 'Queijo Cheddar Fatiado Especial', quantity: 40, unit: 'g', unitCost: 0.025, wastePercent: 0, subtotal: 1.00 },
    { id: 'ing-4', name: 'Molho Secreto da Casa Smash', quantity: 20, unit: 'g', unitCost: 0.015, wastePercent: 0, subtotal: 0.30 },
    { id: 'ing-5', name: 'Embalagem Térmica Kraft Antigordura', quantity: 1, unit: 'un', unitCost: 0.15, wastePercent: 0, subtotal: 0.15 },
  ],
  stockHistory: [
    { id: 'stk-1', date: '2026-10-15 10:00', type: 'in', quantity: 80, reason: 'Entrada de insumos / produção do dia', previousStock: 12, newStock: 92 },
    { id: 'stk-2', date: '2026-10-17 23:30', type: 'out', quantity: 24, reason: 'Vendas delivery e balcão', previousStock: 92, newStock: 68 },
  ],
};

export const INITIAL_PRODUCTS: ProductItem[] = [
  DEFAULT_PRODUCT,
  {
    id: 'prod-2',
    sku: 'BAT-002',
    name: 'Batata Rústica com Alecrim 200g',
    category: 'Acompanhamentos',
    cost: 3.40,
    currentPrice: 7.90,
    targetNetMargin: 0.30,
    estimatedMonthlyUnits: 380,
    unit: 'porção',
    currentStock: 42,
    minStock: 15,
    maxStock: 120,
    costMethod: 'recipe',
    description: 'Batata especial cortada à mão com sal defumado, alecrim fresco e óleo de algodão.',
    active: true,
    ingredients: [
      { id: 'ing-201', name: 'Batata Asterix Selecionada', quantity: 220, unit: 'g', unitCost: 0.007, wastePercent: 0, subtotal: 1.54 },
      { id: 'ing-202', name: 'Alecrim Fresco e Sal Defumado', quantity: 10, unit: 'g', unitCost: 0.035, wastePercent: 0, subtotal: 0.35 },
      { id: 'ing-203', name: 'Óleo de Algodão para Fritura', quantity: 50, unit: 'ml', unitCost: 0.0162, wastePercent: 0, subtotal: 0.81 },
      { id: 'ing-204', name: 'Embalagem Box Kraft 200g', quantity: 1, unit: 'un', unitCost: 0.70, wastePercent: 0, subtotal: 0.70 },
    ],
    stockHistory: [
      { id: 'stk-201', date: '2026-10-16 09:00', type: 'in', quantity: 50, reason: 'Recebimento de hortifrúti', previousStock: 8, newStock: 58 },
      { id: 'stk-202', date: '2026-10-17 23:00', type: 'out', quantity: 16, reason: 'Vendas acumuladas', previousStock: 58, newStock: 42 },
    ],
  },
  {
    id: 'prod-3',
    sku: 'BEB-003',
    name: 'Refrigerante Lata 350ml',
    category: 'Bebidas',
    cost: 2.80,
    currentPrice: 6.50,
    targetNetMargin: 0.35,
    estimatedMonthlyUnits: 620,
    unit: 'lata',
    currentStock: 120,
    minStock: 30,
    maxStock: 250,
    costMethod: 'recipe',
    description: 'Bebida de alto giro com markup tradicional e conveniência.',
    active: true,
    ingredients: [
      { id: 'ing-301', name: 'Lata 350ml Coca / Guaraná (Fardo Distribuidora)', quantity: 1, unit: 'un', unitCost: 2.65, wastePercent: 0, subtotal: 2.65 },
      { id: 'ing-302', name: 'Canudo Biodegradável + Guardanapo', quantity: 1, unit: 'un', unitCost: 0.15, wastePercent: 0, subtotal: 0.15 },
    ],
    stockHistory: [
      { id: 'stk-301', date: '2026-10-14 14:00', type: 'in', quantity: 150, reason: 'Compra distribuidora fardo', previousStock: 22, newStock: 172 },
      { id: 'stk-302', date: '2026-10-17 22:00', type: 'out', quantity: 52, reason: 'Saída vendas', previousStock: 172, newStock: 120 },
    ],
  },
  {
    id: 'prod-4',
    sku: 'CMB-004',
    name: 'Combo Smash + Batata + Bebida',
    category: 'Combos',
    cost: 13.09,
    currentPrice: 24.90,
    targetNetMargin: 0.28,
    estimatedMonthlyUnits: 290,
    unit: 'combo',
    currentStock: 35,
    minStock: 10,
    maxStock: 80,
    costMethod: 'recipe',
    description: 'Combo completo de refeição para elevar ticket médio no delivery.',
    active: true,
    ingredients: [
      { id: 'ing-401', name: 'Hambúrguer Smash Duplo Montado', quantity: 1, unit: 'un', unitCost: 6.89, wastePercent: 0, subtotal: 6.89 },
      { id: 'ing-402', name: 'Batata Rústica Individual', quantity: 1, unit: 'porção', unitCost: 3.40, wastePercent: 0, subtotal: 3.40 },
      { id: 'ing-403', name: 'Refrigerante Lata 350ml', quantity: 1, unit: 'lata', unitCost: 2.80, wastePercent: 0, subtotal: 2.80 },
    ],
    stockHistory: [
      { id: 'stk-401', date: '2026-10-16 11:00', type: 'in', quantity: 40, reason: 'Setup de combo para o fim de semana', previousStock: 5, newStock: 45 },
      { id: 'stk-402', date: '2026-10-17 23:45', type: 'out', quantity: 10, reason: 'Consumo do turno da noite', previousStock: 45, newStock: 35 },
    ],
  },
  {
    id: 'prod-5',
    sku: 'PIZ-005',
    name: 'Pizza Artesanal Calabresa Especial 35cm',
    category: 'Pizzas',
    cost: 14.50,
    currentPrice: 42.00,
    targetNetMargin: 0.32,
    estimatedMonthlyUnits: 180,
    unit: 'un',
    currentStock: 28,
    minStock: 12,
    maxStock: 70,
    costMethod: 'recipe',
    description: 'Massa de fermentação natural 48h, molho pelati italiano, mussarela fatiada e calabresa curada.',
    active: true,
    ingredients: [
      { id: 'ing-501', name: 'Massa Fermentação Longa 350g', quantity: 1, unit: 'un', unitCost: 2.20, wastePercent: 0, subtotal: 2.20 },
      { id: 'ing-502', name: 'Molho de Tomate Pelati Rústico', quantity: 120, unit: 'g', unitCost: 0.015, wastePercent: 0, subtotal: 1.80 },
      { id: 'ing-503', name: 'Queijo Mussarela Especial', quantity: 250, unit: 'g', unitCost: 0.026, wastePercent: 0, subtotal: 6.50 },
      { id: 'ing-504', name: 'Calabresa Artesanal Defumada', quantity: 150, unit: 'g', unitCost: 0.018, wastePercent: 0, subtotal: 2.70 },
      { id: 'ing-505', name: 'Caixa de Pizza Oitavada Térmica', quantity: 1, unit: 'un', unitCost: 1.30, wastePercent: 0, subtotal: 1.30 },
    ],
    stockHistory: [
      { id: 'stk-501', date: '2026-10-15 15:00', type: 'in', quantity: 35, reason: 'Preparo de massas maturadas', previousStock: 3, newStock: 38 },
      { id: 'stk-502', date: '2026-10-17 22:30', type: 'out', quantity: 10, reason: 'Vendas noite de sábado', previousStock: 38, newStock: 28 },
    ],
  },
  {
    id: 'prod-6',
    sku: 'SOB-006',
    name: 'Brownie Fudge com Gotas de Chocolate Belga',
    category: 'Sobremesas',
    cost: 4.20,
    currentPrice: 13.90,
    targetNetMargin: 0.38,
    estimatedMonthlyUnits: 210,
    unit: 'un',
    currentStock: 18,
    minStock: 10,
    maxStock: 60,
    costMethod: 'recipe',
    description: 'Brownie macio e úmido com calda quente de chocolate belga 54% cacau.',
    active: true,
    ingredients: [
      { id: 'ing-601', name: 'Fatia Brownie Cacau 100g', quantity: 1, unit: 'un', unitCost: 2.50, wastePercent: 0, subtotal: 2.50 },
      { id: 'ing-602', name: 'Calda Fudge Chocolate Callebaut', quantity: 40, unit: 'g', unitCost: 0.030, wastePercent: 0, subtotal: 1.20 },
      { id: 'ing-603', name: 'Embalagem Selada Transparente', quantity: 1, unit: 'un', unitCost: 0.50, wastePercent: 0, subtotal: 0.50 },
    ],
    stockHistory: [
      { id: 'stk-601', date: '2026-10-16 11:30', type: 'in', quantity: 25, reason: 'Fornada matinal', previousStock: 5, newStock: 30 },
      { id: 'stk-602', date: '2026-10-17 21:00', type: 'out', quantity: 12, reason: 'Saída pedidos', previousStock: 30, newStock: 18 },
    ],
  },
];

// Canais e taxas exatamente da planilha do usuário
export const INITIAL_CHANNELS: ChannelFee[] = [
  // UAI RANGO
  {
    id: 'uai-online',
    platform: 'uai_rango',
    platformName: 'Uai Rango',
    name: 'Uai Rango Pagamento Online',
    totalRate: 17.49,
    breakdown: {
      appBase: 12.0,
      paymentGateway: 3.5,
      anticipation: 1.99,
    },
    highlight: true,
  },
  {
    id: 'uai-credito',
    platform: 'uai_rango',
    platformName: 'Uai Rango',
    name: 'Uai Rango Pagamentos Crédito',
    totalRate: 16.44,
    breakdown: {
      appBase: 12.0,
      paymentGateway: 0,
      machineRate: 4.44,
    },
  },
  {
    id: 'uai-debito',
    platform: 'uai_rango',
    platformName: 'Uai Rango',
    name: 'Uai Rango Pagamentos Débito',
    totalRate: 13.94,
    breakdown: {
      appBase: 12.0,
      paymentGateway: 0,
      machineRate: 1.94,
    },
  },
  {
    id: 'uai-dinheiro',
    platform: 'uai_rango',
    platformName: 'Uai Rango',
    name: 'Uai Rango Pagamentos no Dinheiro',
    totalRate: 12.0,
    breakdown: {
      appBase: 12.0,
      paymentGateway: 0,
    },
  },

  // TCHAU FOME
  {
    id: 'tf-credito',
    platform: 'tchau_fome',
    platformName: 'Tchau Fome',
    name: 'Tchau Fome Crédito',
    totalRate: 12.44,
    breakdown: {
      appBase: 8.0,
      paymentGateway: 0,
      machineRate: 4.44,
    },
  },
  {
    id: 'tf-debito',
    platform: 'tchau_fome',
    platformName: 'Tchau Fome',
    name: 'Tchau Fome Débito',
    totalRate: 9.94,
    breakdown: {
      appBase: 8.0,
      paymentGateway: 0,
      machineRate: 1.94,
    },
  },
  {
    id: 'tf-pix',
    platform: 'tchau_fome',
    platformName: 'Tchau Fome',
    name: 'Tchau Fome PIX',
    totalRate: 8.99,
    breakdown: {
      appBase: 8.0,
      paymentGateway: 0.99,
    },
    highlight: true,
  },
  {
    id: 'tf-dinheiro',
    platform: 'tchau_fome',
    platformName: 'Tchau Fome',
    name: 'Tchau Fome Dinheiro',
    totalRate: 8.0,
    breakdown: {
      appBase: 8.0,
      paymentGateway: 0,
    },
  },

  // IFOOD PLANO BÁSICO
  {
    id: 'ifood-credito',
    platform: 'ifood',
    platformName: 'iFood Plano Básico',
    name: 'iFood Pagamentos Crédito',
    totalRate: 9.89,
    breakdown: {
      appBase: 6.0,
      paymentGateway: 3.89,
    },
  },
  {
    id: 'ifood-online',
    platform: 'ifood',
    platformName: 'iFood Plano Básico',
    name: 'iFood Pagamento Online',
    totalRate: 9.5,
    breakdown: {
      appBase: 6.0,
      paymentGateway: 3.5,
    },
    highlight: true,
  },
  {
    id: 'ifood-debito',
    platform: 'ifood',
    platformName: 'iFood Plano Básico',
    name: 'iFood Pagamentos Débito',
    totalRate: 7.49,
    breakdown: {
      appBase: 6.0,
      paymentGateway: 1.49,
    },
  },
  {
    id: 'ifood-dinheiro',
    platform: 'ifood',
    platformName: 'iFood Plano Básico',
    name: 'iFood Pagamentos em Dinheiro',
    totalRate: 6.0,
    breakdown: {
      appBase: 6.0,
      paymentGateway: 0,
    },
  },

  // BALCÃO & MEIOS PRÓPRIOS
  {
    id: 'balcao-pix',
    platform: 'balcao',
    platformName: 'Balcão / WhatsApp Próprio',
    name: 'Venda Direta PIX',
    totalRate: 1.0,
    breakdown: {
      appBase: 0,
      paymentGateway: 1.0,
    },
  },
  {
    id: 'balcao-debito',
    platform: 'balcao',
    platformName: 'Balcão / WhatsApp Próprio',
    name: 'Maquininha Débito',
    totalRate: 1.94,
    breakdown: {
      appBase: 0,
      paymentGateway: 1.94,
    },
  },
  {
    id: 'balcao-credito',
    platform: 'balcao',
    platformName: 'Balcão / WhatsApp Próprio',
    name: 'Maquininha Crédito',
    totalRate: 4.44,
    breakdown: {
      appBase: 0,
      paymentGateway: 4.44,
    },
  },
  {
    id: 'balcao-dinheiro',
    platform: 'balcao',
    platformName: 'Balcão / WhatsApp Próprio',
    name: 'Dinheiro em Espécie',
    totalRate: 0.0,
    breakdown: {
      appBase: 0,
      paymentGateway: 0,
    },
  },
];

export const INITIAL_FIXED_EXPENSES: FixedExpenses = {
  ifoodMonthly: 0.0,
  uaiRangoBankFee: 0.0,
  otherFixed: 0.0,
  totalFixed: 0.0,
  profitProjection: 50.0,
  totalWithProfit: 50.0,
};

export const INITIAL_COMPETITORS: CompetitorItem[] = [];

export const USERS: UserProfile[] = [
  {
    id: 'user-admin',
    name: 'Eduardo M. (Diretoria)',
    email: 'emiumtrader@gmail.com',
    role: 'admin',
    title: 'Gestor Geral & Administrador',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    permissions: {
      canEditCosts: true,
      canEditFees: true,
      canEditPrices: true,
      canViewExecutiveReports: true,
      canConfigureWidgets: true,
      canTriggerAI: true,
      canExportReports: true,
    },
  },
  {
    id: 'user-financial',
    name: 'Mariana Silva',
    email: 'mariana.financas@empresa.com',
    role: 'financial',
    title: 'Analista de Controladoria & Custos',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    permissions: {
      canEditCosts: true,
      canEditFees: true,
      canEditPrices: false,
      canViewExecutiveReports: true,
      canConfigureWidgets: true,
      canTriggerAI: true,
      canExportReports: true,
    },
  },
  {
    id: 'user-commercial',
    name: 'Carlos Mendes',
    email: 'carlos.comercial@empresa.com',
    role: 'commercial',
    title: 'Gerente Comercial & Canais',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    permissions: {
      canEditCosts: false,
      canEditFees: false,
      canEditPrices: true,
      canViewExecutiveReports: false,
      canConfigureWidgets: true,
      canTriggerAI: true,
      canExportReports: true,
    },
  },
  {
    id: 'user-operator',
    name: 'Lucas Operações',
    email: 'lucas.caixa@empresa.com',
    role: 'operator',
    title: 'Operador de Caixa & Balcão',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    permissions: {
      canEditCosts: false,
      canEditFees: false,
      canEditPrices: false,
      canViewExecutiveReports: false,
      canConfigureWidgets: false,
      canTriggerAI: false,
      canExportReports: false,
    },
  },
];

export const DEFAULT_ALERT_CONFIG: AlertTriggerConfig = {
  minNetMarginPercent: 12.0, // Alert if net profit drops below 12%
  competitorPriceDropPercent: 6.0, // Alert if competitor price drops by 6%+
  maxChannelFeePercent: 16.0, // Alert if channel fee exceeds 16%
  costInflationPercent: 10.0, // Alert if cost increases by 10%+
  enableBrowserPush: true,
  enableSound: true,
  notifyOnCriticalBreakEven: true,
};

export const INITIAL_WIDGETS: WidgetItem[] = [
  // Financial & CMV
  { id: 'matrix-table', title: 'Matriz de Precificação da Planilha (Multi-Margens)', department: 'financial', visible: true, order: 1, description: 'Tabela completa comparativa de 12%, 13.49%, 15.89% e 17.49% com margens de 20% a 40%.' },
  { id: 'consolidated-profitability', title: 'Dashboard de Rentabilidade Consolidada', department: 'financial', visible: true, order: 2, description: 'Lucro líquido total de todos os produtos ativos com gráfico de barras comparativo por categoria para identificar quais sustentam o faturamento da empresa.' },
  { id: 'profit-goals-dashboard', title: 'Dashboard de Metas de Lucro & Gauge de Progresso', department: 'financial', visible: true, order: 3, description: 'Metas mensais de faturamento e lucro com gráfico de velocímetro (gauge) e projeção de fechamento.' },
  { id: 'cost-seasonality', title: 'Análise de Sazonalidade de Custos & Janela de Compras', department: 'financial', visible: true, order: 4, description: 'Série temporal anual da variação de insumos (carne, queijo, batata) para antecipação de compras.' },
  { id: 'dre-breakdown', title: 'DRE Unitário & Decomposição de Preço', department: 'financial', visible: true, order: 5, description: 'Composição percentual: CMV, Taxa de App, Lucro Líquido Real.' },
  { id: 'what-if-simulator', title: 'Simulador What-If Multi-Variáveis (Custo, Taxas, Margem, Frete)', department: 'financial', visible: true, order: 6, description: 'Ajuste simultâneo de insumos, taxas de app, frete e margem para ver o impacto no lucro.' },
  { id: 'price-margin-evolution', title: 'Evolução de Preço vs Margem & Análise Preditiva (Recharts)', department: 'financial', visible: true, order: 7, description: 'Gráficos preditivos de sensibilidade a custos e evolução temporal de margem com Recharts.' },
  { id: 'breakeven-calc', title: 'Ponto de Equilíbrio & Precificação Blindada', department: 'financial', visible: true, order: 8, description: 'Calculadora da fórmula exata anti-prejuízo e vendas mínimas para cobrir despesas fixas.' },
  { id: 'ai-auditor', title: 'Auditor de Precificação com IA (Gemini)', department: 'financial', visible: true, order: 9, description: 'Diagnóstico contábil, detecção do efeito ilusão de margem e alertas.' },
  
  // Commercial & Channels
  { id: 'channel-comparison', title: 'Comparativo de Canais & Meios de Pagamento', department: 'commercial', visible: true, order: 10, description: 'Uai Rango vs iFood vs Tchau Fome vs Balcão.' },
  { id: 'commercial-channel-manager', title: 'Gestor Comercial de Canais, Comissões & Repasses', department: 'commercial', visible: true, order: 11, description: 'Simulador de repasse líquido bancário por volume de vendas e análise de taxas.' },
  { id: 'competitor-radar', title: 'Radar de Concorrência & Sugestão de Preço', department: 'commercial', visible: true, order: 12, description: 'Monitoramento de preços concorrentes em tempo real e elasticidade.' },

  // Operations
  { id: 'operations-menu-status', title: 'Painel Operacional do Caixa, Cozinha & Canais', department: 'operations', visible: true, order: 13, description: 'Gestão de disponibilidade de itens no delivery, abertura/pausa dos canais e métricas do turno.' },
  { id: 'push-feed', title: 'Central de Alertas & Notificações de Mercado', department: 'operations', visible: true, order: 14, description: 'Avisos de variações de taxas, disparidades de mercado e margens críticas.' },
];

export const INITIAL_NOTIFICATIONS: PushAlert[] = [
  {
    id: 'notif-1',
    title: 'Alerta de Margem Crítica no Uai Rango',
    message: 'No Uai Rango Pagamento Online (17,49% de taxa), ao precificar a R$ 8,61 sua margem líquida real é de apenas 2,55% (R$ 0,22).',
    type: 'danger',
    timestamp: 'Há 5 minutos',
    read: false,
    source: 'margin',
  },
  {
    id: 'notif-2',
    title: 'Concorrência Reduziu Preço',
    message: 'Fast Chapa Lanches reduziu o Smash para R$ 8,90 no Tchau Fome (-9,5% em relação ao seu preço sugerido).',
    type: 'warning',
    timestamp: 'Há 1 hora',
    read: false,
    source: 'market',
  },
  {
    id: 'notif-3',
    title: 'Canal Mais Lucrativo: Balcão Pix',
    message: 'Vendas via Pix direto geram 3,8x mais lucro líquido do que vendas no crédito online.',
    type: 'success',
    timestamp: 'Hoje cedo',
    read: true,
    source: 'fee',
  },
];

// Fórmulas exatas da planilha do usuário
export const SPREADSHEET_MARGINS = [
  { target: 0.20, label: 'MARGEM 20%', costMargin: 0.80 },
  { target: 0.25, label: 'MARGEM 25%', costMargin: 0.75 },
  { target: 0.27, label: 'MARGEM 27%', costMargin: 0.73 },
  { target: 0.30, label: 'MARGEM 30%', costMargin: 0.70 },
  { target: 0.35, label: 'MARGEM 35%', costMargin: 0.65 },
  { target: 0.40, label: 'MARGEM 40%', costMargin: 0.60 },
];

/**
 * Calcula a linha da matriz de precificação idêntica à planilha
 * Preço = Custo / MargemCusto
 * Taxas = Preço * (Taxa% / 100)
 * Lucro Líquido = Preço - Custo - Taxas
 * Alerta Preço Alto = Preço - Custo
 */
export function calculateSpreadsheetRow(cost: number, feeRatePercent: number, marginItem: { target: number; label: string; costMargin: number }): PricingMatrixRow {
  const sellingPrice = Number((cost / marginItem.costMargin).toFixed(2));
  const feeAmount = Number((sellingPrice * (feeRatePercent / 100)).toFixed(2));
  const netProfit = Number((sellingPrice - cost - feeAmount).toFixed(2));
  const highPriceAlert = Number((sellingPrice - cost).toFixed(2));
  const netMarginPercent = sellingPrice > 0 ? Number(((netProfit / sellingPrice) * 100).toFixed(2)) : 0;
  const markupMultiplier = cost > 0 ? Number((sellingPrice / cost).toFixed(3)) : 0;

  // Precificação Blindada: Preço para garantir a margem líquida REAL igual à meta
  // Preço = Custo / (1 - MargemLíquida - TaxaCanal)
  const denominator = 1 - marginItem.target - (feeRatePercent / 100);
  const guaranteedShieldPrice = denominator > 0.05 ? Number((cost / denominator).toFixed(2)) : Number((cost * 2).toFixed(2));
  const guaranteedFee = Number((guaranteedShieldPrice * (feeRatePercent / 100)).toFixed(2));
  const guaranteedNetProfit = Number((guaranteedShieldPrice - cost - guaranteedFee).toFixed(2));

  return {
    targetMargin: marginItem.target,
    marginLabel: marginItem.label,
    costMargin: marginItem.costMargin,
    sellingPrice,
    feeAmount,
    netProfit,
    highPriceAlert,
    netMarginPercent,
    markupMultiplier,
    guaranteedShieldPrice,
    guaranteedNetProfit,
  };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

// Exportador CSV compatível com Microsoft Excel
export function exportPricingToCSV(product: ProductItem, feeRate: number, rows: PricingMatrixRow[]): void {
  const headers = [
    'Margem Alvo (%)',
    'Margem de Custo (Divisor)',
    'Custo do Produto (R$)',
    'Preço de Venda Planilha (R$)',
    'Taxa Canal ' + feeRate + '% (R$)',
    'Lucro Líquido Real (R$)',
    'Margem Líquida Real (%)',
    'Alerta Preço Alto (R$)',
    'Preço Blindado Sugerido (R$)',
    'Lucro Blindado (R$)',
  ];

  const dataRows = rows.map((r) => [
    (r.targetMargin * 100).toFixed(0) + '%',
    r.costMargin.toFixed(2).replace('.', ','),
    product.cost.toFixed(2).replace('.', ','),
    r.sellingPrice.toFixed(2).replace('.', ','),
    r.feeAmount.toFixed(2).replace('.', ','),
    r.netProfit.toFixed(2).replace('.', ','),
    r.netMarginPercent.toFixed(2).replace('.', ',') + '%',
    r.highPriceAlert.toFixed(2).replace('.', ','),
    r.guaranteedShieldPrice.toFixed(2).replace('.', ','),
    r.guaranteedNetProfit.toFixed(2).replace('.', ','),
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM para abrir direto no Excel sem desconfigurar acentuação
    `RELATÓRIO DE PRECIFICAÇÃO E AUDITORIA DE MARGEM - OMNIPRICE AI\n` +
    `Produto:;${product.name}\n` +
    `Custo CMV:;R$ ${product.cost.toFixed(2)}\n` +
    `Taxa do Canal Selecionado:;${feeRate}%\n` +
    `Data da Exportação:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n\n` +
    headers.join(';') +
    '\n' +
    dataRows.map((e) => e.join(';')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `precificacao_${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${feeRate}pct.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Motor heurístico de fallback para auditoria contábil instantânea
 * Executado localmente se a rede estiver offline ou a API demorar
 */
export function generateLocalAuditFallback(
  product: ProductItem,
  channels: ChannelFee[],
  fixedCosts?: FixedExpenses
): PricingAuditResult {
  const cost = Number(product?.cost || 6.89);
  const safeCost = Math.max(0.01, Number(cost) || 0);
  const uaiChannel = channels.find((c) => c.id === 'uai-online') || channels[0] || { totalRate: 17.49 };
  const tfChannel = channels.find((c) => c.id === 'tf-credito') || channels[1] || { totalRate: 12.44 };
  const ifoodChannel = channels.find((c) => c.id === 'ifood-online') || channels[2] || { totalRate: 9.5 };
  const balcaoChannel = channels.find((c) => c.id === 'balcao-pix') || channels[channels.length - 1] || { totalRate: 1.0 };

  const price20 = Number((safeCost / 0.8).toFixed(2));
  const uaiFee = price20 * ((Number(uaiChannel.totalRate) || 0) / 100);
  const realNet = price20 - safeCost - uaiFee;
  const realNetPercent = price20 > 0 ? (realNet / price20) * 100 : 0;

  return {
    status: realNetPercent < 5 ? 'crítico' : realNetPercent < 12 ? 'atenção' : 'saudável',
    score: realNetPercent < 5 ? 58 : 74,
    headline: 'Efeito Ilusão de Margem Detectado: Taxas de Delivery consomem o lucro planejado',
    verdict: `Ao aplicar a fórmula tradicional da planilha [Preço = Custo / (1 - Margem)], você calculou um preço de R$ ${price20.toFixed(2)} esperando 20% de lucro. No entanto, no canal ${'name' in uaiChannel ? uaiChannel.name : 'Uai Rango Pagamento Online'} (${uaiChannel.totalRate}% de taxa), a taxa de R$ ${uaiFee.toFixed(2)} corrói a maior parte do excedente, sobrando apenas R$ ${realNet.toFixed(2)} de lucro líquido real (${realNetPercent.toFixed(2)}%).`,
    marginIllusionAnalysis: 'A planilha calcula a taxa percentual sobre o Preço de Venda final, mas a margem de custo foi calculada sem prever essa despesa variável. É mandatório adotar a Precificação Integrada Blindada.',
    bottlenecks: [
      `Uai Rango Online (${uaiChannel.totalRate}% de taxa): Reduz margem líquida real para ${realNetPercent.toFixed(2)}% no preço base de R$ ${price20.toFixed(2)}.`,
      `Tchau Fome Crédito (${tfChannel.totalRate}% de taxa): Margem líquida real cai para ${((((price20 - safeCost - price20 * (tfChannel.totalRate / 100)) / price20) * 100)).toFixed(2)}% sobre margem nominal de 20%.`,
      'Falta de repasse diferenciado por meio de pagamento (online vs crédito vs dinheiro/Pix).',
    ],
    channelAlerts: [
      {
        channelName: 'Uai Rango',
        subChannel: `Pagamento Online (${uaiChannel.totalRate}%)`,
        currentNetMargin: `${realNetPercent.toFixed(2)}%`,
        warning: 'Margem crítica abaixo do piso operacional aceitável.',
        suggestedAction: `Ajustar preço no canal para no mínimo R$ ${(safeCost / Math.max(0.05, 1 - 0.25 - (uaiChannel.totalRate / 100))).toFixed(2)} para garantir 25% líquido real.`,
      },
      {
        channelName: 'Tchau Fome',
        subChannel: `Crédito (${tfChannel.totalRate}%)`,
        currentNetMargin: `${(((price20 - safeCost - (price20 * (tfChannel.totalRate / 100))) / price20) * 100).toFixed(2)}%`,
        warning: 'Taxa considerável com baixa margem de erro.',
        suggestedAction: `Estimular pagamentos via canal direto (${balcaoChannel.totalRate}%).`,
      },
      {
        channelName: 'iFood Plano Básico',
        subChannel: `Pagamento Online (${ifoodChannel.totalRate}%)`,
        currentNetMargin: `${(((price20 - safeCost - (price20 * (ifoodChannel.totalRate / 100))) / price20) * 100).toFixed(2)}%`,
        warning: 'Taxa moderada, margem sustentável para margens nominais de 25% ou mais.',
        suggestedAction: 'Excelente canal para giro e atração de novos clientes.',
      },
      {
        channelName: 'Balcão / Retirada',
        subChannel: `Pix / Dinheiro (${balcaoChannel.totalRate}%)`,
        currentNetMargin: `${(((price20 - safeCost - (price20 * (balcaoChannel.totalRate / 100))) / price20) * 100).toFixed(2)}%`,
        warning: 'Canal mais rentável de toda a operação gastronômica.',
        suggestedAction: 'Fidelizar clientes com descontos exclusivos no pedido direto via WhatsApp.',
      },
    ],
    smartFormulaRecommendation: {
      explanation: 'Para garantir Margem Líquida Real (MLR) desejada após taxas de app: Preço = CMV / (1 - MLR - TaxaTotalCanal).',
      recommendedMultiplier: `Para 25% líquido no canal principal (${uaiChannel.totalRate}%): Multiplicador ideal = ${(1 / Math.max(0.05, 1 - 0.25 - (uaiChannel.totalRate / 100))).toFixed(3)}x o custo CMV.`,
    },
    actionSteps: [
      'Adote preços dinâmicos por canal: o preço no delivery online deve compensar a taxa da plataforma.',
      'Crie combos exclusivos de delivery com itens de alto markup para diluir taxas de plataforma.',
      'Monitore mensalmente as taxas bancárias e desative antecipações desnecessárias se o fluxo de caixa permitir.',
    ],
  };
}

/**
 * Calcula o custo CMV a partir dos insumos da Ficha Técnica
 */
export function calculateIngredientsCMV(ingredients: ProductIngredient[]): number {
  if (!ingredients || ingredients.length === 0) return 0;
  const total = ingredients.reduce((sum, ing) => {
    const qty = Number(ing.quantity) || 0;
    const unitCost = Number(ing.unitCost) || 0;
    const waste = Number(ing.wastePercent) || 0;
    const sub = qty * unitCost * (1 + waste / 100);
    return sum + sub;
  }, 0);
  return Number(total.toFixed(2));
}

/**
 * Garante que qualquer produto possua estrutura completa de ficha técnica e estoque
 */
export function normalizeProduct(product: ProductItem): ProductItem {
  const hasExplicitCost =
    product.cost !== undefined &&
    product.cost !== null &&
    !Number.isNaN(Number(product.cost));
  const currentCost = hasExplicitCost ? Number(product.cost) : 6.89;

  // Preservar array vazio [] quando o usuário exclui todos os insumos da ficha técnica;
  // gerar insumos iniciais apenas quando o campo estiver ausente (undefined).
  const ingredients: ProductIngredient[] = Array.isArray(product.ingredients)
    ? product.ingredients
    : [
        {
          id: `ing-${product.id}-1`,
          name: 'Base Principal / Insumo Primário',
          quantity: 1,
          unit: product.unit || 'un',
          unitCost: Number((currentCost * 0.7).toFixed(2)),
          wastePercent: 0,
          subtotal: Number((currentCost * 0.7).toFixed(2)),
        },
        {
          id: `ing-${product.id}-2`,
          name: 'Condimento / Acompanhamento / Recheio',
          quantity: 1,
          unit: 'un',
          unitCost: Number((currentCost * 0.2).toFixed(2)),
          wastePercent: 0,
          subtotal: Number((currentCost * 0.2).toFixed(2)),
        },
        {
          id: `ing-${product.id}-3`,
          name: 'Embalagem Térmica / Descartável',
          quantity: 1,
          unit: 'un',
          unitCost: Number((currentCost * 0.1).toFixed(2)),
          wastePercent: 0,
          subtotal: Number((currentCost * 0.1).toFixed(2)),
        },
      ];

  // Preservar histórico vazio [] caso todas as movimentações tenham sido excluídas
  const stockHistory: StockMovement[] = Array.isArray(product.stockHistory)
    ? product.stockHistory
    : [
        {
          id: `stk-${product.id}-init`,
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          type: 'in',
          quantity: product.currentStock ?? 50,
          reason: 'Estoque inicial cadastrado',
          previousStock: 0,
          newStock: product.currentStock ?? 50,
        },
      ];

  return {
    ...product,
    cost: currentCost,
    sku: product.sku || `PRD-${product.id.slice(-4).toUpperCase()}`,
    unit: product.unit || 'un',
    currentStock: product.currentStock ?? 50,
    minStock: product.minStock ?? 15,
    maxStock: product.maxStock ?? 150,
    costMethod: product.costMethod || 'recipe',
    active: product.active ?? true,
    ingredients,
    stockHistory,
    ...(Array.isArray(product.kiloFractions) ? { kiloFractions: product.kiloFractions } : {}),
    ...(typeof product.kgBaseCost === 'number' ? { kgBaseCost: product.kgBaseCost } : {}),
    ...(typeof product.primaryFractionGrams === 'number'
      ? { primaryFractionGrams: product.primaryFractionGrams }
      : {}),
    ...(typeof product.targetNetProfitBRL === 'number'
      ? { targetNetProfitBRL: product.targetNetProfitBRL }
      : {}),
    ...(typeof product.referenceChannelId === 'string' && product.referenceChannelId
      ? { referenceChannelId: product.referenceChannelId }
      : {}),
  };
}

/**
 * Normaliza textos para buscas sem diferenciar acentos, cedilha ou maiúsculas/minúsculas.
 */
export function normalizeSearchText(text?: string | null): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}


