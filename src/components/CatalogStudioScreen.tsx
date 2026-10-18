import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Archive,
  BarChart3,
  History,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  Scale,
  Percent,
} from 'lucide-react';
import { ProductItem, ProductIngredient, StockMovement, ChannelFee } from '../types/pricing';
import { formatBRL, calculateIngredientsCMV, normalizeProduct } from '../utils/pricingEngine';

interface CatalogStudioScreenProps {
  products: ProductItem[];
  selectedProduct: ProductItem;
  channels: ChannelFee[];
  onSelectProduct: (product: ProductItem) => void;
  onUpdateProduct: (product: ProductItem) => void;
  onAddProduct: (product: Omit<ProductItem, 'id'>) => ProductItem;
  onDeleteProduct: (id: string) => void;
  onBackToDashboard: () => void;
}

export const CatalogStudioScreen: React.FC<CatalogStudioScreenProps> = ({
  products,
  selectedProduct,
  channels,
  onSelectProduct,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onBackToDashboard,
}) => {
  // Navigation within Studio: 'list' (Table/Grid) or 'edit' (Dedicated Product & Technical Sheet Studio)
  const [studioMode, setStudioMode] = useState<'list' | 'edit'>('list');
  const [editingProductId, setEditingProductId] = useState<string>(selectedProduct.id);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'critical' | 'ok'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'cost' | 'stock' | 'margin'>('name');

  // Category Management Inline Panel State
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Editing Product Draft State
  const currentEditingProduct = useMemo(() => {
    const found = products.find((p) => p.id === editingProductId);
    return found ? normalizeProduct(found) : normalizeProduct(selectedProduct);
  }, [products, editingProductId, selectedProduct]);

  const [draftProduct, setDraftProduct] = useState<ProductItem>(currentEditingProduct);

  // Sync draft when editingProductId changes
  const handleStartEditing = (prod: ProductItem) => {
    const normalized = normalizeProduct(prod);
    setEditingProductId(prod.id);
    setDraftProduct(normalized);
    setStudioMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateNewProduct = () => {
    const newProd: ProductItem = {
      id: `prod-${Date.now()}`,
      sku: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: 'Novo Prato / Produto do Cardápio',
      category: categories[0] || 'Lanches',
      cost: 5.0,
      currentPrice: 15.0,
      targetNetMargin: 0.25,
      estimatedMonthlyUnits: 150,
      unit: 'un',
      currentStock: 30,
      minStock: 10,
      maxStock: 100,
      costMethod: 'recipe',
      description: 'Descrição do novo item do cardápio.',
      active: true,
      ingredients: [
        { id: `ing-${Date.now()}-1`, name: 'Insumo Base Principal', quantity: 1, unit: 'un', unitCost: 3.5, wastePercent: 0, subtotal: 3.5 },
        { id: `ing-${Date.now()}-2`, name: 'Embalagem / Acessório', quantity: 1, unit: 'un', unitCost: 1.5, wastePercent: 0, subtotal: 1.5 },
      ],
      stockHistory: [
        {
          id: `stk-${Date.now()}`,
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          type: 'in',
          quantity: 30,
          reason: 'Cadastro inicial do produto',
          previousStock: 0,
          newStock: 30,
        },
      ],
      isCustom: true,
    };
    const created = onAddProduct(newProd);
    handleStartEditing(created || newProd);
  };

  // Overall catalog metrics
  const catalogStats = useMemo(() => {
    const totalItems = products.length;
    let totalStockValue = 0;
    let totalCostSum = 0;
    let totalSaleSum = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const norm = normalizeProduct(p);
      const stock = norm.currentStock ?? 0;
      const cost = norm.cost || 0;
      const min = norm.minStock ?? 15;
      totalStockValue += stock * cost;
      totalCostSum += cost;
      totalSaleSum += norm.currentPrice || cost;
      if (stock <= min) lowStockCount++;
    });

    const avgCMVPercent = totalSaleSum > 0 ? (totalCostSum / totalSaleSum) * 100 : 35;

    return {
      totalItems,
      totalStockValue,
      avgCMVPercent,
      lowStockCount,
    };
  }, [products]);

  // Filtered & sorted products list
  const filteredProducts = useMemo(() => {
    return products
      .map((p) => normalizeProduct(p))
      .filter((p) => {
        // Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku?.toLowerCase().includes(q);
          const matchCategory = p.category.toLowerCase().includes(q);
          const matchIngredient = p.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
          if (!matchName && !matchSku && !matchCategory && !matchIngredient) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }

        // Stock status filter
        const stock = p.currentStock ?? 0;
        const min = p.minStock ?? 15;
        if (stockFilter === 'low' && stock > min) return false;
        if (stockFilter === 'critical' && stock > min / 2) return false;
        if (stockFilter === 'ok' && stock <= min) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'price') return (b.currentPrice || 0) - (a.currentPrice || 0);
        if (sortBy === 'cost') return (b.cost || 0) - (a.cost || 0);
        if (sortBy === 'stock') return (a.currentStock ?? 0) - (b.currentStock ?? 0);
        if (sortBy === 'margin') {
          const marginA = (a.currentPrice - a.cost) / (a.currentPrice || 1);
          const marginB = (b.currentPrice - b.cost) / (b.currentPrice || 1);
          return marginB - marginA;
        }
        return 0;
      });
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Ingredient Editor Handlers
  const handleUpdateIngredient = (index: number, updated: Partial<ProductIngredient>) => {
    if (!draftProduct.ingredients) return;
    const newIngredients = [...draftProduct.ingredients];
    const item = { ...newIngredients[index], ...updated };
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    const waste = Number(item.wastePercent) || 0;
    item.subtotal = Number((qty * unitCost * (1 + waste / 100)).toFixed(2));
    newIngredients[index] = item;

    const newCalculatedCost = calculateIngredientsCMV(newIngredients);

    setDraftProduct({
      ...draftProduct,
      ingredients: newIngredients,
      cost: draftProduct.costMethod === 'manual' ? draftProduct.cost : newCalculatedCost,
    });
  };

  const handleAddIngredient = () => {
    const newIng: ProductIngredient = {
      id: `ing-${Date.now()}`,
      name: 'Novo Insumo / Ingrediente',
      quantity: 1,
      unit: 'un',
      unitCost: 1.0,
      wastePercent: 0,
      subtotal: 1.0,
    };
    const newIngredients = [...(draftProduct.ingredients || []), newIng];
    const newCost = calculateIngredientsCMV(newIngredients);
    setDraftProduct({
      ...draftProduct,
      ingredients: newIngredients,
      cost: draftProduct.costMethod === 'manual' ? draftProduct.cost : newCost,
    });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!draftProduct.ingredients) return;
    const newIngredients = draftProduct.ingredients.filter((_, i) => i !== index);
    const newCost = calculateIngredientsCMV(newIngredients);
    setDraftProduct({
      ...draftProduct,
      ingredients: newIngredients,
      cost: draftProduct.costMethod === 'manual' ? draftProduct.cost : newCost,
    });
  };

  // Stock Adjustment State & Handlers
  const [stockAdjustType, setStockAdjustType] = useState<'in' | 'out' | 'adjust'>('in');
  const [stockAdjustQty, setStockAdjustQty] = useState<string>('10');
  const [stockAdjustReason, setStockAdjustReason] = useState<string>('Recebimento de fornecedor');

  const handleApplyStockAdjustment = () => {
    const qty = parseFloat(stockAdjustQty);
    if (isNaN(qty) || qty <= 0) return;

    const current = draftProduct.currentStock ?? 0;
    let newStock = current;

    if (stockAdjustType === 'in') {
      newStock = current + qty;
    } else if (stockAdjustType === 'out') {
      newStock = Math.max(0, current - qty);
    } else {
      newStock = qty;
    }

    const movement: StockMovement = {
      id: `stk-${Date.now()}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: stockAdjustType,
      quantity: qty,
      reason: stockAdjustReason || 'Ajuste manual de estoque',
      previousStock: current,
      newStock,
    };

    const updated = {
      ...draftProduct,
      currentStock: newStock,
      stockHistory: [movement, ...(draftProduct.stockHistory || [])],
    };

    setDraftProduct(updated);
    onUpdateProduct(updated);
    if (selectedProduct.id === updated.id) {
      onSelectProduct(updated);
    }
  };

  // Save changes to draft product
  const handleSaveDraftProduct = () => {
    onUpdateProduct(draftProduct);
    if (selectedProduct.id === draftProduct.id) {
      onSelectProduct(draftProduct);
    }
    setStudioMode('list');
  };

  // Export Catalog to CSV
  const handleExportCatalogCSV = () => {
    const headers = [
      'SKU',
      'Nome do Produto',
      'Categoria',
      'Custo CMV (R$)',
      'Preço de Venda Base (R$)',
      'Margem Bruta (R$)',
      'Margem Bruta (%)',
      'Estoque Atual',
      'Estoque Mínimo',
      'Unidade',
      'Valor em Estoque (R$)',
      'Insumos Cadastrados',
    ];

    const rows = products.map((p) => {
      const norm = normalizeProduct(p);
      const grossProfit = norm.currentPrice - norm.cost;
      const grossPercent = ((grossProfit / (norm.currentPrice || 1)) * 100).toFixed(1);
      const stockVal = ((norm.currentStock ?? 0) * norm.cost).toFixed(2);
      const ingCount = norm.ingredients?.length || 0;

      return [
        `"${norm.sku || ''}"`,
        `"${norm.name.replace(/"/g, '""')}"`,
        `"${norm.category}"`,
        norm.cost.toFixed(2).replace('.', ','),
        norm.currentPrice.toFixed(2).replace('.', ','),
        grossProfit.toFixed(2).replace('.', ','),
        `${grossPercent}%`,
        norm.currentStock ?? 0,
        norm.minStock ?? 15,
        `"${norm.unit || 'un'}"`,
        stockVal.replace('.', ','),
        ingCount,
      ];
    });

    const csvContent =
      '\uFEFF' +
      `ESTÚDIO DE CATÁLOGO & ESTOQUE - OMNIPRICE\n` +
      `Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n` +
      `Itens: ${products.length}\n\n` +
      headers.join(';') +
      '\n' +
      rows.map((r) => r.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* SCREEN TOP HEADER & BREADCRUMB - NON-FLOATING INDEPENDENT SCREEN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={onBackToDashboard}
                className="hover:text-emerald-400 flex items-center gap-1 font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Painel Geral de Precificação
              </button>
              <span>/</span>
              <span className="text-emerald-400 font-semibold">
                {studioMode === 'list' ? 'Estúdio de Catálogo & Estoque' : `Editando: ${draftProduct.name}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Estúdio de Catálogo, Ficha Técnica & Estoque
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Edição completa de produtos, receitas com insumos, cálculo automático de CMV e gestão de inventário.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {studioMode === 'edit' ? (
              <>
                <button
                  onClick={() => setStudioMode('list')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao Catálogo
                </button>
                <button
                  onClick={handleSaveDraftProduct}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCreateNewProduct}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Novo Produto
                </button>
                <button
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    showCategoryManager
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Categorias ({categories.length})
                </button>
                <button
                  onClick={handleExportCatalogCSV}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Exportar CSV
                </button>
                <button
                  onClick={onBackToDashboard}
                  className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <span>Ir para Precificação</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4-COLUMN SUMMARY KPIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total no Cardápio</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {catalogStats.totalItems} <span className="text-xs font-normal text-slate-400">produtos</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Distribuídos em {categories.length} categorias</div>
          </div>

          <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Valor em Estoque</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">
              {formatBRL(catalogStats.totalStockValue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Custo imobilizado em insumos</div>
          </div>

          <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>CMV Médio da Operação</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
              {catalogStats.avgCMVPercent.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Custo Insumos / Preço de Venda</div>
          </div>

          <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Alerta de Estoque</span>
              <AlertTriangle className={`w-4 h-4 ${catalogStats.lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold font-mono ${
                catalogStats.lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {catalogStats.lowStockCount} <span className="text-xs font-normal text-slate-400">itens críticos</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {catalogStats.lowStockCount > 0 ? 'Necessitam reposição imediata' : 'Níveis operacionais normais'}
            </div>
          </div>
        </div>

        {/* INLINE CATEGORY MANAGER (IF OPENED) */}
        {showCategoryManager && studioMode === 'list' && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Gestão de Categorias do Restaurante</span>
              </div>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da nova categoria (ex: Massas, Bebidas Alcoólicas)"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    const cat = newCategoryName.trim();
                    if (!categories.includes(cat)) {
                      setSelectedCategory(cat);
                    }
                    setNewCategoryName('');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Criar Categoria
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((c) => {
                const count = products.filter((p) => p.category === c).length;
                return (
                  <div
                    key={c}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
                  >
                    <span>{c}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400 font-mono">
                      {count} {count === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: PRODUCT LIST & STOCK MANAGEMENT TABLE (SCREEN MODE === 'list') */}
      {studioMode === 'list' && (
        <div className="space-y-4">
          {/* FILTER & SEARCH TOOLBAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar nome, SKU ou insumo..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Stock filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                aria-label="Filtrar por nível de estoque"
                className="px-2.5 py-1.5 text-xs bg-slate-950/90 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Estoque: Todos</option>
                <option value="low">Abaixo do Mínimo</option>
                <option value="critical">Crítico (&lt; 50% min)</option>
                <option value="ok">Estoque Normal</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Ordenar produtos por"
                className="px-2.5 py-1.5 text-xs bg-slate-950/90 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="name">Ordenar: Nome A-Z</option>
                <option value="price">Maior Preço</option>
                <option value="cost">Maior CMV</option>
                <option value="stock">Menor Estoque</option>
                <option value="margin">Maior Margem Bruta</option>
              </select>
            </div>
          </div>

          {/* PRODUCTS TABLE SCREEN */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Item & Categoria</th>
                    <th className="py-3.5 px-3">Custo CMV</th>
                    <th className="py-3.5 px-3">Preço Base</th>
                    <th className="py-3.5 px-3">Margem Bruta</th>
                    <th className="py-3.5 px-3">Nível de Estoque</th>
                    <th className="py-3.5 px-3">Valor em Estoque</th>
                    <th className="py-3.5 px-3">Status Motor</th>
                    <th className="py-3.5 px-4 text-right">Ações do Estúdio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredProducts.map((p) => {
                    const isSelectedInApp = p.id === selectedProduct.id;
                    const stock = p.currentStock ?? 0;
                    const min = p.minStock ?? 15;
                    const isLowStock = stock <= min;
                    const isCriticalStock = stock <= min / 2;
                    const grossProfit = p.currentPrice - p.cost;
                    const grossPercent = (grossProfit / (p.currentPrice || 1)) * 100;
                    const stockValue = stock * p.cost;
                    const ingredientCount = p.ingredients?.length || 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelectedInApp ? 'bg-emerald-950/20' : ''
                        }`}
                      >
                        {/* Name & Category */}
                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelectedInApp
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs sm:text-sm truncate">
                                  {p.name}
                                </span>
                                {p.isCustom && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="text-slate-300">{p.category}</span>
                                <span>·</span>
                                <span className="text-slate-400 font-mono text-[10px]">{p.sku || 'SEM SKU'}</span>
                                <span>·</span>
                                <span className="text-emerald-400 font-sans">
                                  {ingredientCount} {ingredientCount === 1 ? 'insumo' : 'insumos'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cost / CMV */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-200">{formatBRL(p.cost)}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {p.costMethod === 'manual' ? 'CMV Fixo' : 'Ficha Técnica'}
                          </div>
                        </td>

                        {/* Sale Price */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-emerald-400">{formatBRL(p.currentPrice)}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{p.unit || 'un'}</div>
                        </td>

                        {/* Gross Margin */}
                        <td className="py-3.5 px-3">
                          <div className={`font-bold ${grossProfit > 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                            {formatBRL(grossProfit)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {grossPercent.toFixed(1)}% margem
                          </div>
                        </td>

                        {/* Stock Level with Progress Bar */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                isCriticalStock
                                  ? 'text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            >
                              {stock} {p.unit || 'un'}
                            </span>
                            {isLowStock && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Baixo
                              </span>
                            )}
                          </div>
                          <div className="w-28 bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCriticalStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (stock / (p.maxStock || 100)) * 100)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">Mínimo: {min}</div>
                        </td>

                        {/* Stock Value */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-300">{formatBRL(stockValue)}</div>
                          <div className="text-[10px] text-slate-400 font-sans">em mercadoria</div>
                        </td>

                        {/* Selected in App */}
                        <td className="py-3.5 px-3 font-sans">
                          {isSelectedInApp ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              Ativo no Painel
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectProduct(p);
                              }}
                              className="text-[11px] text-slate-400 hover:text-emerald-400 underline font-medium"
                            >
                              Ativar no Painel
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEditing(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                              title="Abrir Estúdio Completo de Edição & Ficha Técnica"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar / Ficha</span>
                            </button>

                            {p.isCustom && (
                              <button
                                onClick={() => onDeleteProduct(p.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                title="Excluir produto customizado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-white">Nenhum produto encontrado</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Tente alterar os termos de busca ou o filtro de categoria selecionado.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED INDEPENDENT PRODUCT & RECIPE STUDIO (SCREEN MODE === 'edit') */}
      {studioMode === 'edit' && (
        <div className="space-y-6">
          {/* PRODUCT PROFILE & GENERAL FIELDS - INDEPENDENT SCREEN SECTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Identificação & Dados Comerciais
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">{draftProduct.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectProduct(draftProduct);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    selectedProduct.id === draftProduct.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedProduct.id === draftProduct.id
                    ? 'Produto Selecionado no Painel'
                    : 'Definir como Ativo na Precificação'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Nome do Produto</label>
                <input
                  type="text"
                  value={draftProduct.name}
                  onChange={(e) => setDraftProduct({ ...draftProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Código / SKU</label>
                <input
                  type="text"
                  value={draftProduct.sku || ''}
                  onChange={(e) => setDraftProduct({ ...draftProduct, sku: e.target.value })}
                  placeholder="Ex: HMB-001"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Categoria</label>
                <select
                  value={draftProduct.category}
                  onChange={(e) => setDraftProduct({ ...draftProduct, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Unidade de Medida</label>
                <select
                  value={draftProduct.unit || 'un'}
                  onChange={(e) => setDraftProduct({ ...draftProduct, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="un">Unidade (un)</option>
                  <option value="porção">Porção</option>
                  <option value="lata">Lata 350ml</option>
                  <option value="garrafa">Garrafa</option>
                  <option value="kg">Quilo (kg)</option>
                  <option value="combo">Combo</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Preço de Venda Base (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">R$</span>
                  <input
                    type="number"
                    step="0.05"
                    value={draftProduct.currentPrice}
                    onChange={(e) =>
                      setDraftProduct({ ...draftProduct, currentPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Margem Líquida Alvo (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={(draftProduct.targetNetMargin * 100).toFixed(0)}
                  onChange={(e) =>
                    setDraftProduct({
                      ...draftProduct,
                      targetNetMargin: (parseFloat(e.target.value) || 0) / 100,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Previsão Vendas Mensais (un)</label>
                <input
                  type="number"
                  value={draftProduct.estimatedMonthlyUnits}
                  onChange={(e) =>
                    setDraftProduct({
                      ...draftProduct,
                      estimatedMonthlyUnits: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Método de CMV</label>
                <select
                  value={draftProduct.costMethod || 'recipe'}
                  onChange={(e) => {
                    const method = e.target.value as 'manual' | 'recipe';
                    const newCost =
                      method === 'recipe' && draftProduct.ingredients
                        ? calculateIngredientsCMV(draftProduct.ingredients)
                        : draftProduct.cost;
                    setDraftProduct({ ...draftProduct, costMethod: method, cost: newCost });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="recipe">Ficha Técnica Automatizada</option>
                  <option value="manual">Custo CMV Digitado Manualmente</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  Descrição Comercial & Composição do Prato
                </label>
                <input
                  type="text"
                  value={draftProduct.description || ''}
                  onChange={(e) => setDraftProduct({ ...draftProduct, description: e.target.value })}
                  placeholder="Ex: Pão brioche selado na manteiga com 2 blends bovinos de 80g e queijo cheddar fatiado..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* FICHA TÉCNICA (TECHNICAL RECIPE SHEET) WITH INGREDIENTS - DEDICATED SECTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Ficha Técnica de Insumos & Cálculo de CMV
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {draftProduct.ingredients?.length || 0} insumos cadastrados
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adicione e precifique cada ingrediente ou embalagem que compõe o produto para apurar o CMV exato.
                </p>
              </div>

              {/* Live CMV Counter Badge */}
              <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">CMV Total Apurado:</span>
                <span className="font-mono text-base font-bold text-white">{formatBRL(draftProduct.cost)}</span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-emerald-400 font-mono">
                  {((draftProduct.cost / (draftProduct.currentPrice || 1)) * 100).toFixed(1)}% da venda
                </span>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th className="py-2.5 px-3">Insumo / Ingrediente / Embalagem</th>
                    <th className="py-2.5 px-3 w-28">Quantidade</th>
                    <th className="py-2.5 px-3 w-24">Unidade</th>
                    <th className="py-2.5 px-3 w-32">Custo Unitário (R$)</th>
                    <th className="py-2.5 px-3 w-24">Quebra / Perda (%)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Subtotal Insumo</th>
                    <th className="py-2.5 px-3 w-16 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {draftProduct.ingredients?.map((ing, idx) => (
                    <tr key={ing.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => handleUpdateIngredient(idx, { name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={ing.quantity}
                          onChange={(e) =>
                            handleUpdateIngredient(idx, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={ing.unit}
                          onChange={(e) => handleUpdateIngredient(idx, { unit: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="un">un</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="porção">porção</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.001"
                          value={ing.unitCost}
                          onChange={(e) =>
                            handleUpdateIngredient(idx, { unitCost: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="1"
                          value={ing.wastePercent || 0}
                          onChange={(e) =>
                            handleUpdateIngredient(idx, { wastePercent: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0%"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                        {formatBRL(ing.subtotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remover insumo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar Insumo à Ficha Técnica
              </button>

              <div className="text-right text-xs text-slate-400">
                Soma da Ficha Técnica:{' '}
                <strong className="text-white font-mono text-sm">{formatBRL(draftProduct.cost)}</strong>
              </div>
            </div>
          </div>

          {/* STOCK MANAGEMENT & MOVEMENTS - INDEPENDENT SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stock Levels & Immediate Adjustment Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Controle & Gestão de Estoque
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Níveis de Estoque do Produto</h3>
              </div>

              {/* Stock KPI Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Atual</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {draftProduct.currentStock ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{draftProduct.unit || 'un'}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Mínimo</span>
                  <span className="font-mono font-bold text-amber-400 text-base">
                    {draftProduct.minStock ?? 15}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{draftProduct.unit || 'un'}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Máximo</span>
                  <span className="font-mono font-bold text-slate-300 text-base">
                    {draftProduct.maxStock ?? 100}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{draftProduct.unit || 'un'}</span>
                </div>
              </div>

              {/* Stock Threshold Editors */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={draftProduct.minStock ?? 15}
                    onChange={(e) =>
                      setDraftProduct({ ...draftProduct, minStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Estoque Máximo</label>
                  <input
                    type="number"
                    value={draftProduct.maxStock ?? 100}
                    onChange={(e) =>
                      setDraftProduct({ ...draftProduct, maxStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {/* Quick Adjustment Form */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <span className="text-xs font-bold text-white block">Registrar Movimentação de Estoque</span>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setStockAdjustType('in')}
                    className={`py-1 rounded-lg font-semibold transition-all ${
                      stockAdjustType === 'in' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    + Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustType('out')}
                    className={`py-1 rounded-lg font-semibold transition-all ${
                      stockAdjustType === 'out' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    - Saída / Perda
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustType('adjust')}
                    className={`py-1 rounded-lg font-semibold transition-all ${
                      stockAdjustType === 'adjust' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    = Inventário
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Quantidade</label>
                    <input
                      type="number"
                      value={stockAdjustQty}
                      onChange={(e) => setStockAdjustQty(e.target.value)}
                      placeholder="10"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Motivo / Origem</label>
                    <input
                      type="text"
                      value={stockAdjustReason}
                      onChange={(e) => setStockAdjustReason(e.target.value)}
                      placeholder="Ex: Compra NF 1234"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyStockAdjustment}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all"
                >
                  Confirmar Movimentação de Estoque
                </button>
              </div>
            </div>

            {/* Stock Movement History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Histórico de Movimentações & Rastreabilidade</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {draftProduct.stockHistory?.length || 0} lançamentos
                </span>
              </div>

              <div className="overflow-y-auto max-h-72 space-y-2 pr-1">
                {draftProduct.stockHistory && draftProduct.stockHistory.length > 0 ? (
                  draftProduct.stockHistory.map((mov) => {
                    const isPlus = mov.type === 'in';
                    const isMinus = mov.type === 'out';
                    return (
                      <div
                        key={mov.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isPlus
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isMinus
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {isPlus ? '+' : isMinus ? '-' : '='}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{mov.reason}</div>
                            <div className="text-[10px] text-slate-400">{mov.date}</div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div
                            className={`font-bold ${
                              isPlus ? 'text-emerald-400' : isMinus ? 'text-rose-400' : 'text-indigo-400'
                            }`}
                          >
                            {isPlus ? `+${mov.quantity}` : isMinus ? `-${mov.quantity}` : `=${mov.quantity}`}{' '}
                            {draftProduct.unit || 'un'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Saldo: {mov.previousStock} → {mov.newStock}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Nenhuma movimentação registrada para este item.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM ACTIONS BAR - NON-FLOATING DEDICATED BUTTONS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Produto: <strong className="text-white">{draftProduct.name}</strong> · Custo CMV:{' '}
              <strong className="text-emerald-400 font-mono">{formatBRL(draftProduct.cost)}</strong> · Preço Base:{' '}
              <strong className="text-white font-mono">{formatBRL(draftProduct.currentPrice)}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudioMode('list')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDraftProduct}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Salvar Produto & Atualizar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
