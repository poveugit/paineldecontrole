import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  AlertTriangle,
  Save,
  HelpCircle,
  ArrowLeft,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Percent,
  Sliders,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChannelFee, UserProfile, ProductItem } from '../types/pricing';
import { INITIAL_CHANNELS, formatBRL, normalizeSearchText } from '../utils/pricingEngine';

interface FeesManagementScreenProps {
  channels: ChannelFee[];
  onSaveChannels: (updatedChannels: ChannelFee[]) => void;
  currentUser: UserProfile;
  products?: ProductItem[];
  onBackToDashboard: () => void;
}

export const FeesManagementScreen: React.FC<FeesManagementScreenProps> = ({
  channels,
  onSaveChannels,
  currentUser,
  products = [],
  onBackToDashboard,
}) => {
  const [localChannels, setLocalChannels] = useState<ChannelFee[]>(channels);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'totalDesc' | 'totalAsc' | 'name'>('totalDesc');
  const [isSaved, setIsSaved] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Channel Form State
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<string>('uai_rango');
  const [newPlatformName, setNewPlatformName] = useState('Uai Rango');
  const [newAppBase, setNewAppBase] = useState('12.0');
  const [newGateway, setNewGateway] = useState('3.5');
  const [newAnticipation, setNewAnticipation] = useState('0.0');

  // Simulator State across full screen
  const [simulatedMonthlyRevenue, setSimulatedMonthlyRevenue] = useState(30000);
  const [showAllSimChannels, setShowAllSimChannels] = useState(false);

  const canEdit = currentUser.permissions.canEditFees;

  // Track if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (localChannels.length !== channels.length) return true;
    return JSON.stringify(localChannels) !== JSON.stringify(channels);
  }, [localChannels, channels]);

  // Rate update handler
  const handleUpdateRate = (
    id: string,
    field: 'appBase' | 'paymentGateway' | 'anticipation' | 'machineRate',
    val: number
  ) => {
    if (!canEdit) return;
    setIsSaved(false);
    setLocalChannels((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newBreakdown = { ...c.breakdown, [field]: Math.max(0, val) };
        const total =
          (newBreakdown.appBase || 0) +
          (newBreakdown.paymentGateway || 0) +
          (newBreakdown.anticipation || 0) +
          (newBreakdown.machineRate || 0);

        return {
          ...c,
          breakdown: newBreakdown,
          totalRate: Number(total.toFixed(2)),
        };
      })
    );
  };

  const handleToggleHighlight = (id: string) => {
    if (!canEdit) return;
    setIsSaved(false);
    setLocalChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, highlight: !c.highlight } : c))
    );
  };

  const handleRemoveChannel = (id: string) => {
    if (!canEdit) return;
    if (confirm('Tem certeza que deseja remover este canal de taxas?')) {
      setIsSaved(false);
      setLocalChannels((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const base = parseFloat(newAppBase) || 0;
    const gateway = parseFloat(newGateway) || 0;
    const ant = parseFloat(newAnticipation) || 0;
    const total = base + gateway + ant;

    const newChannel: ChannelFee = {
      id: 'custom-ch-' + Date.now(),
      platform: newPlatform as any,
      platformName: newPlatformName,
      name: newName.trim(),
      totalRate: Number(total.toFixed(2)),
      breakdown: {
        appBase: base,
        paymentGateway: gateway,
        anticipation: ant,
      },
    };

    setLocalChannels((prev) => [...prev, newChannel]);
    setNewName('');
    setShowAddForm(false);
    setIsSaved(false);
  };

  const handleSaveAll = () => {
    onSaveChannels(localChannels);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetToDefault = () => {
    if (confirm('Deseja restaurar todas as taxas originais da planilha padrão?')) {
      setLocalChannels(INITIAL_CHANNELS);
      setIsSaved(false);
    }
  };

  // Filter & sort
  const filteredChannels = useMemo(() => {
    return localChannels
      .filter((c) => {
        const q = normalizeSearchText(searchTerm);
        const matchesSearch =
          !q ||
          normalizeSearchText(c.name).includes(q) ||
          normalizeSearchText(c.platformName).includes(q);
        const matchesPlatform =
          selectedPlatformFilter === 'all' || c.platform === selectedPlatformFilter;
        return matchesSearch && matchesPlatform;
      })
      .sort((a, b) => {
        if (sortBy === 'totalDesc') return b.totalRate - a.totalRate;
        if (sortBy === 'totalAsc') return a.totalRate - b.totalRate;
        return a.name.localeCompare(b.name);
      });
  }, [localChannels, searchTerm, selectedPlatformFilter, sortBy]);

  // Key metrics
  const metrics = useMemo(() => {
    if (localChannels.length === 0) return { avg: 0, min: 0, max: 0, total: 0 };
    const rates = localChannels.map((c) => c.totalRate);
    const avg = rates.reduce((acc, r) => acc + r, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    return { avg, min, max, total: localChannels.length };
  }, [localChannels]);

  // Color helper for fee rates
  const getRateBadge = (rate: number) => {
    if (rate <= 2.5) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (rate <= 10.0) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
    if (rate <= 15.0) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex flex-col space-y-6 pb-20">
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all group active:scale-95"
            title="Voltar para a Visão Geral de Módulos"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar para Visão Geral</span>
          </button>
          <div className="h-4 w-px bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Módulo de Configuração</span>
              <span className="text-slate-600">/</span>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-400" />
                Gestão Centralizada de Taxas & Meios de Pagamento
              </h1>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-xs font-semibold transition-all"
            title="Restaurar taxas originais da planilha padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Restaurar Padrão da Planilha</span>
            <span className="md:hidden">Padrão</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                showAddForm
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/20'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Fechar Cadastro' : 'Novo Canal / Taxa'}</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges && !isSaved}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isSaved
                  ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                  : hasUnsavedChanges
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Matriz Atualizada!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar & Recalcular Matriz</span>
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
                  )}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Permission & Status Banner */}
      {!canEdit ? (
        <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <strong className="text-amber-100 font-bold block">Modo de Consulta Ativo:</strong>
              Seu perfil atual ({currentUser.name} - {currentUser.title}) possui permissão apenas de visualização. Para alterar ou salvar novas taxas contratuais, faça login com o perfil de Gestor Geral / Admin.
            </div>
          </div>
        </div>
      ) : hasUnsavedChanges ? (
        <div className="w-full p-3.5 rounded-xl bg-gradient-to-r from-violet-950/60 to-indigo-950/60 border border-violet-500/40 flex items-center justify-between gap-3 text-xs text-violet-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
            <span>
              <strong>Alterações pendentes de gravação:</strong> Existem taxas editadas nesta sessão. Clique em <strong>"Salvar & Recalcular Matriz"</strong> para atualizar instantaneamente o preço sugerido e o DRE de todos os 25 produtos.
            </span>
          </div>
          <button
            onClick={handleSaveAll}
            className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shrink-0 shadow-sm"
          >
            Salvar Agora
          </button>
        </div>
      ) : null}

      {/* Executive Overview Linear Stats Row (No floating cards) */}
      <div className="w-full grid grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total de Canais</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-white font-mono">{metrics.total}</span>
            <span className="text-xs text-slate-400">modalidades</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Uai Rango, Tchau Fome, iFood e Balcão</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Taxa Média Global</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-cyan-300 font-mono">{metrics.avg.toFixed(2)}%</span>
            <span className="text-xs text-slate-400">média ponderada</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Impacto direto no CMV real</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Menor Taxa (Mais Lucrativo)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{metrics.min.toFixed(2)}%</span>
            <span className="text-xs text-emerald-300/80">Balcão / PIX</span>
          </div>
          <span className="text-[10px] text-emerald-400/70 mt-1">99% de repasse líquido direto</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Maior Taxa (Mais Onoroso)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{metrics.max.toFixed(2)}%</span>
            <span className="text-xs text-rose-300/80">Online c/ Antecipação</span>
          </div>
          <span className="text-[10px] text-rose-400/70 mt-1">Exige Preço Blindado elevado</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 lg:col-span-1 flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Economia no Canal Próprio</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-teal-300 font-mono">
              +{(metrics.max - metrics.min).toFixed(1)}%
            </span>
            <span className="text-xs text-teal-400/80">margem pura</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Diferencial por venda direta</span>
        </div>
      </div>

      {/* Inline Add New Channel Form (Linear structured drawer, no floating card) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="w-full p-5 rounded-2xl bg-slate-900/90 border border-violet-500/40">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cadastrar Nova Plataforma ou Meio de Pagamento</h3>
                    <p className="text-xs text-slate-400">
                      Adicione um novo aplicativo regional, operadora de maquininha ou taxa contratual negociada.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleAddChannel} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nome Descritivo da Modalidade</label>
                    <input
                      type="text"
                      placeholder="Ex: VR / Sodexo Delivery"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Empresa / Plataforma</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => {
                        setNewPlatform(e.target.value);
                        setNewPlatformName(e.target.options[e.target.selectedIndex].text);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 text-xs"
                    >
                      <option value="uai_rango">Uai Rango</option>
                      <option value="tchau_fome">Tchau Fome</option>
                      <option value="ifood">iFood Plano Básico</option>
                      <option value="balcao">Balcão / Maquininha / Pix</option>
                      <option value="custom">Outro App Regional</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Taxa Base do App (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={newAppBase}
                      onChange={(e) => setNewAppBase(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-violet-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Gateway / Cartão (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newGateway}
                      onChange={(e) => setNewGateway(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-violet-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Taxa de Antecipação (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newAnticipation}
                      onChange={(e) => setNewAnticipation(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-violet-500 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Taxa Total Prevista:</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">
                      {((parseFloat(newAppBase) || 0) + (parseFloat(newGateway) || 0) + (parseFloat(newAnticipation) || 0)).toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-500/20"
                    >
                      Adicionar Canal à Matriz
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar: Search, Platform Filter, Sorting (Full Width, Linear) */}
      <div className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por canal, plataforma ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Platform Category Selector */}
          <div className="flex items-center gap-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setSelectedPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedPlatformFilter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todos ({localChannels.length})
            </button>
            <button
              onClick={() => setSelectedPlatformFilter('uai_rango')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedPlatformFilter === 'uai_rango'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Uai Rango
            </button>
            <button
              onClick={() => setSelectedPlatformFilter('tchau_fome')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedPlatformFilter === 'tchau_fome'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Tchau Fome
            </button>
            <button
              onClick={() => setSelectedPlatformFilter('ifood')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedPlatformFilter === 'ifood'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              iFood
            </button>
            <button
              onClick={() => setSelectedPlatformFilter('balcao')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedPlatformFilter === 'balcao'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Balcão / Maquininhas
            </button>
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <span className="text-slate-400 font-medium">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500 font-semibold"
          >
            <option value="totalDesc">Maior Taxa Total (%)</option>
            <option value="totalAsc">Menor Taxa Total (%)</option>
            <option value="name">Nome Alfabético</option>
          </select>
        </div>
      </div>

      {/* FULL SCREEN TABULAR FINANCIAL MATRIX (No floating cards!) */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-none">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-72">Canal / Meio de Pagamento</th>
                <th className="py-3.5 px-3">Plataforma</th>
                <th className="py-3.5 px-3 w-32">App Base %</th>
                <th className="py-3.5 px-3 w-36">Gateway / Cartão %</th>
                <th className="py-3.5 px-3 w-32">Antecipação %</th>
                <th className="py-3.5 px-4 w-40 text-center">Taxa Total Consolidada</th>
                <th className="py-3.5 px-4 w-36 text-right">Retenção p/ R$ 100</th>
                <th className="py-3.5 px-4 w-36 text-right">Repasse Líquido</th>
                {canEdit && <th className="py-3.5 px-4 w-24 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="py-12 text-center text-slate-500">
                    Nenhum canal encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredChannels.map((channel, idx) => {
                  const feeOn100 = channel.totalRate;
                  const netOn100 = 100 - feeOn100;
                  const isBalcao = channel.platform === 'balcao';
                  const isPrimary = channel.highlight;

                  return (
                    <tr
                      key={channel.id}
                      className={`transition-colors ${
                        isPrimary
                          ? 'bg-violet-950/25 hover:bg-violet-950/35'
                          : idx % 2 === 0
                          ? 'bg-slate-900/40 hover:bg-slate-850/60'
                          : 'bg-slate-900/80 hover:bg-slate-850/80'
                      }`}
                    >
                      {/* Name & Highlight */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleHighlight(channel.id)}
                            disabled={!canEdit}
                            title={isPrimary ? 'Canal principal destacado na Visão Geral' : 'Destacar este canal'}
                            className={`p-1 rounded transition-colors ${
                              isPrimary
                                ? 'text-violet-400 hover:text-violet-300'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <div>
                            <span className="font-bold text-white block text-xs tracking-tight">
                              {channel.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {channel.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Platform Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide border ${
                            channel.platform === 'uai_rango'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : channel.platform === 'tchau_fome'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : channel.platform === 'ifood'
                              ? 'bg-red-500/10 text-red-300 border-red-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {channel.platformName}
                        </span>
                      </td>

                      {/* App Base % */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            disabled={!canEdit}
                            value={channel.breakdown.appBase || 0}
                            onChange={(e) =>
                              handleUpdateRate(channel.id, 'appBase', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-violet-500 disabled:opacity-50 text-right"
                          />
                          <span className="text-slate-400 text-xs font-mono">%</span>
                        </div>
                      </td>

                      {/* Payment Gateway / Card % */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            disabled={!canEdit}
                            value={channel.breakdown.paymentGateway || channel.breakdown.machineRate || 0}
                            onChange={(e) =>
                              handleUpdateRate(channel.id, 'paymentGateway', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-violet-500 disabled:opacity-50 text-right"
                          />
                          <span className="text-slate-400 text-xs font-mono">%</span>
                        </div>
                      </td>

                      {/* Anticipation % */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            disabled={!canEdit}
                            value={channel.breakdown.anticipation || 0}
                            onChange={(e) =>
                              handleUpdateRate(channel.id, 'anticipation', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-violet-500 disabled:opacity-50 text-right"
                          />
                          <span className="text-slate-400 text-xs font-mono">%</span>
                        </div>
                      </td>

                      {/* Total Rate % */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getRateBadge(
                              channel.totalRate
                            )}`}
                          >
                            {channel.totalRate.toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Retenção em R$ 100 */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-semibold text-rose-300">
                          - R$ {feeOn100.toFixed(2)}
                        </span>
                      </td>

                      {/* Repasse Líquido */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          R$ {netOn100.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ({netOn100.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Actions */}
                      {canEdit && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemoveChannel(channel.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remover modalidade de taxas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Footer Summary */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Mostrando <strong>{filteredChannels.length}</strong> de <strong>{localChannels.length}</strong> canais de taxas cadastrados no sistema.
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span>
              Média do Filtro:{' '}
              <strong className="text-cyan-300">
                {filteredChannels.length > 0
                  ? (filteredChannels.reduce((acc, c) => acc + c.totalRate, 0) / filteredChannels.length).toFixed(2)
                  : '0.00'}
                %
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH LIVE FINANCIAL IMPACT SIMULATOR (No floating card) */}
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Simulador Executivo: Impacto das Taxas no Faturamento Mensal
              </h3>
              <p className="text-xs text-slate-400">
                Veja com exatidão matemática quanto dinheiro é retido pelas plataformas vs quanto realmente entra no caixa da sua empresa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Faturamento Simulado:</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              {formatBRL(simulatedMonthlyRevenue)}
            </span>
          </div>
        </div>

        {/* Revenue Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>R$ 5.000 / mês</span>
            <span>R$ 50.000 / mês</span>
            <span>R$ 100.000 / mês</span>
            <span>R$ 200.000 / mês</span>
          </div>
          <input
            type="range"
            min="5000"
            max="200000"
            step="1000"
            value={simulatedMonthlyRevenue}
            onChange={(e) => setSimulatedMonthlyRevenue(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Comparative Full-Width Horizontal Grid */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-slate-400">
            Exibindo {showAllSimChannels ? localChannels.length : Math.min(4, localChannels.length)} de {localChannels.length} canais configurados
          </span>
          {localChannels.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllSimChannels((prev) => !prev)}
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
            >
              {showAllSimChannels ? 'Recolher canais (4 principais)' : `Mostrar todos os canais (+${localChannels.length - 4})`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {(showAllSimChannels ? localChannels : localChannels.slice(0, 4)).map((channel) => {
            const feeCost = (simulatedMonthlyRevenue * channel.totalRate) / 100;
            const netDeposit = simulatedMonthlyRevenue - feeCost;

            return (
              <div
                key={channel.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white truncate max-w-[170px]" title={channel.name}>
                      {channel.name}
                    </span>
                    <span className="font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-slate-800">
                      {channel.totalRate.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">{channel.platformName}</span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-850 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Comissões Pagas:</span>
                    <span className="font-mono font-bold text-rose-300">- {formatBRL(feeCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Depósito Líquido:</span>
                    <span className="font-mono font-bold text-emerald-400">{formatBRL(netDeposit)}</span>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${100 - channel.totalRate}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Líquido: ${(100 - channel.totalRate).toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${channel.totalRate}%` }}
                    className="bg-rose-500 h-full"
                    title={`Taxa: ${channel.totalRate.toFixed(1)}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategic Insights Strip (Full Width) */}
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <strong className="text-white block font-bold">Diretriz Estratégica de Precificação & Repasses</strong>
            <p className="text-slate-400">
              O Uai Rango Online (17,49%) e Tchau Fome Crédito (12,44%) demandam Preços Blindados maiores para garantir margem de lucro real. 
              Estimular vendas no WhatsApp próprio ou Balcão PIX (1,00%) injeta até R$ 16,49 a mais de lucro puro a cada R$ 100 vendidos.
            </p>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-all shrink-0 self-end md:self-auto"
        >
          Retornar ao Dashboard
        </button>
      </div>
    </div>
  );
};
