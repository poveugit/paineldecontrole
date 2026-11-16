import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle,
  HelpCircle,
  Smartphone,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { ChannelFee, ProductItem } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface ChannelComparisonWidgetProps {
  channels: ChannelFee[];
  product: ProductItem;
  canEditFees: boolean;
  onUpdateChannelFee: (id: string, newTotalRate: number) => void;
}

export const ChannelComparisonWidget: React.FC<ChannelComparisonWidgetProps> = ({
  channels,
  product,
  canEditFees,
  onUpdateChannelFee,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [testPrice, setTestPrice] = useState<number>(product.currentPrice || 9.84);

  useEffect(() => {
    setTestPrice(product.currentPrice || 9.84);
  }, [product.id, product.currentPrice]);

  const filteredChannels =
    selectedPlatform === 'all' ? channels : channels.filter((c) => c.platform === selectedPlatform);

  // Group by platform
  const platforms = [
    { key: 'all', name: 'Todos os Canais' },
    { key: 'uai_rango', name: 'Uai Rango' },
    { key: 'tchau_fome', name: 'Tchau Fome' },
    { key: 'ifood', name: 'iFood Básico' },
    { key: 'balcao', name: 'Balcão / Direto' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Comparativo de Canais & Meios de Pagamento
            </h2>
            <p className="text-xs text-slate-400">
              Veja quanto sobra líquido na conta bancária ao vender o mesmo produto em cada aplicativo.
            </p>
          </div>
        </div>

        {/* Test Price Simulator */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Preço de Venda Simulado:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">{formatBRL(testPrice)}</span>
          <input
            type="range"
            min={product.cost}
            max={product.cost * 3}
            step="0.50"
            value={testPrice}
            onChange={(e) => setTestPrice(parseFloat(e.target.value))}
            className="w-20 accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex items-center gap-1.5 my-4 overflow-x-auto pb-1 text-xs">
        {platforms.map((p) => (
          <button
            key={p.key}
            onClick={() => setSelectedPlatform(p.key)}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
              selectedPlatform === p.key
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Channel Comparison Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredChannels.map((channel) => {
          const feeValue = testPrice * (channel.totalRate / 100);
          const netProfit = testPrice - product.cost - feeValue;
          const netMarginPct = testPrice > 0 ? (netProfit / testPrice) * 100 : 0;
          const isCritical = netMarginPct < 8;

          return (
            <div
              key={channel.id}
              className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                channel.highlight
                  ? 'bg-slate-950/90 border-violet-500/40 shadow-lg shadow-violet-500/5'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {channel.platformName}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {channel.totalRate.toFixed(2).replace('.', ',')}% Taxa
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white mt-1.5 leading-snug">{channel.name}</h4>

                {/* Sub-breakdown if available */}
                <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1 font-mono">
                  {channel.breakdown.appBase > 0 && <span>App: {channel.breakdown.appBase}%</span>}
                  {channel.breakdown.paymentGateway > 0 && <span>+ Gateway: {channel.breakdown.paymentGateway}%</span>}
                  {channel.breakdown.machineRate && <span>+ Maquininha: {channel.breakdown.machineRate}%</span>}
                  {channel.breakdown.anticipation && <span>+ Antecipação: {channel.breakdown.anticipation}%</span>}
                </div>
              </div>

              {/* Financial Outcome */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Taxa Retida:</span>
                  <span className="text-rose-400">- {formatBRL(feeValue)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Custo CMV:</span>
                  <span>- {formatBRL(product.cost)}</span>
                </div>
                <div className="flex items-center justify-between font-bold pt-1 border-t border-slate-850">
                  <span className="text-slate-200">Lucro Líquido:</span>
                  <span className={netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {formatBRL(netProfit)}
                  </span>
                </div>

                {/* Net Margin Bar */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400 font-sans">Margem Líquida Real:</span>
                    <span
                      className={`font-bold ${
                        isCritical ? 'text-rose-400' : netMarginPct > 20 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {formatPercent(netMarginPct)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, netMarginPct * 2.5))}%` }}
                      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                      className={`h-full rounded-full ${
                        isCritical ? 'bg-rose-500' : netMarginPct > 20 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Edit Fee capability for authorized roles */}
                {canEditFees && (
                  <div className="pt-2 text-[10px] text-right">
                    <button
                      onClick={() => {
                        const val = prompt(`Nova taxa total percentual para ${channel.name}:`, channel.totalRate.toString());
                        if (val && !isNaN(parseFloat(val))) {
                          onUpdateChannelFee(channel.id, parseFloat(val));
                        }
                      }}
                      className="text-violet-400 hover:text-violet-300 underline font-sans"
                    >
                      Editar taxa %
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
