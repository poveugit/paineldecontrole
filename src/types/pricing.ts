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

export interface KiloFractionOption {
  id: string;
  label: string;
  grams: number; // Quantidade fracionada em gramas (ex: 100, 250, 500)
  sellingPrice: number; // Valor de venda praticado para essa fração do kilo
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
  kiloFractions?: KiloFractionOption[];
  kgBaseCost?: number; // Custo de referência de 1 kg (1000g) quando há fração principal ativa
  primaryFractionGrams?: number; // Fração ativa em gramas usada como custo/preço principal no catálogo
  targetNetProfitBRL?: number; // Meta opcional de lucro líquido fixo em R$ por unidade vendida
  referenceChannelId?: string; // Canal selecionado no estúdio para compor o preço base (ex: 'tf-credito')
  externalSource?: string; // Origem da sincronização externa (ex: 'superluna')
  externalId?: string; // Código externo / SKU / EAN na loja de origem
  externalUrl?: string; // URL do produto no site de origem
  previousCost?: number; // Custo anterior antes da última sincronização automática
  lastCostSyncAt?: string; // Data/hora ISO da última atualização automática de custo
}

export interface ExternalSyncConfig {
  id: string;
  enabled: boolean;
  sourceName: string;
  sourceUrl: string;
  storeBranchLabel: string;
  apiToken: string;
  autoCreateNew: boolean;
  autoUpdateCost: boolean;
  autoRecalculateSellingPrice: boolean;
  defaultTargetMargin: number; // ex: 0.25 (25%)
  defaultTargetProfitBRL?: number; // Lucro líquido desejado fixo em R$ por unidade (opcional; sobrepõe margem %)
  referenceChannelId: string;
  priceRounding: 'none' | '90' | '99';
  minPriceChangeAlertPercent: number;
  updatedAt?: string;
}

export interface ExternalSyncProductInput {
  externalId?: string;
  sku?: string;
  ean?: string;
  name: string;
  category?: string;
  price: number;
  promoPrice?: number;
  unit?: string;
  url?: string;
  inStock?: boolean;
  storeBranch?: string;
}

export interface ExternalSyncDiffItem {
  action: 'created' | 'cost_increased' | 'cost_decreased' | 'unchanged';
  productId: string;
  sku: string;
  name: string;
  category: string;
  oldCost: number | null;
  newCost: number;
  oldPrice: number | null;
  newPrice: number;
  diffPercent: number;
}

export interface ExternalSyncRunLog {
  id: string;
  timestamp: string;
  source: string;
  sourceLabel: string;
  trigger: 'api_webhook' | 'manual_import' | 'browser_script';
  totalReceived: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  priceIncreases: number;
  priceDecreases: number;
  changes: ExternalSyncDiffItem[];
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
