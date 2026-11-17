import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Table,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { ProductItem, PricingMatrixRow, ChannelFee } from '../types/pricing';
import {
  SPREADSHEET_MARGINS,
  INITIAL_CHANNELS,
  calculateSpreadsheetRow,
  calculateIngredientsCMV,
  formatBRL,
  formatPercent,
} from '../utils/pricingEngine';

interface SpreadsheetMatrixProps {
  product: ProductItem;
  products?: ProductItem[];
  channels?: ChannelFee[];
  preferredChannelId?: string;
  canEditCosts: boolean;
  onUpdateProductCost: (newCost: number) => void;
  onApplyRecommendedPrice?: (price: number) => void;
  isPortfolioMode?: boolean;
}

export const SpreadsheetMatrix: React.FC<SpreadsheetMatrixProps> = ({
  product,
  products = [],
  channels = INITIAL_CHANNELS,
  preferredChannelId,
  canEditCosts,
  onUpdateProductCost,
  onApplyRecommendedPrice,
  isPortfolioMode = false,
}) => {
  const rateOptions = useMemo(() => {
    const source = channels.length > 0 ? channels : INITIAL_CHANNELS;
    const maxRate = Math.max(...source.map((c) => Number(c.totalRate) || 0));
    return source.map((ch) => ({
      id: ch.id,
      rate: Number(ch.totalRate) || 0,
      label: ch.name,
      platformName: ch.platformName,
      isMax: (Number(ch.totalRate) || 0) === maxRate && maxRate > 0,
      highlight: ch.highlight,
    }));
  }, [channels]);

  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    preferredChannelId && rateOptions.some((r) => r.id === preferredChannelId)
      ? preferredChannelId
      : rateOptions[0]?.id || 'uai-online'
  );
  const [showAllRates, setShowAllRates] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [showShieldComparison, setShowShieldComparison] = useState(true);

  const initialProductCostsRef = useRef<Record<string, number>>({});
  if (product.id && initialProductCostsRef.current[product.id] === undefined) {
    initialProductCostsRef.current[product.id] = Number(product.cost) || 0;
  }
  const restoreCostValue = useMemo(() => {
    if (product.ingredients && product.ingredients.length > 0) {
      const recipeCost = calculateIngredientsCMV(product.ingredients);
      if (recipeCost > 0) return recipeCost;
    }
    return initialProductCostsRef.current[product.id] ?? (Number(product.cost) || 0);
  }, [product.id, product.ingredients, product.cost]);

  useEffect(() => {
    if (preferredChannelId && rateOptions.some((r) => r.id === preferredChannelId)) {
      setSelectedChannelId(preferredChannelId);
    } else if (rateOptions.length > 0 && !rateOptions.some((r) => r.id === selectedChannelId)) {
      setSelectedChannelId(rateOptions[0].id);
    }
  }, [preferredChannelId, rateOptions, selectedChannelId]);

  const activeChannelOption =
    rateOptions.find((r) => r.id === selectedChannelId) || rateOptions[0] || {
      id: 'uai-online',
      rate: 17.49,
      label: 'Uai Rango Pagamento Online',
      platformName: 'Uai Rango',
      isMax: true,
    };

  const activeRateTab = activeChannelOption.rate;

  const visibleRateCards = useMemo(() => {
    if (showAllRates || rateOptions.length <= 4) return rateOptions;
    const baseFour = rateOptions.slice(0, 4);
    if (baseFour.some((r) => r.id === activeChannelOption.id)) {
      return baseFour;
    }
    return [...rateOptions.slice(0, 3), activeChannelOption];
  }, [showAllRates, rateOptions, activeChannelOption]);

  // Generate rows for a specific rate based on product.cost (or weighted avg cost in portfolio mode)
  const getRowsForRate = (rate: number): PricingMatrixRow[] => {
    return SPREADSHEET_MARGINS.map((m) => calculateSpreadsheetRow(product.cost, rate, m));
  };

  const currentRows = getRowsForRate(activeRateTab);

  // Métricas reais do produto ou média ponderada real do catálogo no modo Visão Geral
  const executiveMetrics = useMemo(() => {
    const sim30Row = currentRows[2] || currentRows[0];

    let activeCount = 1;
    let totalUnits = Math.max(0, Number(product.estimatedMonthlyUnits) || 0);
    let realPrice = Number(product.currentPrice) || 0;
    let realCost = Number(product.cost) || 0;
    let realFee = Number(((realPrice * activeRateTab) / 100).toFixed(2));
    let realProfit = Number((realPrice - realCost - realFee).toFixed(2));
    let realMarginPct = realPrice > 0 ? (realProfit / realPrice) * 100 : 0;
    let monthlyCost = Number((realCost * totalUnits).toFixed(2));
    let monthlyProfit = Number((realProfit * totalUnits).toFixed(2));

    if (isPortfolioMode && products.length > 0) {
      const activeList = products.filter((p) => p.active);
      const targetList = activeList.length > 0 ? activeList : products;
      activeCount = targetList.length;

      const hasPositiveUnits = targetList.some((p) => (Number(p.estimatedMonthlyUnits) || 0) > 0);
      let sumUnits = 0;
      let sumRevenue = 0;
      let sumCost = 0;
      let sumFee = 0;
      let weightedPriceSum = 0;
      let weightedCostSum = 0;
      let weightedFeeSum = 0;
      let totalWeight = 0;

      targetList.forEach((p) => {
        const units = Math.max(0, Number(p.estimatedMonthlyUnits) || 0);
        const weight = hasPositiveUnits ? units : 1;
        const price = Number(p.currentPrice) || 0;
        const cost = Number(p.cost) || 0;
        const unitFee = Number(((price * activeRateTab) / 100).toFixed(2));

        sumUnits += units;
        sumRevenue += price * units;
        sumCost += cost * units;
        sumFee += unitFee * units;

        totalWeight += weight;
        weightedPriceSum += price * weight;
        weightedCostSum += cost * weight;
        weightedFeeSum += unitFee * weight;
      });

      const safeWeight = totalWeight > 0 ? totalWeight : 1;
      totalUnits = sumUnits;
      realPrice = Number((weightedPriceSum / safeWeight).toFixed(2));
      realCost = Number((weightedCostSum / safeWeight).toFixed(2));
      realFee = Number((weightedFeeSum / safeWeight).toFixed(2));
      realProfit = Number((realPrice - realCost - realFee).toFixed(2));
      realMarginPct = realPrice > 0 ? (realProfit / realPrice) * 100 : 0;
      monthlyCost = Number(sumCost.toFixed(2));
      monthlyProfit = Number((sumRevenue - sumCost - sumFee).toFixed(2));
    }

    const sim30Price = sim30Row?.sellingPrice || 0;
    const priceDiffPct =
      sim30Price > 0 ? Number((((realPrice - sim30Price) / sim30Price) * 100).toFixed(1)) : 0;
    const cmvSharePct = realPrice > 0 ? (realCost / realPrice) * 100 : 0;

    return {
      activeCount,
      totalUnits,
      realPrice,
      sim30Price,
      sim30Margin: sim30Row?.netMarginPercent || 0,
      priceDiffPct,
      realCost,
      cmvSharePct,
      monthlyCost,
      realFee,
      realProfit,
      monthlyProfit,
      realMarginPct,
    };
  }, [product, products, isPortfolioMode, currentRows, activeRateTab]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Table className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                Matriz de Precificação & Auditoria de Margem Real
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Planilha Excel Conectada
                </span>
                {isPortfolioMode && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Visão Geral: Média do Catálogo
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isPortfolioMode
                  ? 'Comparativo consolidado baseado no CMV médio ponderado do catálogo ativo e impacto real das taxas.'
                  : 'Comparativo idêntico à sua planilha, com auditoria instantânea do impacto das taxas sobre o lucro líquido.'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Shield Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowShieldComparison(!showShieldComparison)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showShieldComparison
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Precificação Blindada Anti-Prejuízo</span>
          </button>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'single' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aba Individual
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Comparar Todas as Taxas
            </button>
          </div>
        </div>
      </div>

      {/* Explicação Clara quando em Modo Visão Geral */}
      {isPortfolioMode && (
        <div className="mt-5 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-3">
          <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-cyan-300">Como ler no modo Todos os Produtos:</strong> Os cartões abaixo exibem a{' '}
            <strong className="text-white">média ponderada real</strong> dos preços praticados e CMV dos{' '}
            <strong className="text-white">{executiveMetrics.activeCount} produtos ativos</strong> (ponderados pelo volume mensal de vendas). Já a tabela da planilha simula preços ideais para margens de 20% a 50% a partir desse CMV médio ({formatBRL(executiveMetrics.realCost)}).
          </p>
        </div>
      )}

      {/* Cartões Executivos de Métricas Reais de Precificação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {/* Card 1: Ticket Médio / Preço Praticado Real */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isPortfolioMode ? 'Ticket Médio Praticado' : 'Preço Praticado Atual'}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform group-hover:scale-105 ${
                executiveMetrics.priceDiffPct >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
              title="Diferença do preço praticado em relação à linha de 30% nominal da planilha"
            >
              {executiveMetrics.priceDiffPct >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-amber-300" />
              )}
              <span>
                {executiveMetrics.priceDiffPct >= 0
                  ? `+${executiveMetrics.priceDiffPct}%`
                  : `${executiveMetrics.priceDiffPct}%`}{' '}
                vs 30%
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-black text-white font-mono">
              {formatBRL(executiveMetrics.realPrice)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Tab. 30%: {formatBRL(executiveMetrics.sim30Price)}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isPortfolioMode
                ? `Média real de ${executiveMetrics.activeCount} produtos`
                : 'Preço atual no cardápio'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isPortfolioMode
                ? `${executiveMetrics.totalUnits.toLocaleString('pt-BR')} un/mês`
                : `Meta ${(product.targetNetMargin * 100).toFixed(0)}%`}
            </span>
          </div>
        </div>

        {/* Card 2: Margem Líquida Real */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Margem Líquida Real
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                executiveMetrics.realMarginPct >= 20
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : executiveMetrics.realMarginPct >= 10
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              <span>
                {executiveMetrics.realMarginPct >= 20
                  ? 'Saudável'
                  : executiveMetrics.realMarginPct >= 10
                  ? 'Atenção'
                  : 'Crítica'}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-black text-cyan-300 font-mono">
              {formatPercent(executiveMetrics.realMarginPct)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Tab. 30%: {formatPercent(executiveMetrics.sim30Margin)}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Taxa {activeRateTab.toFixed(2).replace('.', ',')}% retida</span>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
              {activeChannelOption.platformName}
            </span>
          </div>
        </div>

        {/* Card 3: Custo Insumos CMV */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isPortfolioMode ? 'CMV Médio Ponderado' : 'Custo Insumos (CMV)'}
            </span>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-800 text-slate-300 border-slate-700 font-mono">
              {executiveMetrics.cmvSharePct.toFixed(1)}% do preço
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-black text-white font-mono">
              {formatBRL(executiveMetrics.realCost)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {isPortfolioMode
                ? `Mês: ${formatBRL(executiveMetrics.monthlyCost)}`
                : 'Custo unitário'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Peso médio dos insumos</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isPortfolioMode ? 'Catálogo ativo' : product.unit || 'un'}
            </span>
          </div>
        </div>

        {/* Card 4: Lucro Líquido Unitário */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isPortfolioMode ? 'Lucro Líquido Médio / Un' : 'Lucro Líquido Unitário'}
            </span>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-500/15 text-rose-300 border-rose-500/30 font-mono">
              Taxa -{formatBRL(executiveMetrics.realFee)}
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              className={`text-xl font-black font-mono ${
                executiveMetrics.realProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatBRL(executiveMetrics.realProfit)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {isPortfolioMode
                ? `Mês: ${formatBRL(executiveMetrics.monthlyProfit)}`
                : 'Líquido no bolso'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>No bolso após taxas</span>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
              {activeChannelOption.label}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Simulator Bar */}
      <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">
              {isPortfolioMode ? 'Custo Médio Ponderado do Catálogo (CMV Unitário)' : 'Custo de Produtos (CMV Unitário)'}
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              {formatBRL(product.cost)}
              <span className="text-xs font-normal text-slate-500">
                ({product.name})
              </span>
            </div>
          </div>
        </div>

        {canEditCosts && !isPortfolioMode && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs text-slate-400 font-medium shrink-0">Ajustar Custo R$:</label>
            <input
              type="number"
              step="0.05"
              min="0.50"
              value={product.cost}
              onChange={(e) => onUpdateProductCost(parseFloat(e.target.value) || 0)}
              className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => onUpdateProductCost(restoreCostValue)}
              className="text-xs text-slate-400 hover:text-emerald-400 underline cursor-pointer"
              title={`Restaurar custo original de ${formatBRL(restoreCostValue)}`}
            >
              Restaurar ({formatBRL(restoreCostValue)})
            </button>
          </div>
        )}
      </div>

      {/* Rate Tabs (Single View Mode) with Expandable All-Rates Toggle */}
      {viewMode === 'single' && (
        <div className="mb-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-400 font-medium">
              Taxas Praticadas por Canal{' '}
              <span className="text-slate-500 font-mono">
                (exibindo {visibleRateCards.length} de {rateOptions.length})
              </span>
            </div>
            {rateOptions.length > 4 && (
              <button
                onClick={() => setShowAllRates((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all shadow-sm"
              >
                {showAllRates ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher taxas (4 principais)</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Mostrar todas as taxas (+{rateOptions.length - 4})</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {visibleRateCards.map((preset) => {
              const isActive = activeChannelOption.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedChannelId(preset.id)}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-br from-slate-800 to-slate-850 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`text-base font-bold font-mono ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {preset.rate.toFixed(2).replace('.', ',')}%
                    </span>
                    {preset.isMax ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Maior Taxa
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 truncate max-w-[90px]">
                        {preset.platformName}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 truncate" title={preset.label}>
                    {preset.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning Notice about the "Margin Illusion" */}
      <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-amber-300 font-semibold">Auditoria da Planilha:</strong> Quando você precifica com{' '}
          <strong className="text-white">Margem de 20% (divisor 0,8)</strong> gerando Preço de{' '}
          <strong className="text-white">{formatBRL(currentRows[0]?.sellingPrice || 0)}</strong>, no canal{' '}
          <strong className="text-white">
            {activeChannelOption.label} ({activeRateTab.toFixed(2).replace('.', ',')}% de taxas)
          </strong>
          , sobram apenas{' '}
          <strong className="text-emerald-400 font-mono">
            {formatBRL(currentRows[0]?.netProfit || 0)} ({currentRows[0]?.netMarginPercent}%)
          </strong>{' '}
          de lucro líquido real! A coluna verde{' '}
          <strong className="text-emerald-300">"Preço Blindado"</strong> mostra o valor exato a ser praticado para reter a margem
          desejada no bolso.
        </div>
      </div>

      {/* Main Spreadsheet Table */}
      {viewMode === 'single' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <th className="py-3.5 px-4 sm:px-6 font-semibold">Parâmetro da Planilha</th>
                {currentRows.map((col) => (
                  <th key={col.marginLabel} className="py-3.5 px-4 sm:px-6 font-bold text-center text-white font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 inline-block">
                      {col.marginLabel}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {/* Row 1: CUSTO DE PRODUTOS */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-slate-300">CUSTO DE PRODUTOS</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-slate-300">
                    {formatBRL(product.cost)}
                  </td>
                ))}
              </tr>

              {/* Row 2: MARGEM DE LUCRO */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-slate-300">MARGEM DE LUCRO (NOMINAL)</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-cyan-300 font-semibold">
                    {col.targetMargin.toString().replace('.', ',')}
                  </td>
                ))}
              </tr>

              {/* Row 3: MARGEM DE CUSTO */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-slate-300">MARGEM DE CUSTO (DIVISOR)</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-slate-400">
                    {col.costMargin.toString().replace('.', ',')}
                  </td>
                ))}
              </tr>

              {/* Row 4: PREÇO DE VENDA */}
              <tr className="hover:bg-slate-900/40 transition-colors bg-emerald-500/5">
                <td className="py-3.5 px-4 sm:px-6 font-sans font-bold text-white">PREÇO DE VENDA (PLANILHA)</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3.5 px-4 sm:px-6 text-center font-bold text-white text-sm sm:text-base">
                    {formatBRL(col.sellingPrice)}
                  </td>
                ))}
              </tr>

              {/* Row 5: TAXAS */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-rose-300">
                  TAXAS DO CANAL ({activeRateTab}%)
                </td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-rose-400">
                    - {formatBRL(col.feeAmount)}
                  </td>
                ))}
              </tr>

              {/* Row 6: LUCRO LÍQUIDO */}
              <tr className="hover:bg-slate-900/40 transition-colors bg-emerald-500/10">
                <td className="py-3 px-4 sm:px-6 font-sans font-bold text-emerald-400">LUCRO LÍQUIDO REAL</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center font-bold text-emerald-400 text-sm">
                    {formatBRL(col.netProfit)}
                  </td>
                ))}
              </tr>

              {/* Row 7: MARGEM LÍQUIDA REAL % (AUDITORIA EXCLUSIVA) */}
              <tr className="hover:bg-slate-900/40 transition-colors bg-slate-900/80">
                <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-200">
                  MARGEM LÍQUIDA REAL (%)
                </td>
                {currentRows.map((col, idx) => {
                  const isCritical = col.netMarginPercent < 10;
                  const isModerate = col.netMarginPercent >= 10 && col.netMarginPercent < 20;
                  return (
                    <td key={idx} className="py-2.5 px-3.5 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isModerate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {formatPercent(col.netMarginPercent)}
                        </span>
                        {/* Animated Visual Margin Bar */}
                        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, col.netMarginPercent * 3.5))}%` }}
                            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-rose-500' : isModerate ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 8: ALERTA DE PREÇO ALTO */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-2.5 px-3.5 font-sans font-medium text-slate-400">
                  ALERTA DE PREÇO ALTO (MARGEM BRUTA)
                </td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-2.5 px-3.5 text-center text-slate-300">
                    {formatBRL(col.highPriceAlert)}
                  </td>
                ))}
              </tr>

              {/* Optional Shield Rows */}
              {showShieldComparison && (
                <>
                  <tr className="border-t-2 border-emerald-500/40 bg-emerald-950/20">
                    <td className="py-3 px-3.5 font-sans font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      PREÇO BLINDADO SUGERIDO (IA)
                    </td>
                    {currentRows.map((col, idx) => (
                      <td key={idx} className="py-3 px-3.5 text-center font-bold text-emerald-300 text-sm">
                        {formatBRL(col.guaranteedShieldPrice)}
                        {onApplyRecommendedPrice && !isPortfolioMode && (
                          <button
                            onClick={() => onApplyRecommendedPrice(col.guaranteedShieldPrice)}
                            className="block mx-auto mt-1 text-[9px] font-sans px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 transition-all"
                            title="Adotar este preço para este produto"
                          >
                            Adotar
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-emerald-950/20">
                    <td className="py-2.5 px-3.5 font-sans font-medium text-emerald-400/90">
                      LUCRO COM PREÇO BLINDADO
                    </td>
                    {currentRows.map((col, idx) => (
                      <td key={idx} className="py-2.5 px-3.5 text-center font-bold text-emerald-400">
                        {formatBRL(col.guaranteedNetProfit)} ({(col.targetMargin * 100).toFixed(0)}% Real)
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Multi-Rate Grid Comparison (All Configured Channels) */
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Comparativo completo de todos os{' '}
              <strong className="text-white">{showAllRates ? rateOptions.length : visibleRateCards.length}</strong>{' '}
              canais e taxas
            </span>
            {rateOptions.length > 4 && (
              <button
                onClick={() => setShowAllRates((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all shadow-sm"
              >
                {showAllRates ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher para 4 principais</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expandir e mostrar todas ({rateOptions.length} taxas)</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(showAllRates ? rateOptions : visibleRateCards).map((preset) => {
              const rows = getRowsForRate(preset.rate);
              return (
                <div key={preset.id} className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div>
                      <span className="text-sm font-bold text-white font-mono">
                        {preset.rate.toFixed(2).replace('.', ',')}% de Taxas
                      </span>
                      <span className="text-xs text-slate-400 block">
                        {preset.label} • {preset.platformName}
                      </span>
                    </div>
                    {preset.isMax && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                        Maior Taxa
                      </span>
                    )}
                  </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1.5 font-medium">Margem</th>
                        <th className="py-1.5 text-center font-medium">Preço Planilha</th>
                        <th className="py-1.5 text-center font-medium">Taxas R$</th>
                        <th className="py-1.5 text-center font-medium text-emerald-400">Lucro Real</th>
                        <th className="py-1.5 text-center font-medium">Margem Real %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {rows.map((r) => (
                        <tr key={r.marginLabel} className="hover:bg-slate-900/30">
                          <td className="py-1.5 font-sans font-semibold text-slate-300">{r.marginLabel}</td>
                          <td className="py-1.5 text-center font-bold text-white">{formatBRL(r.sellingPrice)}</td>
                          <td className="py-1.5 text-center text-rose-400">-{formatBRL(r.feeAmount)}</td>
                          <td className="py-1.5 text-center font-bold text-emerald-400">{formatBRL(r.netProfit)}</td>
                          <td className="py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.2 rounded ${
                                r.netMarginPercent < 10
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {formatPercent(r.netMarginPercent)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
};
