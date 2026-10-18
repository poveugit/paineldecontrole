import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Power,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Store,
  UtensilsCrossed,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';

interface OperationsControlWidgetProps {
  products: ProductItem[];
  channels: ChannelFee[];
  selectedProduct: ProductItem;
  onSelectProduct: (p: ProductItem) => void;
  canEditPrices: boolean;
}

export const OperationsControlWidget: React.FC<OperationsControlWidgetProps> = ({
  products,
  channels,
  selectedProduct,
  onSelectProduct,
  canEditPrices,
}) => {
  const [channelStatus, setChannelStatus] = useState<Record<string, boolean>>({
    'uai-rango': true,
    'ifood-basic': true,
    'tchau-fome': true,
    'balcao-pix': true,
  });

  const [orderCount, setOrderCount] = useState<number>(42);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(18);
  const [shiftTotalBRL, setShiftTotalBRL] = useState<number>(1840.5);

  const toggleChannel = (id: string) => {
    setChannelStatus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const estimatedShiftCMV = shiftTotalBRL * 0.32; // ~32% CMV médio
  const activeChannelsCount = Object.values(channelStatus).filter(Boolean).length;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Painel Operacional do Caixa, Cozinha & Canais
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Turno em Andamento
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestão de disponibilidade de itens no delivery, status de abertura dos canais e métricas de expedição.
            </p>
          </div>
        </div>

        {/* Real-time Status Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">
              {activeChannelsCount} de {Object.keys(channelStatus).length} Canais Conectados
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Faturamento do Turno</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {formatBRL(shiftTotalBRL)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Média de R$ {(shiftTotalBRL / Math.max(1, orderCount)).toFixed(2)} / pedido
          </p>
        </div>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>CMV Consumido Estimado</span>
            <UtensilsCrossed className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
            {formatBRL(estimatedShiftCMV)}
          </div>
          <p className="text-[11px] text-emerald-400 mt-0.5">
            Meta 30-33% atingida (32.0%)
          </p>
        </div>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pedidos Expedidos Hoje</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {orderCount} <span className="text-xs text-slate-400 font-normal">pedidos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            0 cancelamentos ou estornos
          </p>
        </div>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Tempo Médio de Preparo</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {prepTimeMinutes} <span className="text-xs text-slate-400 font-normal">minutos</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-0.5">
            Dentro da janela padrão delivery
          </p>
        </div>
      </div>

      {/* Channel Connections Status Grid */}
      <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <Store className="w-4 h-4 text-cyan-400" />
          Status Operacional dos Canais (Abrir / Pausar Loja)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {channels.map((ch) => {
            const isOnline = channelStatus[ch.id] ?? true;
            return (
              <div
                key={ch.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isOnline
                    ? 'bg-slate-900/80 border-slate-700/80'
                    : 'bg-rose-950/20 border-rose-900/40 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-white">{ch.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Taxa: {ch.totalRate}% • {isOnline ? 'Recebendo pedidos' : 'Loja Pausada'}
                  </p>
                </div>
                <button
                  onClick={() => toggleChannel(ch.id)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                  }`}
                  title={isOnline ? 'Pausar pedidos neste canal' : 'Abrir canal para vendas'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fast Menu Availability & Operational Toggle */}
      <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              Controle de Itens do Cardápio no Caixa
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Clique para selecionar o produto ativo na planilha ou gerenciar disponibilidade.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => {
            const isSelected = selectedProduct.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      {isSelected && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Ativo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{p.category}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                    {formatBRL(p.currentPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                  <span>CMV: <strong className="text-slate-300 font-mono">{formatBRL(p.cost)}</strong></span>
                  <span className="text-emerald-300">
                    Margem: {(((p.currentPrice - p.cost) / (p.currentPrice || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
