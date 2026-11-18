import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  History,
  KeyRound,
  Link2,
  Play,
  RefreshCw,
  Save,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ChannelFee,
  ExternalSyncConfig,
  ExternalSyncDiffItem,
  ExternalSyncRunLog,
  ProductItem,
} from '../types/pricing';
import { formatBRL, normalizeSearchText } from '../utils/pricingEngine';
import {
  buildBrowserExtractorScript,
  buildPlaywrightCollectorScript,
  computeResaleSellingPrice,
  generateSyncToken,
  parseExternalCatalogPayload,
  parseTargetPathsInput,
  reconcileExternalCatalog,
} from '../utils/syncEngine';
import { CurrencyCentsInput } from './CurrencyCentsInput';

interface ExternalSyncScreenProps {
  products: ProductItem[];
  channels: ChannelFee[];
  customCategories?: string[];
  syncConfig: ExternalSyncConfig;
  syncHistory: ExternalSyncRunLog[];
  onSaveSyncConfig: (config: ExternalSyncConfig) => Promise<void>;
  onApplySyncBatch: (
    updatedProducts: ProductItem[],
    productsToSave: ProductItem[],
    runLog: ExternalSyncRunLog
  ) => Promise<void>;
  onBulkUpdateCategories?: (
    updates: Array<{ productId: string; category: string }>,
    newCustomCategory?: string
  ) => Promise<void>;
  onOpenCatalogStudio: () => void;
  onOpenProductInCatalog?: (productId: string) => void;
  onBackToDashboard: () => void;
}

type CollectorTab = 'import' | 'browser' | 'playwright';

export const ExternalSyncScreen: React.FC<ExternalSyncScreenProps> = ({
  products,
  channels,
  customCategories = [],
  syncConfig,
  syncHistory,
  onSaveSyncConfig,
  onApplySyncBatch,
  onBulkUpdateCategories,
  onOpenCatalogStudio,
  onOpenProductInCatalog,
  onBackToDashboard,
}) => {
  const [draftConfig, setDraftConfig] = useState<ExternalSyncConfig>(syncConfig);
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [apiPingStatus, setApiPingStatus] = useState<{
    loading: boolean;
    ok?: boolean;
    message?: string;
  }>({ loading: false });

  const [activeCollectorTab, setActiveCollectorTab] = useState<CollectorTab>('import');
  const [rawPayloadText, setRawPayloadText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [previewResult, setPreviewResult] = useState<{
    updatedProducts: ProductItem[];
    productsToSave: ProductItem[];
    diffItems: ExternalSyncDiffItem[];
    runLog: ExternalSyncRunLog;
  } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'changed' | 'all'>('changed');
  const [previewSearch, setPreviewSearch] = useState('');
  const [isApplyingSync, setIsApplyingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [expandedRunId, setExpandedRunId] = useState<string | null>(syncHistory[0]?.id || null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('all');
  const [selectedHistoryProductIds, setSelectedHistoryProductIds] = useState<string[]>([]);
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>('Mercearia');
  const [isCreatingHistoryCat, setIsCreatingHistoryCat] = useState(false);
  const [newHistoryCategoryName, setNewHistoryCategoryName] = useState('');
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [categoryUpdateMsg, setCategoryUpdateMsg] = useState<string | null>(null);
  const [targetPathsText, setTargetPathsText] = useState<string>(
    (syncConfig.targetPaths && syncConfig.targetPaths.length > 0
      ? syncConfig.targetPaths
      : ['/p/categoria/4750/mercearia']
    ).join('\n')
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync draft when remote config loads for the first time
  React.useEffect(() => {
    setDraftConfig(syncConfig);
    if (syncConfig.targetPaths && syncConfig.targetPaths.length > 0) {
      setTargetPathsText(syncConfig.targetPaths.join('\n'));
    }
  }, [syncConfig]);

  const webhookUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/api/sync/catalog`;
  }, []);

  const linkedProductsCount = useMemo(
    () => products.filter((p) => p.externalSource === 'superluna' || Boolean(p.externalId)).length,
    [products]
  );

  const selectedRefChannel = useMemo(() => {
    if (draftConfig.referenceChannelId === 'direct-zero') return null;
    return channels.find((c) => c.id === draftConfig.referenceChannelId) || channels[0] || null;
  }, [channels, draftConfig.referenceChannelId]);

  const refFeeRate = selectedRefChannel ? selectedRefChannel.totalRate : 0;

  const browserScript = useMemo(
    () => buildBrowserExtractorScript(webhookUrl, draftConfig.apiToken),
    [webhookUrl, draftConfig.apiToken]
  );

  const parsedTargetPaths = useMemo(
    () => parseTargetPathsInput(targetPathsText),
    [targetPathsText]
  );

  const playwrightScript = useMemo(
    () =>
      buildPlaywrightCollectorScript(
        webhookUrl,
        draftConfig.apiToken,
        draftConfig.sourceUrl,
        parsedTargetPaths
      ),
    [webhookUrl, draftConfig.apiToken, draftConfig.sourceUrl, parsedTargetPaths]
  );

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setSyncFeedback({ type: 'error', msg: 'Não foi possível copiar automaticamente. Selecione e copie manualmente.' });
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigFeedback(null);
    try {
      await onSaveSyncConfig(draftConfig);
      setConfigFeedback({
        type: 'success',
        msg: 'Configurações e token de sincronização gravados na nuvem e prontos para uso pela API.',
      });
    } catch (err) {
      setConfigFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Erro ao salvar regras de sincronização.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePingApi = async () => {
    setApiPingStatus({ loading: true });
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setApiPingStatus({
          loading: false,
          ok: true,
          message: data.configured
            ? `API online · Webhook configurado (${data.historyCount || 0} execuções registradas).`
            : 'API online · Clique em "Salvar Regras na Nuvem" para ativar seu token no servidor.',
        });
      } else {
        setApiPingStatus({
          loading: false,
          ok: false,
          message: data.error || 'Falha ao consultar API.',
        });
      }
    } catch {
      setApiPingStatus({
        loading: false,
        ok: false,
        message: 'Não foi possível alcançar o endpoint /api/sync/status.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawPayloadText(content);
      setPreviewResult(null);
      setSyncFeedback(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSimulateDiff = () => {
    setSyncFeedback(null);
    const parsed = parseExternalCatalogPayload(rawPayloadText);
    if (parsed.length === 0) {
      setPreviewResult(null);
      setSyncFeedback({
        type: 'error',
        msg: 'Nenhum produto válido identificado. Verifique se há pelo menos Nome e Preço (JSON, CSV ou tabela com TAB/;).',
      });
      return;
    }

    const reconciled = reconcileExternalCatalog(
      products,
      parsed,
      channels,
      draftConfig,
      'manual_import'
    );
    setPreviewResult(reconciled);
  };

  const handleApplyPreview = async () => {
    if (!previewResult) return;
    setIsApplyingSync(true);
    setSyncFeedback(null);
    try {
      await onSaveSyncConfig(draftConfig);
      await onApplySyncBatch(
        previewResult.updatedProducts,
        previewResult.productsToSave,
        previewResult.runLog
      );
      setSyncFeedback({
        type: 'success',
        msg: `Sincronização aplicada: ${previewResult.runLog.createdCount} novos produtos cadastrados e ${previewResult.runLog.updatedCount} custos atualizados no catálogo.`,
      });
      setExpandedRunId(previewResult.runLog.id);
      setPreviewResult(null);
      setRawPayloadText('');
      setImportFileName('');
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Erro ao aplicar atualização no catálogo.',
      });
    } finally {
      setIsApplyingSync(false);
    }
  };

  const handleDownloadPlaywright = () => {
    const blob = new Blob([playwrightScript], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coletor-superluna.mjs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPreviewItems = useMemo(() => {
    if (!previewResult) return [];
    const q = normalizeSearchText(previewSearch);
    return previewResult.diffItems.filter((item) => {
      if (previewFilter === 'changed' && item.action === 'unchanged') return false;
      if (q) {
        const hay = normalizeSearchText(`${item.name} ${item.sku} ${item.category}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [previewResult, previewFilter, previewSearch]);

  const availableCategories = useMemo(() => {
    const defaults = [
      'Mercearia',
      'Bebidas',
      'Açougue & Frios',
      'Laticínios & Frios',
      'Limpeza & Higiene',
      'Hortifruti',
      'Doces & Snacks',
      'Padaria & Matinais',
      'Lanches',
      'Acompanhamentos',
      'Combos',
      'Pizzas',
      'Sobremesas',
      'Geral',
    ];
    const map = new Map<string, string>();
    [...defaults, ...customCategories, ...products.map((p) => p.category)].forEach((raw) => {
      const cat = String(raw || '').trim();
      if (cat && !map.has(cat.toLowerCase())) {
        map.set(cat.toLowerCase(), cat);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [products, customCategories]);

  const handleQuickCategoryChange = async (
    productIds: string[],
    targetCategory: string,
    customCreated?: string
  ) => {
    const cleanCat = targetCategory.trim();
    if (!cleanCat || productIds.length === 0 || !onBulkUpdateCategories) return;

    setIsUpdatingCategories(true);
    setCategoryUpdateMsg(null);
    try {
      const uniqueIds = Array.from(new Set(productIds));
      await onBulkUpdateCategories(
        uniqueIds.map((productId) => ({ productId, category: cleanCat })),
        customCreated
      );
      setSelectedHistoryProductIds((prev) => prev.filter((id) => !uniqueIds.includes(id)));
      setCategoryUpdateMsg(
        uniqueIds.length === 1
          ? `Categoria alterada para "${cleanCat}".`
          : `${uniqueIds.length} produtos movidos para "${cleanCat}".`
      );
      setTimeout(() => setCategoryUpdateMsg(null), 3500);
    } finally {
      setIsUpdatingCategories(false);
    }
  };

  const handleCreateInlineHistoryCategory = async () => {
    const trimmed = newHistoryCategoryName.trim();
    if (!trimmed) return;
    setBulkTargetCategory(trimmed);
    setIsCreatingHistoryCat(false);
    setNewHistoryCategoryName('');
    if (selectedHistoryProductIds.length > 0) {
      await handleQuickCategoryChange(selectedHistoryProductIds, trimmed, trimmed);
    } else if (onBulkUpdateCategories) {
      await onBulkUpdateCategories([], trimmed);
      setCategoryUpdateMsg(`Categoria "${trimmed}" adicionada à lista.`);
      setTimeout(() => setCategoryUpdateMsg(null), 3000);
    }
  };

  const hasFixedProfitBRL =
    typeof draftConfig.defaultTargetProfitBRL === 'number' && draftConfig.defaultTargetProfitBRL > 0;

  const sampleCostPreview = 10;
  const sampleSellingPreview = computeResaleSellingPrice(
    sampleCostPreview,
    draftConfig.defaultTargetMargin,
    refFeeRate,
    draftConfig.priceRounding,
    draftConfig.defaultTargetProfitBRL
  );

  const handleApplyProfitRuleToAllProducts = async () => {
    if (products.length === 0) return;
    setIsSavingConfig(true);
    setConfigFeedback(null);
    try {
      await onSaveSyncConfig(draftConfig);
      const nowIso = new Date().toISOString();
      const targetProfitBRL = hasFixedProfitBRL ? draftConfig.defaultTargetProfitBRL : undefined;
      const changes: ExternalSyncDiffItem[] = [];

      const updatedProducts = products.map((prod) => {
        const prodCost = Math.max(0, Number(prod.cost) || 0);
        const oldPrice = Number(prod.currentPrice) || 0;
        const nextPrice = computeResaleSellingPrice(
          prodCost,
          draftConfig.defaultTargetMargin,
          refFeeRate,
          draftConfig.priceRounding,
          targetProfitBRL
        );

        changes.push({
          action:
            Math.abs(nextPrice - oldPrice) < 0.01
              ? 'unchanged'
              : nextPrice > oldPrice
              ? 'cost_increased'
              : 'cost_decreased',
          productId: prod.id,
          sku: prod.sku || '',
          name: prod.name,
          category: prod.category,
          oldCost: prodCost,
          newCost: prodCost,
          oldPrice,
          newPrice: nextPrice,
          diffPercent: oldPrice > 0 ? Number((((nextPrice - oldPrice) / oldPrice) * 100).toFixed(2)) : 0,
        });

        return {
          ...prod,
          targetNetMargin: draftConfig.defaultTargetMargin,
          targetNetProfitBRL: targetProfitBRL,
          referenceChannelId:
            draftConfig.referenceChannelId === 'direct-zero' ? undefined : draftConfig.referenceChannelId,
          currentPrice: nextPrice,
        };
      });

      const runLog: ExternalSyncRunLog = {
        id: `sync-rule-${Date.now()}`,
        timestamp: nowIso,
        source: 'resale-rule',
        sourceLabel: hasFixedProfitBRL
          ? `Meta Fixa ${formatBRL(targetProfitBRL || 0)}/un`
          : `Margem Alvo ${(draftConfig.defaultTargetMargin * 100).toFixed(0)}%`,
        trigger: 'manual_import',
        totalReceived: products.length,
        createdCount: 0,
        updatedCount: products.length,
        unchangedCount: 0,
        priceIncreases: changes.filter((c) => c.action === 'cost_increased').length,
        priceDecreases: changes.filter((c) => c.action === 'cost_decreased').length,
        changes: changes.slice(0, 80),
      };

      await onApplySyncBatch(updatedProducts, updatedProducts, runLog);
      setConfigFeedback({
        type: 'success',
        msg: `Meta de lucro aplicada com sucesso em todos os ${products.length} produtos do catálogo.`,
      });
    } catch (err) {
      setConfigFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Erro ao aplicar meta nos produtos.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Strip */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Visão Geral</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-cyan-400 font-semibold">Sincronização Externa & API</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Sincronização Automática de Fornecedor (Revenda)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            Receba o catálogo da <span className="text-slate-200 font-medium">{draftConfig.sourceName}</span>, cadastre novos itens automaticamente e atualize seu custo de aquisição (CMV) e preço blindado sempre que o site alterar valores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handlePingApi}
            disabled={apiPingStatus.loading}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Server className={`w-3.5 h-3.5 text-cyan-400 ${apiPingStatus.loading ? 'animate-spin' : ''}`} />
            <span>{apiPingStatus.loading ? 'Testando API...' : 'Testar Conexão API'}</span>
          </button>

          <button
            onClick={onOpenCatalogStudio}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span>Abrir Catálogo ({products.length})</span>
          </button>
        </div>
      </div>

      {apiPingStatus.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs flex items-center gap-2.5 ${
            apiPingStatus.ok
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
          }`}
        >
          {apiPingStatus.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{apiPingStatus.message}</span>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 block">Produtos Vinculados</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">{linkedProductsCount}</span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">/ {products.length} no catálogo</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 block">Status da API Webhook</span>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-lg font-bold ${draftConfig.enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
              {draftConfig.enabled ? 'Ativa para Receber' : 'Pausada'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 block">Última Sincronização</span>
          <div className="mt-1">
            {syncHistory[0] ? (
              <span className="text-sm font-semibold font-mono tabular-nums text-slate-200">
                {new Date(syncHistory[0].timestamp).toLocaleString('pt-BR')}
              </span>
            ) : (
              <span className="text-sm text-slate-500">Nenhuma execução ainda</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 block">Exemplo Blindagem (Custo R$ 10,00)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono tabular-nums text-cyan-300">
              {formatBRL(sampleSellingPreview)}
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {hasFixedProfitBRL
                ? `(+${formatBRL(draftConfig.defaultTargetProfitBRL || 0)} líq.)`
                : `(${(draftConfig.defaultTargetMargin * 100).toFixed(0)}% líq.)`}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Endpoint/Rules on Left + Collector/Importer on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Webhook Credentials & Resale Rules */}
        <div className="xl:col-span-5 space-y-6">
          {/* API Endpoint & Security Token */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Endpoint & Credencial da API</h2>
              </div>

              <button
                onClick={() => setDraftConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  draftConfig.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {draftConfig.enabled ? 'Recebimento Ativo' : 'Recebimento Pausado'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  URL do Webhook (POST JSON)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none"
                  />
                  <button
                    onClick={() => copyText('url', webhookUrl)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors shrink-0"
                    title="Copiar URL do Webhook"
                  >
                    {copiedKey === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Token de Segurança (Cabeçalho <code className="text-slate-300">x-sync-token</code>)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showToken ? 'text' : 'password'}
                      readOnly
                      value={draftConfig.apiToken}
                      className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showToken ? 'Ocultar token' : 'Exibir token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => copyText('token', draftConfig.apiToken)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors shrink-0"
                    title="Copiar Token"
                  >
                    {copiedKey === 'token' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        apiToken: generateSyncToken(),
                      }))
                    }
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors shrink-0"
                    title="Gerar Novo Token"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resale Automation Rules */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Regras de Cadastro & Precificação de Revenda</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Fornecedor</label>
                <input
                  type="text"
                  value={draftConfig.sourceName}
                  onChange={(e) => setDraftConfig((prev) => ({ ...prev, sourceName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Filial / Cidade</label>
                <input
                  type="text"
                  value={draftConfig.storeBranchLabel}
                  onChange={(e) => setDraftConfig((prev) => ({ ...prev, storeBranchLabel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">URL do Site Fornecedor</label>
              <input
                type="url"
                value={draftConfig.sourceUrl}
                onChange={(e) => setDraftConfig((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftConfig.autoCreateNew}
                  onChange={(e) => setDraftConfig((prev) => ({ ...prev, autoCreateNew: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  <strong className="block text-white">Cadastrar novos produtos automaticamente</strong>
                  <span className="text-slate-400">Itens encontrados no site que ainda não existem no seu catálogo serão criados já com preço calculado.</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftConfig.autoUpdateCost}
                  onChange={(e) => setDraftConfig((prev) => ({ ...prev, autoUpdateCost: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  <strong className="block text-white">Atualizar Custo (CMV) ao mudar preço no site</strong>
                  <span className="text-slate-400">O preço do SuperLuna passa a ser o seu novo custo de compra quando houver alteração.</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftConfig.autoRecalculateSellingPrice}
                  onChange={(e) =>
                    setDraftConfig((prev) => ({ ...prev, autoRecalculateSellingPrice: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  <strong className="block text-white">Recalcular Preço de Venda automaticamente (Blindado)</strong>
                  <span className="text-slate-400">Mantém sua margem líquida protegida descontando a taxa do canal escolhido.</span>
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-emerald-300">
                    Lucro Líquido Desejado (R$/un)
                  </label>
                  {hasFixedProfitBRL && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftConfig((prev) => ({ ...prev, defaultTargetProfitBRL: 0 }))
                      }
                      className="text-[11px] text-slate-400 hover:text-white transition-colors"
                    >
                      Usar %
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="text-xs font-mono text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    R$
                  </span>
                  <CurrencyCentsInput
                    value={draftConfig.defaultTargetProfitBRL || 0}
                    onChangeValue={(val) =>
                      setDraftConfig((prev) => ({ ...prev, defaultTargetProfitBRL: val }))
                    }
                    placeholder="0,00 (opcional)"
                    ariaLabel="Lucro líquido desejado por unidade em reais"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-mono tabular-nums text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Margem Líq. Alvo (%) {hasFixedProfitBRL ? '· fallback' : ''}
                </label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  step={1}
                  disabled={hasFixedProfitBRL}
                  value={Math.round((draftConfig.defaultTargetMargin || 0.25) * 100)}
                  onChange={(e) => {
                    const pct = Math.min(80, Math.max(1, Number(e.target.value) || 25));
                    setDraftConfig((prev) => ({ ...prev, defaultTargetMargin: pct / 100 }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono tabular-nums text-white focus:border-emerald-500 focus:outline-none disabled:opacity-45"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Canal p/ Blindagem</label>
                <select
                  value={draftConfig.referenceChannelId}
                  onChange={(e) => setDraftConfig((prev) => ({ ...prev, referenceChannelId: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="direct-zero">Balcão / Pix Direto (0%)</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.totalRate.toFixed(2).replace('.', ',')}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Arredondamento</label>
                <select
                  value={draftConfig.priceRounding}
                  onChange={(e) =>
                    setDraftConfig((prev) => ({
                      ...prev,
                      priceRounding: e.target.value as 'none' | '90' | '99',
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="90">Terminar em ,90</option>
                  <option value="99">Terminar em ,99</option>
                  <option value="none">Valor Exato</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {hasFixedProfitBRL
                ? `Meta fixa ativa: todos os produtos importados/sincronizados já recebem ${formatBRL(draftConfig.defaultTargetProfitBRL || 0)} de lucro líquido livre por unidade, blindado contra a taxa de ${refFeeRate.toFixed(2).replace('.', ',')}% do canal.`
                : 'Se preencher Lucro Líquido Desejado (R$), esse lucro fixo por unidade será preenchido automaticamente em todos os produtos sincronizados no lugar da margem %.'}
            </p>

            {configFeedback && (
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  configFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                }`}
              >
                {configFeedback.msg}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingConfig ? 'Salvando na Nuvem...' : 'Salvar Regras e Ativar API na Nuvem'}</span>
              </button>

              {products.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyProfitRuleToAllProducts}
                  disabled={isSavingConfig}
                  className="w-full py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-cyan-300 border border-slate-700 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    Aplicar {hasFixedProfitBRL ? `+${formatBRL(draftConfig.defaultTargetProfitBRL || 0)}/un` : `${(draftConfig.defaultTargetMargin * 100).toFixed(0)}%`} nos {products.length} Produtos Atuais
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Data Ingestion & Collector Methods */}
        <div className="xl:col-span-7 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white">Conectores de Coleta — SuperLuna Supermercados</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Escolha entre importar um arquivo/JSON agora, extrair direto do seu Chrome logado na loja ou rodar o robô 24/7.
                </p>
              </div>
            </div>

            {/* Segmented Mode Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveCollectorTab('import')}
                className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeCollectorTab === 'import'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Importar / Simular Agora</span>
              </button>

              <button
                onClick={() => setActiveCollectorTab('browser')}
                className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeCollectorTab === 'browser'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Extrator 1-Clique Chrome</span>
              </button>

              <button
                onClick={() => setActiveCollectorTab('playwright')}
                className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeCollectorTab === 'playwright'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-violet-400" />
                <span>Robô Automático 24/7</span>
              </button>
            </div>

            {/* TAB 1: Manual Import / Simulation */}
            {activeCollectorTab === 'import' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-2 transition-colors"
                    >
                      <UploadCloud className="w-4 h-4 text-emerald-400" />
                      <span>Carregar Arquivo (.json / .csv)</span>
                    </button>
                    {importFileName && (
                      <span className="text-xs text-emerald-300 font-mono">{importFileName}</span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Aceita JSON, CSV (<code className="text-slate-300">;</code> ou <code className="text-slate-300">,</code>) ou planilha colada
                  </span>
                </div>

                <textarea
                  rows={7}
                  value={rawPayloadText}
                  onChange={(e) => {
                    setRawPayloadText(e.target.value);
                    setPreviewResult(null);
                  }}
                  placeholder={`Cole aqui o JSON gerado pelo Extrator Chrome ou linhas CSV:\nSKU;Nome;Preco;Categoria\n7891000100103;Arroz Tio João 5kg;29,90;Mercearia\n7894900011517;Refrigerante Coca-Cola 2L;10,49;Bebidas`}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={handleSimulateDiff}
                    disabled={!rawPayloadText.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Simular Diferenças Antes de Aplicar</span>
                  </button>

                  {previewResult && (
                    <button
                      onClick={handleApplyPreview}
                      disabled={isApplyingSync}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isApplyingSync
                          ? 'Aplicando...'
                          : `Aplicar ${previewResult.runLog.createdCount + previewResult.runLog.updatedCount} Alterações no Catálogo`}
                      </span>
                    </button>
                  )}
                </div>

                {syncFeedback && (
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-center gap-2 ${
                      syncFeedback.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    {syncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{syncFeedback.msg}</span>
                  </div>
                )}

                {/* Dry-Run Preview Table */}
                {previewResult && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                        <span className="text-emerald-300 font-semibold">
                          +{previewResult.runLog.createdCount} novos
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-rose-300 font-semibold">
                          {previewResult.runLog.priceIncreases} subiram
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-cyan-300 font-semibold">
                          {previewResult.runLog.priceDecreases} baixaram
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">
                          {previewResult.runLog.unchangedCount} iguais
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={previewSearch}
                            onChange={(e) => setPreviewSearch(e.target.value)}
                            placeholder="Filtrar item..."
                            className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none w-36"
                          />
                        </div>
                        <button
                          onClick={() =>
                            setPreviewFilter((prev) => (prev === 'changed' ? 'all' : 'changed'))
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white"
                        >
                          {previewFilter === 'changed' ? 'Ver Todos' : 'Só Alterados'}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3 font-semibold">Produto</th>
                            <th className="py-2 px-3 font-semibold text-right">Custo Ant.</th>
                            <th className="py-2 px-3 font-semibold text-right">Novo Custo</th>
                            <th className="py-2 px-3 font-semibold text-right">Venda Blindada</th>
                            <th className="py-2 px-3 font-semibold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {filteredPreviewItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-500">
                                Nenhum item encontrado com os filtros atuais.
                              </td>
                            </tr>
                          ) : (
                            filteredPreviewItems.map((item) => (
                              <tr key={`${item.productId}-${item.sku}`} className="hover:bg-slate-800/40">
                                <td className="py-2 px-3">
                                  <div className="font-medium text-white truncate max-w-[220px]">{item.name}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    {item.sku || 'S/SKU'} · {item.category}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">
                                  {item.oldCost !== null ? formatBRL(item.oldCost) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-white">
                                  {formatBRL(item.newCost)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-emerald-300">
                                  {formatBRL(item.newPrice)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums">
                                  {item.action === 'created' && (
                                    <span className="text-emerald-400 font-semibold">Novo</span>
                                  )}
                                  {item.action === 'cost_increased' && (
                                    <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" />+{item.diffPercent.toFixed(1)}%
                                    </span>
                                  )}
                                  {item.action === 'cost_decreased' && (
                                    <span className="text-cyan-400 font-semibold inline-flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3" />{item.diffPercent.toFixed(1)}%
                                    </span>
                                  )}
                                  {item.action === 'unchanged' && (
                                    <span className="text-slate-500">Igual</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 1-Click Chrome Extractor */}
            {activeCollectorTab === 'browser' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-white">Como extrair direto da vitrine da SuperLuna sem bloqueio:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Abra <code className="text-cyan-300">{draftConfig.sourceUrl}</code> no seu Chrome e selecione sua filial/cidade.</li>
                    <li>Entre na categoria ou busca desejada e role a página para exibir os produtos.</li>
                    <li>Pressione <code className="text-slate-200">F12</code> (aba Console), cole o script abaixo e tecle <code className="text-slate-200">Enter</code>.</li>
                    <li>Ele envia automaticamente para este painel (ou baixa o JSON pronto caso o site restrinja envio direto).</li>
                  </ol>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    Script pré-configurado com seu Webhook e Token
                  </span>
                  <button
                    onClick={() => copyText('browserScript', browserScript)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'browserScript' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Script Console</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-80">
                  {browserScript}
                </pre>
              </div>
            )}

            {/* TAB 3: Playwright Automated Worker 24/7 */}
            {activeCollectorTab === 'playwright' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-white">Coletor Automático Agendado (Node.js + Playwright)</p>
                  <p className="text-slate-400">
                    O robô abre as categorias abaixo em um navegador real (Chromium), clica automaticamente no botão <span className="text-emerald-300 font-semibold">"Carregar mais"</span> até exibir todos os produtos, detecta a categoria pelo link e envia para o seu catálogo via API.
                  </p>
                  <div className="pt-1 font-mono text-[11px] text-emerald-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 overflow-x-auto">
                    npm init -y && npm install playwright && npx playwright install chromium && node coletor-superluna.mjs
                  </div>
                </div>

                {/* Safe Visual Editor for TARGET_PATHS */}
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-white">
                      Links ou Rotas da SuperLuna para o Robô Vigiar (1 por linha)
                    </label>
                    <span className="text-[11px] text-emerald-300 font-mono tabular-nums">
                      {parsedTargetPaths.length} {parsedTargetPaths.length === 1 ? 'rota configurada' : 'rotas configuradas'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Cole aqui os endereços completos (ex.: <code className="text-cyan-300">https://www.superlunasupermercados.com.br/p/categoria/4750/mercearia</code>) ou apenas o final (<code className="text-cyan-300">/p/categoria/4750/mercearia</code>), sem precisar digitar aspas ou vírgulas.
                  </p>
                  <textarea
                    rows={4}
                    value={targetPathsText}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      setTargetPathsText(nextText);
                      setDraftConfig((prev) => ({
                        ...prev,
                        targetPaths: parseTargetPathsInput(nextText),
                      }));
                    }}
                    placeholder={`https://www.superlunasupermercados.com.br/p/categoria/4750/mercearia\n/p/categoria/4751/bebidas`}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    Arquivo <code className="text-slate-200">coletor-superluna.mjs</code> (já gerado com as rotas acima)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText('playwrightScript', playwrightScript)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'playwrightScript' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copiar Código</span>
                    </button>

                    <button
                      onClick={handleDownloadPlaywright}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .mjs</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-80">
                  {playwrightScript}
                </pre>
              </div>
            )}
          </div>

          {/* Real-time Sync History Log */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Histórico de Atualizações de Preço</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {syncHistory.length} {syncHistory.length === 1 ? 'execução' : 'execuções'}
              </span>
            </div>

            {syncHistory.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Nenhuma sincronização registrada ainda</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Salve suas regras ao lado e execute uma importação JSON/CSV, o Extrator 1-Clique ou o Robô Playwright para ver as alterações de preço em tempo real aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {syncHistory.slice(0, 10).map((run) => {
                  const isExpanded = expandedRunId === run.id;
                  const triggerLabel =
                    run.trigger === 'api_webhook'
                      ? 'API Webhook'
                      : run.trigger === 'browser_script'
                      ? 'Extrator Chrome'
                      : 'Importação Manual';

                  const rawChanges = run.changes || [];
                  const resolvedChanges = rawChanges.map((chg) => {
                    const liveProd = products.find((p) => p.id === chg.productId);
                    return {
                      ...chg,
                      resolvedCategory: liveProd?.category || chg.category || 'Sem categoria',
                      existsInCatalog: Boolean(liveProd),
                    };
                  });

                  const categoryCounts = new Map<string, number>();
                  resolvedChanges.forEach((c) => {
                    categoryCounts.set(
                      c.resolvedCategory,
                      (categoryCounts.get(c.resolvedCategory) || 0) + 1
                    );
                  });
                  const categorySummary = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

                  const qHist = normalizeSearchText(historySearch);
                  const visibleChanges = resolvedChanges.filter((c) => {
                    if (historyCategoryFilter !== 'all' && c.resolvedCategory !== historyCategoryFilter) {
                      return false;
                    }
                    if (qHist) {
                      const hay = normalizeSearchText(`${c.name} ${c.sku} ${c.resolvedCategory}`);
                      if (!hay.includes(qHist)) return false;
                    }
                    return true;
                  });

                  const selectableVisibleIds = visibleChanges
                    .filter((c) => c.existsInCatalog)
                    .map((c) => c.productId);
                  const allVisibleSelected =
                    selectableVisibleIds.length > 0 &&
                    selectableVisibleIds.every((id) => selectedHistoryProductIds.includes(id));

                  const toggleSelectAllVisible = () => {
                    if (allVisibleSelected) {
                      setSelectedHistoryProductIds((prev) =>
                        prev.filter((id) => !selectableVisibleIds.includes(id))
                      );
                    } else {
                      setSelectedHistoryProductIds((prev) =>
                        Array.from(new Set([...prev, ...selectableVisibleIds]))
                      );
                    }
                  };

                  const toggleSelectOne = (productId: string) => {
                    setSelectedHistoryProductIds((prev) =>
                      prev.includes(productId)
                        ? prev.filter((id) => id !== productId)
                        : [...prev, productId]
                    );
                  };

                  return (
                    <div key={run.id} className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                      <button
                        onClick={() => {
                          setExpandedRunId(isExpanded ? null : run.id);
                          setHistoryCategoryFilter('all');
                          setSelectedHistoryProductIds([]);
                        }}
                        className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-white">
                            {run.sourceLabel} · <span className="text-cyan-400">{triggerLabel}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {new Date(run.timestamp).toLocaleString('pt-BR')} · {run.totalReceived} recebidos
                            {categorySummary.length > 0 && (
                              <span className="text-slate-300">
                                {' · '}
                                {categorySummary.map(([cat, count]) => `${cat} (${count})`).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                          <span className="text-emerald-400">+{run.createdCount} novos</span>
                          <span className="text-rose-400">{run.priceIncreases} ↑</span>
                          <span className="text-cyan-400">{run.priceDecreases} ↓</span>
                        </div>
                      </button>

                      {isExpanded && resolvedChanges.length > 0 && (
                        <div className="border-t border-slate-800">
                          {/* Category breakdown & quick filter inside expanded run */}
                          <div className="px-3 py-2.5 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setHistoryCategoryFilter('all')}
                                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                                  historyCategoryFilter === 'all'
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Todas ({resolvedChanges.length})
                              </button>
                              {categorySummary.map(([cat, count]) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() =>
                                    setHistoryCategoryFilter((prev) => (prev === cat ? 'all' : cat))
                                  }
                                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                                    historyCategoryFilter === cat
                                      ? 'bg-cyan-600 text-white'
                                      : 'bg-slate-950 text-cyan-300 border border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {cat} ({count})
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsCreatingHistoryCat((prev) => !prev)}
                                className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-300 font-medium whitespace-nowrap"
                              >
                                + Nova Categoria
                              </button>
                              <div className="relative">
                                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={historySearch}
                                  onChange={(e) => setHistorySearch(e.target.value)}
                                  placeholder="Buscar item ou categoria..."
                                  className="pl-6 pr-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white placeholder:text-slate-600 focus:outline-none w-44"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Inline New Category Creator */}
                          {isCreatingHistoryCat && (
                            <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-slate-300 font-medium">Nova categoria:</span>
                              <input
                                type="text"
                                value={newHistoryCategoryName}
                                onChange={(e) => setNewHistoryCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateInlineHistoryCategory();
                                }}
                                placeholder="Ex: Perfumaria, Matinais, Frios..."
                                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-500 focus:outline-none w-56"
                              />
                              <button
                                type="button"
                                onClick={handleCreateInlineHistoryCategory}
                                disabled={!newHistoryCategoryName.trim() || isUpdatingCategories}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold"
                              >
                                {selectedHistoryProductIds.length > 0
                                  ? `Criar e Mover (${selectedHistoryProductIds.length})`
                                  : 'Criar Categoria'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingHistoryCat(false);
                                  setNewHistoryCategoryName('');
                                }}
                                className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {/* Bulk Reassignment Toolbar when items are checked */}
                          {selectedHistoryProductIds.length > 0 && onBulkUpdateCategories && (
                            <div className="px-3 py-2 bg-emerald-950/30 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="text-emerald-200 font-semibold font-mono tabular-nums">
                                {selectedHistoryProductIds.length}{' '}
                                {selectedHistoryProductIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-slate-300">Mover para:</span>
                                <select
                                  value={bulkTargetCategory}
                                  onChange={(e) => setBulkTargetCategory(e.target.value)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
                                >
                                  {availableCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={isUpdatingCategories}
                                  onClick={() =>
                                    handleQuickCategoryChange(selectedHistoryProductIds, bulkTargetCategory)
                                  }
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                                >
                                  {isUpdatingCategories ? 'Salvando...' : 'Aplicar em Lote'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryProductIds([])}
                                  className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                                >
                                  Limpar
                                </button>
                              </div>
                            </div>
                          )}

                          {categoryUpdateMsg && (
                            <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{categoryUpdateMsg}</span>
                            </div>
                          )}

                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                                <tr>
                                  {onBulkUpdateCategories && (
                                    <th className="py-1.5 pl-3 pr-1 w-7">
                                      <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        aria-label="Selecionar todos os itens visíveis"
                                        className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                                      />
                                    </th>
                                  )}
                                  <th className="py-1.5 px-3 font-medium">Item</th>
                                  <th className="py-1.5 px-3 font-medium">Categoria (Edição Rápida)</th>
                                  <th className="py-1.5 px-3 font-medium text-right">Custo</th>
                                  <th className="py-1.5 px-3 font-medium text-right">Venda</th>
                                  <th className="py-1.5 px-3 font-medium text-right">Variação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {visibleChanges.length === 0 ? (
                                  <tr>
                                    <td colSpan={onBulkUpdateCategories ? 6 : 5} className="py-5 text-center text-slate-500">
                                      Nenhum item encontrado nessa categoria ou busca.
                                    </td>
                                  </tr>
                                ) : (
                                  visibleChanges.map((chg, idx) => {
                                    const isChecked = selectedHistoryProductIds.includes(chg.productId);
                                    const rowCategories = availableCategories.includes(chg.resolvedCategory)
                                      ? availableCategories
                                      : [chg.resolvedCategory, ...availableCategories];

                                    return (
                                      <tr
                                        key={`${run.id}-${chg.productId}-${idx}`}
                                        className={isChecked ? 'bg-emerald-950/20' : 'hover:bg-slate-900/40'}
                                      >
                                        {onBulkUpdateCategories && (
                                          <td className="py-1.5 pl-3 pr-1">
                                            <input
                                              type="checkbox"
                                              disabled={!chg.existsInCatalog}
                                              checked={isChecked}
                                              onChange={() => toggleSelectOne(chg.productId)}
                                              aria-label={`Selecionar ${chg.name}`}
                                              className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 disabled:opacity-30"
                                            />
                                          </td>
                                        )}
                                        <td className="py-1.5 px-3">
                                          {chg.existsInCatalog && onOpenProductInCatalog ? (
                                            <button
                                              type="button"
                                              onClick={() => onOpenProductInCatalog(chg.productId)}
                                              className="text-left text-slate-100 hover:text-emerald-300 font-medium truncate max-w-[180px] block transition-colors"
                                              title="Abrir produto no Catálogo & Fichas"
                                            >
                                              {chg.name}
                                            </button>
                                          ) : (
                                            <span className="text-slate-200 truncate max-w-[180px] block">
                                              {chg.name}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-3">
                                          {chg.existsInCatalog && onBulkUpdateCategories ? (
                                            <select
                                              value={chg.resolvedCategory}
                                              disabled={isUpdatingCategories}
                                              onChange={(e) =>
                                                handleQuickCategoryChange([chg.productId], e.target.value)
                                              }
                                              aria-label={`Alterar categoria de ${chg.name}`}
                                              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/60 text-xs text-cyan-300 font-medium focus:border-emerald-500 focus:outline-none max-w-[165px] cursor-pointer"
                                            >
                                              {rowCategories.map((cat) => (
                                                <option key={cat} value={cat} className="bg-slate-950 text-white">
                                                  {cat}
                                                </option>
                                              ))}
                                            </select>
                                          ) : (
                                            <span className="text-cyan-300 font-medium whitespace-nowrap">
                                              {chg.resolvedCategory}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                                          {chg.oldCost !== null && chg.oldCost !== chg.newCost
                                            ? `${formatBRL(chg.oldCost)} → ${formatBRL(chg.newCost)}`
                                            : formatBRL(chg.newCost)}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-300 whitespace-nowrap">
                                          {formatBRL(chg.newPrice)}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                          {chg.action === 'created' && <span className="text-emerald-400">Novo</span>}
                                          {chg.action === 'cost_increased' && (
                                            <span className="text-rose-400">+{chg.diffPercent.toFixed(1)}%</span>
                                          )}
                                          {chg.action === 'cost_decreased' && (
                                            <span className="text-cyan-400">{chg.diffPercent.toFixed(1)}%</span>
                                          )}
                                          {chg.action === 'unchanged' && <span className="text-slate-500">0%</span>}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
