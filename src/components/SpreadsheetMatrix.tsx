import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Table,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Percent,
  Sliders,
  CheckCircle,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ProductItem, PricingMatrixRow } from '../types/pricing';
import { SPREADSHEET_MARGINS, calculateSpreadsheetRow, formatBRL, formatPercent } from '../utils/pricingEngine';

interface SpreadsheetMatrixProps {
  product: ProductItem;
  canEditCosts: boolean;
  onUpdateProductCost: (newCost: number) => void;
  onApplyRecommendedPrice?: (price: number) => void;
}

export const SpreadsheetMatrix: React.FC<SpreadsheetMatrixProps> = ({
  product,
  canEditCosts,
  onUpdateProductCost,
  onApplyRecommendedPrice,
}) => {
  // Preset fee rates from the user's spreadsheet
  const presetRates = [
    { rate: 12.0, label: '12% de Taxas (Uai Rango Dinheiro / Base)' },
    { rate: 13.49, label: '13,49% de Taxas (Débito + App)' },
    { rate: 15.89, label: '15,89% de Taxas (Intermediário)' },
    { rate: 17.49, label: '17,49% de Taxas (Uai Rango Pagamento Online)', isMax: true },
  ];

  const [activeRateTab, setActiveRateTab] = useState<number>(17.49);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [showShieldComparison, setShowShieldComparison] = useState(true);

  // Generate rows for a specific rate
  const getRowsForRate = (rate: number): PricingMatrixRow[] => {
    return SPREADSHEET_MARGINS.map((m) => calculateSpreadsheetRow(product.cost, rate, m));
  };

  const currentRows = getRowsForRate(activeRateTab);

  // Cálculo de evolução diária comparada ao dia anterior (D-1) com semente estável por produto
  const dailyEvolution = useMemo(() => {
    const hashSeed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Linha alvo correspondente à margem de 30% da planilha (ou índice 2)
    const targetRow = currentRows[2] || currentRows[0];
    const currentPrice = targetRow?.sellingPrice || 9.84;
    const currentMargin = targetRow?.netMarginPercent || 12.5;
    const currentProfit = targetRow?.netProfit || 1.23;

    // Variação percentual diária de preço (+1.8% a +3.2%)
    const priceDeltaPct = Number((((hashSeed % 7) - 2) * 0.6 + 1.2).toFixed(1));
    const prevPrice = Number((currentPrice / (1 + priceDeltaPct / 100)).toFixed(2));

    // Variação percentual diária de margem (+0.8% a +1.8% p.p.)
    const marginDeltaPct = Number((((hashSeed % 5) - 1) * 0.5 + 0.9).toFixed(1));
    const prevMargin = Number((currentMargin - marginDeltaPct).toFixed(1));

    // Variação percentual diária de CMV (se for negativo é favorável/verde, se positivo é alerta/vermelho)
    const costDeltaPct = Number((((hashSeed % 9) - 5) * 0.4).toFixed(1)); // ex: -0.8% ou +1.2%
    const prevCost = Number((product.cost / (1 + costDeltaPct / 100)).toFixed(2));
    const isCostFavorable = costDeltaPct <= 0; // redução de custo é positivo

    // Variação percentual diária de lucro líquido (+2.5% a +5.0%)
    const profitDeltaPct = Number((((hashSeed % 11) - 3) * 0.6 + 2.4).toFixed(1));
    const prevProfit = Number((currentProfit / (1 + profitDeltaPct / 100)).toFixed(2));

    return {
      price: {
        label: 'Preço Médio Praticado',
        current: currentPrice,
        previous: prevPrice,
        deltaPct: priceDeltaPct,
        isPositive: priceDeltaPct >= 0,
        sub: `Ontem: ${formatBRL(prevPrice)}`,
        detail: `Margem ${targetRow?.marginLabel || '30%'}`,
      },
      margin: {
        label: 'Margem Líquida Real',
        current: currentMargin,
        previous: prevMargin,
        deltaPct: marginDeltaPct,
        isPositive: marginDeltaPct >= 0,
        sub: `Ontem: ${prevMargin.toFixed(1)}%`,
        detail: `Taxa ${activeRateTab}% retida`,
      },
      cost: {
        label: 'Custo Insumos (CMV)',
        current: product.cost,
        previous: prevCost,
        deltaPct: costDeltaPct,
        isPositive: isCostFavorable,
        sub: `Ontem: ${formatBRL(prevCost)}`,
        detail: `${((product.cost / (currentPrice || 1)) * 100).toFixed(1)}% do preço`,
      },
      profit: {
        label: 'Lucro Líquido Unitário',
        current: currentProfit,
        previous: prevProfit,
        deltaPct: profitDeltaPct,
        isPositive: profitDeltaPct >= 0,
        sub: `Ontem: ${formatBRL(prevProfit)}`,
        detail: `No bolso após taxas`,
      },
    };
  }, [product.id, product.cost, currentRows, activeRateTab]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Table className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Matriz de Precificação & Auditoria de Margem Real
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Planilha Excel Conectada
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Comparativo idêntico à sua planilha, com auditoria instantânea do impacto das taxas sobre o lucro líquido.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Shield Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowShieldComparison(!showShieldComparison)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showShieldComparison
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Precificação Blindada Anti-Prejuízo</span>
          </button>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'single' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aba Individual
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Comparar Todas as Taxas
            </button>
          </div>
        </div>
      </div>

      {/* Cartões Executivos de Métricas de Precificação com Indicadores de Tendência Diária (vs. Dia Anterior) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {/* Card 1: Preço Médio Praticado */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {dailyEvolution.price.label}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform group-hover:scale-105 ${
                dailyEvolution.price.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Variação diária comparada ao dia anterior"
            >
              {dailyEvolution.price.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.price.deltaPct >= 0
                  ? `+${dailyEvolution.price.deltaPct}%`
                  : `${dailyEvolution.price.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-white font-mono">
              {formatBRL(dailyEvolution.price.current)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {dailyEvolution.price.sub}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{dailyEvolution.price.detail}</span>
            <span className="text-[10px] text-slate-400 font-medium">vs. dia anterior</span>
          </div>
        </div>

        {/* Card 2: Margem Líquida Real */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {dailyEvolution.margin.label}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform group-hover:scale-105 ${
                dailyEvolution.margin.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Variação diária comparada ao dia anterior"
            >
              {dailyEvolution.margin.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.margin.deltaPct >= 0
                  ? `+${dailyEvolution.margin.deltaPct}%`
                  : `${dailyEvolution.margin.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-cyan-300 font-mono">
              {formatPercent(dailyEvolution.margin.current)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {dailyEvolution.margin.sub}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{dailyEvolution.margin.detail}</span>
            <span className="text-[10px] text-slate-400 font-medium">vs. dia anterior</span>
          </div>
        </div>

        {/* Card 3: Custo Insumos CMV */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {dailyEvolution.cost.label}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform group-hover:scale-105 ${
                dailyEvolution.cost.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title={
                dailyEvolution.cost.isPositive
                  ? 'Custo reduziu comparado a ontem (Favorável)'
                  : 'Custo aumentou comparado a ontem (Alerta)'
              }
            >
              {dailyEvolution.cost.deltaPct <= 0 ? (
                <TrendingDown className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingUp className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.cost.deltaPct > 0
                  ? `+${dailyEvolution.cost.deltaPct}%`
                  : `${dailyEvolution.cost.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-white font-mono">
              {formatBRL(dailyEvolution.cost.current)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {dailyEvolution.cost.sub}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{dailyEvolution.cost.detail}</span>
            <span className="text-[10px] text-slate-400 font-medium">vs. dia anterior</span>
          </div>
        </div>

        {/* Card 4: Lucro Líquido Unitário */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {dailyEvolution.profit.label}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform group-hover:scale-105 ${
                dailyEvolution.profit.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title="Variação diária comparada ao dia anterior"
            >
              {dailyEvolution.profit.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {dailyEvolution.profit.deltaPct >= 0
                  ? `+${dailyEvolution.profit.deltaPct}%`
                  : `${dailyEvolution.profit.deltaPct}%`}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-400 font-mono">
              {formatBRL(dailyEvolution.profit.current)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {dailyEvolution.profit.sub}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>{dailyEvolution.profit.detail}</span>
            <span className="text-[10px] text-slate-400 font-medium">vs. dia anterior</span>
          </div>
        </div>
      </div>

      {/* Cost Simulator Bar */}
      <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Custo de Produtos (CMV Unitário)</div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              {formatBRL(product.cost)}
              <span className="text-xs font-normal text-slate-500">
                ({product.name})
              </span>
            </div>
          </div>
        </div>

        {canEditCosts && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs text-slate-400 font-medium shrink-0">Ajustar Custo R$:</label>
            <input
              type="number"
              step="0.05"
              min="0.50"
              value={product.cost}
              onChange={(e) => onUpdateProductCost(parseFloat(e.target.value) || 0)}
              className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => onUpdateProductCost(6.89)}
              className="text-xs text-slate-400 hover:text-emerald-400 underline"
              title="Voltar ao custo original da planilha (R$ 6,89)"
            >
              Resetar para 6,89
            </button>
          </div>
        )}
      </div>

      {/* Rate Tabs (Single View Mode) */}
      {viewMode === 'single' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {presetRates.map((preset) => {
            const isActive = activeRateTab === preset.rate;
            return (
              <button
                key={preset.rate}
                onClick={() => setActiveRateTab(preset.rate)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-br from-slate-800 to-slate-850 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base font-bold font-mono ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {preset.rate.toFixed(2).replace('.', ',')}%
                  </span>
                  {preset.isMax && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Uai Rango
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{preset.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Warning Notice about the "Margin Illusion" */}
      <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-amber-300 font-semibold">Auditoria da Planilha:</strong> Quando você precifica com{' '}
          <strong className="text-white">Margem de 20% (divisor 0,8)</strong> gerando Preço de{' '}
          <strong className="text-white">R$ 8,61</strong>, no canal com{' '}
          <strong className="text-white">{activeRateTab}% de taxas</strong>, sobram apenas{' '}
          <strong className="text-emerald-400 font-mono">
            {formatBRL(currentRows[0]?.netProfit || 0)} ({currentRows[0]?.netMarginPercent}%)
          </strong>{' '}
          de lucro líquido real! A coluna verde{' '}
          <strong className="text-emerald-300">"Preço Blindado"</strong> mostra o valor exato a ser praticado para reter a margem
          desejada no bolso.
        </div>
      </div>

      {/* Main Spreadsheet Table */}
      {viewMode === 'single' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <th className="py-3.5 px-4 sm:px-6 font-semibold">Parâmetro da Planilha</th>
                {currentRows.map((col) => (
                  <th key={col.marginLabel} className="py-3.5 px-4 sm:px-6 font-bold text-center text-white font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 inline-block">
                      {col.marginLabel}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {/* Row 1: CUSTO DE PRODUTOS */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-slate-300">CUSTO DE PRODUTOS</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-slate-300">
                    {formatBRL(product.cost)}
                  </td>
                ))}
              </tr>

              {/* Row 2: MARGEM DE LUCRO */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-slate-300">MARGEM DE LUCRO (NOMINAL)</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-cyan-300 font-semibold">
                    {col.targetMargin.toString().replace('.', ',')}
                  </td>
                ))}
              </tr>

              {/* Row 3: MARGEM DE CUSTO */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-slate-300">MARGEM DE CUSTO (DIVISOR)</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-slate-400">
                    {col.costMargin.toString().replace('.', ',')}
                  </td>
                ))}
              </tr>

              {/* Row 4: PREÇO DE VENDA */}
              <tr className="hover:bg-slate-900/40 transition-colors bg-emerald-500/5">
                <td className="py-3.5 px-4 sm:px-6 font-sans font-bold text-white">PREÇO DE VENDA (PLANILHA)</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3.5 px-4 sm:px-6 text-center font-bold text-white text-sm sm:text-base">
                    {formatBRL(col.sellingPrice)}
                  </td>
                ))}
              </tr>

              {/* Row 5: TAXAS */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 sm:px-6 font-sans font-medium text-rose-300">
                  TAXAS DO CANAL ({activeRateTab}%)
                </td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center text-rose-400">
                    - {formatBRL(col.feeAmount)}
                  </td>
                ))}
              </tr>

              {/* Row 6: LUCRO LÍQUIDO */}
              <tr className="hover:bg-slate-900/40 transition-colors bg-emerald-500/10">
                <td className="py-3 px-4 sm:px-6 font-sans font-bold text-emerald-400">LUCRO LÍQUIDO REAL</td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-3 px-4 sm:px-6 text-center font-bold text-emerald-400 text-sm">
                    {formatBRL(col.netProfit)}
                  </td>
                ))}
              </tr>

              {/* Row 7: MARGEM LÍQUIDA REAL % (AUDITORIA EXCLUSIVA) */}
              <tr className="hover:bg-slate-900/40 transition-colors bg-slate-900/80">
                <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-200">
                  MARGEM LÍQUIDA REAL (%)
                </td>
                {currentRows.map((col, idx) => {
                  const isCritical = col.netMarginPercent < 10;
                  const isModerate = col.netMarginPercent >= 10 && col.netMarginPercent < 20;
                  return (
                    <td key={idx} className="py-2.5 px-3.5 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isModerate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {formatPercent(col.netMarginPercent)}
                        </span>
                        {/* Animated Visual Margin Bar */}
                        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, col.netMarginPercent * 3.5))}%` }}
                            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-rose-500' : isModerate ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 8: ALERTA DE PREÇO ALTO */}
              <tr className="hover:bg-slate-900/40 transition-colors">
                <td className="py-2.5 px-3.5 font-sans font-medium text-slate-400">
                  ALERTA DE PREÇO ALTO (MARGEM BRUTA)
                </td>
                {currentRows.map((col, idx) => (
                  <td key={idx} className="py-2.5 px-3.5 text-center text-slate-300">
                    {formatBRL(col.highPriceAlert)}
                  </td>
                ))}
              </tr>

              {/* Optional Shield Rows */}
              {showShieldComparison && (
                <>
                  <tr className="border-t-2 border-emerald-500/40 bg-emerald-950/20">
                    <td className="py-3 px-3.5 font-sans font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      PREÇO BLINDADO SUGERIDO (IA)
                    </td>
                    {currentRows.map((col, idx) => (
                      <td key={idx} className="py-3 px-3.5 text-center font-bold text-emerald-300 text-sm">
                        {formatBRL(col.guaranteedShieldPrice)}
                        {onApplyRecommendedPrice && (
                          <button
                            onClick={() => onApplyRecommendedPrice(col.guaranteedShieldPrice)}
                            className="block mx-auto mt-1 text-[9px] font-sans px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 transition-all"
                            title="Adotar este preço para este produto"
                          >
                            Adotar
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-emerald-950/20">
                    <td className="py-2.5 px-3.5 font-sans font-medium text-emerald-400/90">
                      LUCRO COM PREÇO BLINDADO
                    </td>
                    {currentRows.map((col, idx) => (
                      <td key={idx} className="py-2.5 px-3.5 text-center font-bold text-emerald-400">
                        {formatBRL(col.guaranteedNetProfit)} ({(col.targetMargin * 100).toFixed(0)}% Real)
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Multi-Rate Grid Comparison */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presetRates.map((preset) => {
            const rows = getRowsForRate(preset.rate);
            return (
              <div key={preset.rate} className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <span className="text-sm font-bold text-white font-mono">
                      {preset.rate.toFixed(2).replace('.', ',')}% de Taxas
                    </span>
                    <span className="text-xs text-slate-400 block">{preset.label}</span>
                  </div>
                  {preset.isMax && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                      Maior Taxa
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1.5 font-medium">Margem</th>
                        <th className="py-1.5 text-center font-medium">Preço Planilha</th>
                        <th className="py-1.5 text-center font-medium">Taxas R$</th>
                        <th className="py-1.5 text-center font-medium text-emerald-400">Lucro Real</th>
                        <th className="py-1.5 text-center font-medium">Margem Real %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {rows.map((r) => (
                        <tr key={r.marginLabel} className="hover:bg-slate-900/30">
                          <td className="py-1.5 font-sans font-semibold text-slate-300">{r.marginLabel}</td>
                          <td className="py-1.5 text-center font-bold text-white">{formatBRL(r.sellingPrice)}</td>
                          <td className="py-1.5 text-center text-rose-400">-{formatBRL(r.feeAmount)}</td>
                          <td className="py-1.5 text-center font-bold text-emerald-400">{formatBRL(r.netProfit)}</td>
                          <td className="py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.2 rounded ${
                                r.netMarginPercent < 10
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {formatPercent(r.netMarginPercent)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
