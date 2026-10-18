import React, { useState } from 'react';
import { X, Plus, Package, Check, Trash2, Edit3, DollarSign } from 'lucide-react';
import { ProductItem } from '../types/pricing';
import { formatBRL } from '../utils/pricingEngine';

interface ProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  selectedProduct: ProductItem;
  onSelectProduct: (product: ProductItem) => void;
  onAddProduct: (product: Omit<ProductItem, 'id'>) => void;
  onDeleteProduct: (id: string) => void;
  canEditCosts: boolean;
}

export const ProductManagerModal: React.FC<ProductManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct,
  onSelectProduct,
  onAddProduct,
  onDeleteProduct,
  canEditCosts,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Lanches');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost) return;
    const costNum = parseFloat(cost);
    const priceNum = price ? parseFloat(price) : Number((costNum / 0.7).toFixed(2));
    onAddProduct({
      name,
      category,
      cost: costNum,
      currentPrice: priceNum,
      targetNetMargin: 0.25,
      estimatedMonthlyUnits: 200,
      description,
      isCustom: true,
    });
    setName('');
    setCost('');
    setPrice('');
    setDescription('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Catálogo & Ficha Técnica de Produtos</h3>
              <p className="text-xs text-slate-400">Selecione ou cadastre novos produtos para precificação.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
          {products.map((p) => {
            const isSelected = p.id === selectedProduct.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : p.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {p.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      CMV Custo: <strong className="text-slate-200">{formatBRL(p.cost)}</strong> | Preço Base:{' '}
                      <strong className="text-emerald-400">{formatBRL(p.currentPrice)}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProduct(p.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Excluir produto customizado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Ativo
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {showAddForm ? (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-950 border border-slate-700 space-y-3">
              <div className="text-xs font-bold text-white">Cadastrar Novo Produto para Precificação</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nome do Item</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Pizza Calabresa Especial"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Pizzas, Lanches, Sobremesas"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Custo Insumos / CMV (R$)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Ex: 8.50"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Preço Atual de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Opcional (calculado automático)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          ) : (
            canEditCosts && (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-2.5 rounded-2xl border border-dashed border-slate-700 hover:border-emerald-500 text-slate-400 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Produto / Prato</span>
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20"
          >
            Concluir Seleção
          </button>
        </div>
      </div>
    </div>
  );
};
