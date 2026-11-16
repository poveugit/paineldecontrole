import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ArrowUpRight,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ProductItem, FixedExpenses, ChannelFee } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface ProfitGoalsDashboardWidgetProps {
  product: ProductItem;
  fixedExpenses: FixedExpenses;
  channels: ChannelFee[];
  preferredChannelId?: string;
}

export const ProfitGoalsDashboardWidget: React.FC<ProfitGoalsDashboardWidgetProps> = ({
  product,
  fixedExpenses,
  channels,
  preferredChannelId,
}) => {
  // Goal parameters (stored in local state with user configurability)
  const [revenueGoal, setRevenueGoal] = useState<number>(18000.0);
  const [profitGoal, setProfitGoal] = useState<number>(4500.0);
  const [currentDayOfMonth, setCurrentDayOfMonth] = useState<number>(18);
  const totalDaysInMonth = 30;

  // Realized performance parameters
  const [realizedUnitsSold, setRealizedUnitsSold] = useState<number>(275);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    preferredChannelId || product.referenceChannelId || channels[0]?.id || 'uai-online'
  );

  useEffect(() => {
    const nextChannel = preferredChannelId || product.referenceChannelId;
    if (nextChannel && channels.some((c) => c.id === nextChannel)) {
      setSelectedChannelId(nextChannel);
    }
  }, [preferredChannelId, product.id, product.referenceChannelId, channels]);

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];
  const feeRate = activeChannel.totalRate / 100;
  const currentPrice = product.currentPrice || 9.84;

  // Realized Financials
  const realizedRevenue = Number((realizedUnitsSold * currentPrice).toFixed(2));
  const unitFee = Number((currentPrice * feeRate).toFixed(2));
  const unitNetProfit = Number((currentPrice - product.cost - unitFee).toFixed(2));
  const realizedNetProfit = Number((realizedUnitsSold * unitNetProfit).toFixed(2));

  // Goal Progress
  const profitProgressPct = profitGoal > 0 ? Number(((realizedNetProfit / profitGoal) * 100).toFixed(1)) : 0;
  const revenueProgressPct = revenueGoal > 0 ? Number(((realizedRevenue / revenueGoal) * 100).toFixed(1)) : 0;

  // Pacing / Run-rate analysis
  const expectedProgressByToday = (currentDayOfMonth / totalDaysInMonth) * 100;
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDayOfMonth);
  const remainingProfitToGoal = Math.max(0, profitGoal - realizedNetProfit);
  const requiredDailyProfit = Number((remainingProfitToGoal / daysRemaining).toFixed(2));
  const currentDailyProfitPace = currentDayOfMonth > 0 ? Number((realizedNetProfit / currentDayOfMonth).toFixed(2)) : 0;
  const projectedEndOfMonthProfit = Number((currentDailyProfitPace * totalDaysInMonth).toFixed(2));
  const projectedVsGoalDelta = projectedEndOfMonthProfit - profitGoal;

  // Units required to complete goal
  const unitsNeeded = unitNetProfit > 0 ? Math.ceil(remainingProfitToGoal / unitNetProfit) : 0;

  // Gauge Chart Data (Semi-Circle representation: 180 degrees)
  // Value capped between 0 and 100 for gauge visualization
  const gaugeValue = Math.min(100, Math.max(0, profitProgressPct));
  const remainingGauge = 100 - gaugeValue;

  const gaugeData = [
    { name: 'Lucro Atingido', value: gaugeValue },
    { name: 'Restante para a Meta', value: remainingGauge },
  ];

  // Dynamic status evaluation
  const isAheadOfPace = profitProgressPct >= expectedProgressByToday;
  const statusColor =
    profitProgressPct >= 100
      ? 'emerald'
      : isAheadOfPace
      ? 'emerald'
      : profitProgressPct > 50
      ? 'amber'
      : 'rose';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Dashboard de Metas de Lucro & Velocímetro de Metas
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Progresso Mensal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Acompanhamento do lucro acumulado real versus a meta estipulada com projeção de fechamento.
            </p>
          </div>
        </div>

        {/* Channel Indicator */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Canal Base:</span>
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                {c.name} ({c.totalRate}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Goals Configuration Bar */}
      <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Meta Faturamento Mensal R$
            </label>
            <input
              type="number"
              step="500"
              value={revenueGoal}
              onChange={(e) => setRevenueGoal(parseFloat(e.target.value) || 0)}
              className="w-32 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Meta Lucro Líquido R$
            </label>
            <input
              type="number"
              step="200"
              value={profitGoal}
              onChange={(e) => setProfitGoal(parseFloat(e.target.value) || 0)}
              className="w-32 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Vendas Acumuladas no Mês (Unid)
            </label>
            <input
              type="number"
              step="10"
              value={realizedUnitsSold}
              onChange={(e) => setRealizedUnitsSold(parseInt(e.target.value) || 0)}
              className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-cyan-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Dia Vigente do Mês (1-30)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={currentDayOfMonth}
              onChange={(e) => setCurrentDayOfMonth(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-center focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tempo Decorrido</span>
          <span className="font-mono text-xs text-white">
            Dia {currentDayOfMonth} de {totalDaysInMonth} ({expectedProgressByToday.toFixed(0)}% do mês)
          </span>
        </div>
      </div>

      {/* Main Grid: Gauge Chart vs Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Recharts Semi-Circular Gauge */}
        <div className="lg:col-span-5 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-5 flex flex-col items-center justify-center relative">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
            Velocímetro de Atingimento da Meta
          </span>
          <span className="text-[11px] text-slate-500">Lucro Líquido Acumulado vs Alvo</span>

          <div className="w-full h-52 relative flex items-center justify-center mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="75%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="68%"
                  outerRadius="95%"
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  <Cell
                    key="cell-0"
                    fill={
                      profitProgressPct >= 100
                        ? '#10b981'
                        : isAheadOfPace
                        ? '#059669'
                        : profitProgressPct > 50
                        ? '#f59e0b'
                        : '#ef4444'
                    }
                  />
                  <Cell key="cell-1" fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Gauge Needle Center Display */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <div className="text-3xl font-black font-mono text-white tracking-tight">
                {profitProgressPct}%
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {profitProgressPct >= 100 ? 'Meta Superada' : isAheadOfPace ? 'No Ritmo Ideal' : 'Abaixo do Ritmo'}
              </div>
            </div>
          </div>

          {/* Animated Progress Bar under gauge */}
          <div className="w-full mt-2">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, profitProgressPct)}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className={`h-full rounded-full ${
                  profitProgressPct >= 100 ? 'bg-emerald-400' : isAheadOfPace ? 'bg-teal-400' : 'bg-amber-400'
                }`}
              />
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono px-4 pt-2 border-t border-slate-850 mt-2">
            <span>R$ 0,00</span>
            <span className="text-emerald-400 font-bold">Meta: {formatBRL(profitGoal)}</span>
          </div>
        </div>

        {/* Right: Key Performance & Pacing Cards */}
        <div className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Realized Profit Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Lucro Líquido Realizado</span>
                <span className="text-emerald-400 font-mono font-bold">{profitProgressPct}%</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {formatBRL(realizedNetProfit)}
              </div>
              {/* Animated Progress Mini Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, profitProgressPct)}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className="h-full bg-emerald-400 rounded-full"
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Faturamento: {formatBRL(realizedRevenue)}</span>
                <span className="text-cyan-300 font-mono">({realizedUnitsSold} un)</span>
              </div>
            </div>

            {/* Remaining to Goal */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Faltante para a Meta</span>
                <span className="text-slate-500 font-mono">{daysRemaining} dias restantes</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {formatBRL(remainingProfitToGoal)}
              </div>
              {/* Animated Remaining Mini Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, 100 - profitProgressPct)}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className="h-full bg-amber-400 rounded-full"
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Equivale a: <strong className="text-white font-mono">{unitsNeeded} hambúrgueres</strong>
              </div>
            </div>
          </div>

          {/* Forecast & Run-rate Strip */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Projeção de Fechamento do Mês (Forecast)</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                      projectedVsGoalDelta >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {projectedVsGoalDelta >= 0 ? `+${formatBRL(projectedVsGoalDelta)}` : `${formatBRL(projectedVsGoalDelta)}`}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {formatBRL(projectedEndOfMonthProfit)}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 font-mono text-right w-full sm:w-auto">
              <div className="text-slate-400">
                Ritmo Atual: <strong className="text-white">{formatBRL(currentDailyProfitPace)}/dia</strong>
              </div>
              <div className="text-slate-400">
                Ritmo Necessário: <strong className="text-amber-400">{formatBRL(requiredDailyProfit)}/dia</strong>
              </div>
            </div>
          </div>

          {/* Actionable Advice */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 flex items-start gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {profitProgressPct >= 100
                ? 'Parabéns! Sua meta de lucro líquido do mês já foi atingida com folga. Considere destinar parte do excedente para fidelização.'
                : isAheadOfPace
                ? `Operação saudável: Você já atingiu ${profitProgressPct}% da meta no dia ${currentDayOfMonth}. Mantendo o ritmo atual de ${formatBRL(currentDailyProfitPace)}/dia, você fechará o mês em ${formatBRL(projectedEndOfMonthProfit)}.`
                : `Atenção ao ritmo: Para bater a meta de ${formatBRL(profitGoal)}, você precisa vender mais ${unitsNeeded} unidades nos próximos ${daysRemaining} dias (${(unitsNeeded / daysRemaining).toFixed(0)} un/dia).`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
