import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { PricingAuditResult, ProductItem, ChannelFee } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';

interface AIAuditorWidgetProps {
  auditResult: PricingAuditResult | null;
  isLoading: boolean;
  onRefreshAudit: () => void;
  product: ProductItem;
  channels: ChannelFee[];
  onApplyAdjustment: (newPrice: number) => void;
}

export const AIAuditorWidget: React.FC<AIAuditorWidgetProps> = ({
  auditResult,
  isLoading,
  onRefreshAudit,
  product,
  channels,
  onApplyAdjustment,
}) => {
  const [selectedChannelAlertTab, setSelectedChannelAlertTab] = useState<number>(0);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center animate-spin">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Auditoria Contábil por IA em Execução</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              O Gemini está cruzando sua tabela de CMV (R$ {product.cost.toFixed(2)}) com as taxas do Uai Rango,
              Tchau Fome, iFood e Balcão para identificar vazamento de margem...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!auditResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Auditoria de Precificação com IA Pronta</h3>
            <p className="text-xs text-slate-400">Clique para auditar se seus produtos estão precificados corretamente.</p>
          </div>
        </div>
        <button
          onClick={onRefreshAudit}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Iniciar Auditoria
        </button>
      </div>
    );
  }

  const statusColors = {
    crítico: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: AlertTriangle,
    },
    atenção: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: AlertTriangle,
    },
    saudável: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: CheckCircle,
    },
  };

  const currentTheme = statusColors[auditResult.status] || statusColors.atenção;
  const StatusIcon = currentTheme.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-md shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Auditoria Inteligente de Precificação</h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${currentTheme.badge}`}>
                Status: {auditResult.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Parecer contábil automatizado sobre os canais da sua planilha.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Score Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Índice de Saúde</div>
            <div className="text-base font-mono font-bold text-emerald-400">{auditResult.score}/100</div>
          </div>

          <button
            onClick={onRefreshAudit}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            title="Reavaliar com IA"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Verdict & Margin Illusion Box */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
        <div className="flex items-start gap-3">
          <StatusIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">{auditResult.headline}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{auditResult.verdict}</p>
          </div>
        </div>

        {auditResult.marginIllusionAnalysis && (
          <div className="pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-cyan-300">Entenda a Armadilha da Planilha:</strong>{' '}
              {auditResult.marginIllusionAnalysis}
            </span>
          </div>
        )}
      </div>

      {/* Grid of Bottlenecks & Channel Specific Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Bottlenecks List */}
        <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Gargalos Financeiros Críticos
            </h4>
          </div>
          <ul className="space-y-2 text-xs">
            {auditResult.bottlenecks?.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Smart Formula Recommendation */}
        <div className="bg-gradient-to-br from-emerald-950/20 to-slate-950 rounded-2xl border border-emerald-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Fórmula de Precificação Blindada
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {auditResult.smartFormulaRecommendation?.explanation ||
              'Preço Blindado = Custo / (1 - MargemLíquidaAlvo - TaxaCanal)'}
          </p>
          {auditResult.smartFormulaRecommendation?.recommendedMultiplier && (
            <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300">
              {auditResult.smartFormulaRecommendation.recommendedMultiplier}
            </div>
          )}
        </div>
      </div>

      {/* Channel Alerts Breakdown */}
      {auditResult.channelAlerts && auditResult.channelAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Diagnóstico por Canal de Venda
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {auditResult.channelAlerts.map((ca, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{ca.channelName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                    {ca.currentNetMargin}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{ca.subChannel}</div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">{ca.warning}</p>
                <div className="mt-2 text-[10px] text-emerald-400 font-medium">
                  {ca.suggestedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Action Steps */}
      {auditResult.actionSteps && auditResult.actionSteps.length > 0 && (
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
          <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Plano de Ação Imediato Sugerido pela IA:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {auditResult.actionSteps.map((step, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-emerald-400 mr-1.5">#{idx + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
