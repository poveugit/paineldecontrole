import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  PieChart,
  Target,
  ArrowRight,
  Calculator,
  CheckCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { FixedExpenses, ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface DREWidgetProps {
  product: ProductItem;
  products?: ProductItem[];
  isPortfolioMode?: boolean;
  fixedExpenses: FixedExpenses;
  selectedChannel: ChannelFee;
  onUpdateFixedExpenses: (expenses: FixedExpenses) => void;
  canEditCosts: boolean;
}

export const DREWidget: React.FC<DREWidgetProps> = ({
  product,
  products = [],
  isPortfolioMode = false,
  fixedExpenses,
  selectedChannel,
  onUpdateFixedExpenses,
  canEditCosts,
}) => {
  const [sellingPrice, setSellingPrice] = useState<number>(Number(product.currentPrice) || 0);

  useEffect(() => {
    setSellingPrice(Number(product.currentPrice) || 0);
  }, [product.id, product.currentPrice]);

  const activeProducts = products.filter((p) => p.active !== false);
  const portfolioList = activeProducts.length > 0 ? activeProducts : products;
  const usePortfolioAggregate = isPortfolioMode && portfolioList.length > 0;

  // Portfolio Monthly Aggregate vs Unit DRE Calculation
  let grossDisplay = sellingPrice;
  let costDisplay = Number(product.cost) || 0;
  let feeAmount = sellingPrice * (selectedChannel.totalRate / 100);

  if (usePortfolioAggregate) {
    grossDisplay = portfolioList.reduce((acc, p) => {
      const units = Math.max(0, Number(p.estimatedMonthlyUnits) || 0);
      return acc + (Number(p.currentPrice) || 0) * units;
    }, 0);
    costDisplay = portfolioList.reduce((acc, p) => {
      const units = Math.max(0, Number(p.estimatedMonthlyUnits) || 0);
      return acc + (Number(p.cost) || 0) * units;
    }, 0);
    feeAmount = grossDisplay * (selectedChannel.totalRate / 100);
  }

  const netRevenue = grossDisplay - feeAmount;
  const contributionMargin = netRevenue - costDisplay;
  const contributionMarginPct = grossDisplay > 0 ? (contributionMargin / grossDisplay) * 100 : 0;

  // Break-even Units calculation (using unit metrics even for reference)
  const unitFee = sellingPrice * (selectedChannel.totalRate / 100);
  const unitContributionMargin = sellingPrice - unitFee - product.cost;
  const totalFixedCosts = fixedExpenses.totalFixed;
  const totalTargetWithProfit = fixedExpenses.totalWithProfit;

  // Unidades para cobrir custo fixo
  const breakEvenUnits = unitContributionMargin > 0 ? Math.ceil(totalFixedCosts / unitContributionMargin) : 0;
  // Unidades para cobrir custo fixo + projeção de lucro
  const targetProfitUnits = unitContributionMargin > 0 ? Math.ceil(totalTargetWithProfit / unitContributionMargin) : 0;

  // Faturamento total no ponto de equilíbrio
  const breakEvenRevenue = breakEvenUnits * sellingPrice;
  const targetProfitRevenue = targetProfitUnits * sellingPrice;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-md shadow-emerald-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                {usePortfolioAggregate
                  ? `DRE Consolidado Mensal (${portfolioList.length} produtos)`
                  : 'DRE Unitário & Ponto de Equilíbrio (Break-Even)'}
              </h2>
              {usePortfolioAggregate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Visão Geral do Catálogo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {usePortfolioAggregate
                ? 'Resultado consolidado mensal considerando todo o catálogo ativo versus despesas fixas.'
                : 'Viabilidade financeira detalhada com despesas fixas e projeção de lucro da planilha.'}
            </p>
          </div>
        </div>

        {/* Selected Channel Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Canal Ativo:</span>
          <span className="font-semibold text-emerald-400">{selectedChannel.name}</span>
          <span className="font-mono text-slate-300">({selectedChannel.totalRate}%)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
        {/* Unit / Consolidated DRE Table */}
        <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {usePortfolioAggregate
                ? `Demonstrativo Mensal Consolidado (${portfolioList.length} itens)`
                : 'Demonstrativo de Resultado Unitário (1 Unidade)'}
            </span>
            {!usePortfolioAggregate && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Preço:</span>
                <input
                  type="number"
                  step="0.10"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-200">
              <span className="font-sans font-medium">
                {usePortfolioAggregate ? '(+) Receita Bruta Mensal (Todo Catálogo):' : '(+) Receita Bruta (Preço de Venda):'}
              </span>
              <span className="font-bold text-white">{formatBRL(grossDisplay)}</span>
            </div>

            <div className="flex items-center justify-between text-rose-400">
              <span className="font-sans">(-) Taxas do App ({selectedChannel.totalRate}%):</span>
              <span>- {formatBRL(feeAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
              <span className="font-sans font-semibold">(=) Receita Operacional Líquida:</span>
              <span className="font-bold text-white">{formatBRL(netRevenue)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="font-sans">
                {usePortfolioAggregate ? '(-) Custo Insumos / CMV Total Mensal:' : '(-) Custo Insumos / CMV:'}
              </span>
              <span>- {formatBRL(costDisplay)}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-400 pt-2 border-t-2 border-slate-800 text-sm">
              <span className="font-sans font-bold">(=) Margem de Contribuição Líquida:</span>
              <span className="font-bold">{formatBRL(contributionMargin)}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-slate-400 font-sans">
              <span>Margem de Contribuição %:</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatPercent(contributionMarginPct)}
              </span>
            </div>
          </div>

          {/* Visual Breakdown Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
              Decomposição Visual do Preço de Venda
            </div>
            <div className="w-full h-3.5 rounded-full bg-slate-800/80 overflow-hidden flex gap-0.5 p-0.5 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, grossDisplay > 0 ? (costDisplay / grossDisplay) * 100 : 0)}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="h-full bg-amber-500 rounded-l-full shadow-sm"
                title={`CMV: ${formatPercent(grossDisplay > 0 ? (costDisplay / grossDisplay) * 100 : 0)}`}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, grossDisplay > 0 ? (feeAmount / grossDisplay) * 100 : 0)}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.05 }}
                className="h-full bg-rose-500 shadow-sm"
                title={`Taxa App: ${formatPercent(grossDisplay > 0 ? (feeAmount / grossDisplay) * 100 : 0)}`}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, grossDisplay > 0 ? (contributionMargin / grossDisplay) * 100 : 0)}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
                className="h-full bg-emerald-500 rounded-r-full shadow-sm"
                title={`Lucro Líquido: ${formatPercent(grossDisplay > 0 ? (contributionMargin / grossDisplay) * 100 : 0)}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> CMV ({(grossDisplay > 0 ? (costDisplay / grossDisplay) * 100 : 0).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Taxa App ({(grossDisplay > 0 ? (feeAmount / grossDisplay) * 100 : 0).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Lucro ({(grossDisplay > 0 ? (contributionMargin / grossDisplay) * 100 : 0).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Expenses & Break-Even Goals from Spreadsheet */}
        <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Despesas Fixas & Projeção de Lucro (Planilha)
              </span>
              <span className="text-[10px] text-slate-400">Mensal</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mensalidade iFood:</span>
                <span className="font-mono text-white">{formatBRL(fixedExpenses.ifoodMonthly)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Taxa Bancária Uai Rango:</span>
                <span className="font-mono text-white">{formatBRL(fixedExpenses.uaiRangoBankFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Outras Despesas Fixas:</span>
                <span className="font-mono text-white">{formatBRL(fixedExpenses.otherFixed)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-semibold text-slate-300">
                <span>Total Despesas Fixas:</span>
                <span className="font-mono text-white">{formatBRL(fixedExpenses.totalFixed)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 text-cyan-300 font-semibold">
                <span>Projeção de Lucro Alvo:</span>
                <span className="font-mono">{formatBRL(fixedExpenses.profitProjection)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-bold text-emerald-400">
                <span>Total Despesas Fixas Mais Lucro:</span>
                <span className="font-mono text-emerald-300">{formatBRL(fixedExpenses.totalWithProfit)}</span>
              </div>
            </div>
          </div>

          {/* Break-Even Target Box */}
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Ponto de Equilíbrio Necessário
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <div className="text-[10px] text-slate-400">Vendas para Cobrir Custos:</div>
                <div className="text-sm font-bold font-mono text-white">
                  {breakEvenUnits} unidades{' '}
                  <span className="text-[10px] font-normal text-slate-400">({formatBRL(breakEvenRevenue)})</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Meta com Lucro Alvo:</div>
                <div className="text-sm font-bold font-mono text-emerald-300">
                  {targetProfitUnits} unidades{' '}
                  <span className="text-[10px] font-normal text-emerald-400/80">({formatBRL(targetProfitRevenue)})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
