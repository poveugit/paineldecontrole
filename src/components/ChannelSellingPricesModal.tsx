import React, { useMemo, useState } from 'react';
import {
  X,
  DollarSign,
  Percent,
  Check,
  TrendingUp,
  AlertTriangle,
  Store,
  Smartphone,
  ShieldCheck,
  Calculator,
  Minus,
  Plus,
} from 'lucide-react';
import { ChannelFee } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';
import { CurrencyCentsInput } from './CurrencyCentsInput';

interface ChannelSellingPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  cost: number;
  targetNetMargin: number;
  targetNetProfitBRL?: number;
  currentBasePrice: number;
  channels: ChannelFee[];
  onChangeCost: (newCost: number) => void;
  onChangeTargetMargin: (newMargin: number) => void;
  onChangeTargetNetProfitBRL?: (newProfitBRL: number | undefined) => void;
  onApplyPrice: (price: number, channelName: string) => void;
}

export const ChannelSellingPricesModal: React.FC<ChannelSellingPricesModalProps> = ({
  isOpen,
  onClose,
  productName,
  cost,
  targetNetMargin,
  targetNetProfitBRL,
  currentBasePrice,
  channels,
  onChangeCost,
  onChangeTargetMargin,
  onChangeTargetNetProfitBRL,
  onApplyPrice,
}) => {
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [appliedChannelId, setAppliedChannelId] = useState<string | null>(null);

  const platforms = useMemo(() => {
    const map = new Map<string, string>();
    channels.forEach((c) => {
      if (!map.has(c.platform)) {
        map.set(c.platform, c.platformName);
      }
    });
    return Array.from(map.entries());
  }, [channels]);

  const hasFixedProfitGoal =
    typeof targetNetProfitBRL === 'number' && targetNetProfitBRL > 0;

  const calculatedRows = useMemo(() => {
    const safeCost = Math.max(0, Number(cost) || 0);
    const safeMargin = Math.max(0, Math.min(0.9, Number(targetNetMargin) || 0));
    const safeProfitBRL = hasFixedProfitGoal ? Number(targetNetProfitBRL) : 0;

    return channels
      .filter((c) => platformFilter === 'all' || c.platform === platformFilter)
      .map((channel) => {
        const feeRate = (Number(channel.totalRate) || 0) / 100;
        if (hasFixedProfitGoal) {
          const denominator = 1 - feeRate;
          const feasible = denominator > 0.02;
          const canCompute = feasible && (safeCost > 0 || safeProfitBRL > 0);
          const sellingPrice = canCompute
            ? Number(((safeCost + safeProfitBRL) / denominator).toFixed(2))
            : 0;
          const feeAmount = canCompute ? Number((sellingPrice * feeRate).toFixed(2)) : 0;
          const netProfit = canCompute
            ? Number((sellingPrice - safeCost - feeAmount).toFixed(2))
            : 0;
          const realMarginPct = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
          const markup = safeCost > 0 && sellingPrice > 0 ? sellingPrice / safeCost : 0;
          return {
            channel,
            feasible,
            sellingPrice,
            feeAmount,
            netProfit,
            realMarginPct,
            markup,
          };
        }

        const denominator = 1 - safeMargin - feeRate;
        const feasible = denominator > 0.02;
        const sellingPrice = feasible && safeCost > 0 ? Number((safeCost / denominator).toFixed(2)) : 0;
        const feeAmount = feasible && safeCost > 0 ? Number((sellingPrice * feeRate).toFixed(2)) : 0;
        const netProfit = feasible && safeCost > 0 ? Number((sellingPrice - safeCost - feeAmount).toFixed(2)) : 0;
        const realMarginPct = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
        const markup = safeCost > 0 && sellingPrice > 0 ? sellingPrice / safeCost : 0;

        return {
          channel,
          feasible,
          sellingPrice,
          feeAmount,
          netProfit,
          realMarginPct,
          markup,
        };
      });
  }, [channels, cost, targetNetMargin, targetNetProfitBRL, hasFixedProfitGoal, platformFilter]);

  if (!isOpen) return null;

  const directDenominator = 1 - Math.max(0, Math.min(0.9, Number(targetNetMargin) || 0));
  const zeroFeePrice = hasFixedProfitGoal
    ? Number((Math.max(0, Number(cost) || 0) + Number(targetNetProfitBRL || 0)).toFixed(2))
    : directDenominator > 0.02 && cost > 0
    ? Number((cost / directDenominator).toFixed(2))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Tabela de Precificação Blindada por Canal
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                Preços de Venda a Praticar — {productName || 'Novo Produto'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores calculados automaticamente sobre o Preço de Custo para garantir sua margem líquida real após descontar todas as taxas de cada plataforma e meio de pagamento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Cost, Profit Goal & Margin Controls */}
        <div className="p-4 sm:px-5 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <label className="text-[11px] text-slate-400 font-semibold block mb-1">
              Preço de Custo (CMV) (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">R$</span>
              <CurrencyCentsInput
                ariaLabel="Preço de Custo (CMV) (R$)"
                value={cost || 0}
                onChangeValue={onChangeCost}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div
            className={`bg-slate-950/80 border rounded-xl p-3 transition-colors ${
              hasFixedProfitGoal ? 'border-cyan-500/60' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400 font-semibold">
                Meta de Lucro Líquido (R$)
              </label>
              {hasFixedProfitGoal && onChangeTargetNetProfitBRL && (
                <button
                  type="button"
                  onClick={() => onChangeTargetNetProfitBRL(undefined)}
                  className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">R$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={targetNetProfitBRL && targetNetProfitBRL > 0 ? targetNetProfitBRL : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeTargetNetProfitBRL?.(!Number.isNaN(val) && val > 0 ? val : undefined);
                }}
                placeholder="Opcional (ex: 1,00)"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-bold font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div
            className={`bg-slate-950/80 border rounded-xl p-3 ${
              hasFixedProfitGoal ? 'border-slate-800/60 opacity-70' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400 font-semibold">
                Margem Líquida Alvo (%)
              </label>
              {hasFixedProfitGoal && (
                <span className="text-[9px] text-cyan-400 font-mono">Usando R$</span>
              )}
            </div>
            <div className="flex items-stretch bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-emerald-500">
              <button
                type="button"
                onClick={() =>
                  onChangeTargetMargin(
                    Math.max(0, Math.round(targetNetMargin * 100) - 1) / 100
                  )
                }
                className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-r border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Diminuir margem em 1%"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="relative flex-1 min-w-0">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="85"
                  value={Number((targetNetMargin * 100).toFixed(1))}
                  onChange={(e) =>
                    onChangeTargetMargin(
                      Math.max(0, Math.min(85, parseFloat(e.target.value) || 0)) / 100
                    )
                  }
                  className="w-full pl-2 pr-6 py-1.5 bg-transparent text-center text-cyan-300 font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-2 top-1.5 text-[11px] text-slate-500 font-mono pointer-events-none">
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChangeTargetMargin(
                    Math.min(85, Math.round(targetNetMargin * 100) + 1) / 100
                  )
                }
                className="px-2.5 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 border-l border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Aumentar margem em 1%"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-300 font-semibold">
              {hasFixedProfitGoal
                ? `Balcão 0% (+${formatBRL(targetNetProfitBRL || 0)}) vs Salvo`
                : 'Preço Sem Taxa (Balcão 0%) vs Salvo'}
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-base font-bold font-mono text-emerald-400">
                {formatBRL(zeroFeePrice)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Salvo: <strong className="text-white">{formatBRL(currentBasePrice)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Platform Filter Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
              platformFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Todos os Canais ({channels.length})
          </button>
          {platforms.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlatformFilter(key)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                platformFilter === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Channels Pricing Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {cost <= 0 && !hasFixedProfitGoal ? (
            <div className="py-12 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl">
              <DollarSign className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-white">Informe o Preço de Custo acima</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Assim que você digitar o custo do produto, todos os valores de venda a praticar considerando as taxas de cada aplicativo e maquininha aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Canal & Plataforma</th>
                    <th className="py-3 px-3">Taxa Total</th>
                    <th className="py-3 px-3">Taxa (R$)</th>
                    <th className="py-3 px-3 text-emerald-400">Preço de Venda a Praticar</th>
                    <th className="py-3 px-3">Lucro Líquido Real</th>
                    <th className="py-3 px-3">Markup</th>
                    <th className="py-3 px-3.5 text-right">Definir Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {calculatedRows.map(({ channel, feasible, sellingPrice, feeAmount, netProfit, realMarginPct, markup }) => {
                    const isApplied = appliedChannelId === channel.id || Math.abs(currentBasePrice - sellingPrice) < 0.01;
                    return (
                      <tr
                        key={channel.id}
                        className={`transition-colors ${
                          channel.highlight ? 'bg-slate-800/25 hover:bg-slate-800/45' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            {channel.platform === 'balcao' ? (
                              <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{channel.name}</span>
                                {channel.highlight && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                    Principal
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">{channel.platformName}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              channel.totalRate >= 15
                                ? 'bg-rose-500/15 text-rose-300'
                                : channel.totalRate >= 8
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            {channel.totalRate.toFixed(2).replace('.', ',')}%
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-rose-300">
                          {feasible ? `- ${formatBRL(feeAmount)}` : '—'}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {feasible ? (
                            <span className="text-sm font-black text-emerald-400">
                              {formatBRL(sellingPrice)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-sans font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Margem + Taxa ≥ 98%
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {feasible ? (
                            <div>
                              <span className="font-bold text-cyan-300">{formatBRL(netProfit)}</span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({realMarginPct.toFixed(1)}%)
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-300">
                          {feasible ? `${markup.toFixed(2)}x` : '—'}
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          {feasible && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyPrice(sellingPrice, channel.name);
                                setAppliedChannelId(channel.id);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                isApplied
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-800 hover:bg-emerald-600/90 text-slate-200 hover:text-white border border-slate-700'
                              }`}
                              title="Definir este valor como Preço Base do produto no catálogo"
                            >
                              <Check className="w-3 h-3" />
                              {isApplied ? 'Aplicado' : 'Usar este Preço'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-5 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {hasFixedProfitGoal ? (
                <>
                  Fórmula Lucro Fixo:{' '}
                  <strong className="text-slate-200 font-mono">
                    Preço = (Custo + Lucro R$) / (1 - Taxa do Canal)
                  </strong>
                </>
              ) : (
                <>
                  Fórmula Blindada:{' '}
                  <strong className="text-slate-200 font-mono">
                    Preço = Custo / (1 - Margem Alvo - Taxa do Canal)
                  </strong>
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
          >
            Concluir & Voltar ao Produto
          </button>
        </div>
      </div>
    </div>
  );
};
