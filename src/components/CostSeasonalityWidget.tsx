import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
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
  Calendar,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  PackageCheck,
  Percent,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ProductItem } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface CostSeasonalityWidgetProps {
  product: ProductItem;
  activeChannelRate?: number;
  isPortfolioMode?: boolean;
}

export const CostSeasonalityWidget: React.FC<CostSeasonalityWidgetProps> = ({
  product,
  activeChannelRate = 17.49,
  isPortfolioMode = false,
}) => {
  const ingredientProfiles = useMemo(() => {
    const baseTotal = Number(product.cost) || 0;
    const list: Array<{
      id: string;
      shortName: string;
      title: string;
      baseCost: number;
      bestMonths: string[];
      peakMonths: string[];
      insight: string;
      multipliers: number[];
    }> = [
      {
        id: 'total',
        shortName: isPortfolioMode ? 'CMV Médio Catálogo' : 'CMV Total',
        title: isPortfolioMode
          ? `CMV Médio Ponderado (${product.name})`
          : `CMV Total — ${product.name}`,
        baseCost: baseTotal,
        bestMonths: ['Março', 'Abril', 'Maio'],
        peakMonths: ['Novembro', 'Dezembro'],
        insight:
          'Referência sazonal de compras para simular o impacto de oscilações de safra e demanda sobre o CMV real atual.',
        multipliers: [0.98, 0.96, 0.93, 0.92, 0.94, 0.97, 1.01, 1.02, 1.03, 1.06, 1.12, 1.14],
      },
    ];

    if (!isPortfolioMode && product.ingredients && product.ingredients.length > 0) {
      product.ingredients.slice(0, 6).forEach((ing, idx) => {
        const isDairy = /queijo|mussarela|cheddar|requeij|leite|manteiga|creme/i.test(ing.name);
        const isProduce = /batata|tomate|alface|cebola|hortifr|legume|fruta|oleo|óleo/i.test(ing.name);
        const isPackaging = /embalag|caixa|pote|sacola|copo|guardanapo|canudo/i.test(ing.name);

        const multipliers = isDairy
          ? [0.92, 0.93, 0.96, 0.98, 1.05, 1.12, 1.15, 1.11, 1.04, 0.98, 0.94, 0.91]
          : isProduce
          ? [1.14, 1.16, 1.12, 1.04, 0.99, 0.96, 0.92, 0.89, 0.90, 0.95, 1.02, 1.08]
          : isPackaging
          ? [0.98, 0.95, 0.94, 0.94, 0.96, 0.97, 0.99, 1.01, 1.04, 1.08, 1.15, 1.18]
          : [0.97, 0.95, 0.92, 0.91, 0.94, 0.97, 1.0, 1.03, 1.05, 1.08, 1.14, 1.16];

        const bestMonths = isDairy
          ? ['Novembro', 'Dezembro', 'Janeiro']
          : isProduce
          ? ['Agosto', 'Setembro']
          : ['Março', 'Abril'];

        const peakMonths = isDairy
          ? ['Junho', 'Julho', 'Agosto']
          : isProduce
          ? ['Janeiro', 'Fevereiro', 'Março']
          : ['Novembro', 'Dezembro'];

        list.push({
          id: ing.id || `ing-${idx}`,
          shortName: ing.name.split(' ').slice(0, 2).join(' '),
          title: `${ing.name} (${ing.quantity} ${ing.unit})`,
          baseCost: Number(ing.subtotal) || 0,
          bestMonths,
          peakMonths,
          insight: `Simulação sazonal aplicada sobre o custo real cadastrado de ${formatBRL(Number(ing.subtotal) || 0)} deste insumo na ficha técnica.`,
          multipliers,
        });
      });
    }

    return list;
  }, [product, isPortfolioMode]);

  const [selectedProfileId, setSelectedProfileId] = useState<string>('total');

  const activeProfile =
    ingredientProfiles.find((p) => p.id === selectedProfileId) || ingredientProfiles[0];

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const targetMarginRatio =
    product.targetNetMargin > 0 && product.targetNetMargin < 0.7 ? product.targetNetMargin : 0.25;
  const channelFeeRatio = (Number(activeChannelRate) || 0) / 100;
  const shieldDivisor = Math.max(0.15, 1 - targetMarginRatio - channelFeeRatio);

  // Generate 12-month seasonal stress curve over REAL product/ingredient cost
  const seasonalSeries = useMemo(() => {
    return monthNames.map((month, idx) => {
      const multiplier = activeProfile.multipliers[idx];
      const monthlyCost = Number((activeProfile.baseCost * multiplier).toFixed(2));
      const variationPct = Number(((multiplier - 1) * 100).toFixed(1));
      const suggestedPrice = Number((monthlyCost / shieldDivisor).toFixed(2));

      const isBest = activeProfile.bestMonths.some((m) => m.toLowerCase().startsWith(month.toLowerCase()));
      const isPeak = activeProfile.peakMonths.some((m) => m.toLowerCase().startsWith(month.toLowerCase()));

      return {
        month,
        monthlyCost,
        variationPct,
        suggestedPrice,
        isBest,
        isPeak,
        status: isBest ? 'Safra / Compra Ideal' : isPeak ? 'Pico de Alta' : 'Normal',
      };
    });
  }, [activeProfile, shieldDivisor]);

  const minCost = Math.min(...seasonalSeries.map((s) => s.monthlyCost));
  const maxCost = Math.max(...seasonalSeries.map((s) => s.monthlyCost));
  const potentialSavingsPct = maxCost > 0 ? Number((((maxCost - minCost) / maxCost) * 100).toFixed(1)) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-md shadow-teal-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                Simulador Sazonal de Custos & Janela de Compras
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                {isPortfolioMode ? 'Base: CMV Médio Catálogo' : 'Base: Ficha Técnica Real'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Projeção sazonal sobre o custo real cadastrado ({formatBRL(activeProfile.baseCost)}) mantendo meta de {(targetMarginRatio * 100).toFixed(0)}% com taxa de {activeChannelRate.toFixed(2).replace('.', ',')}%.
            </p>
          </div>
        </div>

        {/* Dynamic Ingredient Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full">
          {ingredientProfiles.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setSelectedProfileId(prof.id)}
              className={`px-3 py-1 rounded-lg transition-all shrink-0 ${
                activeProfile.id === prof.id
                  ? 'bg-teal-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={prof.title}
            >
              {prof.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Strategic Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Custo Médio Base</div>
          <div className="text-base font-mono font-bold text-white mt-1">
            {formatBRL(activeProfile.baseCost)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{activeProfile.title}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" />
            Janela de Compra Ideal
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {activeProfile.bestMonths.join(', ')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Menor custo anual: <strong className="text-emerald-400 font-mono">{formatBRL(minCost)}</strong>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-rose-400 uppercase font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Meses de Alta Sazonal
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {activeProfile.peakMonths.join(', ')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Pico de custo: <strong className="text-rose-400 font-mono">{formatBRL(maxCost)}</strong>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-950/40 to-slate-950 border border-teal-500/30">
          <div className="text-[10px] text-teal-400 uppercase font-semibold">
            Economia com Antecipação
          </div>
          <div className="text-base font-mono font-bold text-teal-300 mt-1">
            Até {potentialSavingsPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Diferença de <strong className="text-white font-mono">{formatBRL(maxCost - minCost)}</strong> por unidade
          </div>
        </div>
      </div>

      {/* Recharts Time Series Chart */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-white">
            Curva Anual de Custo vs Preço de Venda Sugerido ({activeProfile.title})
          </span>
          <span className="text-[11px] text-slate-400">
            Oscilação de Safra e Demanda em 12 Meses
          </span>
        </div>

        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={seasonalSeries} margin={{ top: 15, right: 25, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="seasonalityArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
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
                tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                      <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>Mês: {label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            d.isBest
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : d.isPeak
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Custo Insumo Previsto:{' '}
                        <span className="font-mono font-bold text-white">{formatBRL(d.monthlyCost)}</span>
                      </div>
                      <div className="text-teal-400">
                        Variação vs Base:{' '}
                        <span className="font-mono font-bold">
                          {d.variationPct > 0 ? `+${d.variationPct}%` : `${d.variationPct}%`}
                        </span>
                      </div>
                      <div className="text-amber-300 pt-1 border-t border-slate-800 font-bold">
                        Preço Sugerido para Manter 25% Margem:{' '}
                        <span className="font-mono">{formatBRL(d.suggestedPrice)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />

              <ReferenceLine
                yAxisId="currency"
                y={activeProfile.baseCost}
                stroke="#64748b"
                strokeDasharray="3 3"
                label={{ value: 'Custo Base Atual', fill: '#94a3b8', fontSize: 10, position: 'left' }}
              />

              {/* Area do Custo */}
              <Area
                yAxisId="currency"
                type="monotone"
                dataKey="monthlyCost"
                name="Custo Previsto (R$)"
                stroke="#14b8a6"
                strokeWidth={2.5}
                fill="url(#seasonalityArea)"
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />

              {/* Linha do Preço Sugerido */}
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="suggestedPrice"
                name="Preço de Venda Sugerido (R$)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#f59e0b' }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />

              {/* Linha de Variação % */}
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="variationPct"
                name="Variação Sazonal (%)"
                stroke="#06b6d4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategic Insight Box */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Recomendação Estratégica de Compras:</strong> {activeProfile.insight}{' '}
          Planejar compras para estocar ou travar preços durante os meses de{' '}
          <strong className="text-emerald-400">{activeProfile.bestMonths.join(', ')}</strong> pode gerar uma economia
          operacional de até <strong className="text-white font-mono">{potentialSavingsPct}%</strong> em relação aos
          meses de pico.
        </p>
      </div>
    </div>
  );
};
