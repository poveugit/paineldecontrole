import React, { useMemo, useState } from 'react';
import {
  Building2,
  DollarSign,
  Power,
  Store,
  UtensilsCrossed,
  AlertTriangle,
  Flame,
  Search,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
} from 'lucide-react';
import { ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL, normalizeSearchText } from '../utils/pricingEngine';

interface OperationsControlWidgetProps {
  products: ProductItem[];
  channels: ChannelFee[];
  selectedProduct: ProductItem | null;
  onSelectProduct: (p: ProductItem) => void;
  onEditProduct?: (p: ProductItem) => void;
  onClearProductFocus?: () => void;
  onToggleProductActive?: (product: ProductItem) => void;
  canEditPrices: boolean;
}

export const OperationsControlWidget: React.FC<OperationsControlWidgetProps> = ({
  products,
  channels,
  selectedProduct,
  onSelectProduct,
  onEditProduct,
  onClearProductFocus,
  onToggleProductActive,
  canEditPrices,
}) => {
  const [isProductListExpanded, setIsProductListExpanded] = useState<boolean>(true);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [channelStatus, setChannelStatus] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('omniprice_ops_channel_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleChannel = (id: string) => {
    setChannelStatus((prev) => {
      const next = {
        ...prev,
        [id]: !(prev[id] ?? true),
      };
      localStorage.setItem('omniprice_ops_channel_status', JSON.stringify(next));
      return next;
    });
  };

  const activeProducts = products.filter((p) => p.active !== false);
  const lowStockProducts = products.filter(
    (p) => typeof p.currentStock === 'number' && typeof p.minStock === 'number' && p.currentStock <= p.minStock
  );

  const monthlyProjectedRevenue = activeProducts.reduce(
    (sum, p) => sum + (Number(p.currentPrice) || 0) * Math.max(0, Number(p.estimatedMonthlyUnits) || 0),
    0
  );
  const monthlyProjectedCost = activeProducts.reduce(
    (sum, p) => sum + (Number(p.cost) || 0) * Math.max(0, Number(p.estimatedMonthlyUnits) || 0),
    0
  );
  const realCmvPercent = monthlyProjectedRevenue > 0 ? (monthlyProjectedCost / monthlyProjectedRevenue) * 100 : 0;
  const dailyProjectedRevenue = monthlyProjectedRevenue / 30;
  const totalMonthlyUnits = activeProducts.reduce(
    (sum, p) => sum + Math.max(0, Number(p.estimatedMonthlyUnits) || 0),
    0
  );
  const activeChannelsCount = channels.filter((ch) => channelStatus[ch.id] ?? true).length;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(productSearchQuery);
    if (!normalizedQuery) return products;
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const searchable = normalizeSearchText(
        `${p.name} ${p.category} ${p.sku || ''} ${p.description || ''}`
      );
      return tokens.every((token) => searchable.includes(token));
    });
  }, [products, productSearchQuery]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Painel Operacional do Caixa, Cardápio & Canais
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Dados Reais do Catálogo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestão de disponibilidade de itens, estoque mínimo, canais ativos e previsão operacional com base nos produtos cadastrados.
            </p>
          </div>
        </div>

        {/* Real-time Status Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">
              {activeChannelsCount} de {channels.length} Canais Ativos
            </span>
          </div>
        </div>
      </div>

      {/* Real Operational KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Receita Diária Estimada</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {formatBRL(dailyProjectedRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Base: {formatBRL(monthlyProjectedRevenue)} / mês ({totalMonthlyUnits.toLocaleString('pt-BR')} un)
          </p>
        </div>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>CMV Real do Cardápio (Mês)</span>
            <UtensilsCrossed className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
            {formatBRL(monthlyProjectedCost)}
          </div>
          <p className={`text-[11px] mt-0.5 ${realCmvPercent <= 35 ? 'text-emerald-400' : 'text-amber-300'}`}>
            CMV médio real: {realCmvPercent.toFixed(1)}% do faturamento
          </p>
        </div>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Disponibilidade do Cardápio</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {activeProducts.length}{' '}
            <span className="text-xs text-slate-400 font-normal">de {products.length} ativos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {products.length - activeProducts.length} pausado(s) no catálogo
          </p>
        </div>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Alertas de Estoque Mínimo</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${lowStockProducts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {lowStockProducts.length}{' '}
            <span className="text-xs text-slate-400 font-normal">
              {lowStockProducts.length === 1 ? 'item crítico' : 'itens críticos'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {lowStockProducts.length > 0
              ? `Abaixo do mínimo: ${lowStockProducts[0].name}`
              : 'Todos os estoques dentro da faixa segura'}
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
      <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              Controle de Itens do Cardápio no Caixa
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 normal-case">
                {filteredProducts.length} de {products.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedProduct
                ? `Produto em foco: ${selectedProduct.name}. Clique em qualquer produto para abrir a edição dele.`
                : 'Visão geral de todo o cardápio. Pesquise ou clique sobre qualquer produto para abrir a tela de edição.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedProduct && onClearProductFocus && (
              <button
                type="button"
                onClick={onClearProductFocus}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Tirar Foco (Ver Tudo)
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsProductListExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold border border-cyan-500/30 transition-colors cursor-pointer"
            >
              {isProductListExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Encolher Lista</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expandir Lista ({filteredProducts.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Smart Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={productSearchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setProductSearchQuery(val);
              if (val.trim() && !isProductListExpanded) {
                setIsProductListExpanded(true);
              }
            }}
            placeholder="Pesquisa inteligente: busque por nome, categoria, SKU ou ingrediente (ignora acentos)..."
            aria-label="Pesquisar itens do cardápio no caixa"
            className="w-full pl-10 pr-24 py-2.5 bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
          />
          {productSearchQuery && (
            <button
              type="button"
              onClick={() => setProductSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {isProductListExpanded ? (
          filteredProducts.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-900/50 border border-dashed border-slate-800">
              <p className="text-xs font-semibold text-slate-300">
                Nenhum produto encontrado para "{productSearchQuery}"
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tente buscar por outro termo, categoria ou código SKU.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const isActive = p.active !== false;
                return (
                  <div
                    key={p.id}
                    onClick={() => (onEditProduct ? onEditProduct(p) : onSelectProduct(p))}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all group ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : isActive
                        ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60'
                        : 'bg-slate-950/60 border-rose-900/30 opacity-75 hover:opacity-100 hover:border-cyan-500/40'
                    }`}
                    title={`Clique para abrir e editar "${p.name}"`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {p.name}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                              Em Foco
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {p.category} • {(Math.max(0, Number(p.estimatedMonthlyUnits) || 0)).toLocaleString('pt-BR')} un/mês
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatBRL(p.currentPrice)}
                        </span>
                        {canEditPrices && onToggleProductActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleProductActive(p);
                            }}
                            className={`p-1 rounded-lg border transition-all ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                            }`}
                            title={isActive ? 'Pausar item no cardápio' : 'Reativar item no cardápio'}
                          >
                            <Power className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>CMV: <strong className="text-slate-300 font-mono">{formatBRL(p.cost)}</strong></span>
                      <div className="flex items-center gap-2">
                        <span className={isActive ? 'text-emerald-300' : 'text-rose-300'}>
                          {isActive
                            ? `Margem: ${(((p.currentPrice - p.cost) / (p.currentPrice || 1)) * 100).toFixed(0)}%`
                            : 'Pausado'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300/80 group-hover:text-cyan-300">
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Lista de produtos recolhida ({filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'item disponível' : 'itens disponíveis'}).
            </span>
            <button
              type="button"
              onClick={() => setIsProductListExpanded(true)}
              className="text-cyan-300 hover:text-cyan-200 font-semibold underline cursor-pointer"
            >
              Mostrar itens
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
