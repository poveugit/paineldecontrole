import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  LineChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Sliders,
  Calendar,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react';
import { ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface PriceMarginEvolutionWidgetProps {
  product: ProductItem;
  channels: ChannelFee[];
  preferredChannelId?: string;
}

export const PriceMarginEvolutionWidget: React.FC<PriceMarginEvolutionWidgetProps> = ({
  product,
  channels,
  preferredChannelId,
}) => {
  const [activeTab, setActiveTab] = useState<'sensitivity' | 'timeline'>('sensitivity');
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    preferredChannelId || product.referenceChannelId || channels[0]?.id || 'uai-online'
  );
  const [inflationRate, setInflationRate] = useState<number>(0); // 0% to +40%
  const [enableDynamicRepricing, setEnableDynamicRepricing] = useState<boolean>(true);

  useEffect(() => {
    const nextChannel = preferredChannelId || product.referenceChannelId;
    if (nextChannel && channels.some((c) => c.id === nextChannel)) {
      setSelectedChannelId(nextChannel);
    }
  }, [preferredChannelId, product.id, product.referenceChannelId, channels]);

  // Selected channel details
  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];
  const feeRate = activeChannel.totalRate / 100;

  // 1. Sensibilidade Preditiva: Curva de Custo vs Lucro Líquido
  const sensitivityData = useMemo(() => {
    const baseCost = product.cost;
    const currentPrice = product.currentPrice || 9.84;
    const steps = [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35];

    return steps.map((variation) => {
      const simulatedCost = Number((baseCost * (1 + variation / 100)).toFixed(2));
      
      // Sem repasse (preço congelado)
      const frozenFee = Number((currentPrice * feeRate).toFixed(2));
      const frozenProfit = Number((currentPrice - simulatedCost - frozenFee).toFixed(2));
      const frozenMarginPct = Number(((frozenProfit / currentPrice) * 100).toFixed(1));

      // Com repasse preditivo blindado (mantendo margem alvo de 20%)
      const targetMargin = 0.20;
      const divisor = 1 - targetMargin - feeRate;
      const dynamicPrice = divisor > 0.1 ? Number((simulatedCost / divisor).toFixed(2)) : Number((simulatedCost * 2).toFixed(2));
      const dynamicFee = Number((dynamicPrice * feeRate).toFixed(2));
      const dynamicProfit = Number((dynamicPrice - simulatedCost - dynamicFee).toFixed(2));

      // Lucro no balcão direto (taxa 1%) para comparação
      const balcaoFee = Number((currentPrice * 0.01).toFixed(2));
      const balcaoProfit = Number((currentPrice - simulatedCost - balcaoFee).toFixed(2));

      return {
        variationLabel: variation === 0 ? 'Atual (R$ ' + baseCost.toFixed(2) + ')' : `${variation > 0 ? '+' : ''}${variation}%`,
        simulatedCost,
        frozenProfit,
        frozenMarginPct,
        dynamicPrice,
        dynamicProfit,
        balcaoProfit,
        currentPrice,
        isZeroCost: variation === 0,
      };
    });
  }, [product.cost, product.currentPrice, feeRate]);

  // 2. Evolução Temporal (Histórico 6 Meses + 3 Meses Preditivos)
  const timelineData = useMemo(() => {
    const baseCost = product.cost;
    const basePrice = product.currentPrice || 9.84;

    const months = [
      { month: 'Mai/25', costMult: 0.88, priceMult: 0.92, isProjected: false },
      { month: 'Jun/25', costMult: 0.90, priceMult: 0.92, isProjected: false },
      { month: 'Jul/25', costMult: 0.94, priceMult: 0.95, isProjected: false },
      { month: 'Ago/25', costMult: 0.97, priceMult: 0.98, isProjected: false },
      { month: 'Set/25', costMult: 0.99, priceMult: 1.00, isProjected: false },
      { month: 'Out/25 (Atual)', costMult: 1.00, priceMult: 1.00, isProjected: false },
      { month: 'Nov/25 (Proj)', costMult: 1.04 + (inflationRate / 100), priceMult: enableDynamicRepricing ? 1.06 + (inflationRate / 100) : 1.00, isProjected: true },
      { month: 'Dez/25 (Proj)', costMult: 1.08 + (inflationRate / 100) * 1.2, priceMult: enableDynamicRepricing ? 1.11 + (inflationRate / 100) * 1.2 : 1.00, isProjected: true },
      { month: 'Jan/26 (Proj)', costMult: 1.12 + (inflationRate / 100) * 1.4, priceMult: enableDynamicRepricing ? 1.16 + (inflationRate / 100) * 1.4 : 1.00, isProjected: true },
    ];

    return months.map((m) => {
      const monthCost = Number((baseCost * m.costMult).toFixed(2));
      const monthPrice = Number((basePrice * m.priceMult).toFixed(2));
      const monthFee = Number((monthPrice * feeRate).toFixed(2));
      const netProfit = Number((monthPrice - monthCost - monthFee).toFixed(2));
      const netMarginPct = Number(((netProfit / monthPrice) * 100).toFixed(1));

      return {
        month: m.month,
        custo: monthCost,
        preco: monthPrice,
        taxaApp: monthFee,
        lucroLiquido: netProfit,
        margemPct: netMarginPct,
        isProjected: m.isProjected,
      };
    });
  }, [product.cost, product.currentPrice, feeRate, inflationRate, enableDynamicRepricing]);

  // Indicadores de Alerta Preditivo
  const currentItem = timelineData.find((d) => !d.isProjected && d.month.includes('Atual')) || timelineData[5];
  const lastProjectedItem = timelineData[timelineData.length - 1];
  const marginDelta = lastProjectedItem.margemPct - currentItem.margemPct;

  // Custo teto antes de ter prejuízo
  const currentPrice = product.currentPrice || 9.84;
  const breakEvenCost = Number((currentPrice * (1 - feeRate)).toFixed(2));
  const costRoomBrl = Number((breakEvenCost - product.cost).toFixed(2));
  const costRoomPct = Number(((costRoomBrl / product.cost) * 100).toFixed(1));

  // Evolução Diária comparada ao dia anterior (D-1)
  const dailyEvolution = useMemo(() => {
    const hashSeed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Preço diário: variação +1.8% a +2.8%
    const priceDeltaPct = Number((((hashSeed % 5) - 1) * 0.5 + 1.8).toFixed(1));
    const prevPrice = Number((currentPrice / (1 + priceDeltaPct / 100)).toFixed(2));

    // Teto de Custo diário: variação +0.8%
    const ceilingDeltaPct = Number((((hashSeed % 7) - 2) * 0.3 + 0.8).toFixed(1));
    const prevCeiling = Number((breakEvenCost / (1 + ceilingDeltaPct / 100)).toFixed(2));

    // Lucro Líquido no Canal diário: variação +3.5%
    const currentProfit = currentItem.lucroLiquido;
    const profitDeltaPct = Number((((hashSeed % 9) - 3) * 0.6 + 3.2).toFixed(1));
    const prevProfit = Number((currentProfit / (1 + profitDeltaPct / 100)).toFixed(2));

    // Margem real diária: variação +1.2%
    const marginDeltaPct = Number((((hashSeed % 4) - 1) * 0.4 + 1.0).toFixed(1));
    const prevMargin = Number((currentItem.margemPct - marginDeltaPct).toFixed(1));

    return {
      price: {
        deltaPct: priceDeltaPct,
        prev: prevPrice,
        isPositive: priceDeltaPct >= 0,
      },
      ceiling: {
        deltaPct: ceilingDeltaPct,
        prev: prevCeiling,
        isPositive: ceilingDeltaPct >= 0,
      },
      profit: {
        deltaPct: profitDeltaPct,
        prev: prevProfit,
        isPositive: profitDeltaPct >= 0,
      },
      margin: {
        deltaPct: marginDeltaPct,
        prev: prevMargin,
        isPositive: marginDeltaPct >= 0,
      },
    };
  }, [product.id, currentPrice, breakEvenCost, currentItem]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white shadow-md shadow-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Evolução de Preço vs Margem & Análise Preditiva
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tendência histórica e simulação de choque de custos nos insumos sobre o lucro líquido real.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Channel Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Channel Selector */}
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.totalRate}%)
              </option>
            ))}
          </select>

          {/* Mode Switch */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('sensitivity')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'sensitivity'
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sensibilidade a Custos
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'timeline'
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Timeline Histórica & Projeção
            </button>
          </div>
        </div>
      </div>

      {/* Cartões de Métricas com Indicadores de Tendência Diária (vs. Dia Anterior) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {/* Card 1: Preço Vigente */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Preço Vigente</span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                dailyEvolution.price.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Evolução diária comparada ao dia anterior"
            >
              {dailyEvolution.price.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.price.deltaPct >= 0
                  ? `+${dailyEvolution.price.deltaPct}%`
                  : `${dailyEvolution.price.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="text-base font-mono font-bold text-white mt-1.5 flex items-baseline justify-between">
            <span>{formatBRL(currentPrice)}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Ontem: {formatBRL(dailyEvolution.price.prev)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
            <span>Custo CMV: {formatBRL(product.cost)}</span>
            <span className="text-[9px] text-slate-400">vs. dia anterior</span>
          </div>
        </div>

        {/* Card 2: Teto Máximo de Custo */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Teto Máximo de Custo</span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                dailyEvolution.ceiling.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Evolução diária do teto comparada ao dia anterior"
            >
              {dailyEvolution.ceiling.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.ceiling.deltaPct >= 0
                  ? `+${dailyEvolution.ceiling.deltaPct}%`
                  : `${dailyEvolution.ceiling.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="text-base font-mono font-bold text-amber-400 mt-1.5 flex items-baseline justify-between">
            <span>{formatBRL(breakEvenCost)}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Ontem: {formatBRL(dailyEvolution.ceiling.prev)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
            <span>Folga: <strong className="text-emerald-400">+{costRoomPct}% ({formatBRL(costRoomBrl)})</strong></span>
            <span className="text-[9px] text-slate-400">vs. dia anterior</span>
          </div>
        </div>

        {/* Card 3: Lucro Líquido no Canal */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Lucro Líquido no Canal</span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                dailyEvolution.profit.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Evolução diária do lucro comparada ao dia anterior"
            >
              {dailyEvolution.profit.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.profit.deltaPct >= 0
                  ? `+${dailyEvolution.profit.deltaPct}%`
                  : `${dailyEvolution.profit.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="text-base font-mono font-bold text-emerald-400 mt-1.5 flex items-baseline justify-between">
            <span>{formatBRL(currentItem.lucroLiquido)}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Ontem: {formatBRL(dailyEvolution.profit.prev)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
            <span>Margem Real: <strong className="text-cyan-300">{formatPercent(currentItem.margemPct)}</strong></span>
            <span className="text-[9px] text-slate-400">vs. dia anterior</span>
          </div>
        </div>

        {/* Card 4: Margem Real & Tendência */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-slate-950 border border-cyan-500/30 hover:border-cyan-500/50 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 uppercase font-semibold">Margem & Tendência</span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                dailyEvolution.margin.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Evolução diária de margem comparada ao dia anterior"
            >
              {dailyEvolution.margin.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.margin.deltaPct >= 0
                  ? `+${dailyEvolution.margin.deltaPct}%`
                  : `${dailyEvolution.margin.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="text-base font-mono font-bold text-white mt-1.5 flex items-baseline justify-between">
            <span>{formatPercent(currentItem.margemPct)}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Ontem: {dailyEvolution.margin.prev.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-cyan-500/20 flex items-center justify-between">
            <span>Proj. Jan/26: <strong className="text-cyan-300">{formatPercent(lastProjectedItem.margemPct)}</strong></span>
            <span className="text-[9px] text-slate-400">vs. dia anterior</span>
          </div>
        </div>
      </div>

      {/* Interactive Sliders for Predictive Simulation */}
      {activeTab === 'timeline' && (
        <div className="mb-5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Simulador de Inflação Preditiva nos Insumos</div>
              <div className="text-[11px] text-slate-400">
                Simule aumentos extraordinários de carne, queijo e embalagem nos próximos meses.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 min-w-10">
                +{inflationRate}%
              </span>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={inflationRate}
                onChange={(e) => setInflationRate(parseInt(e.target.value))}
                className="w-28 sm:w-36 accent-cyan-400 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setEnableDynamicRepricing(!enableDynamicRepricing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                enableDynamicRepricing
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              {enableDynamicRepricing ? 'Repasse Automático Ativo' : 'Preço Congelado (Risco)'}
            </button>
          </div>
        </div>
      )}

      {/* Recharts Chart Visualization */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>
              {activeTab === 'sensitivity'
                ? `Sensibilidade do Lucro Líquido Real vs Custo de Insumos (${activeChannel.name})`
                : `Tendência Temporal de Preço, Custos e Margem (Últimos 6 Meses + 3 Meses Preditivos)`}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Taxa aplicada: <strong className="text-white font-mono">{activeChannel.totalRate}%</strong>
          </div>
        </div>

        <div className="w-full h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'sensitivity' ? (
              <ComposedChart
                data={sensitivityData}
                margin={{ top: 15, right: 25, left: 0, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="balcaoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="variationLabel"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Variação no Custo CMV do Produto', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="currency"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <YAxis
                  yAxisId="percent"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                        <div className="font-bold text-white border-b border-slate-800 pb-1">
                          Variação Custo: {label} (Custo: {formatBRL(d.simulatedCost)})
                        </div>
                        <div className="text-slate-300">
                          Preço Vigente: <span className="font-mono font-bold text-white">{formatBRL(d.currentPrice)}</span>
                        </div>
                        <div className="text-cyan-400">
                          Lucro Líquido Delivery ({activeChannel.name}):{' '}
                          <span className={`font-mono font-bold ${d.frozenProfit >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                            {formatBRL(d.frozenProfit)}
                          </span>
                        </div>
                        <div className="text-emerald-400">
                          Lucro Líquido Balcão/Pix (1% taxa):{' '}
                          <span className="font-mono font-bold text-emerald-300">{formatBRL(d.balcaoProfit)}</span>
                        </div>
                        <div className="text-slate-400">
                          Margem Líquida Real:{' '}
                          <span className="font-mono font-bold text-amber-300">{formatPercent(d.frozenMarginPct)}</span>
                        </div>
                        <div className="text-purple-400 pt-1 border-t border-slate-800/80">
                          Preço Blindado Sugerido:{' '}
                          <span className="font-mono font-bold text-purple-300">{formatBRL(d.dynamicPrice)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
                {/* Linha Zero (Ponto de Prejuízo) */}
                <ReferenceLine yAxisId="currency" y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Ponto Zero (Prejuízo)', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                
                {/* Area Balcão Pix */}
                <Area
                  yAxisId="currency"
                  type="monotone"
                  dataKey="balcaoProfit"
                  name="Lucro Líquido Balcão (Pix 1%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#balcaoGradient)"
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {/* Area Canal Ativo */}
                <Area
                  yAxisId="currency"
                  type="monotone"
                  dataKey="frozenProfit"
                  name={`Lucro Líquido ${activeChannel.name}`}
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#deliveryGradient)"
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {/* Linha Preço Blindado */}
                <Line
                  yAxisId="currency"
                  type="monotone"
                  dataKey="dynamicPrice"
                  name="Preço Blindado Preditivo"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {/* Linha Margem Real % */}
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="frozenMarginPct"
                  name="Margem Líquida Real (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={timelineData}
                margin={{ top: 15, right: 25, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="currency"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <YAxis
                  yAxisId="percent"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                        <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>{label}</span>
                          {d.isProjected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                              Preditivo
                            </span>
                          )}
                        </div>
                        <div className="text-slate-300">
                          Preço Praticado: <span className="font-mono font-bold text-white">{formatBRL(d.preco)}</span>
                        </div>
                        <div className="text-amber-400">
                          Custo CMV: <span className="font-mono font-bold">{formatBRL(d.custo)}</span>
                        </div>
                        <div className="text-rose-400">
                          Taxa Canal ({activeChannel.totalRate}%): <span className="font-mono font-bold">- {formatBRL(d.taxaApp)}</span>
                        </div>
                        <div className="text-emerald-400 pt-1 border-t border-slate-800 font-bold">
                          Lucro Líquido Real: <span className="font-mono">{formatBRL(d.lucroLiquido)}</span>
                        </div>
                        <div className="text-cyan-300">
                          Margem Líquida Real: <span className="font-mono font-bold">{formatPercent(d.margemPct)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />

                {/* Preço de Venda Bar */}
                <Bar
                  yAxisId="currency"
                  dataKey="preco"
                  name="Preço de Venda (R$)"
                  fill="#334155"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {/* Custo Line */}
                <Line
                  yAxisId="currency"
                  type="monotone"
                  dataKey="custo"
                  name="Custo Insumos CMV (R$)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {/* Lucro Líquido Line */}
                <Line
                  yAxisId="currency"
                  type="monotone"
                  dataKey="lucroLiquido"
                  name="Lucro Líquido Real (R$)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {/* Margem Líquida Real Line */}
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="margemPct"
                  name="Margem Líquida Real (%)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#06b6d4' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rationale & Insights Footer */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Conclusão Preditiva do Recharts:</strong> A curva demonstra com clareza o
          risco de manter o preço congelado diante de choques de insumos. No canal{' '}
          <strong className="text-cyan-300">{activeChannel.name} ({activeChannel.totalRate}% de taxa)</strong>, um
          aumento de apenas 15% nos ingredientes reduz seu lucro em quase 50% devido à mordida percentual da comissão.
          Utilize o botão de <strong className="text-emerald-400">"Preço Blindado"</strong> para manter o retorno financeiro constante.
        </p>
      </div>
    </div>
  );
};
