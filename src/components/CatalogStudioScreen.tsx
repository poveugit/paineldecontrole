import React, { useState, useMemo, useRef } from 'react';
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
  UploadCloud,
  Calculator,
  Minus,
} from 'lucide-react';
import {
  ProductItem,
  ProductIngredient,
  StockMovement,
  ChannelFee,
  KiloFractionOption,
} from '../types/pricing';
import {
  formatBRL,
  calculateIngredientsCMV,
  normalizeProduct,
  normalizeSearchText,
} from '../utils/pricingEngine';
import { UnitSelectorModal } from './UnitSelectorModal';
import { SpreadsheetImportModal } from './SpreadsheetImportModal';
import { ChannelSellingPricesModal } from './ChannelSellingPricesModal';
import { CurrencyCentsInput } from './CurrencyCentsInput';

interface CatalogStudioScreenProps {
  products: ProductItem[];
  selectedProduct: ProductItem;
  channels: ChannelFee[];
  customCategories?: string[];
  onSaveCustomCategories?: (categories: string[]) => void;
  onSelectProduct: (product: ProductItem) => void;
  onUpdateProduct: (product: ProductItem) => void;
  onAddProduct: (product: Omit<ProductItem, 'id'>) => ProductItem;
  onDeleteProduct: (id: string) => void;
  onBackToDashboard: () => void;
  onBatchImportProducts?: (products: ProductItem[], mode: 'merge' | 'replace') => void;
}

export const CatalogStudioScreen: React.FC<CatalogStudioScreenProps> = ({
  products,
  selectedProduct,
  channels,
  customCategories: customCategoriesProp,
  onSaveCustomCategories,
  onSelectProduct,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onBackToDashboard,
  onBatchImportProducts,
}) => {
  // Navigation within Studio: 'list' (Table/Grid) or 'edit' (Dedicated Product & Technical Sheet Studio)
  const [studioMode, setStudioMode] = useState<'list' | 'edit'>('list');
  const [editingProductId, setEditingProductId] = useState<string>(selectedProduct.id);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'critical' | 'ok'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'cost' | 'stock' | 'margin'>('name');

  // Category Management Inline Panel & Persisted Custom Categories
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [localCustomCategories, setLocalCustomCategories] = useState<string[]>([]);
  const customCategories = customCategoriesProp ?? localCustomCategories;

  // Inline "+ Nova Categoria" state inside Product Edit / Creation form
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');

  const persistCustomCategories = (next: string[]) => {
    if (onSaveCustomCategories) {
      onSaveCustomCategories(next);
    } else {
      setLocalCustomCategories(next);
    }
  };

  // Extract unique categories combining existing products + persisted custom categories
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat && !map.has(cat.toLowerCase())) {
        map.set(cat.toLowerCase(), cat);
      }
    });
    customCategories.forEach((c) => {
      const cat = c?.trim();
      if (cat && !map.has(cat.toLowerCase())) {
        map.set(cat.toLowerCase(), cat);
      }
    });
    return Array.from(map.values());
  }, [products, customCategories]);

  const handleCreateCategory = (rawName: string): string | null => {
    const trimmed = rawName.trim();
    if (!trimmed) return null;
    const existing = categories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    persistCustomCategories([...customCategories, trimmed]);
    return trimmed;
  };

  const handleRemoveEmptyCustomCategory = (catName: string) => {
    const hasProducts = products.some((p) => p.category === catName);
    if (hasProducts) return;
    persistCustomCategories(customCategories.filter((c) => c !== catName));
    if (selectedCategory === catName) {
      setSelectedCategory('all');
    }
  };

  // Editing Product Draft State
  const currentEditingProduct = useMemo(() => {
    const found = products.find((p) => p.id === editingProductId);
    return found ? normalizeProduct(found) : normalizeProduct(selectedProduct);
  }, [products, editingProductId, selectedProduct]);

  const [draftProduct, setDraftProduct] = useState<ProductItem>(currentEditingProduct);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isSellingPricesModalOpen, setIsSellingPricesModalOpen] = useState(false);
  const [referenceChannelId, setReferenceChannelId] = useState<string>(
    currentEditingProduct.referenceChannelId || channels[0]?.id || 'direct-zero'
  );
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [nameError, setNameError] = useState<string>('');
  const [unsavedNewProductId, setUnsavedNewProductId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const computeChannelSellingPrice = (
    costVal: number,
    marginDecimal: number,
    feeRatePercent: number,
    fixedNetProfitBRL?: number
  ): { feasible: boolean; sellingPrice: number; feeAmount: number; netProfit: number } => {
    const safeCost = Math.max(0, Number(costVal) || 0);
    const feeRate = (Number(feeRatePercent) || 0) / 100;
    const safeProfitBRL =
      typeof fixedNetProfitBRL === 'number' && fixedNetProfitBRL > 0 ? fixedNetProfitBRL : 0;

    if (safeProfitBRL > 0) {
      const denominator = 1 - feeRate;
      if (denominator <= 0.02 || (safeCost <= 0 && safeProfitBRL <= 0)) {
        return { feasible: denominator > 0.02, sellingPrice: 0, feeAmount: 0, netProfit: 0 };
      }
      const sellingPrice = Number(((safeCost + safeProfitBRL) / denominator).toFixed(2));
      const feeAmount = Number((sellingPrice * feeRate).toFixed(2));
      const netProfit = Number((sellingPrice - safeCost - feeAmount).toFixed(2));
      return { feasible: true, sellingPrice, feeAmount, netProfit };
    }

    const safeMargin = Math.max(0, Math.min(0.9, Number(marginDecimal) || 0));
    const denominator = 1 - safeMargin - feeRate;
    if (denominator <= 0.02 || safeCost <= 0) {
      return { feasible: denominator > 0.02, sellingPrice: 0, feeAmount: 0, netProfit: 0 };
    }
    const sellingPrice = Number((safeCost / denominator).toFixed(2));
    const feeAmount = Number((sellingPrice * feeRate).toFixed(2));
    const netProfit = Number((sellingPrice - safeCost - feeAmount).toFixed(2));
    return { feasible: true, sellingPrice, feeAmount, netProfit };
  };

  const getReferenceFeeRate = (channelId: string): number => {
    if (channelId === 'direct-zero') return 0;
    const found = channels.find((c) => c.id === channelId);
    return found ? found.totalRate : 0;
  };

  const channelSellingPreviews = useMemo(() => {
    return channels.map((channel) => {
      const calc = computeChannelSellingPrice(
        draftProduct.cost,
        draftProduct.targetNetMargin,
        channel.totalRate,
        draftProduct.targetNetProfitBRL
      );
      return {
        channel,
        ...calc,
      };
    });
  }, [channels, draftProduct.cost, draftProduct.targetNetMargin, draftProduct.targetNetProfitBRL]);

  const handleChangeTargetNetMarginPercent = (rawPercent: number) => {
    const clampedPercent = Math.max(0, Math.min(85, Number.isNaN(rawPercent) ? 0 : rawPercent));
    const newMargin = clampedPercent / 100;
    const refFee = getReferenceFeeRate(referenceChannelId);
    const calc = computeChannelSellingPrice(draftProduct.cost, newMargin, refFee, undefined);
    const nextPrice =
      draftProduct.cost > 0 && calc.feasible ? calc.sellingPrice : draftProduct.currentPrice;
    const updatedFractions = (draftProduct.kiloFractions || []).map((f) => {
      if (
        draftProduct.primaryFractionGrams &&
        Math.abs(f.grams - draftProduct.primaryFractionGrams) < 0.01 &&
        draftProduct.cost > 0 &&
        calc.feasible
      ) {
        return { ...f, sellingPrice: calc.sellingPrice };
      }
      return f;
    });
    setDraftProduct((prev) => ({
      ...prev,
      targetNetMargin: newMargin,
      targetNetProfitBRL: undefined,
      currentPrice: nextPrice,
      kiloFractions: updatedFractions,
    }));
  };

  const handleChangeTargetNetProfitBRL = (rawProfit: number | undefined) => {
    const cleanProfit =
      typeof rawProfit === 'number' && !Number.isNaN(rawProfit) && rawProfit > 0
        ? Number(rawProfit.toFixed(2))
        : undefined;
    const refFee = getReferenceFeeRate(referenceChannelId);
    const calc = computeChannelSellingPrice(
      draftProduct.cost,
      draftProduct.targetNetMargin,
      refFee,
      cleanProfit
    );
    const shouldUpdatePrice =
      calc.feasible && (draftProduct.cost > 0 || (cleanProfit !== undefined && cleanProfit > 0));
    const nextPrice = shouldUpdatePrice ? calc.sellingPrice : draftProduct.currentPrice;
    const updatedFractions = (draftProduct.kiloFractions || []).map((f) => {
      if (
        draftProduct.primaryFractionGrams &&
        Math.abs(f.grams - draftProduct.primaryFractionGrams) < 0.01 &&
        shouldUpdatePrice
      ) {
        return { ...f, sellingPrice: calc.sellingPrice };
      }
      return f;
    });

    setDraftProduct((prev) => ({
      ...prev,
      targetNetProfitBRL: cleanProfit,
      currentPrice: nextPrice,
      kiloFractions: updatedFractions,
    }));

    if (isKiloUnit(draftProduct.unit) && !fractionPriceTouched) {
      const typedGrams = parseFloat(fractionGramsInput.replace(',', '.'));
      if (!Number.isNaN(typedGrams) && typedGrams > 0) {
        const fracCost = Number(((getEffectiveKgCost(draftProduct) * typedGrams) / 1000).toFixed(2));
        const fracCalc = computeChannelSellingPrice(
          fracCost,
          draftProduct.targetNetMargin,
          refFee,
          cleanProfit
        );
        if (fracCalc.feasible && fracCalc.sellingPrice > 0) {
          setFractionPriceInput(fracCalc.sellingPrice.toFixed(2).replace('.', ','));
        }
      }
    }
  };

  // Fractional Kilo Pricing State & Helpers
  const isKiloUnit = (unit?: string): boolean => {
    const u = (unit || '').trim().toLowerCase();
    return (
      u === 'kg' ||
      u === 'kilo' ||
      u === 'quilo' ||
      u === 'quilograma' ||
      u.includes('kilo') ||
      u.includes('quilo') ||
      u.includes('kg')
    );
  };

  const formatGramsLabel = (grams: number): string => {
    if (grams >= 1000) {
      const kgVal = grams / 1000;
      return `${kgVal.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`;
    }
    return `${grams}g`;
  };

  const getEffectiveKgCost = (prod: ProductItem): number => {
    if (isKiloUnit(prod.unit) && typeof prod.kgBaseCost === 'number') {
      return prod.kgBaseCost;
    }
    return prod.cost || 0;
  };

  const getReferenceKgSellingPrice = (prod: ProductItem): number => {
    const kgCost = getEffectiveKgCost(prod);
    if (!prod.primaryFractionGrams && prod.currentPrice > 0) return prod.currentPrice;
    if (kgCost > 0 || (prod.targetNetProfitBRL && prod.targetNetProfitBRL > 0)) {
      const refFee = getReferenceFeeRate(referenceChannelId);
      const calc = computeChannelSellingPrice(
        kgCost,
        prod.targetNetMargin,
        refFee,
        prod.targetNetProfitBRL
      );
      if (calc.feasible) return calc.sellingPrice;
    }
    if (prod.primaryFractionGrams && prod.primaryFractionGrams > 0 && prod.currentPrice > 0) {
      return Number(((prod.currentPrice * 1000) / prod.primaryFractionGrams).toFixed(2));
    }
    return 0;
  };

  const getSuggestedFractionPrice = (
    grams: number,
    prod: ProductItem = draftProduct,
    feeRateOverride?: number
  ): number => {
    if (grams <= 0) return 0;
    const kgCost = getEffectiveKgCost(prod);
    const hasProfitBRL = typeof prod.targetNetProfitBRL === 'number' && prod.targetNetProfitBRL > 0;
    if (kgCost > 0 || hasProfitBRL) {
      const fracCost = Number(((kgCost * grams) / 1000).toFixed(2));
      const feeRate = feeRateOverride ?? getReferenceFeeRate(referenceChannelId);
      const calc = computeChannelSellingPrice(
        fracCost,
        prod.targetNetMargin,
        feeRate,
        prod.targetNetProfitBRL
      );
      if (calc.feasible) return calc.sellingPrice;
    }
    const baseKgPrice = getReferenceKgSellingPrice(prod);
    if (baseKgPrice <= 0) return 0;
    return Number(((baseKgPrice * grams) / 1000).toFixed(2));
  };

  const [fractionGramsInput, setFractionGramsInput] = useState<string>('250');
  const [fractionPriceInput, setFractionPriceInput] = useState<string>('');
  const [fractionPriceTouched, setFractionPriceTouched] = useState<boolean>(false);
  const [useFractionAsPrimary, setUseFractionAsPrimary] = useState<boolean>(true);
  const [fractionError, setFractionError] = useState<string>('');
  const [fractionSavedFeedback, setFractionSavedFeedback] = useState<string>('');

  const parsedFractionGrams = parseFloat(fractionGramsInput.replace(',', '.')) || 0;
  const parsedFractionPrice = parseFloat(fractionPriceInput.replace(',', '.')) || 0;

  const fractionChannelPreviews = useMemo(() => {
    if (parsedFractionGrams <= 0) return [];
    const kgCost = getEffectiveKgCost(draftProduct);
    const fracCost = Number(((kgCost * parsedFractionGrams) / 1000).toFixed(2));
    return channels.map((channel) => {
      const calc = computeChannelSellingPrice(
        fracCost,
        draftProduct.targetNetMargin,
        channel.totalRate,
        draftProduct.targetNetProfitBRL
      );
      return {
        channel,
        fracCost,
        ...calc,
      };
    });
  }, [
    channels,
    parsedFractionGrams,
    draftProduct.cost,
    draftProduct.kgBaseCost,
    draftProduct.unit,
    draftProduct.targetNetMargin,
    draftProduct.targetNetProfitBRL,
  ]);

  const applyPrimaryFractionState = (
    prod: ProductItem,
    grams: number,
    sellingPrice: number,
    fractionsList?: KiloFractionOption[]
  ): ProductItem => {
    const kgCost = getEffectiveKgCost(prod);
    const fracCost = Number(((kgCost * grams) / 1000).toFixed(2));
    return {
      ...prod,
      kgBaseCost: kgCost,
      primaryFractionGrams: grams,
      cost: fracCost,
      currentPrice: Number(sellingPrice.toFixed(2)),
      referenceChannelId,
      kiloFractions: fractionsList ?? prod.kiloFractions,
    };
  };

  const persistFractionDraftIfNamed = (updatedProd: ProductItem) => {
    if (updatedProd.name.trim()) {
      onUpdateProduct(updatedProd);
      if (selectedProduct.id === updatedProd.id) {
        onSelectProduct(updatedProd);
      }
    }
  };

  const handleSetPrimaryFraction = (frac: KiloFractionOption) => {
    setUseFractionAsPrimary(true);
    setFractionGramsInput(String(frac.grams));
    setFractionPriceInput(frac.sellingPrice > 0 ? frac.sellingPrice.toFixed(2).replace('.', ',') : '');
    setFractionPriceTouched(true);
    setFractionError('');
    const nextProd = applyPrimaryFractionState(draftProduct, frac.grams, frac.sellingPrice);
    setDraftProduct(nextProd);
    persistFractionDraftIfNamed(nextProd);
    setFractionSavedFeedback(
      `Preço salvo: ${formatGramsLabel(frac.grams)} por ${formatBRL(frac.sellingPrice)} (Custo prop. ${formatBRL(nextProd.cost)}).`
    );
  };

  const handleClearPrimaryFraction = () => {
    setUseFractionAsPrimary(false);
    setFractionSavedFeedback('');
    setFractionPriceInput('');
    setFractionPriceTouched(false);
    setDraftProduct((prev) => {
      const kgCost = getEffectiveKgCost(prev);
      const refFee = getReferenceFeeRate(referenceChannelId);
      const calc = computeChannelSellingPrice(
        kgCost,
        prev.targetNetMargin,
        refFee,
        prev.targetNetProfitBRL
      );
      return {
        ...prev,
        kgBaseCost: kgCost,
        primaryFractionGrams: undefined,
        cost: kgCost,
        currentPrice:
          (kgCost > 0 || (prev.targetNetProfitBRL && prev.targetNetProfitBRL > 0)) && calc.feasible
            ? calc.sellingPrice
            : prev.primaryFractionGrams && prev.currentPrice > 0
            ? Number(((prev.currentPrice * 1000) / prev.primaryFractionGrams).toFixed(2))
            : prev.currentPrice,
      };
    });
  };

  const handleSelectPresetFraction = (grams: number) => {
    setFractionGramsInput(String(grams));
    setFractionPriceTouched(false);
    setFractionError('');
    setFractionSavedFeedback('');
    const suggested = getSuggestedFractionPrice(grams);
    if (suggested > 0) {
      setFractionPriceInput(suggested.toFixed(2).replace('.', ','));
    } else {
      setFractionPriceInput('');
    }
  };

  const handleSaveFractionPrice = (forcePrimary = true) => {
    const grams = parseFloat(fractionGramsInput.replace(',', '.'));
    const rawPrice = parseFloat(fractionPriceInput.replace(',', '.'));
    const suggestedFallback = !Number.isNaN(grams) && grams > 0 ? getSuggestedFractionPrice(grams) : 0;
    const price = !Number.isNaN(rawPrice) && rawPrice > 0 ? rawPrice : suggestedFallback;

    if (Number.isNaN(grams) || grams <= 0) {
      setFractionError('Informe uma quantidade fracionada em gramas maior que zero (ex: 70, 150, 250).');
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      setFractionError('Informe o valor a ser vendido (R$) para essa quantidade fracionada.');
      return;
    }

    setFractionError('');
    const roundedPrice = Number(price.toFixed(2));
    const currentFractions = draftProduct.kiloFractions || [];
    const existingIdx = currentFractions.findIndex((f) => Math.abs(f.grams - grams) < 0.01);
    const label = formatGramsLabel(grams);

    let nextFractions: KiloFractionOption[];
    if (existingIdx >= 0) {
      nextFractions = currentFractions.map((f, idx) =>
        idx === existingIdx ? { ...f, label, grams, sellingPrice: roundedPrice } : f
      );
    } else {
      nextFractions = [
        ...currentFractions,
        {
          id: `frac-${Date.now()}-${Math.round(grams)}`,
          label,
          grams,
          sellingPrice: roundedPrice,
        },
      ];
    }

    nextFractions.sort((a, b) => a.grams - b.grams);
    const shouldMakePrimary = forcePrimary || useFractionAsPrimary || !draftProduct.primaryFractionGrams;
    const nextProd = shouldMakePrimary
      ? applyPrimaryFractionState(draftProduct, grams, roundedPrice, nextFractions)
      : {
          ...draftProduct,
          kgBaseCost: getEffectiveKgCost(draftProduct),
          kiloFractions: nextFractions,
        };

    if (forcePrimary) {
      setUseFractionAsPrimary(true);
    }
    setDraftProduct(nextProd);
    persistFractionDraftIfNamed(nextProd);
    setFractionPriceInput(roundedPrice.toFixed(2).replace('.', ','));
    setFractionPriceTouched(true);
    setFractionSavedFeedback(
      shouldMakePrimary
        ? `Preço salvo: ${label} por ${formatBRL(roundedPrice)} definido como preço principal do produto.`
        : `Fração ${label} (${formatBRL(roundedPrice)}) adicionada à tabela.`
    );
  };

  const handleUpdateKiloFraction = (
    fractionId: string,
    updates: Partial<Pick<KiloFractionOption, 'grams' | 'sellingPrice'>>
  ) => {
    setFractionSavedFeedback('');
    const targetFrac = (draftProduct.kiloFractions || []).find((f) => f.id === fractionId);
    if (
      targetFrac &&
      updates.sellingPrice !== undefined &&
      Math.abs((updates.grams ?? targetFrac.grams) - parsedFractionGrams) < 0.01
    ) {
      setFractionPriceInput(
        updates.sellingPrice > 0 ? updates.sellingPrice.toFixed(2).replace('.', ',') : ''
      );
      setFractionPriceTouched(true);
    }
    setDraftProduct((prev) => {
      const targetBefore = (prev.kiloFractions || []).find((f) => f.id === fractionId);
      const isEditingPrimary =
        targetBefore !== undefined &&
        prev.primaryFractionGrams !== undefined &&
        Math.abs(targetBefore.grams - prev.primaryFractionGrams) < 0.01;

      const nextFractions = (prev.kiloFractions || []).map((f) => {
        if (f.id !== fractionId) return f;
        const nextGrams = updates.grams !== undefined ? Math.max(0, updates.grams) : f.grams;
        const nextPrice =
          updates.sellingPrice !== undefined ? Math.max(0, updates.sellingPrice) : f.sellingPrice;
        return {
          ...f,
          grams: nextGrams,
          label: formatGramsLabel(nextGrams || f.grams),
          sellingPrice: nextPrice,
        };
      });

      if (isEditingPrimary) {
        const updatedTarget = nextFractions.find((f) => f.id === fractionId);
        if (updatedTarget && updatedTarget.grams > 0) {
          return applyPrimaryFractionState(
            prev,
            updatedTarget.grams,
            updatedTarget.sellingPrice,
            nextFractions
          );
        }
      }
      return { ...prev, kiloFractions: nextFractions };
    });
  };

  const handleRemoveKiloFraction = (fractionId: string) => {
    setFractionSavedFeedback('');
    setDraftProduct((prev) => {
      const removed = (prev.kiloFractions || []).find((f) => f.id === fractionId);
      const nextFractions = (prev.kiloFractions || []).filter((f) => f.id !== fractionId);
      const removedWasPrimary =
        removed !== undefined &&
        prev.primaryFractionGrams !== undefined &&
        Math.abs(removed.grams - prev.primaryFractionGrams) < 0.01;

      if (removedWasPrimary) {
        if (nextFractions.length > 0 && useFractionAsPrimary) {
          return applyPrimaryFractionState(
            prev,
            nextFractions[0].grams,
            nextFractions[0].sellingPrice,
            nextFractions
          );
        }
        const kgCost = getEffectiveKgCost(prev);
        const refFee = getReferenceFeeRate(referenceChannelId);
        const calc = computeChannelSellingPrice(
          kgCost,
          prev.targetNetMargin,
          refFee,
          prev.targetNetProfitBRL
        );
        return {
          ...prev,
          kiloFractions: nextFractions,
          primaryFractionGrams: undefined,
          cost: kgCost,
          currentPrice:
            (kgCost > 0 || (prev.targetNetProfitBRL && prev.targetNetProfitBRL > 0)) && calc.feasible
              ? calc.sellingPrice
              : prev.currentPrice,
        };
      }

      return { ...prev, kiloFractions: nextFractions };
    });
  };

  const handleGenerateDefaultFractions = () => {
    const presets = [100, 250, 500];
    const currentFractions = [...(draftProduct.kiloFractions || [])];

    presets.forEach((grams) => {
      const suggested = getSuggestedFractionPrice(grams);
      const alreadyExists = currentFractions.some((f) => Math.abs(f.grams - grams) < 0.01);
      if (!alreadyExists) {
        currentFractions.push({
          id: `frac-${Date.now()}-${grams}`,
          label: formatGramsLabel(grams),
          grams,
          sellingPrice: suggested > 0 ? suggested : 0,
        });
      }
    });

    currentFractions.sort((a, b) => a.grams - b.grams);
    setDraftProduct((prev) => ({
      ...prev,
      kgBaseCost: getEffectiveKgCost(prev),
      kiloFractions: currentFractions,
    }));
  };

  // Sync draft when editingProductId changes
  const handleStartEditing = (prod: ProductItem, isNewDraft = false) => {
    const normalized = normalizeProduct(prod);
    setEditingProductId(prod.id);
    setDraftProduct(normalized);
    setReferenceChannelId(
      normalized.referenceChannelId || channels[0]?.id || 'direct-zero'
    );
    setNameError('');
    setUnsavedNewProductId(isNewDraft ? prod.id : null);
    setIsAddingCategoryInline(false);
    setInlineCategoryName('');
    setFractionGramsInput(
      normalized.primaryFractionGrams ? String(normalized.primaryFractionGrams) : '250'
    );
    setFractionPriceInput(
      normalized.primaryFractionGrams && normalized.currentPrice > 0
        ? normalized.currentPrice.toFixed(2).replace('.', ',')
        : ''
    );
    setFractionPriceTouched(false);
    setUseFractionAsPrimary(
      normalized.primaryFractionGrams !== undefined || !normalized.kiloFractions?.length
    );
    setFractionError('');
    setFractionSavedFeedback('');
    setStudioMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditing = () => {
    if (
      unsavedNewProductId &&
      draftProduct.id === unsavedNewProductId &&
      !draftProduct.name.trim()
    ) {
      onDeleteProduct(draftProduct.id);
    }
    setUnsavedNewProductId(null);
    setNameError('');
    setStudioMode('list');
  };

  const handleCreateNewProduct = (forcedCategory?: string) => {
    const initialCategory =
      forcedCategory ||
      (selectedCategory !== 'all' ? selectedCategory : categories[0] || 'Lanches');
    const defaultChannelId = channels[0]?.id || 'direct-zero';

    const newProd: ProductItem = {
      id: `prod-${Date.now()}`,
      sku: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: initialCategory,
      cost: 0,
      currentPrice: 0,
      targetNetMargin: 0.25,
      referenceChannelId: defaultChannelId,
      estimatedMonthlyUnits: 150,
      unit: 'un',
      currentStock: 30,
      minStock: 10,
      maxStock: 100,
      costMethod: 'manual',
      description: '',
      active: true,
      ingredients: [],
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
    handleStartEditing(created || newProd, true);
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
        // Text search (accent-insensitive & multi-word across name, SKU, category, description, unit & ingredients)
        if (searchQuery.trim()) {
          const normalizedQuery = normalizeSearchText(searchQuery);
          const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
          const searchableBlob = normalizeSearchText(
            [
              p.name,
              p.sku,
              p.category,
              p.description,
              p.unit,
              ...(p.ingredients?.map((ing) => ing.name) || []),
            ]
              .filter(Boolean)
              .join(' ')
          );
          const allTokensMatch = tokens.every((tok) => searchableBlob.includes(tok));
          if (!allTokensMatch) return false;
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

  // Stock Movement Edit State & Handlers
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [editMovDate, setEditMovDate] = useState<string>('');
  const [editMovReason, setEditMovReason] = useState<string>('');
  const [editMovQty, setEditMovQty] = useState<string>('');
  const [editMovType, setEditMovType] = useState<'in' | 'out' | 'adjust'>('in');

  const handleStartEditMovement = (mov: StockMovement) => {
    setEditingMovementId(mov.id);
    setEditMovDate(mov.date);
    setEditMovReason(mov.reason);
    setEditMovQty(mov.quantity.toString());
    setEditMovType(mov.type);
  };

  const handleCancelEditMovement = () => {
    setEditingMovementId(null);
  };

  const handleSaveEditMovement = (movementId: string) => {
    const qty = parseFloat(editMovQty);
    if (isNaN(qty) || qty <= 0) return;

    const oldMov = (draftProduct.stockHistory || []).find((m) => m.id === movementId);
    if (!oldMov) return;

    const updatedHistory = (draftProduct.stockHistory || []).map((m) => {
      if (m.id === movementId) {
        return {
          ...m,
          date: editMovDate || m.date,
          reason: editMovReason || m.reason,
          type: editMovType,
          quantity: qty,
        };
      }
      return m;
    });

    const updated = {
      ...draftProduct,
      stockHistory: updatedHistory,
    };

    setDraftProduct(updated);
    onUpdateProduct(updated);
    if (selectedProduct.id === updated.id) {
      onSelectProduct(updated);
    }
    setEditingMovementId(null);
  };

  const handleDeleteMovement = (movementId: string) => {
    const updatedHistory = (draftProduct.stockHistory || []).filter((m) => m.id !== movementId);
    const updated = {
      ...draftProduct,
      stockHistory: updatedHistory,
    };

    setDraftProduct(updated);
    onUpdateProduct(updated);
    if (selectedProduct.id === updated.id) {
      onSelectProduct(updated);
    }
  };

  // Save changes to draft product
  const handleSaveDraftProduct = () => {
    const finalCat = draftProduct.category?.trim() || categories[0] || 'Lanches';
    let finalProduct: ProductItem = { ...draftProduct, category: finalCat };

    if (isKiloUnit(finalProduct.unit)) {
      const pendingGrams = parseFloat(fractionGramsInput.replace(',', '.'));
      const pendingPriceInput = parseFloat(fractionPriceInput.replace(',', '.'));

      // Se o usuário digitou peso e valor da fração mas clicou direto em Salvar sem clicar "+ Adicionar Fração",
      // registra automaticamente a fração e aplica como preço principal se habilitado.
      if (!Number.isNaN(pendingGrams) && pendingGrams > 0 && !Number.isNaN(pendingPriceInput) && pendingPriceInput > 0) {
        const roundedPrice = Number(pendingPriceInput.toFixed(2));
        const currentFractions = [...(finalProduct.kiloFractions || [])];
        const existingIdx = currentFractions.findIndex((f) => Math.abs(f.grams - pendingGrams) < 0.01);
        const label = formatGramsLabel(pendingGrams);

        if (existingIdx >= 0) {
          currentFractions[existingIdx] = {
            ...currentFractions[existingIdx],
            label,
            grams: pendingGrams,
            sellingPrice: roundedPrice,
          };
        } else {
          currentFractions.push({
            id: `frac-${Date.now()}-${Math.round(pendingGrams)}`,
            label,
            grams: pendingGrams,
            sellingPrice: roundedPrice,
          });
        }
        currentFractions.sort((a, b) => a.grams - b.grams);
        finalProduct = {
          ...finalProduct,
          kiloFractions: currentFractions,
          kgBaseCost: getEffectiveKgCost(finalProduct),
        };
        if (useFractionAsPrimary || !finalProduct.primaryFractionGrams) {
          finalProduct = applyPrimaryFractionState(finalProduct, pendingGrams, roundedPrice, currentFractions);
        }
      } else if (finalProduct.primaryFractionGrams) {
        const matched = (finalProduct.kiloFractions || []).find(
          (f) => Math.abs(f.grams - (finalProduct.primaryFractionGrams || 0)) < 0.01
        );
        if (matched) {
          finalProduct = applyPrimaryFractionState(
            finalProduct,
            matched.grams,
            matched.sellingPrice,
            finalProduct.kiloFractions
          );
        }
      } else if (useFractionAsPrimary && finalProduct.kiloFractions && finalProduct.kiloFractions.length === 1) {
        const single = finalProduct.kiloFractions[0];
        finalProduct = applyPrimaryFractionState(
          finalProduct,
          single.grams,
          single.sellingPrice,
          finalProduct.kiloFractions
        );
      }
    }

    const trimmedName = draftProduct.name.trim();
    if (!trimmedName) {
      setNameError('Informe o nome do produto antes de salvar.');
      nameInputRef.current?.focus();
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!categories.some((c) => c.toLowerCase() === finalCat.toLowerCase())) {
      handleCreateCategory(finalCat);
    }
    finalProduct = {
      ...finalProduct,
      name: trimmedName,
      referenceChannelId,
    };
    setNameError('');
    setUnsavedNewProductId(null);
    onUpdateProduct(finalProduct);
    onSelectProduct(finalProduct);
    if (selectedCategory !== 'all' && selectedCategory !== finalCat) {
      setSelectedCategory(finalCat);
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
                {studioMode === 'list'
                  ? 'Estúdio de Catálogo & Estoque'
                  : `Editando: ${draftProduct.name.trim() || 'Novo Produto'}`}
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
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setProductToDelete(draftProduct)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Excluir este produto permanentemente do catálogo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Produto
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraftProduct}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleCreateNewProduct()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
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
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Importar produtos em massa via planilha (Excel, CSV ou Colar da Planilha)"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Importar Planilha</span>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const created = handleCreateCategory(newCategoryName);
                      if (created) {
                        setSelectedCategory(created);
                        setNewCategoryName('');
                      }
                    }
                  }}
                  placeholder="Nome da nova categoria (ex: Massas, Bebidas Alcoólicas)"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const created = handleCreateCategory(newCategoryName);
                    if (created) {
                      setSelectedCategory(created);
                      setNewCategoryName('');
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Criar Categoria
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((c) => {
                const count = products.filter((p) => p.category === c).length;
                const isCustomEmpty = count === 0 && customCategories.includes(c);
                return (
                  <div
                    key={c}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(c)}
                      className="hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {c}
                    </button>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400 font-mono">
                      {count} {count === 1 ? 'item' : 'itens'}
                    </span>
                    {isCustomEmpty && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmptyCustomCategory(c)}
                        className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remover categoria vazia"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
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
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar nome, SKU ou insumo..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-950/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1.5 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
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

              {selectedCategory === 'all' && (
                <button
                  type="button"
                  onClick={() => setGroupByCategory((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    groupByCategory
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                  title="Alternar entre produtos separados por categoria ou tabela única"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{groupByCategory ? 'Por Categoria' : 'Lista Única'}</span>
                </button>
              )}
            </div>
          </div>

          {/* PRODUCTS TABLE SCREEN (GROUPED BY CATEGORY OR SINGLE FILTERED TABLE) */}
          {(() => {
            const renderProductRow = (p: ProductItem) => {
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
                        {(p.name?.trim() || 'NP').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {p.name?.trim() || 'Produto sem nome'}
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
                      {isKiloUnit(p.unit) && p.primaryFractionGrams
                        ? `Fração ${formatGramsLabel(p.primaryFractionGrams)}${
                            p.kgBaseCost ? ` · Kg: ${formatBRL(p.kgBaseCost)}` : ''
                          }`
                        : p.costMethod === 'manual'
                        ? 'CMV Fixo'
                        : 'Ficha Técnica'}
                    </div>
                  </td>

                  {/* Sale Price */}
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-emerald-400">{formatBRL(p.currentPrice)}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {isKiloUnit(p.unit) && p.primaryFractionGrams
                        ? `por ${formatGramsLabel(p.primaryFractionGrams)} (${(
                            p.primaryFractionGrams / 1000
                          ).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg)`
                        : p.unit || 'un'}
                    </div>
                    {isKiloUnit(p.unit) && p.kiloFractions && p.kiloFractions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 font-sans">
                        {p.kiloFractions
                          .filter(
                            (frac) =>
                              !p.primaryFractionGrams ||
                              Math.abs(frac.grams - p.primaryFractionGrams) >= 0.01
                          )
                          .slice(0, 2)
                          .map((frac) => (
                            <span
                              key={frac.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono"
                            >
                              {frac.label}: {formatBRL(frac.sellingPrice)}
                            </span>
                          ))}
                      </div>
                    )}
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
                        type="button"
                        onClick={() => {
                          onSelectProduct(p);
                        }}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 underline font-medium cursor-pointer"
                      >
                        Ativar no Painel
                      </button>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditing(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Abrir Estúdio Completo de Edição & Ficha Técnica"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar / Ficha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductToDelete(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Excluir produto cadastrado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            };

            const renderTableHeader = () => (
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
            );

            if (selectedCategory === 'all' && groupByCategory) {
              const hasActiveSearchOrStockFilter =
                searchQuery.trim().length > 0 || stockFilter !== 'all';

              const sectionsToShow = categories
                .map((catName) => ({
                  catName,
                  items: filteredProducts.filter((p) => p.category === catName),
                }))
                .filter((sec) => !hasActiveSearchOrStockFilter || sec.items.length > 0);

              if (sectionsToShow.length === 0) {
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl py-12 text-center text-slate-400 shadow-xl">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-white">Nenhum produto encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tente alterar os termos de busca ou o filtro de estoque selecionado.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {sectionsToShow.map(({ catName, items }) => {
                    const catStockVal = items.reduce(
                      (acc, item) => acc + (item.currentStock ?? 0) * (item.cost || 0),
                      0
                    );
                    return (
                      <div
                        key={catName}
                        className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
                      >
                        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <Layers className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-white">{catName}</h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                              {items.length} {items.length === 1 ? 'produto' : 'produtos'}
                            </span>
                            <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
                              · Estoque: {formatBRL(catStockVal)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCategory(catName)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Focar Categoria
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCreateNewProduct(catName)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Novo em {catName}</span>
                            </button>
                          </div>
                        </div>

                        {items.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              {renderTableHeader()}
                              <tbody className="divide-y divide-slate-800/60 font-mono">
                                {items.map(renderProductRow)}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-6 px-4 text-center text-xs text-slate-400">
                            Nenhum produto cadastrado na categoria{' '}
                            <strong className="text-white">{catName}</strong> ainda. Clique em{' '}
                            <button
                              type="button"
                              onClick={() => handleCreateNewProduct(catName)}
                              className="text-emerald-400 hover:underline font-bold cursor-pointer"
                            >
                              + Novo em {catName}
                            </button>{' '}
                            para cadastrar o primeiro item.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    {renderTableHeader()}
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredProducts.map(renderProductRow)}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                            <p className="font-semibold text-white">
                              Nenhum produto encontrado
                              {selectedCategory !== 'all' ? ` na categoria "${selectedCategory}"` : ''}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {selectedCategory !== 'all' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCreateNewProduct(selectedCategory)}
                                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Cadastrar Produto em {selectedCategory}
                                </button>
                              ) : (
                                'Tente alterar os termos de busca ou o filtro de categoria selecionado.'
                              )}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
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
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {draftProduct.name.trim() || 'Novo Produto'}
                </h2>
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
                  ref={nameInputRef}
                  type="text"
                  autoFocus={unsavedNewProductId === draftProduct.id}
                  value={draftProduct.name}
                  placeholder="Digite o nome do produto..."
                  onChange={(e) => {
                    if (nameError) setNameError('');
                    setDraftProduct({ ...draftProduct, name: e.target.value });
                  }}
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-white font-medium focus:outline-none ${
                    nameError
                      ? 'border-rose-500 focus:border-rose-400'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {nameError && (
                  <p className="text-[11px] text-rose-400 mt-1 font-medium">{nameError}</p>
                )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Categoria</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategoryInline((prev) => !prev);
                      setInlineCategoryName('');
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3" />
                    {isAddingCategoryInline ? 'Cancelar' : 'Nova Categoria'}
                  </button>
                </div>

                {isAddingCategoryInline ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={inlineCategoryName}
                      onChange={(e) => setInlineCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const created = handleCreateCategory(inlineCategoryName);
                          if (created) {
                            setDraftProduct({ ...draftProduct, category: created });
                            setInlineCategoryName('');
                            setIsAddingCategoryInline(false);
                          }
                        } else if (e.key === 'Escape') {
                          setIsAddingCategoryInline(false);
                          setInlineCategoryName('');
                        }
                      }}
                      placeholder="Ex: Massas, Porções..."
                      className="flex-1 min-w-0 px-2.5 py-2 bg-slate-950 border border-indigo-500/60 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const created = handleCreateCategory(inlineCategoryName);
                        if (created) {
                          setDraftProduct({ ...draftProduct, category: created });
                          setInlineCategoryName('');
                          setIsAddingCategoryInline(false);
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
                      title="Salvar e selecionar nova categoria"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={draftProduct.category}
                      onChange={(e) => setDraftProduct({ ...draftProduct, category: e.target.value })}
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    >
                      {(draftProduct.category && !categories.includes(draftProduct.category)
                        ? [...categories, draftProduct.category]
                        : categories
                      ).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategoryInline(true);
                        setInlineCategoryName('');
                      }}
                      className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-colors shrink-0 cursor-pointer"
                      title="Adicionar nova categoria de produto"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Unidade de Medida</label>
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Scale className="w-3 h-3" />
                    Abrir Roleta
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(true)}
                  className="w-full px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl text-white flex items-center justify-between transition-all group cursor-pointer shadow-sm"
                  title="Abrir seletor tipo roleta de cards para escolher ou cadastrar unidades de medida"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs uppercase">
                      {draftProduct.unit || 'un'}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 capitalize">
                      {draftProduct.unit === 'un'
                        ? 'Unidade (un)'
                        : draftProduct.unit === 'porção'
                        ? 'Porção'
                        : draftProduct.unit === 'lata'
                        ? 'Lata 350ml'
                        : draftProduct.unit === 'garrafa'
                        ? 'Garrafa'
                        : draftProduct.unit === 'kg'
                        ? 'Quilograma (kg)'
                        : draftProduct.unit === 'g'
                        ? 'Grama (g)'
                        : draftProduct.unit === 'combo'
                        ? 'Combo Completo'
                        : draftProduct.unit === 'fatia'
                        ? 'Fatia'
                        : draftProduct.unit === 'ml'
                        ? 'Mililitro (ml)'
                        : draftProduct.unit === 'l'
                        ? 'Litro (L)'
                        : draftProduct.unit === 'cx'
                        ? 'Caixa / Box'
                        : draftProduct.unit === 'pct'
                        ? 'Pacote'
                        : `${draftProduct.unit}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                    Roleta <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    {isKiloUnit(draftProduct.unit) ? 'Preço de Custo de 1 kg (R$/kg)' : 'Preço de Custo (R$)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSellingPricesModalOpen(true)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" />
                    Ver Preços / Taxas
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">R$</span>
                  <CurrencyCentsInput
                    ariaLabel={
                      isKiloUnit(draftProduct.unit)
                        ? 'Preço de Custo de 1 kg (R$/kg)'
                        : 'Preço de Custo (R$)'
                    }
                    value={
                      isKiloUnit(draftProduct.unit)
                        ? getEffectiveKgCost(draftProduct)
                        : draftProduct.cost || 0
                    }
                    placeholder="0,00"
                    onChangeValue={(newInputCost) => {
                      const refFee = getReferenceFeeRate(referenceChannelId);

                      if (isKiloUnit(draftProduct.unit)) {
                        const activeGrams = draftProduct.primaryFractionGrams;
                        const activeCost = activeGrams
                          ? Number(((newInputCost * activeGrams) / 1000).toFixed(2))
                          : newInputCost;
                        const calc = computeChannelSellingPrice(
                          activeCost,
                          draftProduct.targetNetMargin,
                          refFee,
                          draftProduct.targetNetProfitBRL
                        );
                        const nextPrice = calc.feasible ? calc.sellingPrice : draftProduct.currentPrice;
                        const updatedFractions = (draftProduct.kiloFractions || []).map((f) => {
                          if (activeGrams && Math.abs(f.grams - activeGrams) < 0.01 && calc.feasible) {
                            return { ...f, sellingPrice: calc.sellingPrice };
                          }
                          return f;
                        });
                        setDraftProduct({
                          ...draftProduct,
                          kgBaseCost: newInputCost,
                          cost: activeCost,
                          costMethod: 'manual',
                          currentPrice: nextPrice,
                          kiloFractions: updatedFractions,
                        });
                        if (!fractionPriceTouched) {
                          const typedGrams = parseFloat(fractionGramsInput.replace(',', '.'));
                          if (!Number.isNaN(typedGrams) && typedGrams > 0 && newInputCost > 0) {
                            const fracCost = Number(((newInputCost * typedGrams) / 1000).toFixed(2));
                            const fracCalc = computeChannelSellingPrice(
                              fracCost,
                              draftProduct.targetNetMargin,
                              refFee,
                              draftProduct.targetNetProfitBRL
                            );
                            if (fracCalc.feasible) {
                              setFractionPriceInput(fracCalc.sellingPrice.toFixed(2).replace('.', ','));
                            }
                          }
                        }
                      } else {
                        const calc = computeChannelSellingPrice(
                          newInputCost,
                          draftProduct.targetNetMargin,
                          refFee,
                          draftProduct.targetNetProfitBRL
                        );
                        setDraftProduct({
                          ...draftProduct,
                          cost: newInputCost,
                          costMethod: 'manual',
                          currentPrice: calc.feasible ? calc.sellingPrice : draftProduct.currentPrice,
                        });
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-bold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {isKiloUnit(draftProduct.unit) && draftProduct.primaryFractionGrams && (
                  <div className="text-[10px] text-cyan-300 mt-1 font-mono">
                    Fração ativa ({formatGramsLabel(draftProduct.primaryFractionGrams)}): Custo{' '}
                    <strong>{formatBRL(draftProduct.cost)}</strong>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    Margem Líquida Alvo (%)
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                        ? 'text-slate-500'
                        : 'text-emerald-400'
                    }`}
                  >
                    {draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                      ? 'Em pausa (usando R$)'
                      : `${Math.round(draftProduct.targetNetMargin * 100)}% líquido`}
                  </span>
                </div>
                <div
                  className={`flex items-stretch bg-slate-950 border rounded-xl overflow-hidden focus-within:border-emerald-500 transition-colors ${
                    draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                      ? 'border-slate-800/60 opacity-75'
                      : 'border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleChangeTargetNetMarginPercent(
                        Math.round(draftProduct.targetNetMargin * 100) - 1
                      )
                    }
                    className="px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 border-r border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Diminuir margem em 1%"
                    aria-label="Diminuir margem líquida em 1%"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="85"
                      value={Math.round(draftProduct.targetNetMargin * 100)}
                      onChange={(e) =>
                        handleChangeTargetNetMarginPercent(parseFloat(e.target.value) || 0)
                      }
                      className="w-full py-2 pl-2 pr-6 bg-transparent text-center text-white font-mono font-bold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-500 font-mono pointer-events-none">
                      %
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleChangeTargetNetMarginPercent(
                        Math.round(draftProduct.targetNetMargin * 100) + 1
                      )
                    }
                    className="px-3 bg-slate-900 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border-l border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Aumentar margem em 1%"
                    aria-label="Aumentar margem líquida em 1%"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[15, 20, 25, 30, 35, 40].map((presetPct) => {
                    const isCurrent =
                      !(draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0) &&
                      Math.round(draftProduct.targetNetMargin * 100) === presetPct;
                    return (
                      <button
                        key={presetPct}
                        type="button"
                        onClick={() => handleChangeTargetNetMarginPercent(presetPct)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                        }`}
                      >
                        {presetPct}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    Meta de Lucro Líquido (R$)
                  </label>
                  {draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleChangeTargetNetProfitBRL(undefined)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Limpar meta em R$ e voltar a usar Margem %"
                    >
                      <X className="w-3 h-3" />
                      Limpar
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">Opcional</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={
                      draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                        ? draftProduct.targetNetProfitBRL
                        : ''
                    }
                    placeholder="Ex: 1,00"
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      handleChangeTargetNetProfitBRL(
                        !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined
                      );
                    }}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl font-bold font-mono focus:outline-none transition-colors ${
                      draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                        ? 'border-cyan-500/70 text-cyan-300'
                        : 'border-slate-800 text-emerald-300 focus:border-cyan-500'
                    }`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[1, 2, 3, 5].map((presetBRL) => {
                    const isActiveBRL =
                      draftProduct.targetNetProfitBRL !== undefined &&
                      Math.abs(draftProduct.targetNetProfitBRL - presetBRL) < 0.01;
                    return (
                      <button
                        key={presetBRL}
                        type="button"
                        onClick={() => handleChangeTargetNetProfitBRL(presetBRL)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          isActiveBRL
                            ? 'bg-cyan-600 text-white border-cyan-500'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border-slate-800'
                        }`}
                      >
                        +R$ {presetBRL}
                      </button>
                    );
                  })}
                </div>
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

            {/* FRACTIONAL KILO SELLING PRICES (VISIBLE WHEN UNIT IS KG / KILO) */}
            {isKiloUnit(draftProduct.unit) && (
              <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="w-4 h-4" />
                        Venda Fracionada do Kilo (Peso & Valor por Fração)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                        {draftProduct.primaryFractionGrams
                          ? `Principal salvo: ${formatGramsLabel(draftProduct.primaryFractionGrams)} (${formatBRL(draftProduct.currentPrice)})`
                          : `Principal salvo: 1 kg (${formatBRL(draftProduct.currentPrice)})`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Defina o peso fracionado (ex: 70g, 250g, 500g) e o valor a ser vendido. Ao adicionar uma fração, ela pode ser usada diretamente como preço e custo principal do produto salvo no catálogo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {draftProduct.primaryFractionGrams && (
                      <button
                        type="button"
                        onClick={handleClearPrimaryFraction}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Usar 1 kg inteiro como Principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateDefaultFractions}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Gerar Padrão (100g, 250g, 500g)
                    </button>
                  </div>
                </div>

                {/* Preset Weight Chips + Custom Fractional Adder */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/25 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold mr-1">
                        Atalhos de fração:
                      </span>
                      {[70, 100, 150, 200, 250, 300, 500, 750].map((presetGrams) => {
                        const isSelectedPreset = Math.abs(parsedFractionGrams - presetGrams) < 0.01;
                        return (
                          <button
                            key={presetGrams}
                            type="button"
                            onClick={() => handleSelectPresetFraction(presetGrams)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              isSelectedPreset
                                ? 'bg-cyan-600 text-white border-cyan-400'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {presetGrams}g ({(presetGrams / 1000).toLocaleString('pt-BR')} kg)
                          </button>
                        );
                      })}
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-emerald-300 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useFractionAsPrimary}
                        onChange={(e) => setUseFractionAsPrimary(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      Salvar fração como Preço Principal do produto
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                    <div className="sm:col-span-3">
                      <label className="text-[11px] text-slate-300 block mb-1 font-semibold">
                        Quantidade Fracionada (g)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="10"
                          value={fractionGramsInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFractionGramsInput(val);
                            setFractionError('');
                            setFractionSavedFeedback('');
                            const parsed = parseFloat(val.replace(',', '.'));
                            if (!Number.isNaN(parsed) && parsed > 0) {
                              const suggested = getSuggestedFractionPrice(parsed);
                              if (suggested > 0 && !fractionPriceTouched) {
                                setFractionPriceInput(suggested.toFixed(2).replace('.', ','));
                              }
                            }
                          }}
                          placeholder="Ex: 150"
                          className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                        />
                        <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">g</span>
                      </div>
                      {parsedFractionGrams > 0 && (
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          = {(parsedFractionGrams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg · Custo:{' '}
                          <span className="text-amber-300 font-bold">
                            {formatBRL(Number(((getEffectiveKgCost(draftProduct) * parsedFractionGrams) / 1000).toFixed(2)))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-5">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <label className="text-[11px] text-slate-300 font-semibold">
                          Valor a ser Vendido para essa Fração (R$)
                        </label>
                        {parsedFractionGrams > 0 && getSuggestedFractionPrice(parsedFractionGrams) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFractionPriceInput(
                                getSuggestedFractionPrice(parsedFractionGrams).toFixed(2).replace('.', ',')
                              );
                              setFractionPriceTouched(false);
                            }}
                            className="text-[10px] text-cyan-400 hover:underline font-mono cursor-pointer shrink-0"
                          >
                            Sugestão canal: {formatBRL(getSuggestedFractionPrice(parsedFractionGrams))}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fractionPriceInput}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                            setFractionPriceInput(cleaned);
                            setFractionPriceTouched(true);
                            setFractionError('');
                            setFractionSavedFeedback('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveFractionPrice(true);
                            }
                          }}
                          placeholder="0,00"
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveFractionPrice(true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Salvar este preço para a fração e defini-lo como preço de venda do produto"
                      >
                        <Check className="w-4 h-4" />
                        Salvar Preço
                      </button>
                      {!useFractionAsPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSaveFractionPrice(false)}
                          className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          title="Apenas adicionar à tabela sem alterar o preço principal"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Só Listar
                        </button>
                      )}
                    </div>
                  </div>

                  {fractionSavedFeedback && (
                    <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{fractionSavedFeedback}</span>
                    </div>
                  )}

                  {/* ALL Channel Fee Suggestions for the currently typed fraction */}
                  {parsedFractionGrams > 0 && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-cyan-300 font-bold flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5" />
                          Sugestões para {formatGramsLabel(parsedFractionGrams)} em Todas as Taxas ({channels.length} canais)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Clique em qualquer taxa para aplicar o valor e depois clique em <strong className="text-emerald-300">Salvar Preço</strong>
                        </span>
                      </div>

                      {getEffectiveKgCost(draftProduct) <= 0 &&
                      !(draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0) ? (
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-dashed border-slate-800 text-[11px] text-slate-400">
                          Informe o <strong className="text-amber-300">Preço de Custo de 1 kg (R$/kg)</strong> acima para calcular o valor sugerido de {formatGramsLabel(parsedFractionGrams)} em todas as taxas disponíveis.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                          {fractionChannelPreviews.map(({ channel, feasible, sellingPrice, netProfit }) => {
                            const isSelectedChannel =
                              feasible &&
                              (referenceChannelId === channel.id ||
                                (parsedFractionPrice > 0 && Math.abs(parsedFractionPrice - sellingPrice) < 0.01));

                            return (
                              <button
                                key={channel.id}
                                type="button"
                                disabled={!feasible}
                                onClick={() => {
                                  if (!feasible) return;
                                  const formattedPrice = sellingPrice.toFixed(2).replace('.', ',');
                                  setFractionPriceInput(formattedPrice);
                                  setFractionPriceTouched(true);
                                  setReferenceChannelId(channel.id);
                                  setFractionError('');
                                  setFractionSavedFeedback('');
                                  setDraftProduct((prev) => ({
                                    ...prev,
                                    referenceChannelId: channel.id,
                                  }));
                                }}
                                className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1 ${
                                  !feasible
                                    ? 'bg-slate-900/40 border-rose-500/20 opacity-65 cursor-not-allowed'
                                    : isSelectedChannel
                                    ? 'bg-emerald-500/15 border-emerald-500/60 shadow-sm cursor-pointer'
                                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-cyan-500/50 cursor-pointer'
                                }`}
                                title={
                                  feasible
                                    ? `Aplicar ${formatBRL(sellingPrice)} (${channel.name} · Taxa ${channel.totalRate.toFixed(2).replace('.', ',')}%) na fração de ${formatGramsLabel(parsedFractionGrams)}`
                                    : 'Margem + taxa ≥ 98%'
                                }
                              >
                                <div className="flex items-start justify-between gap-1.5 w-full">
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-white truncate">
                                      {channel.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Taxa:{' '}
                                      <span className="font-mono text-slate-300">
                                        {channel.totalRate.toFixed(2).replace('.', ',')}%
                                      </span>
                                    </div>
                                  </div>
                                  {isSelectedChannel && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 text-[9px] font-bold shrink-0">
                                      Aplicado
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-800/70 w-full font-mono">
                                  {feasible ? (
                                    <>
                                      <span className="text-xs font-black text-emerald-400">
                                        {formatBRL(sellingPrice)}
                                      </span>
                                      <span className="text-[10px] text-cyan-300">
                                        Lucro {formatBRL(netProfit)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-rose-400 font-sans font-semibold">
                                      Margem + Taxa ≥ 98%
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {fractionError && (
                    <div className="text-[11px] text-rose-400 font-medium">{fractionError}</div>
                  )}
                </div>

                {/* Configured Fractional Kilo Prices List */}
                {draftProduct.kiloFractions && draftProduct.kiloFractions.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Quantidade (g)</th>
                          <th className="py-2.5 px-3">Fração do Kg</th>
                          <th className="py-2.5 px-3">Custo Prop. (CMV)</th>
                          <th className="py-2.5 px-3">Valor de Venda (R$)</th>
                          <th className="py-2.5 px-3">Equivalente R$/kg</th>
                          <th className="py-2.5 px-3">Margem Bruta</th>
                          <th className="py-2.5 px-3">Definir / Salvar Preço</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {draftProduct.kiloFractions.map((frac) => {
                          const kgRatio = (frac.grams || 0) / 1000;
                          const propCost = Number((getEffectiveKgCost(draftProduct) * kgRatio).toFixed(2));
                          const equivPerKg = kgRatio > 0 ? frac.sellingPrice / kgRatio : 0;
                          const grossMarginPct =
                            frac.sellingPrice > 0
                              ? ((frac.sellingPrice - propCost) / frac.sellingPrice) * 100
                              : 0;
                          const isPrimaryFrac =
                            draftProduct.primaryFractionGrams !== undefined &&
                            Math.abs(frac.grams - draftProduct.primaryFractionGrams) < 0.01;

                          return (
                            <tr
                              key={frac.id}
                              className={`hover:bg-slate-900/60 ${isPrimaryFrac ? 'bg-emerald-950/20' : ''}`}
                            >
                              <td className="py-2 px-3 w-28">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    step="10"
                                    value={frac.grams || ''}
                                    onChange={(e) =>
                                      handleUpdateKiloFraction(frac.id, {
                                        grams: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full pl-2.5 pr-7 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                                  />
                                  <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-mono">
                                    g
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-300">
                                {kgRatio.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg
                              </td>
                              <td className="py-2 px-3 font-mono text-amber-300">
                                {formatBRL(propCost)}
                              </td>
                              <td className="py-2 px-3 w-36">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-[11px] text-slate-400 font-mono">
                                    R$
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={frac.sellingPrice || ''}
                                    onChange={(e) =>
                                      handleUpdateKiloFraction(frac.id, {
                                        sellingPrice: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-900 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-emerald-400"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-300">
                                {formatBRL(equivPerKg)}/kg
                              </td>
                              <td className="py-2 px-3 font-mono">
                                <span
                                  className={`font-bold ${
                                    grossMarginPct >= 25
                                      ? 'text-emerald-400'
                                      : grossMarginPct > 0
                                      ? 'text-amber-300'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  {grossMarginPct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryFraction(frac)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                    isPrimaryFrac
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                      : 'bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40'
                                  }`}
                                  title="Definir e salvar este valor como preço principal do produto"
                                >
                                  <Check className="w-3 h-3" />
                                  {isPrimaryFrac ? 'Preço Salvo ✓' : 'Salvar Preço'}
                                </button>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFractionGramsInput(String(frac.grams));
                                      setFractionPriceInput(
                                        frac.sellingPrice > 0
                                          ? frac.sellingPrice.toFixed(2).replace('.', ',')
                                          : ''
                                      );
                                      setFractionPriceTouched(true);
                                      setFractionError('');
                                      setFractionSavedFeedback('');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                                    title="Carregar esta fração para ver todas as sugestões de taxas acima"
                                  >
                                    Ver Taxas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKiloFraction(frac.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Remover fração do kilo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-[11px] text-slate-400 text-center">
                    Nenhuma fração adicionada ainda. Escolha um atalho acima (ex: 70g, 150g, 250g) ou digite o peso em gramas e o valor a ser vendido.
                  </div>
                )}
              </div>
            )}

            {/* LIVE SELLING PRICES ACROSS ALL AVAILABLE FEES PANEL */}
            <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" />
                      Valor de Venda a Praticar (Todas as Taxas Disponíveis)
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                        draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                        ? `Meta Fixa: +${formatBRL(draftProduct.targetNetProfitBRL)} lucro líquido`
                        : `Meta: ${(draftProduct.targetNetMargin * 100).toFixed(0)}% líquido real`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                      Preço Salvo no Catálogo:{' '}
                      <strong className="text-emerald-400">{formatBRL(draftProduct.currentPrice)}</strong>
                      {isKiloUnit(draftProduct.unit) && draftProduct.primaryFractionGrams
                        ? ` (${formatGramsLabel(draftProduct.primaryFractionGrams)})`
                        : ''}
                      {' · '}
                      <span className="text-cyan-300">
                        {channels.find((c) => c.id === referenceChannelId)?.name || 'Balcão 0%'}
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cálculo automático blindado sobre o custo{' '}
                    {isKiloUnit(draftProduct.unit) && draftProduct.primaryFractionGrams
                      ? `da fração de ${formatGramsLabel(draftProduct.primaryFractionGrams)} (`
                      : 'de '}
                    <strong className="text-amber-300 font-mono">{formatBRL(draftProduct.cost)}</strong>
                    {isKiloUnit(draftProduct.unit) && draftProduct.primaryFractionGrams ? ')' : ''}
                    {draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0
                      ? ` garantindo ${formatBRL(draftProduct.targetNetProfitBRL)} de lucro líquido livre após taxas em cada meta de faturamento.`
                      : '. Clique em qualquer canal para aplicá-lo como Preço Base do catálogo ou abra o comparativo completo.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSellingPricesModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Abrir Modal Completo por Taxa ({channels.length})</span>
                </button>
              </div>

              {draftProduct.cost <= 0 &&
              !(draftProduct.targetNetProfitBRL && draftProduct.targetNetProfitBRL > 0) ? (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                  <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    Digite o <strong className="text-amber-300">Preço de Custo (R$)</strong> acima para visualizar instantaneamente o valor de venda ideal a praticar no Uai Rango, Tchau Fome, iFood e Balcão.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {channelSellingPreviews.map(({ channel, feasible, sellingPrice, netProfit }) => {
                    const isBaseSelected =
                      feasible &&
                      (referenceChannelId === channel.id ||
                        Math.abs(draftProduct.currentPrice - sellingPrice) < 0.01);

                    return (
                      <button
                        key={channel.id}
                        type="button"
                        disabled={!feasible}
                        onClick={() => {
                          if (!feasible) return;
                          setReferenceChannelId(channel.id);
                          if (
                            draftProduct.primaryFractionGrams &&
                            Math.abs(draftProduct.primaryFractionGrams - parsedFractionGrams) < 0.01
                          ) {
                            setFractionPriceInput(sellingPrice.toFixed(2).replace('.', ','));
                            setFractionPriceTouched(true);
                          }
                          setDraftProduct((prev) => ({
                            ...prev,
                            referenceChannelId: channel.id,
                            currentPrice: sellingPrice,
                            kiloFractions: (prev.kiloFractions || []).map((f) =>
                              prev.primaryFractionGrams &&
                              Math.abs(f.grams - prev.primaryFractionGrams) < 0.01
                                ? { ...f, sellingPrice }
                                : f
                            ),
                          }));
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                          !feasible
                            ? 'bg-slate-950/40 border-rose-500/20 opacity-70 cursor-not-allowed'
                            : isBaseSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 shadow-sm cursor-pointer'
                            : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-emerald-500/40 cursor-pointer'
                        }`}
                        title={
                          feasible
                            ? `Clique para definir ${formatBRL(sellingPrice)} como Preço Base do produto`
                            : 'Combinação de margem alvo + taxa do canal inviável'
                        }
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate">{channel.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Taxa: <span className="font-mono text-slate-300">{channel.totalRate.toFixed(2).replace('.', ',')}%</span>
                            </div>
                          </div>
                          {isBaseSelected && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 text-[9px] font-bold shrink-0">
                              Base
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-800/70 w-full">
                          {feasible ? (
                            <>
                              <span className="text-sm font-black font-mono text-emerald-400">
                                {formatBRL(sellingPrice)}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-300">
                                Lucro {formatBRL(netProfit)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-semibold">
                              Margem + Taxa ≥ 98%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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
                  {(!draftProduct.ingredients || draftProduct.ingredients.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-6 px-4 text-center text-xs text-slate-400">
                        Nenhum insumo cadastrado na ficha técnica deste produto. Clique em{' '}
                        <strong className="text-cyan-400">Adicionar Insumo à Ficha Técnica</strong> para incluir ingredientes ou salve sem insumos.
                      </td>
                    </tr>
                  )}
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

                    if (editingMovementId === mov.id) {
                      return (
                        <div
                          key={mov.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/50 space-y-3 text-xs shadow-lg ring-1 ring-amber-500/20"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              Editar Lançamento do Histórico
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEditMovement(mov.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                title="Salvar alterações"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditMovement}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title="Cancelar edição"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancelar
                              </button>
                            </div>
                          </div>

                          {/* Tipo de Movimento */}
                          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg text-[11px] text-center">
                            <button
                              type="button"
                              onClick={() => setEditMovType('in')}
                              className={`py-1 rounded font-semibold transition-all ${
                                editMovType === 'in' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              + Entrada
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditMovType('out')}
                              className={`py-1 rounded font-semibold transition-all ${
                                editMovType === 'out' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              - Saída
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditMovType('adjust')}
                              className={`py-1 rounded font-semibold transition-all ${
                                editMovType === 'adjust' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              = Inventário
                            </button>
                          </div>

                          {/* Campos: Motivo, Qtd, Data */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-1">
                              <label className="text-[10px] text-slate-400 block mb-1">Motivo / Razão</label>
                              <input
                                type="text"
                                value={editMovReason}
                                onChange={(e) => setEditMovReason(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                                placeholder="Motivo da movimentação"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">
                                Quantidade ({draftProduct.unit || 'un'})
                              </label>
                              <input
                                type="number"
                                value={editMovQty}
                                onChange={(e) => setEditMovQty(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 outline-none"
                                placeholder="10"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Data / Hora</label>
                              <input
                                type="text"
                                value={editMovDate}
                                onChange={(e) => setEditMovDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 outline-none"
                                placeholder="AAAA-MM-DD HH:MM"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={mov.id}
                        className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPlus
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isMinus
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {isPlus ? '+' : isMinus ? '-' : '='}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{mov.reason}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{mov.date}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Saldo e Quantidade */}
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

                          {/* Botões de Ação no Canto Direito: Editar e Excluir */}
                          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleStartEditMovement(mov)}
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/15 rounded-lg transition-colors cursor-pointer"
                              title="Editar este lançamento do histórico"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMovement(mov.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                              title="Excluir este lançamento do histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
              Produto: <strong className="text-white">{draftProduct.name.trim() || 'Novo Produto'}</strong>
              {isKiloUnit(draftProduct.unit) && draftProduct.primaryFractionGrams && (
                <>
                  {' '}
                  · Fração Ativa:{' '}
                  <strong className="text-cyan-400 font-mono">
                    {formatGramsLabel(draftProduct.primaryFractionGrams)}
                  </strong>
                </>
              )}{' '}
              · Custo CMV: <strong className="text-emerald-400 font-mono">{formatBRL(draftProduct.cost)}</strong> ·
              Preço Base:{' '}
              <strong className="text-white font-mono">{formatBRL(draftProduct.currentPrice)}</strong>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(draftProduct)}
                className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Produto
              </button>
              <button
                type="button"
                onClick={handleCancelEditing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDraftProduct}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Salvar Produto & Atualizar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit of Measure Roulette Modal */}
      <UnitSelectorModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        currentUnit={draftProduct.unit || 'un'}
        onSelectUnit={(selectedUnitCode) => {
          setDraftProduct((prev) => {
            if (isKiloUnit(selectedUnitCode)) {
              return {
                ...prev,
                unit: selectedUnitCode,
                kgBaseCost: prev.kgBaseCost ?? prev.cost,
              };
            }
            return {
              ...prev,
              unit: selectedUnitCode,
              primaryFractionGrams: undefined,
            };
          });
          if (isKiloUnit(selectedUnitCode)) {
            const grams = parseFloat(fractionGramsInput.replace(',', '.')) || 250;
            const suggested = getSuggestedFractionPrice(grams);
            if (suggested > 0 && !fractionPriceInput) {
              setFractionPriceInput(suggested.toFixed(2).replace('.', ','));
            }
          }
        }}
      />

      {/* Spreadsheet Import Modal (Excel / CSV / Copy-Paste) */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentProductsCount={products.length}
        onImport={(importedProducts, mode) => {
          if (onBatchImportProducts) {
            onBatchImportProducts(importedProducts, mode);
          } else {
            importedProducts.forEach((p) => onAddProduct(p));
          }
        }}
      />

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">Excluir Produto do Catálogo</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tem certeza que deseja excluir este item? Esta ação removerá o produto e sua ficha técnica do catálogo e do banco de dados.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="font-bold text-white truncate">{productToDelete.name}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>{productToDelete.sku || 'SEM SKU'}</span>
                <span>·</span>
                <span className="font-sans">{productToDelete.category}</span>
                <span>·</span>
                <span className="text-emerald-400">{formatBRL(productToDelete.currentPrice)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = productToDelete.id;
                  onDeleteProduct(idToDelete);
                  if (studioMode === 'edit' && draftProduct.id === idToDelete) {
                    setStudioMode('list');
                  }
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Channel Selling Prices Modal (All Available Fees) */}
      <ChannelSellingPricesModal
        isOpen={isSellingPricesModalOpen}
        onClose={() => setIsSellingPricesModalOpen(false)}
        productName={
          isKiloUnit(draftProduct.unit) && draftProduct.primaryFractionGrams
            ? `${draftProduct.name} (Fração ${formatGramsLabel(draftProduct.primaryFractionGrams)})`
            : draftProduct.name
        }
        cost={draftProduct.cost}
        targetNetMargin={draftProduct.targetNetMargin}
        targetNetProfitBRL={draftProduct.targetNetProfitBRL}
        currentBasePrice={draftProduct.currentPrice}
        channels={channels}
        onChangeCost={(newCost) => {
          const refFee = getReferenceFeeRate(referenceChannelId);
          const calc = computeChannelSellingPrice(
            newCost,
            draftProduct.targetNetMargin,
            refFee,
            draftProduct.targetNetProfitBRL
          );
          setDraftProduct((prev) => ({
            ...prev,
            cost: newCost,
            kgBaseCost:
              isKiloUnit(prev.unit) && prev.primaryFractionGrams
                ? Number(((newCost * 1000) / prev.primaryFractionGrams).toFixed(2))
                : isKiloUnit(prev.unit)
                ? newCost
                : prev.kgBaseCost,
            costMethod: 'manual',
            currentPrice: calc.feasible ? calc.sellingPrice : prev.currentPrice,
            kiloFractions: (prev.kiloFractions || []).map((f) =>
              prev.primaryFractionGrams &&
              Math.abs(f.grams - prev.primaryFractionGrams) < 0.01 &&
              calc.feasible
                ? { ...f, sellingPrice: calc.sellingPrice }
                : f
            ),
          }));
        }}
        onChangeTargetMargin={(newMargin) => {
          handleChangeTargetNetMarginPercent(Math.round(newMargin * 100));
        }}
        onChangeTargetNetProfitBRL={(newProfitBRL) => {
          handleChangeTargetNetProfitBRL(newProfitBRL);
        }}
        onApplyPrice={(price, channelName) => {
          const matched = channels.find((c) => c.name === channelName);
          if (matched) setReferenceChannelId(matched.id);
          setDraftProduct((prev) => ({
            ...prev,
            referenceChannelId: matched ? matched.id : prev.referenceChannelId,
            currentPrice: price,
            kiloFractions: (prev.kiloFractions || []).map((f) =>
              prev.primaryFractionGrams && Math.abs(f.grams - prev.primaryFractionGrams) < 0.01
                ? { ...f, sellingPrice: price }
                : f
            ),
          }));
        }}
      />
    </div>
  );
};
