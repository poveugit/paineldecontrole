import React, { useState } from 'react';
import {
  X,
  Bell,
  Sliders,
  ShieldAlert,
  Percent,
  TrendingDown,
  Volume2,
  VolumeX,
  Send,
  Check,
  Save,
  HelpCircle,
} from 'lucide-react';
import { AlertTriggerConfig, PushAlert } from '../types/pricing';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AlertTriggerConfig;
  onSaveConfig: (newConfig: AlertTriggerConfig) => void;
  onTriggerTestPush: () => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTriggerTestPush,
}) => {
  const [localConfig, setLocalConfig] = useState<AlertTriggerConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(localConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md shadow-rose-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Configuração de Gatilhos & Alertas Push</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  Personalizável
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Defina os limites percentuais para receber notificações automáticas no navegador.
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

        {/* Triggers Form */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
          {/* Trigger 1: Margem Líquida Mínima */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Gatilho 1: Margem Líquida Mínima Tolerada
              </span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                &lt; {localConfig.minNetMarginPercent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dispara notificação push urgente se a margem líquida real de qualquer produto em qualquer canal
              cair abaixo deste patamar.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={localConfig.minNetMarginPercent}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, minNetMarginPercent: parseInt(e.target.value) })
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Trigger 2: Redução de Preço da Concorrência */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                Gatilho 2: Queda de Preço da Concorrência
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                &gt; {localConfig.competitorPriceDropPercent}% de queda
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dispara alerta sempre que um concorrente cadastrado reduzir seus preços além deste percentual.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="20"
                step="1"
                value={localConfig.competitorPriceDropPercent}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, competitorPriceDropPercent: parseInt(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Trigger 3: Teto de Taxas de Apps/Cartões */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                Gatilho 3: Teto Máximo de Taxas de Apps & Cartões
              </span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                &gt; {localConfig.maxChannelFeePercent}% de taxa
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Alerta quando um meio de pagamento ou comissão ultrapassar o teto estipulado (ex: Uai Rango Online 17,49%).
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="25"
                step="0.5"
                value={localConfig.maxChannelFeePercent}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, maxChannelFeePercent: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Switches for Push Channels */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
            <div className="font-bold text-white">Canais de Notificação</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Notificações Push no Navegador</span>
                <span className="text-[11px] text-slate-400">Exibir balões de alerta nativos do sistema</span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.enableBrowserPush}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, enableBrowserPush: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-850">
              <div>
                <span className="font-semibold text-slate-200 block">Sinal Sonoro de Alerta</span>
                <span className="text-[11px] text-slate-400">Tocar sinal sonoro em eventos críticos</span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.enableSound}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, enableSound: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Test Trigger Button */}
          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={onTriggerTestPush}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs"
            >
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Testar Disparo de Alerta Agora</span>
            </button>
            <span className="text-[10px] text-slate-500">Testa a Web Notification API</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Gatilhos Salvos!' : 'Salvar Configurações de Alerta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
