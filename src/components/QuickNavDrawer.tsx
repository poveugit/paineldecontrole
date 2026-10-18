import React, { useState } from 'react';
import {
  Compass,
  X,
  Maximize2,
  ArrowDownRight,
  Layers,
  DollarSign,
  ShoppingCart,
  Building2,
  Search,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WidgetItem, DepartmentKey } from '../types/pricing';

interface QuickNavDrawerProps {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  widgets: WidgetItem[];
  activeDepartment: DepartmentKey;
  onSelectDepartment: (dept: DepartmentKey) => void;
  onFocusWidget: (widgetId: string) => void;
  onScrollToWidget: (widgetId: string) => void;
}

export const QuickNavDrawer: React.FC<QuickNavDrawerProps> = ({
  isOpen,
  onOpen,
  onClose,
  widgets,
  activeDepartment,
  onSelectDepartment,
  onFocusWidget,
  onScrollToWidget,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'financial' | 'commercial' | 'operations'>('all');

  const visibleWidgets = widgets.filter((w) => w.visible);

  const filteredWidgets = visibleWidgets.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedFilter === 'all' || w.department === selectedFilter;
    return matchesSearch && matchesDept;
  });

  const getDepartmentMeta = (dept: DepartmentKey) => {
    switch (dept) {
      case 'financial':
        return {
          label: 'Financeiro & CMV',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          icon: DollarSign,
        };
      case 'commercial':
        return {
          label: 'Comercial & Canais',
          color: 'text-violet-400',
          bg: 'bg-violet-500/10 border-violet-500/30',
          icon: ShoppingCart,
        };
      case 'operations':
        return {
          label: 'Operações & PDV',
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/30',
          icon: Building2,
        };
      default:
        return {
          label: 'Visão Geral',
          color: 'text-slate-300',
          bg: 'bg-slate-800 border-slate-700',
          icon: Layers,
        };
    }
  };

  return (
    <>
      {/* Floating Trigger Pill on Screen Edge (Always accessible) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, x: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (onOpen) onOpen();
            else onClose();
          }}
          className="fixed right-3 bottom-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 border border-emerald-500/40 text-white shadow-2xl shadow-emerald-500/20 backdrop-blur-md group hover:border-emerald-400 transition-colors"
          title="Abrir Menu de Navegação Rápida dos Módulos"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-tight flex items-center gap-1.5">
              Navegação Rápida
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {visibleWidgets.length}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">Pular direto para módulos</span>
          </div>
        </motion.button>
      )}

      {/* Retractable Drawer Modal Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            />

            {/* Slide-out Sidebar Drawer with Elastic Spring */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      Navegação Rápida
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {visibleWidgets.length} Módulos
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Acesso instantâneo e modo de foco sem precisar rolar
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Fechar navegação rápida"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Department Filters */}
              <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 space-y-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar módulo por nome ou métrica..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos ({visibleWidgets.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('financial')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedFilter === 'financial'
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Financeiro
                  </button>
                  <button
                    onClick={() => setSelectedFilter('commercial')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedFilter === 'commercial'
                        ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Comercial
                  </button>
                  <button
                    onClick={() => setSelectedFilter('operations')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedFilter === 'operations'
                        ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Operações
                  </button>
                </div>
              </div>

              {/* Widgets List with Elastic Motion */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {filteredWidgets.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Nenhum módulo encontrado para "{searchTerm}".
                  </div>
                ) : (
                  filteredWidgets.map((widget, index) => {
                    const deptMeta = getDepartmentMeta(widget.department);
                    const DeptIcon = deptMeta.icon;

                    return (
                      <motion.div
                        key={widget.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 350,
                          damping: 25,
                          delay: index * 0.03,
                        }}
                        className="group p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${deptMeta.bg}`}>
                              <DeptIcon className={`w-4 h-4 ${deptMeta.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                                  {widget.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {widget.description}
                              </p>
                              <span className={`text-[10px] font-semibold mt-1.5 inline-block ${deptMeta.color}`}>
                                {deptMeta.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons: Focus Mode vs Smooth Scroll Jump */}
                        <div className="mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              onScrollToWidget(widget.id);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] font-medium transition-colors"
                            title="Rolar a página até este módulo"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rolar até Aqui</span>
                          </button>

                          <button
                            onClick={() => {
                              onFocusWidget(widget.id);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                            title="Abrir este módulo em Modo de Foco Destacado"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Abrir em Modo Foco</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer Notice */}
              <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Dica: Pressione Esc para sair do foco
                </span>
                <button
                  onClick={() => {
                    onSelectDepartment('all');
                    onClose();
                  }}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Ver Visão Geral
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
