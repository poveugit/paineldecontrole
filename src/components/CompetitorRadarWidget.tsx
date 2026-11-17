import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Compass,
  ShieldCheck,
  AlertTriangle,
  Store,
} from 'lucide-react';
import { CompetitorItem, ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';

interface CompetitorRadarWidgetProps {
  competitors: CompetitorItem[];
  product: ProductItem;
  channels: ChannelFee[];
  preferredChannelId?: string;
  isPortfolioMode?: boolean;
  onAddCompetitor: (competitor: Omit<CompetitorItem, 'id' | 'differenceToUs' | 'threatLevel'>) => void;
  onRemoveCompetitor: (id: string) => void;
  onApplyPrice: (price: number) => void;
}

export const CompetitorRadarWidget: React.FC<CompetitorRadarWidgetProps> = ({
  competitors,
  product,
  channels,
  preferredChannelId,
  isPortfolioMode = false,
  onAddCompetitor,
  onRemoveCompetitor,
  onApplyPrice,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('iFood');
  const [newPrice, setNewPrice] = useState('');
  const [newDistance, setNewDistance] = useState('1.5');
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    preferredChannelId || product.referenceChannelId || channels[0]?.id || 'direct-zero'
  );

  useEffect(() => {
    const nextChannel = preferredChannelId || product.referenceChannelId;
    if (nextChannel && (nextChannel === 'direct-zero' || channels.some((c) => c.id === nextChannel))) {
      setSelectedChannelId(nextChannel);
    }
  }, [preferredChannelId, product.id, product.referenceChannelId, channels]);

  const activeChannel =
    selectedChannelId === 'direct-zero'
      ? { id: 'direct-zero', name: 'Balcão Direto (0%)', totalRate: 0 }
      : channels.find((c) => c.id === selectedChannelId) ||
        channels[0] || { id: 'direct-zero', name: 'Balcão Direto (0%)', totalRate: 0 };

  const hasCompetitors = competitors.length > 0;
  const prices = competitors.map((c) => c.price);
  const avgPrice = hasCompetitors ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = hasCompetitors ? Math.min(...prices) : 0;
  const maxPrice = hasCompetitors ? Math.max(...prices) : 0;

  // Cálculo Blindado do Sweet Spot (nunca sugere prejuízo nem fere a margem líquida alvo)
  const cost = Math.max(0, Number(product.cost) || 0);
  const feeRate = Math.max(0, Math.min(0.9, (Number(activeChannel.totalRate) || 0) / 100));
  const targetNetMargin = Math.max(0, Math.min(0.85, Number(product.targetNetMargin) || 0.25));

  const breakEvenDenominator = 1 - feeRate;
  const breakEvenFloorPrice =
    cost > 0 && breakEvenDenominator > 0.02
      ? Number((cost / breakEvenDenominator).toFixed(2))
      : 0;

  const shieldedDenominator = 1 - targetNetMargin - feeRate;
  const shieldedFloorPrice =
    cost > 0 && shieldedDenominator > 0.02
      ? Number((cost / shieldedDenominator).toFixed(2))
      : breakEvenFloorPrice;

  const rawMarketTarget = hasCompetitors ? Number((avgPrice * 0.98).toFixed(2)) : 0;
  const wasShieldedByFloor = hasCompetitors && rawMarketTarget < shieldedFloorPrice;
  const wouldCauseLossWithoutShield = hasCompetitors && rawMarketTarget < breakEvenFloorPrice;

  const sweetSpotPrice = hasCompetitors
    ? Math.max(rawMarketTarget, shieldedFloorPrice)
    : shieldedFloorPrice;

  const sweetSpotFeeAmount = Number((sweetSpotPrice * feeRate).toFixed(2));
  const sweetSpotNetProfit = Number((sweetSpotPrice - cost - sweetSpotFeeAmount).toFixed(2));
  const sweetSpotRealMarginPct =
    sweetSpotPrice > 0 ? (sweetSpotNetProfit / sweetSpotPrice) * 100 : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;
    const parsedPrice = parseFloat(newPrice.replace(',', '.'));
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return;

    onAddCompetitor({
      name: newName.trim(),
      platform: newPlatform,
      price: parsedPrice,
      lastUpdated: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      distanceKm: parseFloat(newDistance.replace(',', '.')) || 1.0,
    });
    setNewName('');
    setNewPrice('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-md shadow-cyan-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                Monitoramento de Concorrência & Radar de Mercado
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Sweet Spot Blindado
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Estatísticas calculadas exclusivamente com base nos concorrentes reais cadastrados por você, com piso protegido pelo seu CMV e taxa do canal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Canal p/ Piso:</span>
            <select
              value={activeChannel.id}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id} className="bg-slate-900 text-white">
                  {ch.name} ({ch.totalRate.toFixed(2).replace('.', ',')}%)
                </option>
              ))}
              <option value="direct-zero" className="bg-slate-900 text-white">
                Balcão Direto (0,00%)
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Concorrente</span>
          </button>
        </div>
      </div>

      {/* Market Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Preço Médio de Mercado</div>
          <div className="text-base font-mono font-bold text-white mt-1">
            {hasCompetitors ? formatBRL(avgPrice) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {hasCompetitors
              ? `Base: ${competitors.length} ${competitors.length === 1 ? 'concorrente real' : 'concorrentes reais'}`
              : 'Cadastre concorrentes abaixo'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Menor Preço Local</div>
          <div className="text-base font-mono font-bold text-rose-400 mt-1">
            {hasCompetitors ? formatBRL(minPrice) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {hasCompetitors ? 'Menor valor cadastrado na região' : 'Sem registros no radar'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Maior Preço Local</div>
          <div className="text-base font-mono font-bold text-cyan-400 mt-1">
            {hasCompetitors ? formatBRL(maxPrice) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {hasCompetitors ? 'Teto registrado na tabela' : 'Sem registros no radar'}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            wasShieldedByFloor
              ? 'bg-gradient-to-br from-amber-950/30 to-slate-950 border-amber-500/40'
              : 'bg-gradient-to-br from-emerald-950/30 to-slate-950 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div
              className={`text-[10px] uppercase font-semibold flex items-center gap-1 ${
                wasShieldedByFloor ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Sweet Spot Blindado</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700">
              Piso: {formatBRL(shieldedFloorPrice)}
            </span>
          </div>

          <div className="text-base font-mono font-bold text-emerald-300 mt-1">
            {sweetSpotPrice > 0 ? formatBRL(sweetSpotPrice) : '—'}
          </div>

          <div className="text-[10px] text-slate-300 mt-0.5 leading-snug">
            {!hasCompetitors ? (
              <span className="text-slate-400">
                Piso mínimo p/ {(targetNetMargin * 100).toFixed(0)}% líquido no {activeChannel.name}
              </span>
            ) : wasShieldedByFloor ? (
              <span className="text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {wouldCauseLossWithoutShield
                  ? `Média -2% (${formatBRL(rawMarketTarget)}) daria prejuízo; travado no piso!`
                  : `Média -2% (${formatBRL(rawMarketTarget)}) ficou abaixo do piso de ${(targetNetMargin * 100).toFixed(0)}%.`}
              </span>
            ) : (
              <span className="text-emerald-300">
                2% abaixo da média • Lucro real: +{formatBRL(sweetSpotNetProfit)} ({sweetSpotRealMarginPct.toFixed(1)}%)
              </span>
            )}
          </div>

          {sweetSpotPrice > 0 && (
            isPortfolioMode ? (
              <span className="text-[10px] text-slate-500 mt-1 block">
                Selecione 1 produto em foco para aplicar preço
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onApplyPrice(sweetSpotPrice)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium mt-1 block cursor-pointer"
              >
                Adotar este preço no produto
              </button>
            )
          )}
        </div>
      </div>

      {/* Add Competitor Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 rounded-2xl bg-slate-950 border border-slate-700/80 space-y-3">
          <div className="text-xs font-bold text-white">Cadastrar Concorrente Real para Monitoramento</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <input
              type="text"
              placeholder="Nome do Concorrente"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="iFood">iFood</option>
              <option value="Uai Rango">Uai Rango</option>
              <option value="Tchau Fome">Tchau Fome</option>
              <option value="Balcão">Balcão Local</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Preço Praticado R$"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Distância (km)"
              value={newDistance}
              onChange={(e) => setNewDistance(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
            >
              Salvar Concorrente
            </button>
          </div>
        </form>
      )}

      {/* Competitors Table or Clean Empty State */}
      {!hasCompetitors ? (
        <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white">
              Nenhum concorrente cadastrado no radar
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Os exemplos fictícios foram removidos. Cadastre manualmente seus concorrentes reais da região para comparar preços e calcular o Sweet Spot Blindado sobre o mercado real.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeiro Concorrente</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3.5 font-semibold">Concorrente</th>
                <th className="py-2.5 px-3.5 font-semibold">Plataforma</th>
                <th className="py-2.5 px-3.5 font-semibold text-center">Preço Praticado</th>
                <th className="py-2.5 px-3.5 font-semibold text-center">Diferença vs Nós</th>
                <th className="py-2.5 px-3.5 font-semibold">Última Checagem</th>
                <th className="py-2.5 px-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {competitors.map((comp) => {
                const ourPrice = Number(product.currentPrice) || 0;
                const diffPct = ourPrice > 0 ? ((comp.price - ourPrice) / ourPrice) * 100 : 0;
                const isCheaper = diffPct < 0;

                return (
                  <tr key={comp.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <span className="font-semibold text-white block">{comp.name}</span>
                      <span className="text-[10px] text-slate-400">{comp.distanceKm} km de distância</span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                        {comp.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-white">
                      {formatBRL(comp.price)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isCheaper
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isCheaper ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {diffPct > 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">{comp.lastUpdated}</td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveCompetitor(comp.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-all cursor-pointer"
                        title="Excluir concorrente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
