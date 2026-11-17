import React, { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  DollarSign,
  TrendingUp,
  Percent,
  Truck,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { ProductItem, ChannelFee, WhatIfScenario } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface WhatIfSimulatorWidgetProps {
  product: ProductItem;
  channels: ChannelFee[];
  canEditPrices: boolean;
  onApplyPrice: (price: number) => void;
  preferredChannelId?: string;
}

export const WhatIfSimulatorWidget: React.FC<WhatIfSimulatorWidgetProps> = ({
  product,
  channels,
  canEditPrices,
  onApplyPrice,
  preferredChannelId,
}) => {
  const initialChannel =
    channels.find((c) => c.id === (preferredChannelId || product.referenceChannelId)) || channels[0];

  // Variables state (derived strictly from real product & channel data)
  const [cost, setCost] = useState<number>(Number(product.cost) || 0);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(initialChannel?.id || '');
  const [customAppFee, setCustomAppFee] = useState<number>(initialChannel?.breakdown.appBase || 0);
  const [paymentGatewayFee, setPaymentGatewayFee] = useState<number>(
    initialChannel?.breakdown.paymentGateway || initialChannel?.breakdown.machineRate || 0
  );
  const [anticipationFee, setAnticipationFee] = useState<number>(initialChannel?.breakdown.anticipation || 0);
  const [deliverySubsidy, setDeliverySubsidy] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(
    Math.round((Number(product.targetNetMargin) || 0.25) * 100)
  );
  const [monthlyUnits, setMonthlyUnits] = useState<number>(
    Math.max(0, Number(product.estimatedMonthlyUnits) || 0)
  );
  const [showAllChannels, setShowAllChannels] = useState<boolean>(false);

  useEffect(() => {
    setCost(Number(product.cost) || 0);
    setMonthlyUnits(Math.max(0, Number(product.estimatedMonthlyUnits) || 0));
    setTargetMargin(Math.round((Number(product.targetNetMargin) || 0.25) * 100));
  }, [product.id, product.cost, product.estimatedMonthlyUnits, product.targetNetMargin]);

  useEffect(() => {
    const nextChannelId = preferredChannelId || product.referenceChannelId || channels[0]?.id;
    if (nextChannelId) {
      const ch = channels.find((c) => c.id === nextChannelId);
      if (ch) {
        setSelectedChannelId(ch.id);
        setCustomAppFee(ch.breakdown.appBase || 0);
        setPaymentGatewayFee(ch.breakdown.paymentGateway || ch.breakdown.machineRate || 0);
        setAnticipationFee(ch.breakdown.anticipation || 0);
      }
    }
  }, [preferredChannelId, product.id, product.referenceChannelId, channels]);

  // Saved scenarios persisted in localStorage (no fake seeded items)
  const [savedScenarios, setSavedScenarios] = useState<WhatIfScenario[]>(() => {
    try {
      const saved = localStorage.getItem('omniprice_whatif_scenarios');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('omniprice_whatif_scenarios', JSON.stringify(savedScenarios));
    } catch {
      // Ignore storage errors
    }
  }, [savedScenarios]);

  // Synchronize when a preset channel is picked
  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    const ch = channels.find((c) => c.id === channelId);
    if (ch) {
      setCustomAppFee(ch.breakdown.appBase || 0);
      setPaymentGatewayFee(ch.breakdown.paymentGateway || ch.breakdown.machineRate || 0);
      setAnticipationFee(ch.breakdown.anticipation || 0);
    }
  };

  // Total fee percentage
  const totalFeePercent = customAppFee + paymentGatewayFee + anticipationFee;

  // Real-time calculation
  const calculations = useMemo(() => {
    const totalDirectCost = cost + packagingCost + deliverySubsidy;
    const targetMarginRatio = targetMargin / 100;
    const feeRatio = totalFeePercent / 100;

    // Fórmula Tradicional da planilha: Preço = CustoDireto / (1 - MargemNominal)
    const traditionalDenominator = 1 - targetMarginRatio;
    const traditionalPrice =
      traditionalDenominator > 0.05
        ? Number((totalDirectCost / traditionalDenominator).toFixed(2))
        : totalDirectCost * 2;
    const traditionalFeeAmount = Number((traditionalPrice * feeRatio).toFixed(2));
    const traditionalNetProfit = Number(
      (traditionalPrice - totalDirectCost - traditionalFeeAmount).toFixed(2)
    );
    const traditionalNetMarginPercent =
      traditionalPrice > 0 ? (traditionalNetProfit / traditionalPrice) * 100 : 0;

    // Fórmula Blindada IA: Preço = CustoDireto / (1 - MargemAlvo - Taxas)
    const shieldedDenominator = 1 - targetMarginRatio - feeRatio;
    const shieldedPrice =
      shieldedDenominator > 0.05
        ? Number((totalDirectCost / shieldedDenominator).toFixed(2))
        : Number((totalDirectCost * 2.5).toFixed(2));
    const shieldedFeeAmount = Number((shieldedPrice * feeRatio).toFixed(2));
    const shieldedNetProfit = Number(
      (shieldedPrice - totalDirectCost - shieldedFeeAmount).toFixed(2)
    );
    const shieldedMonthlyProfit = Number((shieldedNetProfit * monthlyUnits).toFixed(2));
    const shieldedMonthlyRevenue = Number((shieldedPrice * monthlyUnits).toFixed(2));

    return {
      totalDirectCost,
      traditionalPrice,
      traditionalFeeAmount,
      traditionalNetProfit,
      traditionalNetMarginPercent,
      shieldedPrice,
      shieldedFeeAmount,
      shieldedNetProfit,
      shieldedMonthlyProfit,
      shieldedMonthlyRevenue,
    };
  }, [cost, packagingCost, deliverySubsidy, targetMargin, totalFeePercent, monthlyUnits]);

  // Save current scenario
  const handleSaveCurrentScenario = () => {
    const name = prompt('Nome deste cenário:', `Cenário ${savedScenarios.length + 1} (${totalFeePercent}% taxa)`);
    if (!name) return;

    const newScen: WhatIfScenario = {
      id: 'scen-' + Date.now(),
      name,
      productCost: cost,
      channelFeeRate: totalFeePercent,
      deliverySubsidy,
      packagingCost,
      targetNetMargin: targetMargin / 100,
      monthlyUnits,
      calculatedPrice: calculations.shieldedPrice,
      calculatedNetProfit: calculations.shieldedNetProfit,
      calculatedMonthlyProfit: calculations.shieldedMonthlyProfit,
      calculatedMarginPercent: targetMargin,
    };

    setSavedScenarios((prev) => [newScen, ...prev]);
  };

  const handleApplyScenario = (scen: WhatIfScenario) => {
    setCost(scen.productCost);
    setDeliverySubsidy(scen.deliverySubsidy);
    setPackagingCost(scen.packagingCost);
    setTargetMargin(scen.targetNetMargin * 100);
    setMonthlyUnits(scen.monthlyUnits);
    setCustomAppFee(scen.channelFeeRate);
    setPaymentGatewayFee(0);
    setAnticipationFee(0);
  };

  const handleRemoveScenario = (id: string) => {
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white shadow-md shadow-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Simulador What-If Multi-Variáveis
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ajuste custos, taxas bancárias, frete e margem simultaneamente para simular o preço e lucro ideal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveCurrentScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-all"
            title="Salvar parâmetros atuais como um cenário para comparação"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Salvar Cenário</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-5">
        {/* Left Column: Sliders and Multi-Variable Inputs */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Preset Selector */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Canal de Venda Base ({showAllChannels ? channels.length : Math.min(4, channels.length)} de {channels.length})
              </div>
              {channels.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllChannels((prev) => !prev)}
                  className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  {showAllChannels ? 'Recolher canais' : `Mostrar todos (+${channels.length - 4})`}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(showAllChannels ? channels : channels.slice(0, 4)).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelectChannel(ch.id)}
                  className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                    selectedChannelId === ch.id
                      ? 'bg-amber-500/20 text-white border-amber-500/50 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="truncate font-medium">{ch.name}</div>
                  <div className="font-mono text-[10px] text-amber-400">{ch.totalRate}% taxa</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 text-xs">
            {/* 1. Custo CMV */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-cyan-400" />
                  Custo CMV do Produto:
                </span>
                <span className="font-mono font-bold text-white text-sm">{formatBRL(cost)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(50, Math.ceil((product.cost || 10) * 2.5))}
                step="0.10"
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* 2. Embalagem e Frete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-850">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400">Embalagem (R$):</span>
                  <span className="font-mono font-bold text-white">{formatBRL(packagingCost)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.10"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-amber-400" /> Frete Subsidiado (R$):
                  </span>
                  <span className="font-mono font-bold text-amber-300">{formatBRL(deliverySubsidy)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.50"
                  value={deliverySubsidy}
                  onChange={(e) => setDeliverySubsidy(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* 3. Taxas Compostas */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Comissão App %</label>
                <input
                  type="number"
                  step="0.5"
                  value={customAppFee}
                  onChange={(e) => setCustomAppFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Cartão / Gateway %</label>
                <input
                  type="number"
                  step="0.1"
                  value={paymentGatewayFee}
                  onChange={(e) => setPaymentGatewayFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Antecipação %</label>
                <input
                  type="number"
                  step="0.01"
                  value={anticipationFee}
                  onChange={(e) => setAnticipationFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="text-[11px] text-right text-slate-400 font-mono">
              Taxa Variável Total Acumulada:{' '}
              <strong className="text-rose-400 text-xs">{totalFeePercent.toFixed(2)}%</strong>
            </div>

            {/* 4. Margem Líquida Alvo Desejada */}
            <div className="pt-2 border-t border-slate-850">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Margem Líquida Real Desejada no Bolso:
                </span>
                <span className="font-mono font-bold text-emerald-400 text-base">{targetMargin}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="1"
                value={targetMargin}
                onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* 5. Volume Mensal */}
            <div className="pt-2 border-t border-slate-850">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Volume de Vendas Mensais:</span>
                <span className="font-mono font-bold text-cyan-300">{monthlyUnits} unidades</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(2000, Math.ceil((product.estimatedMonthlyUnits || 500) * 2))}
                step="10"
                value={monthlyUnits}
                onChange={(e) => setMonthlyUnits(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Impact & Live Comparison */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Main Price Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Preço de Venda Blindado Sugerido
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {targetMargin}% Líquido Real
              </span>
            </div>

            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {formatBRL(calculations.shieldedPrice)}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="font-sans">Lucro Líquido Unitário:</span>
                <span className="font-bold text-emerald-400">
                  +{formatBRL(calculations.shieldedNetProfit)}
                </span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span className="font-sans">Taxas Retidas ({totalFeePercent.toFixed(1)}%):</span>
                <span>-{formatBRL(calculations.shieldedFeeAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Custo Direto Total (CMV + Embalagem + Frete):</span>
                <span>-{formatBRL(calculations.totalDirectCost)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1.5 border-t border-slate-800 text-sm">
                <span className="font-sans">Projeção Lucro Mensal ({monthlyUnits} un):</span>
                <span className="text-emerald-300">
                  {formatBRL(calculations.shieldedMonthlyProfit)}
                </span>
              </div>
            </div>

            {/* Apply Button */}
            {canEditPrices && (
              <button
                onClick={() => onApplyPrice(calculations.shieldedPrice)}
                className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Adotar Preço de {formatBRL(calculations.shieldedPrice)} no Produto</span>
              </button>
            )}
          </div>

          {/* Contrast Card: What if you used traditional spreadsheet formula? */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-semibold">
              <span>Comparativo: Fórmula Tradicional da Planilha</span>
              <span className="text-amber-400 font-mono font-bold">
                {formatBRL(calculations.traditionalPrice)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Se você usar a fórmula comum da planilha para margem de {targetMargin}%, você cobra{' '}
              <strong className="text-white">{formatBRL(calculations.traditionalPrice)}</strong>, mas as taxas de{' '}
              {totalFeePercent.toFixed(1)}% reduzem seu lucro real para apenas{' '}
              <strong className="text-rose-400">
                {formatBRL(calculations.traditionalNetProfit)} (
                {calculations.traditionalNetMarginPercent.toFixed(1)}%)
              </strong>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Saved Scenarios Comparison Table */}
      {savedScenarios.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              Cenários Salvos para Comparação
            </span>
            <span className="text-[11px] text-slate-400">{savedScenarios.length} cenários arquivados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedScenarios.map((scen) => (
              <div
                key={scen.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-white">
                    <span className="truncate">{scen.name}</span>
                    <button
                      onClick={() => handleRemoveScenario(scen.id)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                      title="Excluir cenário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    CMV: {formatBRL(scen.productCost)} | Taxa: {scen.channelFeeRate}% | Margem: {(scen.targetNetMargin * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Preço Resultante</span>
                    <span className="font-bold text-white text-sm">{formatBRL(scen.calculatedPrice)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Lucro Mensal</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatBRL(scen.calculatedMonthlyProfit)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyScenario(scen)}
                  className="mt-2.5 w-full py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-all"
                >
                  Carregar Parâmetros deste Cenário
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
