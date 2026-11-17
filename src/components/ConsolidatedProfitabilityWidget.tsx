import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Sparkles,
  Award,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  Scale,
} from 'lucide-react';
import { ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface ConsolidatedProfitabilityWidgetProps {
  products: ProductItem[];
  channels: ChannelFee[];
  selectedProduct?: ProductItem;
  onSelectProduct?: (product: ProductItem) => void;
  onOpenCatalogStudio?: () => void;
}

type ChartMetric = 'nominalProfit' | 'netMarginPercent' | 'revenueVsCost' | 'profitShare';

export const ConsolidatedProfitabilityWidget: React.FC<ConsolidatedProfitabilityWidgetProps> = ({
  products,
  channels,
  selectedProduct,
  onSelectProduct,
  onOpenCatalogStudio,
}) => {
  // Filters & Controls
  const [onlyActive, setOnlyActive] = useState<boolean>(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('weighted'); // 'weighted' or specific channel ID
  const [chartMetric, setChartMetric] = useState<ChartMetric>('nominalProfit');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Active channel determination
  const effectiveChannelRate = useMemo(() => {
    if (selectedChannelId === 'weighted') {
      if (!channels || channels.length === 0) return 0;
      const sum = channels.reduce((acc, ch) => acc + (Number(ch.totalRate) || 0), 0);
      return Number((sum / channels.length).toFixed(2));
    }
    const found = channels.find((c) => c.id === selectedChannelId);
    return found ? found.totalRate : (channels[0]?.totalRate ?? 0);
  }, [selectedChannelId, channels]);

  // Filter products by active state if requested
  const filteredProducts = useMemo(() => {
    if (onlyActive) {
      return products.filter((p) => p.active !== false);
    }
    return products;
  }, [products, onlyActive]);

  // Aggregate profitability data by product category
  const categoryAnalytics = useMemo(() => {
    const feeRate = effectiveChannelRate / 100;
    const catMap = new Map<
      string,
      {
        category: string;
        products: Array<{
          product: ProductItem;
          unitPrice: number;
          unitCost: number;
          unitFee: number;
          unitNetProfit: number;
          unitNetMarginPercent: number;
          monthlyUnits: number;
          monthlyRevenue: number;
          monthlyCost: number;
          monthlyFees: number;
          monthlyNetProfit: number;
        }>;
        totalUnits: number;
        totalRevenue: number;
        totalCost: number;
        totalFees: number;
        totalNetProfit: number;
      }
    >();

    filteredProducts.forEach((p) => {
      const cat = p.category || 'Geral';
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          category: cat,
          products: [],
          totalUnits: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalFees: 0,
          totalNetProfit: 0,
        });
      }

      const item = catMap.get(cat)!;
      const unitPrice = p.currentPrice || 0;
      const unitCost = p.cost || 0;
      const unitFee = unitPrice * feeRate;
      const unitNetProfit = unitPrice - unitCost - unitFee;
      const unitNetMarginPercent = unitPrice > 0 ? (unitNetProfit / unitPrice) * 100 : 0;
      const monthlyUnits = Math.max(0, Number(p.estimatedMonthlyUnits) || 0);

      const monthlyRevenue = unitPrice * monthlyUnits;
      const monthlyCost = unitCost * monthlyUnits;
      const monthlyFees = unitFee * monthlyUnits;
      const monthlyNetProfit = unitNetProfit * monthlyUnits;

      item.products.push({
        product: p,
        unitPrice,
        unitCost,
        unitFee,
        unitNetProfit,
        unitNetMarginPercent,
        monthlyUnits,
        monthlyRevenue,
        monthlyCost,
        monthlyFees,
        monthlyNetProfit,
      });

      item.totalUnits += monthlyUnits;
      item.totalRevenue += monthlyRevenue;
      item.totalCost += monthlyCost;
      item.totalFees += monthlyFees;
      item.totalNetProfit += monthlyNetProfit;
    });

    // Company wide totals
    let companyRevenue = 0;
    let companyCost = 0;
    let companyFees = 0;
    let companyNetProfit = 0;
    let companyUnits = 0;

    Array.from(catMap.values()).forEach((cat) => {
      companyRevenue += cat.totalRevenue;
      companyCost += cat.totalCost;
      companyFees += cat.totalFees;
      companyNetProfit += cat.totalNetProfit;
      companyUnits += cat.totalUnits;
    });

    const categoryList = Array.from(catMap.values()).map((cat) => {
      const avgNetMarginPercent = cat.totalRevenue > 0 ? (cat.totalNetProfit / cat.totalRevenue) * 100 : 0;
      const cmvPercent = cat.totalRevenue > 0 ? (cat.totalCost / cat.totalRevenue) * 100 : 0;
      const profitSharePercent = companyNetProfit > 0 ? (cat.totalNetProfit / companyNetProfit) * 100 : 0;
      const revenueSharePercent = companyRevenue > 0 ? (cat.totalRevenue / companyRevenue) * 100 : 0;

      // Find top profit contributor inside this category
      const sortedProducts = [...cat.products].sort((a, b) => b.monthlyNetProfit - a.monthlyNetProfit);
      const topPerformer = sortedProducts[0]?.product;

      return {
        category: cat.category,
        productCount: cat.products.length,
        totalUnits: cat.totalUnits,
        totalRevenue: cat.totalRevenue,
        totalCost: cat.totalCost,
        totalFees: cat.totalFees,
        totalNetProfit: cat.totalNetProfit,
        avgNetMarginPercent,
        cmvPercent,
        profitSharePercent,
        revenueSharePercent,
        products: sortedProducts,
        topPerformer,
      };
    });

    // Sort categories primarily by total net profit descending (which one sustains the company!)
    categoryList.sort((a, b) => b.totalNetProfit - a.totalNetProfit);

    const overallNetMargin = companyRevenue > 0 ? (companyNetProfit / companyRevenue) * 100 : 0;
    const overallCMV = companyRevenue > 0 ? (companyCost / companyRevenue) * 100 : 0;

    // Identify Pillar category (highest profit share)
    const pillarCategory = categoryList[0];

    // Identify Highest % margin category
    const highestMarginCategory = [...categoryList].sort((a, b) => b.avgNetMarginPercent - a.avgNetMarginPercent)[0];

    // Find company-wide top profit champion product name
    let championName = '';
    let maxProfit = -Infinity;
    for (const cat of categoryList) {
      for (const prod of cat.products) {
        if (prod.monthlyNetProfit > maxProfit) {
          maxProfit = prod.monthlyNetProfit;
          championName = prod.product.name;
        }
      }
    }

    return {
      categories: categoryList,
      companyRevenue,
      companyCost,
      companyFees,
      companyNetProfit,
      companyUnits,
      overallNetMargin,
      overallCMV,
      pillarCategory,
      highestMarginCategory,
      championProductName: championName,
    };
  }, [filteredProducts, effectiveChannelRate]);

  // Data formatted for Recharts
  const chartData = useMemo(() => {
    return categoryAnalytics.categories.map((cat, idx) => ({
      name: cat.category,
      lucroLiquido: Number(cat.totalNetProfit.toFixed(2)),
      faturamento: Number(cat.totalRevenue.toFixed(2)),
      custoCMV: Number(cat.totalCost.toFixed(2)),
      taxasApp: Number(cat.totalFees.toFixed(2)),
      margemPercent: Number(cat.avgNetMarginPercent.toFixed(1)),
      profitShare: Number(cat.profitSharePercent.toFixed(1)),
      revenueShare: Number(cat.revenueSharePercent.toFixed(1)),
      produtosAtivos: cat.productCount,
      unidadesMes: cat.totalUnits,
      topItem: cat.topPerformer?.name || 'N/A',
      index: idx,
    }));
  }, [categoryAnalytics]);

  const lowestFeeChannel = useMemo(() => {
    if (!channels || channels.length === 0) return null;
    return [...channels].sort((a, b) => a.totalRate - b.totalRate)[0];
  }, [channels]);

  const directChannelSavingsBRL = useMemo(() => {
    const lowestRate = (lowestFeeChannel?.totalRate || 0) / 100;
    const lowestFeeCost = categoryAnalytics.companyRevenue * lowestRate;
    return Math.max(0, categoryAnalytics.companyFees - lowestFeeCost);
  }, [categoryAnalytics.companyFees, categoryAnalytics.companyRevenue, lowestFeeChannel]);

  const avgUnitProfit =
    categoryAnalytics.companyUnits > 0
      ? categoryAnalytics.companyNetProfit / categoryAnalytics.companyUnits
      : 0;
  const avgTicket =
    categoryAnalytics.companyUnits > 0
      ? categoryAnalytics.companyRevenue / categoryAnalytics.companyUnits
      : 0;

  // Category Color Palette
  const getCategoryColor = (index: number) => {
    const palette = [
      '#10b981', // Emerald (Líder)
      '#06b6d4', // Cyan
      '#8b5cf6', // Violet
      '#f59e0b', // Amber
      '#3b82f6', // Blue
      '#ec4899', // Pink
      '#14b8a6', // Teal
    ];
    return palette[index % palette.length];
  };

  return (
    <section className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-2xl backdrop-blur-sm space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Dashboard de Rentabilidade Consolidada
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Multi-Produto & Categorias
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
              Análise comparativa do lucro líquido real por categoria: identifique exatamente quais linhas de produtos sustentam o faturamento da empresa.
            </p>
          </div>
        </div>

        {/* CONTROLS STRIP */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Benchmark Channel Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium hidden sm:inline">Canal:</span>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="weighted" className="bg-slate-900 text-slate-100">
                Média Geral dos Canais ({effectiveChannelRate.toFixed(2).replace('.', ',')}%)
              </option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id} className="bg-slate-900 text-slate-100">
                  {ch.name} ({ch.totalRate}%)
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Filter */}
          <button
            onClick={() => setOnlyActive(!onlyActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              onlyActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="Alternar entre apenas produtos ativos ou todo o catálogo"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${onlyActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{onlyActive ? 'Apenas Ativos' : 'Todos os Itens'}</span>
          </button>

          {/* Go to Catalog Studio Button */}
          {onOpenCatalogStudio && (
            <button
              onClick={onOpenCatalogStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
              title="Abrir o Estúdio de Catálogo para editar custos e preços"
            >
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Gerenciar Catálogo</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 EXECUTIVE KPI SUMMARY CARDS COM DADOS REAIS DO CATÁLOGO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Lucro Líquido Total Consolidado */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Lucro Líquido Consolidado
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>{filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {formatBRL(categoryAnalytics.companyNetProfit)}
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">/mês projetado</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Lucro/un: {formatBRL(avgUnitProfit)}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Margem Líquida Real:</span>
            <span className="font-mono font-bold text-emerald-300">
              {formatPercent(categoryAnalytics.overallNetMargin)}
            </span>
          </div>
        </div>

        {/* KPI 2: Faturamento Bruto Estimado */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Faturamento Bruto Mensal
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
              <span>Taxa {effectiveChannelRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {formatBRL(categoryAnalytics.companyRevenue)}
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                {categoryAnalytics.companyUnits.toLocaleString('pt-BR')} itens vendidos/mês
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Ticket: {formatBRL(avgTicket)}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">CMV Médio da Empresa:</span>
            <span className="font-mono font-bold text-cyan-300">
              {formatPercent(categoryAnalytics.overallCMV)} ({formatBRL(categoryAnalytics.companyCost)})
            </span>
          </div>
        </div>

        {/* KPI 3: Categoria Pilar (Sustenta o Faturamento) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950 border border-violet-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
              Categoria Pilar (Sustentáculo)
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/20 text-violet-300 border-violet-500/40">
              <span>
                {categoryAnalytics.pillarCategory
                  ? `${categoryAnalytics.pillarCategory.revenueSharePercent.toFixed(0)}% receita`
                  : '-'}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate block">
              {categoryAnalytics.pillarCategory?.category || 'N/A'}
            </span>
            <span className="text-xs text-violet-300 font-semibold block mt-0.5">
              {categoryAnalytics.pillarCategory
                ? `${formatPercent(categoryAnalytics.pillarCategory.profitSharePercent)} do Lucro da Empresa`
                : '-'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Lucro Líquido Mensal:</span>
            <span className="font-mono font-bold text-violet-300">
              {categoryAnalytics.pillarCategory ? formatBRL(categoryAnalytics.pillarCategory.totalNetProfit) : '-'}
            </span>
          </div>
        </div>

        {/* KPI 4: Categoria Maior Margem % (Máxima Eficiência) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Maior Margem Líquida %
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/40">
              <span>
                {categoryAnalytics.highestMarginCategory
                  ? `${categoryAnalytics.highestMarginCategory.productCount} ${
                      categoryAnalytics.highestMarginCategory.productCount === 1 ? 'item' : 'itens'
                    }`
                  : '-'}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate block">
              {categoryAnalytics.highestMarginCategory?.category || 'N/A'}
            </span>
            <span className="text-xs text-amber-300 font-semibold block mt-0.5">
              {categoryAnalytics.highestMarginCategory
                ? `${formatPercent(categoryAnalytics.highestMarginCategory.avgNetMarginPercent)} de margem real`
                : '-'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Produto Campeão:</span>
            <span className="font-medium text-amber-200 truncate max-w-[130px]" title={categoryAnalytics.championProductName || '-'}>
              {categoryAnalytics.championProductName || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* COMPARATIVE BAR CHART SECTION */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Chart Header & Metric Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Gráfico Comparativo de Desempenho por Categoria</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Visualize a rentabilidade direta de cada categoria com base no volume mensal e taxas operacionais de delivery ({effectiveChannelRate}%).
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-center overflow-x-auto max-w-full">
            <button
              onClick={() => setChartMetric('nominalProfit')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                chartMetric === 'nominalProfit'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lucro Líquido vs CMV vs Faturamento (R$)
            </button>
            <button
              onClick={() => setChartMetric('netMarginPercent')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                chartMetric === 'netMarginPercent'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Margem Líquida (%)
            </button>
            <button
              onClick={() => setChartMetric('profitShare')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                chartMetric === 'profitShare'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              % Sustentação do Lucro
            </button>
          </div>
        </div>

        {/* The Recharts Bar Chart */}
        <div className="w-full h-80 sm:h-96 pt-2">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-xl border border-slate-800/80">
              <Package className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Nenhum produto ativo encontrado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Desative o filtro "Apenas Ativos" ou cadastre novos produtos no estúdio de catálogo para visualizar os comparativos.
              </p>
              <button
                onClick={() => setOnlyActive(false)}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-all"
              >
                Exibir Todos os Produtos
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => {
                  if (chartMetric === 'netMarginPercent' || chartMetric === 'profitShare') {
                    return `${val}%`;
                  }
                  if (val >= 1000) {
                    return `R$ ${(val / 1000).toFixed(0)}k`;
                  }
                  return `R$ ${val}`;
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs space-y-2 backdrop-blur-md min-w-[240px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-white text-sm">{data.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                            {data.produtosAtivos} {data.produtosAtivos === 1 ? 'produto' : 'produtos'}
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Lucro Líquido Real:</span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {formatBRL(data.lucroLiquido)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Margem Líquida %:</span>
                            <span className="font-mono font-bold text-emerald-300">
                              {data.margemPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Faturamento Bruto:</span>
                            <span className="font-mono text-cyan-300">{formatBRL(data.faturamento)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Custo Insumos (CMV):</span>
                            <span className="font-mono text-rose-300">{formatBRL(data.custoCMV)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Taxas Aplicativo ({effectiveChannelRate}%):</span>
                            <span className="font-mono text-slate-300">{formatBRL(data.taxasApp)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                            <span className="text-violet-300 font-semibold">% Lucro da Empresa:</span>
                            <span className="font-mono font-bold text-violet-400">{data.profitShare}%</span>
                          </div>
                          <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
                            <span className="text-slate-500 block">Item Principal:</span>
                            <span className="text-slate-200 font-medium truncate block">{data.topItem}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              />

              {chartMetric === 'nominalProfit' && (
                <>
                  <Bar
                    dataKey="lucroLiquido"
                    name="Lucro Líquido Real (R$)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="custoCMV"
                    name="Custo de Insumos CMV (R$)"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento Total (R$)"
                    fill="#06b6d4"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                </>
              )}

              {chartMetric === 'netMarginPercent' && (
                <>
                  <ReferenceLine
                    y={categoryAnalytics.overallNetMargin}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    label={{
                      value: `Média Geral (${categoryAnalytics.overallNetMargin.toFixed(1)}%)`,
                      fill: '#94a3b8',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Bar
                    dataKey="margemPercent"
                    name="Margem Líquida Real (%)"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.margemPercent >= 25 ? '#10b981' : entry.margemPercent >= 15 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </>
              )}

              {chartMetric === 'profitShare' && (
                <>
                  <Bar
                    dataKey="profitShare"
                    name="Participação no Lucro Total da Empresa (%)"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                    ))}
                  </Bar>
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>

      {/* STRATEGIC MANAGEMENT DIAGNOSTIC (GESTÃO DE CARDÁPIO) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Diagnóstico do Gestor: Quais categorias sustentam a sua empresa?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Insight 1: O Motor Principal */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Award className="w-4 h-4" />
              <span>Sustentáculo de Caixa (Volume & Valor)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              A categoria <strong className="text-white font-bold">{categoryAnalytics.pillarCategory?.category}</strong> é o principal pilar do seu negócio, gerando{' '}
              <strong className="text-emerald-300">{formatPercent(categoryAnalytics.pillarCategory?.profitSharePercent || 0)}</strong> do seu lucro líquido total ({formatBRL(categoryAnalytics.pillarCategory?.totalNetProfit || 0)}/mês). Qualquer reajuste de insumo aqui impacta diretamente o lucro da empresa.
            </p>
          </div>

          {/* Insight 2: Alavanca de Rentabilidade */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Alavanca de Margem Alta</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              A categoria <strong className="text-white font-bold">{categoryAnalytics.highestMarginCategory?.category}</strong> entrega a maior margem líquida percentual ({formatPercent(categoryAnalytics.highestMarginCategory?.avgNetMarginPercent || 0)}). Estimule o consumo dessa linha combinando-a em combos para elevar seu lucro sem sobrecarregar a cozinha.
            </p>
          </div>

          {/* Insight 3: Dica de Precificação Blindada */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Mitigação de Comissões ({effectiveChannelRate}%)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Taxas deste canal consomem <strong className="text-cyan-300">{formatBRL(categoryAnalytics.companyFees)}/mês</strong> do faturamento bruto. Migrar pedidos para{' '}
              <strong className="text-white">{lowestFeeChannel?.name || 'canal direto'}</strong> ({lowestFeeChannel?.totalRate ?? 0}%) recupera até{' '}
              <strong className="text-emerald-300">{formatBRL(directChannelSavingsBRL)}/mês</strong> em margem líquida real.
            </p>
          </div>
        </div>
      </div>

      {/* DETAILED CATEGORY & PRODUCTS BREAKDOWN TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Detalhamento por Categoria e Fichas Técnicas</span>
            <span className="text-[11px] text-slate-400 font-normal">
              (Clique em uma categoria para expandir seus produtos)
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {categoryAnalytics.categories.length} categorias cadastradas
          </span>
        </div>

        <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-3 text-center">Itens Ativos</th>
                <th className="py-3 px-3 text-right">Volume Mês</th>
                <th className="py-3 px-3 text-right">Faturamento</th>
                <th className="py-3 px-3 text-right">Custo CMV</th>
                <th className="py-3 px-3 text-right text-emerald-400">Lucro Líquido</th>
                <th className="py-3 px-3 text-right">Margem Real %</th>
                <th className="py-3 px-3 text-right text-violet-400">% Sustentação</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categoryAnalytics.categories.map((cat, idx) => {
                const isExpanded = expandedCategory === cat.category;
                const isPillar = idx === 0;

                return (
                  <React.Fragment key={cat.category}>
                    <tr
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                      className={`hover:bg-slate-850/60 cursor-pointer transition-colors ${
                        isPillar ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{cat.category}</span>
                        {isPillar && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-bold">
                            Líder
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                        {cat.productCount}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                        {cat.totalUnits.toLocaleString('pt-BR')} un
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-cyan-300">
                        {formatBRL(cat.totalRevenue)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-rose-300">
                        {formatBRL(cat.totalCost)}{' '}
                        <span className="text-[10px] text-slate-400">({cat.cmvPercent.toFixed(1)}%)</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                        {formatBRL(cat.totalNetProfit)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-slate-200">
                            {formatPercent(cat.avgNetMarginPercent)}
                          </span>
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, cat.avgNetMarginPercent * 2.5))}%` }}
                              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                              className={`h-full rounded-full ${
                                cat.avgNetMarginPercent >= 25
                                  ? 'bg-emerald-400'
                                  : cat.avgNetMarginPercent >= 15
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-violet-300">
                            {formatPercent(cat.profitSharePercent)}
                          </span>
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, cat.profitSharePercent))}%` }}
                              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                              className="h-full bg-violet-400 rounded-full"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold">
                          {isExpanded ? 'Recolher' : 'Ver Fichas'}
                        </span>
                      </td>
                    </tr>

                    {/* EXPANDED PRODUCTS ACCORDION */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 bg-slate-900/60 border-y border-slate-800">
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-semibold text-slate-300">
                                Produtos da categoria {cat.category} ({cat.products.length} itens)
                              </span>
                              <span>Ordenados por contribuição de lucro mensal</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {cat.products.map(({ product, unitPrice, unitCost, unitNetProfit, unitNetMarginPercent, monthlyUnits, monthlyNetProfit }) => {
                                const isCurrentSelected = selectedProduct?.id === product.id;

                                return (
                                  <div
                                    key={product.id}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                      isCurrentSelected
                                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-white text-xs">{product.name}</span>
                                          {product.sku && (
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                              {product.sku}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[11px] text-slate-400 block mt-0.5">
                                          Giro est.: {monthlyUnits} un/mês
                                        </span>
                                      </div>

                                      {onSelectProduct && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectProduct(product);
                                          }}
                                          className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 ${
                                            isCurrentSelected
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                                          }`}
                                          title="Carregar este produto no motor de precificação e matriz"
                                        >
                                          {isCurrentSelected ? 'Em Análise' : 'Precificar'}
                                        </button>
                                      )}
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px]">
                                      <div>
                                        <span className="text-slate-500 block text-[9px] uppercase">Preço / CMV</span>
                                        <span className="font-mono font-medium text-white">
                                          {formatBRL(unitPrice)} <span className="text-slate-400 text-[10px]">({formatBRL(unitCost)})</span>
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[9px] uppercase">Margem Real</span>
                                        <span className="font-mono font-bold text-emerald-300">
                                          {formatPercent(unitNetMarginPercent)}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-slate-500 block text-[9px] uppercase">Lucro Mês</span>
                                        <span className="font-mono font-bold text-emerald-400">
                                          {formatBRL(monthlyNetProfit)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
