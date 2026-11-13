import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Scale,
  Package,
  Layers,
  Droplet,
  Droplets,
  Archive,
  ShoppingBag,
  Sparkles,
  Tag,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UnitDefinition {
  id: string;
  code: string;
  name: string;
  category: 'contagem' | 'peso' | 'volume' | 'porcao' | 'combo' | 'personalizado';
  categoryLabel: string;
  description: string;
  example: string;
  isCustom?: boolean;
}

export const DEFAULT_UNITS: UnitDefinition[] = [
  {
    id: 'unit-un',
    code: 'un',
    name: 'Unidade',
    category: 'contagem',
    categoryLabel: 'Contagem Individual',
    description: 'Item comercializado por unidade discreta inteira.',
    example: 'Burgers, lanches, sobremesas individuais',
  },
  {
    id: 'unit-porcao',
    code: 'porção',
    name: 'Porção',
    category: 'porcao',
    categoryLabel: 'Gastronomia & Cozinha',
    description: 'Dose culinária padronizada para consumo imediato.',
    example: 'Batata rústica, onion rings, petiscos',
  },
  {
    id: 'unit-lata',
    code: 'lata',
    name: 'Lata 350ml',
    category: 'volume',
    categoryLabel: 'Bebidas & Conveniência',
    description: 'Refrigerantes, cervejas e sucos em embalagem metálica.',
    example: 'Coca-Cola 350ml, Guaraná, Cerveja',
  },
  {
    id: 'unit-garrafa',
    code: 'garrafa',
    name: 'Garrafa',
    category: 'volume',
    categoryLabel: 'Bebidas & Líquidos',
    description: 'Bebidas em garrafa PET ou vidro (500ml, 1L, 2L).',
    example: 'Refrigerante 2L, Água Mineral, Cerveja 600ml',
  },
  {
    id: 'unit-combo',
    code: 'combo',
    name: 'Combo Completo',
    category: 'combo',
    categoryLabel: 'Kits & Menus Especiais',
    description: 'Combinação de prato principal, acompanhamento e bebida.',
    example: 'Combo Smash + Batata + Refrigerante',
  },
  {
    id: 'unit-fatia',
    code: 'fatia',
    name: 'Fatia / Pedaço',
    category: 'porcao',
    categoryLabel: 'Fracionamento',
    description: 'Porção individual cortada de item maior.',
    example: 'Fatia de pizza, torta artesanal, bolo',
  },
  {
    id: 'unit-kg',
    code: 'kg',
    name: 'Quilograma (kg)',
    category: 'peso',
    categoryLabel: 'Pesáveis & Carnes',
    description: 'Preço cotado ou vendido pelo peso de 1.000 gramas.',
    example: 'Carnes a granel, queijos em peça, massas',
  },
  {
    id: 'unit-g',
    code: 'g',
    name: 'Grama (g)',
    category: 'peso',
    categoryLabel: 'Insumos & Especiarias',
    description: 'Fracionamento em gramas para receitas e fichas técnicas.',
    example: 'Blend 160g, bacon 40g, temperos',
  },
  {
    id: 'unit-ml',
    code: 'ml',
    name: 'Mililitro (ml)',
    category: 'volume',
    categoryLabel: 'Doses & Caldas',
    description: 'Medida líquida para doses, caldas e óleos.',
    example: 'Molho especial 30ml, calda fudge 40ml',
  },
  {
    id: 'unit-l',
    code: 'l',
    name: 'Litro (L)',
    category: 'volume',
    categoryLabel: 'Bebidas a Granel',
    description: 'Líquidos comercializados em volume de 1 litro.',
    example: 'Chopp artesanal 1L, suco natural da casa',
  },
  {
    id: 'unit-cx',
    code: 'cx',
    name: 'Caixa / Box',
    category: 'contagem',
    categoryLabel: 'Embalagem Múltipla',
    description: 'Embalagem contendo múltiplos itens ou pratos especiais.',
    example: 'Box com 12 mini burgers, caixa de salgados',
  },
  {
    id: 'unit-pct',
    code: 'pct',
    name: 'Pacote',
    category: 'contagem',
    categoryLabel: 'Agrupamentos',
    description: 'Fardo, pacote selado ou kit de ingredientes.',
    example: 'Pacote de pães, kit de sachês',
  },
];

interface UnitSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUnit: string;
  onSelectUnit: (unitCode: string) => void;
}

export const UnitSelectorModal: React.FC<UnitSelectorModalProps> = ({
  isOpen,
  onClose,
  currentUnit,
  onSelectUnit,
}) => {
  // Load custom units from localStorage
  const [units, setUnits] = useState<UnitDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('omniprice_custom_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_UNITS, ...parsed];
      }
    } catch {
      // fallback
    }
    return DEFAULT_UNITS;
  });

  // Selected index in the roulette/carousel
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New Unit Form State
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<UnitDefinition['category']>('personalizado');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newExample, setNewExample] = useState<string>('');

  const rouletteRef = useRef<HTMLDivElement>(null);

  // Filtered list of units
  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'todos' || u.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Initialize selected index to the current unit when opened
  useEffect(() => {
    if (isOpen) {
      const idx = units.findIndex(
        (u) => u.code.toLowerCase() === (currentUnit || 'un').toLowerCase()
      );
      if (idx !== -1) {
        setSelectedIndex(idx);
      } else {
        setSelectedIndex(0);
      }
      setIsAddingNew(false);
      setSearchFilter('');
    }
  }, [isOpen, currentUnit, units]);

  // Scroll active card into view in roulette
  useEffect(() => {
    if (rouletteRef.current && filteredUnits.length > 0) {
      const container = rouletteRef.current;
      const activeCard = container.querySelector(`[data-unit-index="${selectedIndex}"]`) as HTMLElement;
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedIndex, filteredUnits.length]);

  if (!isOpen) return null;

  const currentSelectedUnit = filteredUnits[selectedIndex] || filteredUnits[0] || units[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredUnits.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < filteredUnits.length - 1 ? prev + 1 : 0));
  };

  const handleConfirmSelection = (unitCode: string) => {
    onSelectUnit(unitCode);
    onClose();
  };

  const handleCreateNewUnit = () => {
    const cleanCode = newCode.trim().toLowerCase();
    const cleanName = newName.trim();
    if (!cleanCode || !cleanName) return;

    // Check if code already exists
    if (units.some((u) => u.code.toLowerCase() === cleanCode)) {
      alert(`A unidade com o código "${cleanCode}" já existe!`);
      return;
    }

    const categoryLabels: Record<UnitDefinition['category'], string> = {
      contagem: 'Contagem Individual',
      peso: 'Pesáveis & Massas',
      volume: 'Volume & Líquidos',
      porcao: 'Gastronomia & Porções',
      combo: 'Kits & Menus',
      personalizado: 'Personalizado',
    };

    const newUnitItem: UnitDefinition = {
      id: `custom-unit-${Date.now()}`,
      code: cleanCode,
      name: cleanName,
      category: newCategory,
      categoryLabel: categoryLabels[newCategory] || 'Personalizado',
      description: newDesc.trim() || `Unidade personalizada (${cleanCode}) para itens do cardápio.`,
      example: newExample.trim() || 'Produtos exclusivos do catálogo',
      isCustom: true,
    };

    const updatedList = [...units, newUnitItem];
    setUnits(updatedList);

    // Persist custom units
    const customOnly = updatedList.filter((u) => u.isCustom);
    localStorage.setItem('omniprice_custom_units', JSON.stringify(customOnly));

    // Reset form
    setNewCode('');
    setNewName('');
    setNewDesc('');
    setNewExample('');
    setIsAddingNew(false);

    // Automatically select the newly created unit!
    handleConfirmSelection(newUnitItem.code);
  };

  const handleDeleteCustomUnit = (unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = units.filter((u) => u.id !== unitId);
    setUnits(updated);
    const customOnly = updated.filter((u) => u.isCustom);
    localStorage.setItem('omniprice_custom_units', JSON.stringify(customOnly));
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
  };

  const getCategoryIcon = (category: UnitDefinition['category']) => {
    switch (category) {
      case 'peso':
        return <Scale className="w-4 h-4 text-emerald-400" />;
      case 'volume':
        return <Droplets className="w-4 h-4 text-cyan-400" />;
      case 'porcao':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'combo':
        return <Layers className="w-4 h-4 text-violet-400" />;
      case 'contagem':
      default:
        return <Package className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  Seletor de Unidade de Medida
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Roleta Interativa
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Navegue pela roleta de cartões de medidas ou crie novas unidades para outros produtos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(!isAddingNew)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isAddingNew
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingNew ? 'Fechar Cadastro' : 'Nova Unidade'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form to Add New Unit (Expandable) */}
          <AnimatePresence>
            {isAddingNew && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950 border-b border-slate-800 p-4 sm:p-5 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Cadastrar Nova Unidade de Medida
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Código / Abreviatura *
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="Ex: balde, dz, copo, dose"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono uppercase focus:border-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Nome Completo da Medida *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Balde Frango 1kg, Dúzia de Ovos"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Família / Categoria
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as UnitDefinition['category'])}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-400 outline-none"
                    >
                      <option value="contagem">Contagem / Discreto</option>
                      <option value="porcao">Porção / Prato</option>
                      <option value="volume">Volume / Líquido</option>
                      <option value="peso">Peso / Massa</option>
                      <option value="combo">Combo / Kit</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Descrição / Regra de Aplicação
                    </label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Ex: Medida para baldes térmicos de frango frito"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Exemplos de Itens que usam esta Unidade
                    </label>
                    <input
                      type="text"
                      value={newExample}
                      onChange={(e) => setNewExample(e.target.value)}
                      placeholder="Ex: Balde Crocante Família, Asinhas de Frango"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-400 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewUnit}
                    disabled={!newCode.trim() || !newName.trim()}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Salvar e Aplicar Unidade
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search and Filters Bar */}
          <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por código, nome..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Category Badges */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-[11px]">
              {['todos', 'contagem', 'porcao', 'volume', 'peso', 'combo'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cat === 'todos' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* ROULETTE / CAROUSEL SELECTOR SECTION */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Roulette Navigation Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                Gire a roleta ou clique no card desejado:
                <strong className="text-white font-mono">
                  {filteredUnits.length > 0 ? `${selectedIndex + 1}/${filteredUnits.length}` : '0/0'}
                </strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={filteredUnits.length <= 1}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40"
                  title="Card anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={filteredUnits.length <= 1}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40"
                  title="Próximo card"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* THE ROULETTE TRACK (Interactive Horizontal Carousel of Cards) */}
            <div
              ref={rouletteRef}
              className="flex items-stretch gap-3 overflow-x-auto py-3 px-1 scrollbar-thin scrollbar-thumb-slate-800 snap-x snap-mandatory"
            >
              {filteredUnits.length === 0 ? (
                <div className="w-full text-center py-10 text-slate-500 text-xs">
                  Nenhuma unidade encontrada com o filtro &quot;{searchFilter}&quot;.
                </div>
              ) : (
                filteredUnits.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isCurrentProductUnit =
                    item.code.toLowerCase() === (currentUnit || '').toLowerCase();

                  return (
                    <motion.div
                      key={item.id}
                      data-unit-index={idx}
                      onClick={() => setSelectedIndex(idx)}
                      whileHover={{ scale: isSelected ? 1.02 : 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      className={`min-w-[200px] sm:min-w-[220px] max-w-[220px] p-4 rounded-2xl cursor-pointer snap-center transition-all flex flex-col justify-between border relative ${
                        isSelected
                          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                          : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          {getCategoryIcon(item.category)}
                          {item.categoryLabel}
                        </span>

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomUnit(item.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                            title="Excluir unidade personalizada"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Code Avatar & Full Name */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-black tracking-tight font-mono px-2 py-0.5 rounded-lg ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-900 text-white border border-slate-800'
                            }`}
                          >
                            {item.code}
                          </span>
                          {isCurrentProductUnit && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Atual
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-white text-sm leading-tight pt-1">
                          {item.name}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Example Footer */}
                      <div className="pt-2 border-t border-slate-800/80 mt-auto">
                        <span className="text-[10px] text-slate-500 block truncate" title={item.example}>
                          Ex: {item.example}
                        </span>
                      </div>

                      {/* Active Indicator dot */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* FOCUSED / CENTERED CARD DETAILS BOX */}
            {currentSelectedUnit && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-black text-lg shadow-inner shrink-0">
                    {currentSelectedUnit.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base">
                        {currentSelectedUnit.name} ({currentSelectedUnit.code})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                        {currentSelectedUnit.categoryLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{currentSelectedUnit.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <strong>Exemplos no cardápio:</strong> {currentSelectedUnit.example}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmSelection(currentSelectedUnit.code)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Confirmar e Adotar Esta Unidade
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
