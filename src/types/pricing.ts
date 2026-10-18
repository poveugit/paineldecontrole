export type PlatformKey = 'uai_rango' | 'tchau_fome' | 'ifood' | 'balcao' | 'custom';

export interface ChannelFee {
  id: string;
  platform: PlatformKey;
  platformName: string;
  name: string;
  totalRate: number; // e.g. 17.49 for 17.49%
  breakdown: {
    appBase: number;
    paymentGateway: number;
    anticipation?: number;
    machineRate?: number;
  };
  highlight?: boolean;
}

export interface PricingMatrixRow {
  targetMargin: number; // e.g. 0.20
  marginLabel: string; // "Margem 20%"
  costMargin: number; // e.g. 0.80
  sellingPrice: number; // e.g. 8.61
  feeAmount: number; // e.g. 1.51
  netProfit: number; // e.g. 0.22
  highPriceAlert: number; // e.g. 1.72
  netMarginPercent: number; // (netProfit / sellingPrice) * 100
  markupMultiplier: number; // sellingPrice / cost
  guaranteedShieldPrice: number; // Cost / (1 - targetMargin - feeRate)
  guaranteedNetProfit: number; // Profit if using guarded pricing
}

export interface ProductIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string; // 'un' | 'g' | 'kg' | 'ml' | 'l' | 'pct'
  unitCost: number; // Custo unitário do insumo
  wastePercent?: number; // % perda / rendimento
  subtotal: number; // Calculado: quantity * unitCost * (1 + wastePercent/100)
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'in' | 'out' | 'adjust'; // entrada, saída/venda/perda, balanço/inventário
  quantity: number;
  reason: string;
  previousStock: number;
  newStock: number;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  cost: number; // CMV total (e.g. 6.89)
  currentPrice: number;
  targetNetMargin: number; // default 0.25 (25%)
  estimatedMonthlyUnits: number;
  description?: string;
  isCustom?: boolean;
  active?: boolean;
  sku?: string;
  unit?: string;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  ingredients?: ProductIngredient[];
  stockHistory?: StockMovement[];
  costMethod?: 'manual' | 'recipe'; // Se o custo é calculado pela ficha ou digitado
}

export interface FixedExpenses {
  ifoodMonthly: number;
  uaiRangoBankFee: number;
  otherFixed: number;
  totalFixed: number;
  profitProjection: number;
  totalWithProfit: number;
}

export interface CompetitorItem {
  id: string;
  name: string;
  platform: string;
  price: number;
  lastUpdated: string;
  distanceKm: number;
  differenceToUs: number; // in %
  threatLevel: 'low' | 'medium' | 'high';
}

export type UserRole = 'admin' | 'commercial' | 'financial' | 'operator';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar: string;
  permissions: {
    canEditCosts: boolean;
    canEditFees: boolean;
    canEditPrices: boolean;
    canViewExecutiveReports: boolean;
    canConfigureWidgets: boolean;
    canTriggerAI: boolean;
    canExportReports: boolean;
  };
}

export type DepartmentKey = 'all' | 'financial' | 'commercial' | 'operations';

export interface WidgetItem {
  id: string;
  title: string;
  department: DepartmentKey;
  visible: boolean;
  order: number;
  description: string;
}

export interface PushAlert {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  source: 'market' | 'margin' | 'fee' | 'system';
}

export interface PricingAuditResult {
  status: 'crítico' | 'atenção' | 'saudável';
  score: number;
  headline: string;
  verdict: string;
  marginIllusionAnalysis: string;
  bottlenecks: string[];
  channelAlerts: Array<{
    channelName: string;
    subChannel: string;
    currentNetMargin: string;
    warning: string;
    suggestedAction: string;
  }>;
  smartFormulaRecommendation: {
    explanation: string;
    recommendedMultiplier: string;
  };
  actionSteps: string[];
}

export interface AlertTriggerConfig {
  minNetMarginPercent: number; // e.g. 12%
  competitorPriceDropPercent: number; // e.g. 5%
  maxChannelFeePercent: number; // e.g. 16%
  costInflationPercent: number; // e.g. 10%
  enableBrowserPush: boolean;
  enableSound: boolean;
  notifyOnCriticalBreakEven: boolean;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  productCost: number;
  channelFeeRate: number;
  deliverySubsidy: number; // Frete subsidiado em R$
  packagingCost: number; // Embalagem adicional em R$
  targetNetMargin: number; // 0.20 -> 20%
  monthlyUnits: number;
  calculatedPrice: number;
  calculatedNetProfit: number;
  calculatedMonthlyProfit: number;
  calculatedMarginPercent: number;
}

