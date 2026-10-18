import React from 'react';
import { X, SlidersHorizontal, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw, Check } from 'lucide-react';
import { WidgetItem, DepartmentKey } from '../types/pricing';

interface CustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetItem[];
  onToggleWidget: (id: string) => void;
  onMoveWidget: (id: string, direction: 'up' | 'down') => void;
  onResetWidgets: () => void;
}

export const CustomizerModal: React.FC<CustomizerModalProps> = ({
  isOpen,
  onClose,
  widgets,
  onToggleWidget,
  onMoveWidget,
  onResetWidgets,
}) => {
  if (!isOpen) return null;

  const departmentBadge = (dept: DepartmentKey) => {
    switch (dept) {
      case 'financial':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Financeiro</span>;
      case 'commercial':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">Comercial</span>;
      case 'operations':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Operações</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Geral</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Personalização de Widgets do Gestor</h3>
              <p className="text-xs text-slate-400">
                Ative, desative ou reordene as métricas do painel por departamento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Widgets List */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-2.5">
          {widgets.map((widget, index) => (
            <div
              key={widget.id}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                widget.visible
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                  : 'bg-slate-950/30 border-slate-800/40 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <button
                  onClick={() => onToggleWidget(widget.id)}
                  className={`p-2 rounded-xl transition-all ${
                    widget.visible
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={widget.visible ? 'Ocultar widget' : 'Exibir widget'}
                >
                  {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{widget.title}</span>
                    {departmentBadge(widget.department)}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{widget.description}</p>
                </div>
              </div>

              {/* Order Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  disabled={index === 0}
                  onClick={() => onMoveWidget(widget.id, 'up')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-all"
                  title="Mover para cima"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  disabled={index === widgets.length - 1}
                  onClick={() => onMoveWidget(widget.id, 'down')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-all"
                  title="Mover para baixo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onResetWidgets}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20"
          >
            Salvar Layout
          </button>
        </div>
      </div>
    </div>
  );
};
