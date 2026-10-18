import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  TrendingUp,
  Target,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ProductItem, ChannelFee, FixedExpenses } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';

interface BreakevenShieldedWidgetProps {
  product: ProductItem;
  channels: ChannelFee[];
  fixedExpenses: FixedExpenses;
  onApplyPrice?: (price: number) => void;
  canEditPrices?: boolean;
}

export const BreakevenShieldedWidget: React.FC<BreakevenShieldedWidgetProps> = ({
  product,
  channels,
  fixedExpenses,
  onApplyPrice,
  canEditPrices = true,
}) => {
  const [targetMargin, setTargetMargin] = useState<number>(30); // 30% target margin
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || 'uai-rango');

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0] || {
    name: 'Uai Rango Online',
    totalRate: 17.49,
  };

  // Precise shielded pricing formula:
  // Price = Cost / (1 - (ChannelFee% + TargetMargin%) / 100)
  const divisor = 1 - (activeChannel.totalRate + targetMargin) / 100;
  const shieldedPrice = divisor > 0.05 ? product.cost / divisor : product.cost * 2.5;

  // Break-even units needed for this product to cover total fixed costs
  const unitContributionMargin = Math.max(
    0.5,
    shieldedPrice - product.cost - (shieldedPrice * activeChannel.totalRate) / 100
  );
  const breakEvenUnits = Math.ceil(fixedExpenses.totalFixed / unitContributionMargin);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Calculadora de Precificação Blindada & Ponto de Equilíbrio
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Fórmula Anti-Prejuízo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fórmula contábil exata que calcula o preço necessário para atingir sua margem líquida real após o desconto do app.
            </p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold px-2">Canal:</span>
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChannelId(c.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                c.id === selectedChannelId
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.name.split(' ')[0]} ({c.totalRate}%)
            </button>
          ))}
        </div>
      </div>

      {/* Target Margin Slider & Shielded Price Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Margin Slider */}
        <div className="lg:col-span-2 bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Margem Líquida Desejada no Bolso
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Quanto % de lucro líquido real você deseja reter na venda deste produto.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {targetMargin}%
              </span>
            </div>
          </div>

          <input
            type="range"
            min="10"
            max="50"
            step="1"
            value={targetMargin}
            onChange={(e) => setTargetMargin(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          {/* Animated Illustrative Composition Bar for Shielded Price */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> CMV ({( (product.cost / shieldedPrice) * 100 ).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Taxa Canal ({activeChannel.totalRate}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 font-bold" /> Margem Líquida ({targetMargin}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800/80 overflow-hidden flex gap-0.5 p-0.5 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, (product.cost / shieldedPrice) * 100))}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="h-full bg-amber-500 rounded-l-full shadow-sm"
                title={`CMV: ${formatBRL(product.cost)}`}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, activeChannel.totalRate))}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.05 }}
                className="h-full bg-rose-500 shadow-sm"
                title={`Taxa Canal: ${activeChannel.totalRate}%`}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, targetMargin))}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
                className="h-full bg-emerald-500 rounded-r-full shadow-sm"
                title={`Lucro no Bolso: ${targetMargin}%`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            <button
              onClick={() => setTargetMargin(20)}
              className={`p-2 rounded-xl border transition-all ${
                targetMargin === 20 ? 'bg-slate-800 border-emerald-500/40 text-emerald-300 font-bold' : 'border-slate-800 text-slate-400'
              }`}
            >
              20% (Competitivo)
            </button>
            <button
              onClick={() => setTargetMargin(30)}
              className={`p-2 rounded-xl border transition-all ${
                targetMargin === 30 ? 'bg-slate-800 border-emerald-500/40 text-emerald-300 font-bold' : 'border-slate-800 text-slate-400'
              }`}
            >
              30% (Recomendado)
            </button>
            <button
              onClick={() => setTargetMargin(40)}
              className={`p-2 rounded-xl border transition-all ${
                targetMargin === 40 ? 'bg-slate-800 border-emerald-500/40 text-emerald-300 font-bold' : 'border-slate-800 text-slate-400'
              }`}
            >
              40% (Alta Rentabilidade)
            </button>
          </div>
        </div>

        {/* Shielded Price Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-emerald-500/40 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Preço Blindado Calculado
            </span>
            <div className="text-3xl font-black text-white font-mono mt-2">
              {formatBRL(shieldedPrice)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Garante exatamente {targetMargin}% líquido com taxa de {activeChannel.totalRate}%.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Custo CMV:</span>
              <span className="font-mono text-white">{formatBRL(product.cost)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxa do App ({activeChannel.totalRate}%):</span>
              <span className="font-mono text-rose-400">
                - {formatBRL((shieldedPrice * activeChannel.totalRate) / 100)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Lucro Líquido Real:</span>
              <span className="font-mono">
                {formatBRL((shieldedPrice * targetMargin) / 100)}
              </span>
            </div>

            {onApplyPrice && canEditPrices && (
              <button
                onClick={() => onApplyPrice(shieldedPrice)}
                className="w-full mt-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                Aplicar Preço de {formatBRL(shieldedPrice)} ao Produto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Break-Even Insight Strip */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">Ponto de Equilíbrio das Despesas Fixas</span>
            <span className="text-slate-400">
              Despesas fixas mensais cadastradas: <strong className="text-slate-200">{formatBRL(fixedExpenses.totalFixed)}</strong>.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-sans">Margem de Contribuição Unitária:</span>
            <span className="font-bold text-emerald-400">{formatBRL(unitContributionMargin)} / unid</span>
          </div>
          <div className="text-right pl-4 border-l border-slate-800">
            <span className="text-xs text-slate-400 block font-sans">Vendas Mínimas Necessárias:</span>
            <span className="font-bold text-amber-300 text-sm sm:text-base">{breakEvenUnits} unidades/mês</span>
          </div>
        </div>
      </div>
    </div>
  );
};
