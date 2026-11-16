import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Layers,
  DollarSign,
  Package,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  Info,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Bell,
  Eye,
  Sliders,
  Smartphone,
  Building2,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { Header } from './components/Header';
import { SpreadsheetMatrix } from './components/SpreadsheetMatrix';
import { AIAuditorWidget } from './components/AIAuditorWidget';
import { ChannelComparisonWidget } from './components/ChannelComparisonWidget';
import { CompetitorRadarWidget } from './components/CompetitorRadarWidget';
import { DREWidget } from './components/DREWidget';
import { PriceMarginEvolutionWidget } from './components/PriceMarginEvolutionWidget';
import { WhatIfSimulatorWidget } from './components/WhatIfSimulatorWidget';
import { ProfitGoalsDashboardWidget } from './components/ProfitGoalsDashboardWidget';
import { CostSeasonalityWidget } from './components/CostSeasonalityWidget';
import { AlertFeedWidget } from './components/AlertFeedWidget';
import { OperationsControlWidget } from './components/OperationsControlWidget';
import { CommercialChannelManagerWidget } from './components/CommercialChannelManagerWidget';
import { BreakevenShieldedWidget } from './components/BreakevenShieldedWidget';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { CustomizerModal } from './components/CustomizerModal';
import { FeesManagementScreen } from './components/FeesManagementScreen';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { CatalogStudioScreen } from './components/CatalogStudioScreen';
import { ConsolidatedProfitabilityWidget } from './components/ConsolidatedProfitabilityWidget';
import { QuickNavDrawer } from './components/QuickNavDrawer';
import { WidgetFocusModal } from './components/WidgetFocusModal';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';
import {
  testFirestoreConnection,
  dbSeedIfEmpty,
  dbSubscribeProducts,
  dbSaveProduct,
  dbDeleteProduct,
  dbSaveProductsBatch,
  dbSaveChannels,
  dbSaveFixedExpenses,
  dbSaveCompetitors,
  dbSaveCustomCategories,
  dbSubscribeCustomCategories,
} from './lib/firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { motion, AnimatePresence } from 'motion/react';
import {
  DEFAULT_PRODUCT,
  INITIAL_PRODUCTS,
  INITIAL_CHANNELS,
  INITIAL_FIXED_EXPENSES,
  INITIAL_COMPETITORS,
  USERS,
  INITIAL_WIDGETS,
  INITIAL_NOTIFICATIONS,
  DEFAULT_ALERT_CONFIG,
  calculateSpreadsheetRow,
  SPREADSHEET_MARGINS,
  exportPricingToCSV,
  formatBRL,
  formatPercent,
  generateLocalAuditFallback,
  normalizeProduct,
} from './utils/pricingEngine';
import {
  ProductItem,
  ChannelFee,
  FixedExpenses,
  CompetitorItem,
  UserProfile,
  WidgetItem,
  PushAlert,
  DepartmentKey,
  PricingAuditResult,
  AlertTriggerConfig,
} from './types/pricing';

export default function App() {
  // State management with LocalStorage persistence where appropriate
  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem('omniprice_products');
    if (saved) {
      try {
        const parsed: ProductItem[] = JSON.parse(saved);
        return parsed.map((p) => normalizeProduct(p));
      } catch {
        return INITIAL_PRODUCTS.map((p) => normalizeProduct(p));
      }
    }
    return INITIAL_PRODUCTS.map((p) => normalizeProduct(p));
  });

  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(() => {
    const saved = localStorage.getItem('omniprice_selected_product');
    if (saved) {
      try {
        return normalizeProduct(JSON.parse(saved));
      } catch {
        return normalizeProduct(DEFAULT_PRODUCT);
      }
    }
    return normalizeProduct(DEFAULT_PRODUCT);
  });

  const [channels, setChannels] = useState<ChannelFee[]>(() => {
    const saved = localStorage.getItem('omniprice_channels');
    return saved ? JSON.parse(saved) : INITIAL_CHANNELS;
  });

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenses>(() => {
    const saved = localStorage.getItem('omniprice_fixed_expenses');
    return saved ? JSON.parse(saved) : INITIAL_FIXED_EXPENSES;
  });

  const [competitors, setCompetitors] = useState<CompetitorItem[]>(() => {
    const saved = localStorage.getItem('omniprice_competitors');
    return saved ? JSON.parse(saved) : INITIAL_COMPETITORS;
  });

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omniprice_custom_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[0]); // Admin by default
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentKey>('all');

  // Screen level navigation: 'dashboard' vs 'catalog-studio' vs 'fees' (Independent screen, zero floating cards!)
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'catalog-studio' | 'fees'>('dashboard');

  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
    const saved = localStorage.getItem('omniprice_widgets');
    if (!saved) return INITIAL_WIDGETS;
    try {
      const parsed: WidgetItem[] = JSON.parse(saved);
      const canonicalMap = new Map(INITIAL_WIDGETS.map((w) => [w.id, w]));
      const validCanonicalIds = new Set(INITIAL_WIDGETS.map((w) => w.id));

      // Expurgar qualquer entrada órfã 'shielded-pricing' ou desconhecida e desduplicar por ID
      const seen = new Set<string>();
      const deduped: WidgetItem[] = [];

      for (const w of parsed) {
        if (w.id === 'shielded-pricing') continue; // Remove explicit duplicate of breakeven
        if (!validCanonicalIds.has(w.id)) continue;
        if (!seen.has(w.id)) {
          seen.add(w.id);
          const canonical = canonicalMap.get(w.id);
          deduped.push({
            ...w,
            department: canonical?.department || w.department,
            title: canonical?.title || w.title,
            description: canonical?.description || w.description,
          });
        }
      }

      // Adicionar módulos canônicos ausentes
      for (const cw of INITIAL_WIDGETS) {
        if (!seen.has(cw.id)) {
          seen.add(cw.id);
          deduped.push(cw);
        }
      }

      return deduped;
    } catch {
      return INITIAL_WIDGETS;
    }
  });

  // Quick Navigation & Focus Spotlight State
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);
  const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);
  const [highlightedWidgetId, setHighlightedWidgetId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<PushAlert[]>(() => {
    const saved = localStorage.getItem('omniprice_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // AI Audit State
  const [auditResult, setAuditResult] = useState<PricingAuditResult | null>(null);
  const [auditNotice, setAuditNotice] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Alert Trigger Configuration
  const [alertConfig, setAlertConfig] = useState<AlertTriggerConfig>(() => {
    const saved = localStorage.getItem('omniprice_alert_config');
    return saved ? JSON.parse(saved) : DEFAULT_ALERT_CONFIG;
  });

  // Layout Display Mode (Full Width vs 2-Column Executive Grid)
  const [layoutGridMode, setLayoutGridMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('omniprice_layout_grid_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Modals state (For executive reports, fees, alerts)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isFeeManagerOpen, setIsFeeManagerOpen] = useState(false);
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState(false);

  // Database Connection State (Google Cloud Firestore)
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isDbStatusModalOpen, setIsDbStatusModalOpen] = useState<boolean>(false);

  // Firebase Firestore Live Connection, Seed and Subscription
  useEffect(() => {
    let unsubscribeProducts: (() => void) | undefined;
    let unsubscribeCategories: (() => void) | undefined;

    const setupDatabase = async () => {
      try {
        const testRes = await testFirestoreConnection();
        setIsDbConnected(testRes.connected);
        if (testRes.connected) {
          setLastSyncTime(new Date());

          // Seed database if empty with initial catalog
          await dbSeedIfEmpty(products, channels, fixedExpenses, competitors);

          // Real-time listener for products from Cloud Firestore
          unsubscribeProducts = dbSubscribeProducts((remoteProds) => {
            if (remoteProds && remoteProds.length > 0) {
              setProducts(remoteProds.map((p) => normalizeProduct(p)));
              setLastSyncTime(new Date());
            }
          });

          // Real-time listener for custom product categories
          unsubscribeCategories = dbSubscribeCustomCategories((remoteCats) => {
            setCustomCategories((prev) => {
              const merged = Array.from(new Set([...prev, ...remoteCats]));
              return merged;
            });
          });
        }
      } catch (err) {
        console.warn('Firebase initialization check:', err);
      }
    };

    setupDatabase();

    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeCategories) unsubscribeCategories();
    };
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('omniprice_layout_grid_mode', JSON.stringify(layoutGridMode));
  }, [layoutGridMode]);

  useEffect(() => {
    localStorage.setItem('omniprice_alert_config', JSON.stringify(alertConfig));
  }, [alertConfig]);

  useEffect(() => {
    localStorage.setItem('omniprice_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('omniprice_selected_product', JSON.stringify(selectedProduct));
  }, [selectedProduct]);

  useEffect(() => {
    localStorage.setItem('omniprice_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('omniprice_fixed_expenses', JSON.stringify(fixedExpenses));
  }, [fixedExpenses]);

  useEffect(() => {
    localStorage.setItem('omniprice_competitors', JSON.stringify(competitors));
  }, [competitors]);

  useEffect(() => {
    localStorage.setItem('omniprice_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('omniprice_widgets', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem('omniprice_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Initial AI Audit on load
  useEffect(() => {
    triggerAIAudit();
  }, [selectedProduct.id, selectedProduct.cost]);

  // Execute AI Audit
  const triggerAIAudit = async () => {
    setIsAuditing(true);
    try {
      const currentPricingMatrix = SPREADSHEET_MARGINS.map((m) =>
        calculateSpreadsheetRow(selectedProduct.cost, 17.49, m)
      );

      const res = await fetch('/api/ai/pricing-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            cost: Number(selectedProduct.cost) || 6.89,
            currentPrice: Number(selectedProduct.currentPrice) || 9.84,
            targetNetMargin: Number(selectedProduct.targetNetMargin) || 0.25,
          },
          channels: (channels || []).slice(0, 8),
          fixedCosts: fixedExpenses,
          currentPricingMatrix,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && data.analysis) {
          setAuditResult(data.analysis);
          setAuditNotice(data.apiNotice || null);
          return;
        }
      }

      // If response is not ok or not JSON, use local heuristic fallback seamlessly
      const fallbackAudit = generateLocalAuditFallback(selectedProduct, channels, fixedExpenses);
      setAuditResult(fallbackAudit);
      setAuditNotice('Motor heurístico local ativado.');
    } catch {
      const fallbackAudit = generateLocalAuditFallback(selectedProduct, channels, fixedExpenses);
      setAuditResult(fallbackAudit);
      setAuditNotice('Motor heurístico local ativado.');
    } finally {
      setIsAuditing(false);
    }
  };

  // Push notification permission handler
  const handleRequestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('OmniPrice AI Conectado!', {
          body: 'Notificações de variação de taxas e concorrência estão ativadas no seu navegador.',
          icon: '/favicon.ico',
        });
        setNotifications((prev) => [
          {
            id: 'notif-' + Date.now(),
            title: 'Notificações Push do Navegador Ativadas',
            message: 'Você receberá avisos em tempo real quando houver variações de preço na concorrência.',
            type: 'success',
            timestamp: 'Agora',
            read: false,
            source: 'system',
          },
          ...prev,
        ]);
      } else {
        alert('Permissão de notificações não concedida no navegador.');
      }
    } else {
      alert('Seu navegador não suporta a Web Notification API.');
    }
  };

  // Cost update
  const handleUpdateProductCost = (newCost: number) => {
    if (!currentUser.permissions.canEditCosts) {
      alert('Seu perfil atual não possui permissão para editar custos de insumos.');
      return;
    }
    const updated = { ...selectedProduct, cost: newCost };
    setSelectedProduct(updated);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    dbSaveProduct(updated).then(() => setLastSyncTime(new Date())).catch(console.error);
  };

  // Price apply
  const handleApplyRecommendedPrice = (price: number) => {
    if (!currentUser.permissions.canEditPrices) {
      alert('Seu perfil atual não possui permissão para alterar preços finais de venda.');
      return;
    }
    const updated = { ...selectedProduct, currentPrice: price };
    setSelectedProduct(updated);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    dbSaveProduct(updated).then(() => setLastSyncTime(new Date())).catch(console.error);

    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        title: 'Preço Blindado Aplicado',
        message: `Novo preço de ${formatBRL(price)} adotado para ${selectedProduct.name}. Margem real protegida contra taxas e gravada no banco de dados.`,
        type: 'success',
        timestamp: 'Agora',
        read: false,
        source: 'margin',
      },
      ...prev,
    ]);
  };

  // Global Fee Update by General Manager (Admin)
  const handleSaveChannels = (updatedChannels: ChannelFee[]) => {
    if (!currentUser.permissions.canEditFees) {
      alert('Seu perfil atual não possui permissão para alterar taxas globais da empresa.');
      return;
    }
    setChannels(updatedChannels);
    dbSaveChannels(updatedChannels).then(() => setLastSyncTime(new Date())).catch(console.error);
    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        title: 'Taxas Globais Atualizadas no Banco',
        message: 'O Gestor Geral atualizou a tabela de taxas dos aplicativos e maquininhas. Toda a matriz foi recalculada e sincronizada no Firestore.',
        type: 'success',
        timestamp: 'Agora',
        read: false,
        source: 'fee',
      },
      ...prev,
    ]);
  };

  // Test Trigger Push handler
  const handleTriggerTestPush = () => {
    const alertMsg = `Aviso Preditivo: A margem líquida calculada para o Uai Rango Online atingiu o gatilho crítico de ${alertConfig.minNetMarginPercent}%.`;
    if ('Notification' in window && Notification.permission === 'granted' && alertConfig.enableBrowserPush) {
      new Notification('OmniPrice Alerta Preditivo!', {
        body: alertMsg,
        icon: '/favicon.ico',
      });
    }

    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        title: 'Disparo de Alerta de Demonstração',
        message: alertMsg,
        type: 'danger',
        timestamp: 'Agora',
        read: false,
        source: 'margin',
      },
      ...prev,
    ]);
    alert('Alerta teste disparado com sucesso! Verifique a central de notificações.');
  };

  // Channel Fee update
  const handleUpdateChannelFee = (id: string, newTotalRate: number) => {
    if (!currentUser.permissions.canEditFees) {
      alert('Seu perfil atual não possui permissão para alterar taxas de canais.');
      return;
    }
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, totalRate: newTotalRate } : c))
    );
  };

  // Add competitor
  const handleAddCompetitor = (newComp: Omit<CompetitorItem, 'id' | 'differenceToUs' | 'threatLevel'>) => {
    const diff = ((newComp.price - selectedProduct.currentPrice) / selectedProduct.currentPrice) * 100;
    const item: CompetitorItem = {
      ...newComp,
      id: 'comp-' + Date.now(),
      differenceToUs: Number(diff.toFixed(1)),
      threatLevel: diff < -5 ? 'high' : diff < 10 ? 'medium' : 'low',
    };
    setCompetitors((prev) => [item, ...prev]);

    if (item.threatLevel === 'high') {
      setNotifications((prev) => [
        {
          id: 'notif-' + Date.now(),
          title: `Alerta Concorrente: ${item.name}`,
          message: `${item.name} está praticando ${formatBRL(item.price)} no ${item.platform} (${diff.toFixed(1)}% menor que seu preço).`,
          type: 'warning',
          timestamp: 'Agora',
          read: false,
          source: 'market',
        },
        ...prev,
      ]);
    }
  };

  // Remove competitor
  const handleRemoveCompetitor = (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  // Add product
  const handleAddProduct = (newProd: Omit<ProductItem, 'id'> | ProductItem) => {
    const id = 'id' in newProd && newProd.id ? newProd.id : 'prod-' + Date.now();
    const item: ProductItem = normalizeProduct({
      ...newProd,
      id,
    });
    setProducts((prev) => [...prev, item]);
    setSelectedProduct(item);
    dbSaveProduct(item).then(() => setLastSyncTime(new Date())).catch(console.error);
    return item;
  };

  // Update existing product (costs, recipe ingredients, stock, margins, etc.)
  const handleUpdateProduct = (updated: ProductItem) => {
    const norm = normalizeProduct(updated);
    setProducts((prev) => prev.map((p) => (p.id === norm.id ? norm : p)));
    if (selectedProduct.id === norm.id) {
      setSelectedProduct(norm);
    }
    dbSaveProduct(norm).then(() => setLastSyncTime(new Date())).catch(console.error);
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    const deletedProd = products.find((p) => p.id === id);
    const remaining = products.filter((p) => p.id !== id);
    setProducts(remaining);
    if (selectedProduct.id === id) {
      setSelectedProduct(remaining[0] || normalizeProduct(DEFAULT_PRODUCT));
    }
    dbDeleteProduct(id).then(() => setLastSyncTime(new Date())).catch(console.error);

    if (deletedProd) {
      setNotifications((prev) => [
        {
          id: 'notif-' + Date.now(),
          title: 'Produto Excluído do Catálogo',
          message: `${deletedProd.name} foi removido do catálogo e sincronizado com o banco de dados.`,
          type: 'warning',
          timestamp: 'Agora',
          read: false,
          source: 'system',
        },
        ...prev,
      ]);
    }
  };

  const handleSaveCustomCategories = (nextCategories: string[]) => {
    setCustomCategories(nextCategories);
    dbSaveCustomCategories(nextCategories).then(() => setLastSyncTime(new Date())).catch(console.error);
  };

  // Batch Import Products from Spreadsheet
  const handleBatchImportProducts = (importedProducts: ProductItem[], mode: 'merge' | 'replace') => {
    let finalProducts: ProductItem[] = [];
    if (mode === 'replace') {
      finalProducts = importedProducts;
    } else {
      const existingMap = new Map<string, ProductItem>();
      products.forEach((p) => {
        if (p.sku) existingMap.set(p.sku.toLowerCase().trim(), p);
        existingMap.set(p.name.toLowerCase().trim(), p);
      });

      const mergedList = [...products];
      for (const item of importedProducts) {
        const keySku = item.sku ? item.sku.toLowerCase().trim() : null;
        const keyName = item.name.toLowerCase().trim();
        const existing = (keySku && existingMap.get(keySku)) || existingMap.get(keyName);

        if (existing) {
          const idx = mergedList.findIndex((p) => p.id === existing.id);
          if (idx !== -1) {
            mergedList[idx] = { ...existing, ...item, id: existing.id };
          }
        } else {
          mergedList.push(item);
        }
      }
      finalProducts = mergedList;
    }

    setProducts(finalProducts);
    if (finalProducts.length > 0) {
      setSelectedProduct(finalProducts[0]);
    }
    dbSaveProductsBatch(finalProducts).then(() => setLastSyncTime(new Date())).catch(console.error);

    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        title: 'Planilha Importada',
        message: `${importedProducts.length} itens foram processados e sincronizados no catálogo via planilha.`,
        type: 'success',
        timestamp: 'Agora',
        read: false,
        source: 'market',
      },
      ...prev,
    ]);
  };

  // Cloud Firestore Sync Actions
  const handleSyncAllToCloud = async () => {
    await dbSaveProductsBatch(products);
    await dbSaveChannels(channels);
    await dbSaveFixedExpenses(fixedExpenses);
    await dbSaveCompetitors(competitors);
    setLastSyncTime(new Date());
    setIsDbConnected(true);
  };

  const handleReloadFromCloud = async () => {
    const testRes = await testFirestoreConnection();
    setIsDbConnected(testRes.connected);
    setLastSyncTime(new Date());
  };

  const handleSeedDefaultData = async () => {
    await dbSaveProductsBatch(INITIAL_PRODUCTS);
    await dbSaveChannels(INITIAL_CHANNELS);
    await dbSaveFixedExpenses(INITIAL_FIXED_EXPENSES);
    await dbSaveCompetitors(INITIAL_COMPETITORS);
    setProducts(INITIAL_PRODUCTS.map(normalizeProduct));
    setSelectedProduct(normalizeProduct(DEFAULT_PRODUCT));
    setChannels(INITIAL_CHANNELS);
    setFixedExpenses(INITIAL_FIXED_EXPENSES);
    setCompetitors(INITIAL_COMPETITORS);
    setLastSyncTime(new Date());
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = SPREADSHEET_MARGINS.map((m) =>
      calculateSpreadsheetRow(selectedProduct.cost, 17.49, m)
    );
    exportPricingToCSV(selectedProduct, 17.49, rows);
  };

  // Widget management
  const handleToggleWidget = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleMoveWidget = (id: string, direction: 'up' | 'down') => {
    const index = widgets.findIndex((w) => w.id === id);
    if (index < 0) return;
    const newWidgets = [...widgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      const temp = newWidgets[index];
      newWidgets[index] = newWidgets[targetIndex];
      newWidgets[targetIndex] = temp;
      setWidgets(newWidgets);
    }
  };

  const handleResetWidgets = () => {
    setWidgets(INITIAL_WIDGETS);
  };

  // Switch department tab smoothly with automatic scroll to top
  const handleSelectDepartment = (dept: DepartmentKey) => {
    setActiveScreen('dashboard');
    setSelectedDepartment(dept);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick jump / scroll to widget with dynamic highlight
  const handleScrollToWidget = (widgetId: string) => {
    const targetWidget = widgets.find((w) => w.id === widgetId);
    if (targetWidget && selectedDepartment !== 'all' && targetWidget.department !== selectedDepartment) {
      setSelectedDepartment('all');
    }
    setActiveScreen('dashboard');

    setTimeout(() => {
      const el = document.getElementById(widgetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedWidgetId(widgetId);
        setTimeout(() => {
          setHighlightedWidgetId(null);
        }, 2500);
      }
    }, 120);
  };

  // Filter widgets strictly by active department (or show all in 'all')
  const visibleWidgets = widgets.filter((w) => {
    if (!w.visible) return false;
    if (selectedDepartment === 'all') return true;
    return w.department === selectedDepartment;
  });

  // Render individual widget component by id (used for both feed and spotlight focus modal)
  const renderWidgetById = (widgetId: string) => {
    switch (widgetId) {
      case 'consolidated-profitability':
        return (
          <ConsolidatedProfitabilityWidget
            products={products}
            channels={channels}
            selectedProduct={selectedProduct}
            onSelectProduct={(p) => {
              setSelectedProduct(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenCatalogStudio={() => {
              setActiveScreen('catalog-studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        );

      case 'matrix-table':
        return (
          <SpreadsheetMatrix
            product={selectedProduct}
            canEditCosts={currentUser.permissions.canEditCosts}
            onUpdateProductCost={handleUpdateProductCost}
            onApplyRecommendedPrice={handleApplyRecommendedPrice}
          />
        );

      case 'ai-auditor':
        return (
          <AIAuditorWidget
            auditResult={auditResult}
            auditNotice={auditNotice}
            isLoading={isAuditing}
            onRefreshAudit={triggerAIAudit}
            product={selectedProduct}
            channels={channels}
            onApplyAdjustment={handleApplyRecommendedPrice}
          />
        );

      case 'profit-goals-dashboard':
        return (
          <ProfitGoalsDashboardWidget
            product={selectedProduct}
            fixedExpenses={fixedExpenses}
            channels={channels}
          />
        );

      case 'what-if-simulator':
        return (
          <WhatIfSimulatorWidget
            product={selectedProduct}
            channels={channels}
            canEditPrices={currentUser.permissions.canEditPrices}
            onApplyPrice={handleApplyRecommendedPrice}
          />
        );

      case 'price-margin-evolution':
        return (
          <PriceMarginEvolutionWidget
            product={selectedProduct}
            channels={channels}
          />
        );

      case 'cost-seasonality':
        return (
          <CostSeasonalityWidget
            product={selectedProduct}
          />
        );

      case 'channel-comparison':
        return (
          <ChannelComparisonWidget
            channels={channels}
            product={selectedProduct}
            canEditFees={currentUser.permissions.canEditFees}
            onUpdateChannelFee={handleUpdateChannelFee}
          />
        );

      case 'dre-breakdown':
        return (
          <DREWidget
            product={selectedProduct}
            fixedExpenses={fixedExpenses}
            selectedChannel={channels[0]}
            onUpdateFixedExpenses={setFixedExpenses}
            canEditCosts={currentUser.permissions.canEditCosts}
          />
        );

      case 'competitor-radar':
        return (
          <CompetitorRadarWidget
            competitors={competitors}
            product={selectedProduct}
            channels={channels}
            onAddCompetitor={handleAddCompetitor}
            onRemoveCompetitor={handleRemoveCompetitor}
            onApplyPrice={handleApplyRecommendedPrice}
          />
        );

      case 'breakeven-calc':
        return (
          <BreakevenShieldedWidget
            product={selectedProduct}
            channels={channels}
            fixedExpenses={fixedExpenses}
            onApplyPrice={handleApplyRecommendedPrice}
            canEditPrices={currentUser.permissions.canEditPrices}
          />
        );

      case 'commercial-channel-manager':
        return (
          <CommercialChannelManagerWidget
            channels={channels}
            product={selectedProduct}
            onOpenFeeManager={() => {
              setActiveScreen('fees');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            canEditFees={currentUser.permissions.canEditFees}
          />
        );

      case 'operations-menu-status':
        return (
          <OperationsControlWidget
            products={products}
            channels={channels}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            canEditPrices={currentUser.permissions.canEditPrices}
          />
        );

      case 'push-feed':
        return (
          <AlertFeedWidget
            notifications={notifications}
            onMarkNotificationRead={(id) =>
              setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
              )
            }
            onRequestPushPermission={handleRequestPushPermission}
            onOpenAlertSettings={() => setIsAlertSettingsOpen(true)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={handleSelectDepartment}
        notifications={notifications}
        onMarkNotificationRead={(id) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenFeeManager={() => {
          setActiveScreen('fees');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAlertSettings={() => setIsAlertSettingsOpen(true)}
        onTriggerAudit={triggerAIAudit}
        isAuditing={isAuditing}
        onRequestPushPermission={handleRequestPushPermission}
        layoutGridMode={layoutGridMode}
        onToggleLayoutGridMode={() => setLayoutGridMode((prev) => !prev)}
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        totalProductsCount={products.length}
        totalChannelsCount={channels.length}
        onOpenQuickNav={() => setIsQuickNavOpen(true)}
        totalWidgetsCount={widgets.filter((w) => w.visible).length}
        widgets={widgets}
        onFocusWidget={(widgetId) => {
          setFocusedWidgetId(widgetId);
        }}
        onScrollToWidget={handleScrollToWidget}
        focusedWidgetId={focusedWidgetId}
        onOpenDatabaseStatus={() => setIsDbStatusModalOpen(true)}
        isDbConnected={isDbConnected}
      />

      {/* Main Container - Full Fluid Width across all devices with Animated Tab Transitions */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 sm:py-6">
        <AnimatePresence mode="wait">
          {activeScreen === 'catalog-studio' ? (
            <motion.div
              key="catalog-studio"
              initial={{ opacity: 0, y: 15, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            >
              <CatalogStudioScreen
                products={products}
                selectedProduct={selectedProduct}
                channels={channels}
                customCategories={customCategories}
                onSaveCustomCategories={handleSaveCustomCategories}
                onSelectProduct={(p) => {
                  setSelectedProduct(p);
                }}
                onUpdateProduct={handleUpdateProduct}
                onAddProduct={handleAddProduct}
                onDeleteProduct={handleDeleteProduct}
                onBatchImportProducts={handleBatchImportProducts}
                onBackToDashboard={() => {
                  setActiveScreen('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          ) : activeScreen === 'fees' ? (
            <motion.div
              key="fees-management"
              initial={{ opacity: 0, y: 15, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            >
              <FeesManagementScreen
                channels={channels}
                onSaveChannels={handleSaveChannels}
                currentUser={currentUser}
                products={products}
                onBackToDashboard={() => {
                  setActiveScreen('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`dashboard-${selectedDepartment}`}
              initial={{ opacity: 0, y: 15, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="space-y-6"
            >
              {/* Active Department Filter Indicator (Only shown when a specific department is filtered) */}
              {selectedDepartment !== 'all' && (
                <div
                  id="main-department-content"
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    selectedDepartment === 'financial'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : selectedDepartment === 'commercial'
                      ? 'bg-violet-950/30 border-violet-500/30 text-violet-200'
                      : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        selectedDepartment === 'financial'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : selectedDepartment === 'commercial'
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {selectedDepartment === 'financial' ? (
                        <DollarSign className="w-4 h-4" />
                      ) : selectedDepartment === 'commercial' ? (
                        <ShoppingCart className="w-4 h-4" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm">
                        {selectedDepartment === 'financial' && 'Filtro Ativo: Financeiro & CMV'}
                        {selectedDepartment === 'commercial' && 'Filtro Ativo: Comercial & Canais de Venda'}
                        {selectedDepartment === 'operations' && 'Filtro Ativo: Operações & PDV Delivery'}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {selectedDepartment === 'financial' &&
                          `Exibindo ${visibleWidgets.length} módulos: CMV, insumos, sazonalidade, metas mensais e DRE unitário.`}
                        {selectedDepartment === 'commercial' &&
                          `Exibindo ${visibleWidgets.length} módulos: taxas de canais de delivery, radar concorrencial e repasses.`}
                        {selectedDepartment === 'operations' &&
                          `Exibindo ${visibleWidgets.length} módulos: alertas em tempo real e status operacional das lojas.`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <button
                      onClick={() => handleSelectDepartment('all')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ver Todos os Módulos (Visão Geral)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Product Selector Banner - Expansive full-width executive strip */}
              {(() => {
                const primaryChannel = channels[0] || { totalRate: 17.49, name: 'Uai Rango Online' };
                const feeAmt = (selectedProduct.currentPrice * primaryChannel.totalRate) / 100;
                const netProfitAmt = selectedProduct.currentPrice - selectedProduct.cost - feeAmt;
                const netMarginPercent = selectedProduct.currentPrice > 0 ? (netProfitAmt / selectedProduct.currentPrice) * 100 : 0;

                return (
                  <div className="w-full p-4 sm:p-5 lg:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                        <Package className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Ficha Técnica em Precificação
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {selectedProduct.category}
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {selectedProduct.active ? 'Cardápio Ativo' : 'Pausado'}
                          </span>
                        </div>
                        <h1 className="text-lg sm:text-xl xl:text-2xl font-black text-white tracking-tight mt-1">
                          {selectedProduct.name}
                        </h1>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-2xl line-clamp-1">
                          {selectedProduct.description || 'Ficha técnica conectada ao motor de precificação e viabilidade contábil.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Metrics & Actions Bar */}
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800/80 text-xs w-full sm:w-auto">
                        <div className="px-3 py-1">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Custo CMV</span>
                          <span className="font-mono font-bold text-white text-sm sm:text-base">{formatBRL(selectedProduct.cost)}</span>
                        </div>
                        <div className="px-3 py-1 border-l border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Preço Venda</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">{formatBRL(selectedProduct.currentPrice)}</span>
                        </div>
                        <div className="px-3 py-1 border-l border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Taxa ({primaryChannel.totalRate}%)</span>
                          <span className="font-mono font-bold text-rose-400 text-sm sm:text-base">- {formatBRL(feeAmt)}</span>
                        </div>
                        <div className="px-3 py-1 border-l border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Lucro Real</span>
                          <span className={`font-mono font-bold text-sm sm:text-base ${netProfitAmt > 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                            {formatBRL(netProfitAmt)} <span className="text-[10px]">({netMarginPercent.toFixed(1)}%)</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveScreen('catalog-studio');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-500 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap"
                        title="Abrir Estúdio Completo de Edição de Catálogo, Ficha Técnica e Gestão de Estoque"
                      >
                        <Package className="w-4 h-4 text-white" />
                        <span>Estúdio de Catálogo, Ficha & Estoque</span>
                        <ChevronRight className="w-4 h-4 text-emerald-200" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Widgets Layout - Full Fluid Width or 2-Column Responsive Grid */}
              <div className={layoutGridMode ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : 'space-y-6'}>
                {visibleWidgets.map((widget) => {
                  const isFullWidthWidget =
                    widget.id === 'matrix-table' ||
                    widget.id === 'consolidated-profitability' ||
                    widget.id === 'price-margin-evolution' ||
                    widget.id === 'what-if-simulator' ||
                    widget.id === 'breakeven-calc' ||
                    widget.id === 'commercial-channel-manager' ||
                    widget.id === 'operations-menu-status' ||
                    widget.id === 'push-feed';
                  const colClass = layoutGridMode && isFullWidthWidget ? 'col-span-1 xl:col-span-2' : 'w-full';

                  return (
                    <div
                      id={widget.id}
                      key={widget.id}
                      className={`${colClass} transition-all duration-700 rounded-3xl ${
                        highlightedWidgetId === widget.id
                          ? 'ring-4 ring-emerald-400 shadow-2xl shadow-emerald-500/40 scale-[1.01]'
                          : ''
                      }`}
                    >
                      {renderWidgetById(widget.id)}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-5 text-xs text-slate-400 text-center">
        <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">OmniPrice AI</span>
            <span>•</span>
            <span>Sistema Avançado de Precificação, Concorrência & Delivery</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Uai Rango • Tchau Fome • iFood Plano Básico • Balcão Direto
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        product={selectedProduct}
        channels={channels}
        fixedExpenses={fixedExpenses}
        auditResult={auditResult}
        onExportCSV={handleExportCSV}
      />

      <CustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        widgets={widgets}
        onToggleWidget={handleToggleWidget}
        onMoveWidget={handleMoveWidget}
        onResetWidgets={handleResetWidgets}
      />

      <AlertSettingsModal
        isOpen={isAlertSettingsOpen}
        onClose={() => setIsAlertSettingsOpen(false)}
        config={alertConfig}
        onSaveConfig={setAlertConfig}
        onTriggerTestPush={handleTriggerTestPush}
      />

      <DatabaseStatusModal
        isOpen={isDbStatusModalOpen}
        onClose={() => setIsDbStatusModalOpen(false)}
        isConnected={isDbConnected}
        projectId={firebaseConfig.projectId}
        databaseId={firebaseConfig.firestoreDatabaseId}
        lastSyncTime={lastSyncTime}
        totalProducts={products.length}
        totalChannels={channels.length}
        onSyncAllToCloud={handleSyncAllToCloud}
        onReloadFromCloud={handleReloadFromCloud}
        onSeedDefaultData={handleSeedDefaultData}
      />

      {/* Retractable Quick Navigation Drawer */}
      <QuickNavDrawer
        isOpen={isQuickNavOpen}
        onOpen={() => setIsQuickNavOpen(true)}
        onClose={() => setIsQuickNavOpen(false)}
        widgets={widgets}
        activeDepartment={selectedDepartment}
        onSelectDepartment={handleSelectDepartment}
        onFocusWidget={(widgetId) => {
          setFocusedWidgetId(widgetId);
        }}
        onScrollToWidget={handleScrollToWidget}
      />

      {/* Spotlight Focus Mode Modal */}
      {focusedWidgetId && (
        <WidgetFocusModal
          focusedWidget={widgets.find((w) => w.id === focusedWidgetId) || null}
          onClose={() => setFocusedWidgetId(null)}
          onScrollToWidget={handleScrollToWidget}
        >
          {renderWidgetById(focusedWidgetId)}
        </WidgetFocusModal>
      )}
    </div>
  );
}
