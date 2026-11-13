import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductItem } from '../types/pricing';
import { formatBRL, normalizeProduct } from '../utils/pricingEngine';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ProductItem[], mode: 'merge' | 'replace') => void;
  currentProductsCount: number;
}

interface ParsedPreviewRow {
  sku: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  promoPrice?: number;
  cost: number;
  category: string;
  unit: string;
  valid: boolean;
  rawLine: string;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentProductsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [defaultCostRatio, setDefaultCostRatio] = useState<number>(50); // Default 50% CMV if not specified
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Example matching the exact user screenshot
  const SAMPLE_SPREADSHEET_TEXT = `Código de Barras\tNome\tPreço\tQtd. Atual Estoque\tAtivo\tPreço em Promoção
7896356800011\tArroz Pilecco Nobre 5kg\tR$ 30,73\t100\t1\t
7891000100103\tFeijão Carioca Tipo 1 1kg\tR$ 8,49\t85\t1\t
7891025114138\tAzeite de Oliva Extra Virgem 500ml\tR$ 39,90\t40\t1\tR$ 34,90
7894900010015\tRefrigerante Coca-Cola 2L\tR$ 11,50\t120\t1\t
7898080640019\tHambúrguer Artesanal Angus 180g\tR$ 18,90\t60\t1\t`;

  // Infer measurement unit from product name
  const inferUnit = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('5kg') || lower.includes('1kg') || lower.includes('kg')) return 'kg';
    if (lower.includes('500g') || lower.includes('200g') || lower.includes('180g') || lower.includes('g ')) return 'g';
    if (lower.includes('350ml') || lower.includes('lata')) return 'lata';
    if (lower.includes('2l') || lower.includes('1l') || lower.includes('litro')) return 'l';
    if (lower.includes('500ml') || lower.includes('600ml') || lower.includes('garrafa')) return 'garrafa';
    if (lower.includes('porção') || lower.includes('porcao') || lower.includes('batata')) return 'porção';
    if (lower.includes('combo')) return 'combo';
    if (lower.includes('fatia')) return 'fatia';
    if (lower.includes('box') || lower.includes('caixa')) return 'cx';
    return 'un';
  };

  // Infer category from product name
  const inferCategory = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('arroz') || lower.includes('feijão') || lower.includes('feijao') || lower.includes('óleo') || lower.includes('azeite')) {
      return 'Mercearia';
    }
    if (lower.includes('hambúrguer') || lower.includes('hamburguer') || lower.includes('burger') || lower.includes('smash') || lower.includes('sanduíche')) {
      return 'Lanches';
    }
    if (lower.includes('coca') || lower.includes('refrigerante') || lower.includes('suco') || lower.includes('água') || lower.includes('cerveja') || lower.includes('bebida')) {
      return 'Bebidas';
    }
    if (lower.includes('batata') || lower.includes('onion') || lower.includes('mandioca') || lower.includes('aperitivo')) {
      return 'Acompanhamentos';
    }
    if (lower.includes('pizza') || lower.includes('calabresa')) {
      return 'Pizzas';
    }
    if (lower.includes('brownie') || lower.includes('torta') || lower.includes('sobremesa') || lower.includes('doce')) {
      return 'Sobremesas';
    }
    return 'Geral';
  };

  // Clean and parse monetary or numeric values (supports "R$ 30,73", "30,73", "30.73")
  const parseCurrencyNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val
      .replace(/R\$/gi, '')
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Clean and parse stock quantity (supports "100", "100,0")
  const parseStockNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  };

  // Clean and parse boolean active status ("1", "sim", "s", "true" -> true)
  const parseActiveStatus = (val: string | undefined): boolean => {
    if (!val) return true;
    const clean = val.trim().toLowerCase();
    if (clean === '1' || clean === 'sim' || clean === 's' || clean === 'true' || clean === 'ativo' || clean === 'yes') {
      return true;
    }
    if (clean === '0' || clean === 'não' || clean === 'nao' || clean === 'n' || clean === 'false' || clean === 'inativo' || clean === 'no') {
      return false;
    }
    return true;
  };

  // Parse lines from CSV, TSV, or Excel copy-paste
  const parseSpreadsheetData = (text: string): ParsedPreviewRow[] => {
    if (!text || !text.trim()) return [];

    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length === 0) return [];

    // Detect delimiter: tab (\t), semicolon (;), or comma (,)
    const firstLine = rawLines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';')) {
      delimiter = ';';
    } else if (firstLine.includes(',')) {
      delimiter = ',';
    }

    // Header mapping detection
    const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase());

    const findIndex = (keywords: string[]) => {
      return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
    };

    let colSku = findIndex(['código de barras', 'codigo de barras', 'código', 'codigo', 'barras', 'sku', 'ean']);
    let colName = findIndex(['nome', 'produto', 'descrição', 'descricao', 'item']);
    let colPrice = findIndex(['preço', 'preco', 'valor', 'venda']);
    let colStock = findIndex(['qtd. atual estoque', 'qtd atual estoque', 'estoque', 'qtd', 'quantidade']);
    let colActive = findIndex(['ativo', 'status', 'habilitado']);
    let colPromo = findIndex(['promoção', 'promocao', 'promo']);
    let colCost = findIndex(['custo', 'cmv']);

    // Fallback if headers were not recognized (e.g. pasted directly as columns 0, 1, 2, 3, 4)
    if (colName === -1 && headers.length >= 2) {
      colSku = 0;
      colName = 1;
      colPrice = headers.length > 2 ? 2 : -1;
      colStock = headers.length > 3 ? 3 : -1;
      colActive = headers.length > 4 ? 4 : -1;
      colPromo = headers.length > 5 ? 5 : -1;
    }

    const dataLines = rawLines.slice(1);
    const parsedRows: ParsedPreviewRow[] = [];

    dataLines.forEach((line) => {
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length === 0 || parts.every((p) => p === '')) return;

      const rawSku = colSku !== -1 && parts[colSku] !== undefined ? parts[colSku] : '';
      const rawName = colName !== -1 && parts[colName] !== undefined ? parts[colName] : parts[0] || 'Produto sem nome';
      const rawPrice = colPrice !== -1 && parts[colPrice] !== undefined ? parts[colPrice] : '0';
      const rawStock = colStock !== -1 && parts[colStock] !== undefined ? parts[colStock] : '0';
      const rawActive = colActive !== -1 && parts[colActive] !== undefined ? parts[colActive] : '1';
      const rawPromo = colPromo !== -1 && parts[colPromo] !== undefined ? parts[colPromo] : undefined;
      const rawCost = colCost !== -1 && parts[colCost] !== undefined ? parts[colCost] : undefined;

      const price = parseCurrencyNumber(rawPrice);
      const stock = parseStockNumber(rawStock);
      const active = parseActiveStatus(rawActive);
      const promoPrice = rawPromo ? parseCurrencyNumber(rawPromo) : undefined;

      // Calculate or infer cost CMV
      const cost = rawCost ? parseCurrencyNumber(rawCost) : Number((price * (defaultCostRatio / 100)).toFixed(2));
      const category = inferCategory(rawName);
      const unit = inferUnit(rawName);

      const isValid = Boolean(rawName && rawName.trim().length > 0 && price > 0);

      parsedRows.push({
        sku: rawSku || `SKU-${Date.now().toString().slice(-6)}`,
        name: rawName,
        price,
        stock,
        active,
        promoPrice,
        cost,
        category,
        unit,
        valid: isValid,
        rawLine: line,
      });
    });

    return parsedRows;
  };

  const previewRows = parseSpreadsheetData(pasteContent);
  const validRows = previewRows.filter((r) => r.valid);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setPasteContent(text);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  // Execute import
  const handleExecuteImport = () => {
    if (validRows.length === 0) {
      setFeedback({ message: 'Nenhuma linha válida encontrada para importar.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

      const convertedProducts: ProductItem[] = validRows.map((row, index) => {
        const id = `prod-imp-${Date.now()}-${index}`;
        return normalizeProduct({
          id,
          sku: row.sku,
          name: row.name,
          category: row.category,
          cost: row.cost,
          currentPrice: row.price,
          targetNetMargin: 0.25,
          estimatedMonthlyUnits: Math.max(30, row.stock * 2),
          unit: row.unit,
          currentStock: row.stock,
          minStock: Math.max(5, Math.floor(row.stock * 0.2)),
          maxStock: Math.max(50, row.stock * 3),
          active: row.active,
          costMethod: 'manual',
          description: row.promoPrice && row.promoPrice > 0
            ? `Item importado via planilha. Preço promocional: ${formatBRL(row.promoPrice)}.`
            : `Item importado via planilha em ${now}.`,
          stockHistory: [
            {
              id: `stk-init-${Date.now()}-${index}`,
              date: now,
              type: 'adjust',
              quantity: row.stock,
              reason: 'Carga inicial via importação de planilha',
              previousStock: 0,
              newStock: row.stock,
            },
          ],
        });
      });

      onImport(convertedProducts, importMode);
      setFeedback({
        message: `${convertedProducts.length} produtos importados com sucesso!`,
        type: 'success',
      });

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar planilha';
      setFeedback({ message: `Erro ao importar: ${msg}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Sample CSV template matching screenshot
  const handleDownloadTemplate = () => {
    const csvContent =
      'Código de Barras;Nome;Preço;Qtd. Atual Estoque;Ativo;Preço em Promoção\n' +
      '7896356800011;Arroz Pilecco Nobre 5kg;R$ 30,73;100;1;\n' +
      '7891000100103;Feijão Carioca Tipo 1 1kg;R$ 8,49;85;1;\n' +
      '7891025114138;Azeite de Oliva Extra Virgem 500ml;R$ 39,90;40;1;R$ 34,90\n';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_importacao_omniprice.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  Importação de Produtos via Planilha
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Excel & CSV
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suporta Código de Barras, Nome, Preço, Estoque, Ativo e Preço Promocional
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                title="Baixar planilha modelo CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Modelo CSV</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Input Method Selector Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Colar da Planilha (Ctrl+V)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Subir Arquivo (.csv, .tsv)</span>
                </button>
              </div>

              {/* Quick Sample Button */}
              <button
                type="button"
                onClick={() => {
                  setPasteContent(SAMPLE_SPREADSHEET_TEXT);
                  setActiveTab('paste');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Carregar linhas da imagem de exemplo enviada"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Carregar Exemplo da Imagem</span>
              </button>
            </div>

            {/* Tab 1: Colar Dados */}
            {activeTab === 'paste' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label className="font-semibold text-slate-300">
                    Copie as linhas da sua planilha (Excel ou Google Sheets) e cole abaixo:
                  </label>
                  {pasteContent && (
                    <button
                      type="button"
                      onClick={() => setPasteContent('')}
                      className="text-rose-400 hover:underline text-[11px]"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={`Código de Barras\tNome\tPreço\tQtd. Atual Estoque\tAtivo\tPreço em Promoção\n7896356800011\tArroz Pilecco Nobre 5kg\tR$ 30,73\t100\t1\t`}
                  rows={6}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            {/* Tab 2: Upload de Arquivo */}
            {activeTab === 'upload' && (
              <div className="p-6 border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-2xl text-center space-y-3">
                <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto" />
                <div className="text-xs text-slate-300">
                  Arraste seu arquivo de planilha aqui ou clique para selecionar do computador
                </div>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-file-upload-input"
                />
                <label
                  htmlFor="csv-file-upload-input"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer transition-all shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>{fileName ? `Selecionado: ${fileName}` : 'Procurar Arquivo CSV / TSV'}</span>
                </label>
                <p className="text-[10px] text-slate-500">
                  Compatível com planilhas exportadas do Excel, ERPs de supermercado e sistemas de PDV.
                </p>
              </div>
            )}

            {/* Import Configurations Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950/70 rounded-2xl border border-slate-800 text-xs">
              <div>
                <label className="font-semibold text-white block mb-1.5 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Modo de Importação no Catálogo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-emerald-400">Mesclar / Atualizar</div>
                    <div className="text-[10px] text-slate-400">Atualiza iguais e inclui novos</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-rose-500/15 border-rose-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px] text-rose-400">Substituir Tudo</div>
                    <div className="text-[10px] text-slate-400">Limpa e grava apenas a planilha</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-white block mb-1.5 flex items-center justify-between">
                  <span>Custo CMV Padrão se ausente na planilha</span>
                  <span className="text-emerald-400 font-mono font-bold">{defaultCostRatio}% do preço</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={defaultCostRatio}
                  onChange={(e) => setDefaultCostRatio(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Se a planilha contiver apenas o Preço de Venda, o custo unitário será calculado em {defaultCostRatio}% (editável a qualquer momento na ficha).
                </p>
              </div>
            </div>

            {/* PREVIEW TABLE */}
            {previewRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">
                      Pré-visualização dos Dados ({validRows.length} de {previewRows.length} itens válidos)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Catálogo atual: <strong>{currentProductsCount} itens</strong>
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-2xl max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Código de Barras (SKU)</th>
                        <th className="py-2.5 px-3">Nome do Produto</th>
                        <th className="py-2.5 px-3">Preço</th>
                        <th className="py-2.5 px-3">Estoque</th>
                        <th className="py-2.5 px-3">Ativo</th>
                        <th className="py-2.5 px-3">Unidade</th>
                        <th className="py-2.5 px-3">Custo Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-900/80">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'hover:bg-slate-800/40' : 'bg-rose-950/20 text-rose-300'}>
                          <td className="py-2 px-3">
                            {row.valid ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Linha válida" />
                            ) : (
                              <span className="text-[10px] text-rose-400 font-bold">Incompleto</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-300">{row.sku}</td>
                          <td className="py-2 px-3 font-semibold text-white">{row.name}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                            {formatBRL(row.price)}
                            {row.promoPrice ? (
                              <span className="text-[10px] text-amber-300 block font-normal">
                                Promo: {formatBRL(row.promoPrice)}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-200">{row.stock}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.active
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {row.active ? 'Ativo (1)' : 'Inativo (0)'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                              {row.unit}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">{formatBRL(row.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 hidden sm:block">
              {validRows.length > 0 ? (
                <span>
                  Pronto para importar <strong>{validRows.length} produtos</strong> com sincronização no banco em nuvem.
                </span>
              ) : (
                <span>Cole ou envie o arquivo da planilha para começar.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={validRows.length === 0 || isProcessing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Importar {validRows.length} Produtos</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
