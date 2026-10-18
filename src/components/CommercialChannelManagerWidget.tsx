import React, { useState } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  Percent,
  Calendar,
  CreditCard,
  Sliders,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { ChannelFee, ProductItem } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';

interface CommercialChannelManagerWidgetProps {
  channels: ChannelFee[];
  product: ProductItem;
  onOpenFeeManager: () => void;
  canEditFees: boolean;
}

export const CommercialChannelManagerWidget: React.FC<CommercialChannelManagerWidgetProps> = ({
  channels,
  product,
  onOpenFeeManager,
  canEditFees,
}) => {
  const [simulationGrossSales, setSimulationGrossSales] = useState<number>(5000);

  // Channels ranked by lowest total fee (highest net return)
  const rankedChannels = [...channels].sort((a, b) => a.totalRate - b.totalRate);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Gestor Comercial de Canais, Comissões & Repasses
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
                Estratégia de Vendas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulador de repasse líquido bancário por volume de vendas e análise de taxas contratuais.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFeeManager}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 shrink-0"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Editar Taxas Contratuais</span>
        </button>
      </div>

      {/* Simulator Slider */}
      <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Simular Volume de Faturamento Mensal do Canal
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compare quanto sobra na sua conta bancária após as comissões de cada plataforma de delivery.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-violet-300 font-mono">
              {formatBRL(simulationGrossSales)}
            </span>
            <span className="text-[10px] text-slate-500 block">Faturamento Bruto</span>
          </div>
        </div>

        <input
          type="range"
          min="1000"
          max="30000"
          step="500"
          value={simulationGrossSales}
          onChange={(e) => setSimulationGrossSales(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />

        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>R$ 1.000</span>
          <span>R$ 15.000</span>
          <span>R$ 30.000</span>
        </div>
      </div>

      {/* Comparative Simulation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rankedChannels.map((ch, idx) => {
          const feeDiscount = (simulationGrossSales * ch.totalRate) / 100;
          const netPayout = simulationGrossSales - feeDiscount;
          const isBestChannel = idx === 0;

          return (
            <div
              key={ch.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isBestChannel
                  ? 'bg-gradient-to-b from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                  : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white truncate">{ch.name}</span>
                  {isBestChannel ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      ★ Maior Retorno
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                  )}
                </div>

                <div className="space-y-1.5 py-2 border-y border-slate-800/80 my-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxa Total Aplicada:</span>
                    <span className="font-mono font-bold text-rose-400">{ch.totalRate}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Comissão Cobrada:</span>
                    <span className="font-mono text-rose-300">- {formatBRL(feeDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Repasse Bancário Líquido:</span>
                    <span className="font-mono font-bold text-emerald-300">{formatBRL(netPayout)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Margem no Smash (R$ {product.currentPrice.toFixed(2)}):</span>
                  <span className="font-mono font-bold text-white">
                    {(
                      ((product.currentPrice - product.cost - (product.currentPrice * ch.totalRate) / 100) /
                        (product.currentPrice || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
