import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Trash2,
  Volume2,
  VolumeX,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { PushAlert } from '../types/pricing';

interface AlertFeedWidgetProps {
  notifications: PushAlert[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications?: () => void;
  onRequestPushPermission: () => void;
  onOpenAlertSettings: () => void;
}

export const AlertFeedWidget: React.FC<AlertFeedWidgetProps> = ({
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  onRequestPushPermission,
  onOpenAlertSettings,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'danger' | 'warning' | 'info' | 'success'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const getAlertIcon = (type: PushAlert['type']) => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getAlertBorder = (type: PushAlert['type'], read: boolean) => {
    if (read) return 'border-slate-800 bg-slate-900/40 opacity-70';
    switch (type) {
      case 'danger':
        return 'border-rose-500/40 bg-rose-500/10 shadow-lg shadow-rose-500/5';
      case 'warning':
        return 'border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/5';
      case 'success':
        return 'border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/5';
      default:
        return 'border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/5';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Central de Alertas & Notificações de Mercado
              </h2>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  {unreadCount} não {unreadCount === 1 ? 'lido' : 'lidos'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoramento ativo de margens críticas, quedas de preço de concorrentes e avisos operacionais.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              soundEnabled
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950/60 text-slate-500 border-slate-800'
            }`}
            title="Alternar sinal sonoro de novos alertas"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
          </button>

          <button
            onClick={onRequestPushPermission}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-semibold transition-all"
            title="Autorizar notificações no navegador"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Ativar Push Web</span>
          </button>

          <button
            onClick={onOpenAlertSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <span>Configurar Gatilhos</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 py-4 border-b border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('danger')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'danger'
                ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Críticos ({notifications.filter((n) => n.type === 'danger').length})
          </button>
          <button
            onClick={() => setFilterType('warning')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'warning'
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Avisos ({notifications.filter((n) => n.type === 'warning').length})
          </button>
          <button
            onClick={() => setFilterType('success')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oportunidades ({notifications.filter((n) => n.type === 'success').length})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => notifications.forEach((n) => onMarkNotificationRead(n.id))}
            className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors"
          >
            Marcar todos como lidos
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800/60">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">Nenhum alerta com este filtro</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Todas as métricas operacionais estão dentro dos parâmetros seguros.
            </p>
          </div>
        ) : (
          filteredNotifications.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${getAlertBorder(
                alert.type,
                alert.read
              )}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">{alert.title}</h3>
                    {!alert.read && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="font-mono">{alert.timestamp}</span>
                    <span>•</span>
                    <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-400">
                      Origem: {alert.source || 'Sistema'}
                    </span>
                  </div>
                </div>
              </div>

              {!alert.read && (
                <button
                  onClick={() => onMarkNotificationRead(alert.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 shrink-0 transition-all"
                  title="Marcar como lido"
                >
                  Lido
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
