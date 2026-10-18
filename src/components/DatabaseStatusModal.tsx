import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Server,
  ShieldCheck,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  projectId: string;
  databaseId: string;
  lastSyncTime: Date | null;
  totalProducts: number;
  totalChannels: number;
  onSyncAllToCloud: () => Promise<void>;
  onReloadFromCloud: () => Promise<void>;
  onSeedDefaultData: () => Promise<void>;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  projectId,
  databaseId,
  lastSyncTime,
  totalProducts,
  totalChannels,
  onSyncAllToCloud,
  onReloadFromCloud,
  onSeedDefaultData,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleAction = async (action: () => Promise<void>, successText: string) => {
    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      await action();
      setFeedbackMsg({ text: successText, type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na operação';
      setFeedbackMsg({ text: `Erro: ${msg}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  Banco de Dados em Nuvem
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Conectando...
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Google Cloud Firestore & Firebase Auth</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Connection Details Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Provedor
                </span>
                <span className="font-semibold text-white">Google Cloud Firestore (Enterprise)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Projeto Firebase</span>
                <span className="font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                  {projectId || 'gen-lang-client-0935853461'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Base de Dados</span>
                <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] max-w-[240px] truncate" title={databaseId}>
                  {databaseId || '(default)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Regras de Segurança
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativas e Protegidas
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Última Sincronização</span>
                <span className="text-slate-300 font-medium">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString('pt-BR') : 'Em tempo real'}
                </span>
              </div>
            </div>

            {/* Collections Synced Counter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Produtos no Catálogo
                </div>
                <div className="text-xl font-black text-white">{totalProducts}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Sincronizados no Firestore</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Canais e Taxas
                </div>
                <div className="text-xl font-black text-white">{totalChannels}</div>
                <div className="text-[10px] text-violet-400 mt-0.5">Comissões monitoradas</div>
              </div>
            </div>

            {/* Notification message */}
            {feedbackMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* Cloud Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleAction(onSyncAllToCloud, 'Todos os produtos e taxas foram salvos na nuvem com sucesso!')}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Salvar Todos os Dados na Nuvem (Firestore)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAction(onReloadFromCloud, 'Dados atualizados da nuvem com sucesso!')}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  Recarregar da Nuvem
                </button>

                <button
                  onClick={() => handleAction(onSeedDefaultData, 'Catálogo base restaurado na nuvem com sucesso!')}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  Restaurar Catálogo Base
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
