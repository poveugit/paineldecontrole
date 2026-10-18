import React, { useState } from 'react';
import {
  Users,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  DollarSign,
  Compass,
} from 'lucide-react';
import { CompetitorItem, ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL, formatPercent } from '../utils/pricingEngine';

interface CompetitorRadarWidgetProps {
  competitors: CompetitorItem[];
  product: ProductItem;
  channels: ChannelFee[];
  onAddCompetitor: (competitor: Omit<CompetitorItem, 'id' | 'differenceToUs' | 'threatLevel'>) => void;
  onRemoveCompetitor: (id: string) => void;
  onApplyPrice: (price: number) => void;
}

export const CompetitorRadarWidget: React.FC<CompetitorRadarWidgetProps> = ({
  competitors,
  product,
  channels,
  onAddCompetitor,
  onRemoveCompetitor,
  onApplyPrice,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('iFood');
  const [newPrice, setNewPrice] = useState('');
  const [newDistance, setNewDistance] = useState('1.5');

  const prices = competitors.map((c) => c.price);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : product.currentPrice;
  const minPrice = prices.length ? Math.min(...prices) : product.currentPrice;
  const maxPrice = prices.length ? Math.max(...prices) : product.currentPrice;

  // Sweet spot recommended by AI logic
  const sweetSpotPrice = Number((avgPrice * 0.98).toFixed(2));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    onAddCompetitor({
      name: newName,
      platform: newPlatform,
      price: parseFloat(newPrice),
      lastUpdated: 'Agora',
      distanceKm: parseFloat(newDistance) || 1.0,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-md shadow-cyan-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Monitoramento de Concorrência & Radar de Mercado
            </h2>
            <p className="text-xs text-slate-400">
              Acompanhamento de preços praticados por concorrentes locais no iFood, Uai Rango e Tchau Fome.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Cadastrar Concorrente</span>
        </button>
      </div>

      {/* Market Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Preço Médio de Mercado</div>
          <div className="text-base font-mono font-bold text-white mt-1">{formatBRL(avgPrice)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Base: {competitors.length} estabelecimentos</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Menor Preço Local</div>
          <div className="text-base font-mono font-bold text-rose-400 mt-1">{formatBRL(minPrice)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Pressão promocional</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Maior Preço Local</div>
          <div className="text-base font-mono font-bold text-cyan-400 mt-1">{formatBRL(maxPrice)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Teto da categoria</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-500/30">
          <div className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Sweet Spot Sugerido (IA)
          </div>
          <div className="text-base font-mono font-bold text-emerald-300 mt-1">
            {formatBRL(sweetSpotPrice)}
          </div>
          <button
            onClick={() => onApplyPrice(sweetSpotPrice)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium mt-0.5 block"
          >
            Adotar este preço
          </button>
        </div>
      </div>

      {/* Add Competitor Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 rounded-2xl bg-slate-950 border border-slate-700/80 space-y-3">
          <div className="text-xs font-bold text-white">Cadastrar Novo Concorrente para Monitoramento</div>
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
              step="0.10"
              placeholder="Preço Praticado R$"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="number"
              step="0.1"
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
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Salvar Concorrente
            </button>
          </div>
        </form>
      )}

      {/* Competitors Table */}
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
              const diffPct = ((comp.price - product.currentPrice) / product.currentPrice) * 100;
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
                      onClick={() => onRemoveCompetitor(comp.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-all"
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
    </div>
  );
};
