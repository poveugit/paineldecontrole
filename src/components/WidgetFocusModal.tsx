import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowDownRight, Sparkles, Layers, DollarSign, ShoppingCart, Building2, Maximize2 } from 'lucide-react';
import { WidgetItem, DepartmentKey } from '../types/pricing';

interface WidgetFocusModalProps {
  focusedWidget: WidgetItem | null;
  onClose: () => void;
  onScrollToWidget: (widgetId: string) => void;
  children: React.ReactNode;
}

export const WidgetFocusModal: React.FC<WidgetFocusModalProps> = ({
  focusedWidget,
  onClose,
  onScrollToWidget,
  children,
}) => {
  // ESC key listener to exit focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (focusedWidget) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [focusedWidget, onClose]);

  if (!focusedWidget) return null;

  const getDepartmentBadge = (dept: DepartmentKey) => {
    switch (dept) {
      case 'financial':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <DollarSign className="w-3 h-3" /> Financeiro & CMV
          </span>
        );
      case 'commercial':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
            <ShoppingCart className="w-3 h-3" /> Comercial & Canais
          </span>
        );
      case 'operations':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Building2 className="w-3 h-3" /> Operações & PDV
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            <Layers className="w-3 h-3" /> Visão Geral
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 lg:p-8">
        {/* Backdrop click closes modal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 cursor-pointer"
        />

        {/* Modal Container with Elastic Motion */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-6xl my-auto z-10 bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Spotlight Top Control Strip */}
          <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Modo de Foco Destacado
                  </span>
                  {getDepartmentBadge(focusedWidget.department)}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {focusedWidget.title}
                </h2>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onScrollToWidget(focusedWidget.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
                title="Fechar modo foco e rolar até a posição deste módulo no painel"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Rolar até o Módulo</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                title="Fechar modo foco (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Fechar Foco</span>
              </button>
            </div>
          </div>

          {/* Render Focused Child Widget */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
