import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Building,
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { ProductItem, ChannelFee, FixedExpenses, PricingAuditResult } from '../types/pricing';
import { formatBRL, formatPercent, calculateSpreadsheetRow, SPREADSHEET_MARGINS } from '../utils/pricingEngine';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem;
  channels: ChannelFee[];
  fixedExpenses: FixedExpenses;
  auditResult: PricingAuditResult | null;
  onExportCSV: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  product,
  channels,
  fixedExpenses,
  auditResult,
  onExportCSV,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const sampleRates = [12.0, 13.49, 15.89, 17.49];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Relatório Executivo de Viabilidade Financeira</h3>
              <p className="text-xs text-slate-400">Pronto para impressão em PDF ou apresentação à diretoria.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div ref={printRef} className="overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-200 print:text-black print:bg-white print:p-0">
          {/* Executive Letterhead */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-800 print:border-gray-300">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-emerald-400 print:text-emerald-700">OMNIPRICE AI</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 print:border print:border-gray-300">
                  Parecer Técnico Oficial
                </span>
              </div>
              <h1 className="text-lg font-bold text-white print:text-gray-900 mt-1">
                Laudo de Auditoria & Precificação por Canal
              </h1>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Produto Analisado: <strong className="text-white print:text-black">{product.name}</strong> (CMV: {formatBRL(product.cost)})
              </p>
            </div>

            <div className="text-right text-xs text-slate-400 print:text-gray-600 font-mono">
              <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
              <div>Horário: {new Date().toLocaleTimeString('pt-BR')}</div>
              <div>Protocolo: OP-{(Math.random() * 900000 + 100000).toFixed(0)}</div>
            </div>
          </div>

          {/* AI Executive Summary Box */}
          {auditResult && (
            <div className="p-4 rounded-2xl bg-slate-950 print:bg-gray-50 border border-slate-800 print:border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Diagnóstico Contábil da IA
                </span>
                <span className="text-xs font-mono font-bold text-white print:text-gray-900">
                  Pontuação: {auditResult.score}/100
                </span>
              </div>
              <h4 className="text-sm font-bold text-white print:text-gray-900">{auditResult.headline}</h4>
              <p className="text-xs text-slate-300 print:text-gray-700 leading-relaxed">{auditResult.verdict}</p>
            </div>
          )}

          {/* Comparative Matrix Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-700 mb-2">
              Demonstrativo Comparativo das Taxas da Planilha vs Margem Líquida Real
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-gray-300">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-700 border-b border-slate-800 print:border-gray-300">
                    <th className="py-2 px-3 font-semibold font-sans">Canal / Taxa</th>
                    <th className="py-2 px-3 text-center">Preço (Margem 20%)</th>
                    <th className="py-2 px-3 text-center">Lucro Real (20%)</th>
                    <th className="py-2 px-3 text-center">Preço (Margem 30%)</th>
                    <th className="py-2 px-3 text-center">Lucro Real (30%)</th>
                    <th className="py-2 px-3 text-center">Preço (Margem 40%)</th>
                    <th className="py-2 px-3 text-center">Lucro Real (40%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                  {sampleRates.map((rate) => {
                    const row20 = calculateSpreadsheetRow(product.cost, rate, SPREADSHEET_MARGINS[0]);
                    const row30 = calculateSpreadsheetRow(product.cost, rate, SPREADSHEET_MARGINS[3]);
                    const row40 = calculateSpreadsheetRow(product.cost, rate, SPREADSHEET_MARGINS[5]);
                    return (
                      <tr key={rate} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                        <td className="py-2 px-3 font-sans font-bold text-white print:text-gray-900">
                          {rate.toFixed(2).replace('.', ',')}% de Taxas
                        </td>
                        <td className="py-2 px-3 text-center">{formatBRL(row20.sellingPrice)}</td>
                        <td className="py-2 px-3 text-center text-emerald-400 print:text-emerald-700 font-bold">
                          {formatBRL(row20.netProfit)} ({row20.netMarginPercent}%)
                        </td>
                        <td className="py-2 px-3 text-center">{formatBRL(row30.sellingPrice)}</td>
                        <td className="py-2 px-3 text-center text-emerald-400 print:text-emerald-700 font-bold">
                          {formatBRL(row30.netProfit)} ({row30.netMarginPercent}%)
                        </td>
                        <td className="py-2 px-3 text-center">{formatBRL(row40.sellingPrice)}</td>
                        <td className="py-2 px-3 text-center text-emerald-400 print:text-emerald-700 font-bold">
                          {formatBRL(row40.netProfit)} ({row40.netMarginPercent}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Guidelines & Governance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 print:bg-gray-50 border border-slate-800 print:border-gray-300">
              <span className="font-bold text-white print:text-gray-900 block mb-1">
                Diretrizes de Governança
              </span>
              <ul className="space-y-1 text-slate-300 print:text-gray-700 list-disc list-inside">
                <li>Preços no delivery devem conter o markup compensatório das taxas financeiras.</li>
                <li>Incentivar vendas via Pix e canais diretos para capturar margem de até 19%.</li>
                <li>Monitorar a taxa de antecipação bancária mensalmente.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 print:bg-gray-50 border border-slate-800 print:border-gray-300">
              <span className="font-bold text-white print:text-gray-900 block mb-1">
                Ponto de Equilíbrio & Alvos
              </span>
              <div className="space-y-1 text-slate-300 print:text-gray-700 font-mono">
                <div>Despesas Fixas Totais: {formatBRL(fixedExpenses.totalFixed)}</div>
                <div>Projeção de Lucro Alvo: {formatBRL(fixedExpenses.profitProjection)}</div>
                <div>Volume Mínimo Estimado: ~140 unidades/mês</div>
              </div>
            </div>
          </div>

          {/* Signatures for Print */}
          <div className="pt-8 flex justify-between text-xs text-slate-400 print:text-gray-700 border-t border-slate-800 print:border-gray-300">
            <div className="text-center w-48">
              <div className="border-t border-slate-600 print:border-black pt-1">Responsável Controladoria</div>
              <div className="text-[10px] text-slate-500">Analista Financeiro</div>
            </div>
            <div className="text-center w-48">
              <div className="border-t border-slate-600 print:border-black pt-1">Aprovação Executiva</div>
              <div className="text-[10px] text-slate-500">Diretoria Geral</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
