import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Download,
  FileSpreadsheet,
  Bell,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Building2,
  DollarSign,
  ShoppingCart,
  UserCheck,
  CreditCard,
  Sliders,
  Maximize2,
  LayoutGrid,
  Package,
  Compass,
  BarChart3,
  Target,
  Calendar,
  Receipt,
  Store,
  Crosshair,
  ChefHat,
  ArrowDownRight,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, DepartmentKey, PushAlert, UserRole, WidgetItem } from '../types/pricing';
import { USERS } from '../utils/pricingEngine';

interface HeaderProps {
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  selectedDepartment: DepartmentKey;
  onSelectDepartment: (dept: DepartmentKey) => void;
  notifications: PushAlert[];
  onMarkNotificationRead: (id: string) => void;
  onOpenReportModal: () => void;
  onExportCSV: () => void;
  onOpenCustomizer: () => void;
  onOpenFeeManager: () => void;
  onOpenAlertSettings: () => void;
  onTriggerAudit: () => void;
  isAuditing: boolean;
  onRequestPushPermission: () => void;
  layoutGridMode?: boolean;
  onToggleLayoutGridMode?: () => void;
  activeScreen?: 'dashboard' | 'catalog-studio' | 'fees';
  onSelectScreen?: (screen: 'dashboard' | 'catalog-studio' | 'fees') => void;
  totalProductsCount?: number;
  totalChannelsCount?: number;
  onOpenQuickNav?: () => void;
  totalWidgetsCount?: number;
  widgets?: WidgetItem[];
  onFocusWidget?: (widgetId: string) => void;
  onScrollToWidget?: (widgetId: string) => void;
  focusedWidgetId?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUser,
  selectedDepartment,
  onSelectDepartment,
  notifications,
  onMarkNotificationRead,
  onOpenReportModal,
  onExportCSV,
  onOpenCustomizer,
  onOpenFeeManager,
  onOpenAlertSettings,
  onTriggerAudit,
  isAuditing,
  onRequestPushPermission,
  layoutGridMode = false,
  onToggleLayoutGridMode,
  activeScreen = 'dashboard',
  onSelectScreen,
  totalProductsCount = 0,
  totalChannelsCount = 0,
  onOpenQuickNav,
  totalWidgetsCount = 0,
  widgets,
  onFocusWidget,
  onScrollToWidget,
  focusedWidgetId,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    admin: { label: 'Administrador (Geral)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    financial: { label: 'Controladoria & Custos', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    commercial: { label: 'Gerente Comercial', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    operator: { label: 'Operador de Caixa', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };

  const departmentTabs = [
    {
      id: 'all',
      dept: 'all' as DepartmentKey,
      label: 'Todos os Módulos',
      shortLabel: 'Todos',
      icon: Layers,
      activeBg: 'bg-slate-800 text-white shadow-sm border border-slate-700',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'financial',
      dept: 'financial' as DepartmentKey,
      label: 'Financeiro & CMV',
      shortLabel: 'Financeiro',
      icon: DollarSign,
      activeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'commercial',
      dept: 'commercial' as DepartmentKey,
      label: 'Comercial & Canais',
      shortLabel: 'Comercial',
      icon: ShoppingCart,
      activeBg: 'bg-violet-500/20 text-violet-300 border border-violet-500/40',
      iconColor: 'text-violet-400',
    },
    {
      id: 'operations',
      dept: 'operations' as DepartmentKey,
      label: 'Operações & PDV',
      shortLabel: 'Operações',
      icon: Building2,
      activeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      iconColor: 'text-cyan-400',
    },
  ];

  const getWidgetMeta = (widgetId: string, department: string, title: string) => {
    switch (widgetId) {
      case 'consolidated-profitability':
        return { shortTitle: 'Rentabilidade', icon: BarChart3, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'matrix-table':
        return { shortTitle: 'Planilha Margens', icon: FileSpreadsheet, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'profit-goals-dashboard':
        return { shortTitle: 'Metas & Velocímetro', icon: Target, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'cost-seasonality':
        return { shortTitle: 'Sazonalidade CMV', icon: Calendar, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'dre-breakdown':
        return { shortTitle: 'DRE Unitário', icon: Receipt, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'what-if-simulator':
        return { shortTitle: 'Simulador What-If', icon: Sliders, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'price-margin-evolution':
        return { shortTitle: 'Evolução Margens', icon: TrendingUp, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'breakeven-calc':
        return { shortTitle: 'Ponto Equilíbrio & Blindada', icon: ShieldAlert, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'ai-auditor':
        return { shortTitle: 'Auditor IA', icon: Sparkles, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' };
      case 'channel-comparison':
        return { shortTitle: 'Comparativo Canais', icon: Store, color: 'text-violet-400', border: 'hover:border-violet-500/50' };
      case 'commercial-channel-manager':
        return { shortTitle: 'Gestão de Taxas', icon: CreditCard, color: 'text-violet-400', border: 'hover:border-violet-500/50' };
      case 'competitor-radar':
        return { shortTitle: 'Radar Concorrentes', icon: Crosshair, color: 'text-violet-400', border: 'hover:border-violet-500/50' };
      case 'operations-menu-status':
        return { shortTitle: 'Painel Operacional PDV', icon: ChefHat, color: 'text-cyan-400', border: 'hover:border-cyan-500/50' };
      case 'push-feed':
        return { shortTitle: 'Alertas de Mercado', icon: Bell, color: 'text-cyan-400', border: 'hover:border-cyan-500/50' };
      default:
        return {
          shortTitle: title.split(' ')[0],
          icon: department === 'commercial' ? ShoppingCart : department === 'operations' ? Building2 : DollarSign,
          color: department === 'commercial' ? 'text-violet-400' : department === 'operations' ? 'text-cyan-400' : 'text-emerald-400',
          border: 'hover:border-slate-700',
        };
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 shadow-xl w-full">
      {/* ROW 1: MASTER COMMAND BAR (Guaranteed to fit on all standard screens at 100% zoom!) */}
      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3 w-full">
          {/* BRAND IDENTITY (Never squeezed, compact and crisp) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onSelectScreen?.('dashboard')}
              className="flex items-center gap-2.5 group text-left"
              title="Ir para a Visão Geral"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/25 text-white font-black text-lg tracking-tighter shrink-0 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                OP
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg text-white tracking-tight leading-none group-hover:text-emerald-300 transition-colors">
                    OmniPrice<span className="text-emerald-400 ml-0.5">AI</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hidden sm:inline-block">
                    Pro
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium hidden md:block leading-tight mt-0.5">
                  Precificação & CMV Delivery
                </span>
              </div>
            </button>
          </div>

          {/* SCREEN SWITCHER (Central navigation between the 3 main screens) */}
          <nav className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold shrink-0">
            {/* Tab 1: Visão Geral */}
            <button
              onClick={() => onSelectScreen?.('dashboard')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeScreen === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="Abrir Painel Geral de Widgets e Indicadores"
            >
              {activeScreen === 'dashboard' && (
                <motion.div
                  layoutId="master-active-screen-indicator"
                  className="absolute inset-0 rounded-lg bg-slate-800 border border-slate-700/80 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Layers className={`w-3.5 h-3.5 relative z-10 ${activeScreen === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="relative z-10">Visão Geral</span>
            </button>

            {/* Tab 2: Estúdio Catálogo */}
            <button
              onClick={() => onSelectScreen?.('catalog-studio')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeScreen === 'catalog-studio'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold ring-1 ring-emerald-400/50'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
              title="Abrir Estúdio Completo de Catálogo, Fichas Técnicas e Estoque"
            >
              {activeScreen === 'catalog-studio' && (
                <motion.div
                  layoutId="master-active-screen-indicator"
                  className="absolute inset-0 rounded-lg bg-emerald-600 ring-1 ring-emerald-400/50 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Package className={`w-3.5 h-3.5 relative z-10 ${activeScreen === 'catalog-studio' ? 'text-white' : 'text-emerald-400'}`} />
              <span className="relative z-10">Catálogo & Fichas</span>
              {totalProductsCount > 0 && (
                <span
                  className={`relative z-10 text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeScreen === 'catalog-studio' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {totalProductsCount}
                </span>
              )}
            </button>

            {/* Tab 3: Gestão de Taxas (Dedicated Full-Screen!) */}
            <button
              onClick={() => onSelectScreen?.('fees')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeScreen === 'fees'
                  ? 'bg-violet-600 text-white shadow-sm font-bold ring-1 ring-violet-400/50'
                  : 'text-violet-300 hover:text-violet-200 hover:bg-violet-500/10'
              }`}
              title="Abrir Tela Completa de Gestão de Taxas e Meios de Pagamento"
            >
              {activeScreen === 'fees' && (
                <motion.div
                  layoutId="master-active-screen-indicator"
                  className="absolute inset-0 rounded-lg bg-violet-600 ring-1 ring-violet-400/50 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <CreditCard className={`w-3.5 h-3.5 relative z-10 ${activeScreen === 'fees' ? 'text-white' : 'text-violet-400'}`} />
              <span className="relative z-10">Gestão de Taxas</span>
              {totalChannelsCount > 0 && (
                <span
                  className={`relative z-10 text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeScreen === 'fees' ? 'bg-violet-800 text-violet-100' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {totalChannelsCount}
                </span>
              )}
            </button>
          </nav>

          {/* ACTIONS & CONTROLS TOOLBAR (Clean, comfortable, perfectly fitted) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Primary Action: AI Pricing Audit */}
            <button
              onClick={onTriggerAudit}
              disabled={isAuditing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0 whitespace-nowrap"
              title="Executar auditoria contábil com IA sobre margens e taxas"
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isAuditing ? 'animate-spin text-cyan-200' : 'text-emerald-200'}`} />
              <span className="hidden sm:inline">{isAuditing ? 'Auditando...' : 'Auditar c/ IA'}</span>
              <span className="sm:hidden">{isAuditing ? '...' : 'IA'}</span>
            </button>

            {/* Export Group (Excel & PDF) */}
            <div className="flex items-center bg-slate-950/80 rounded-xl p-0.5 border border-slate-800 shrink-0">
              <button
                onClick={onExportCSV}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all font-semibold whitespace-nowrap"
                title="Exportar planilha completa em Excel (CSV brasileiro)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden lg:inline text-[11px]">Excel</span>
              </button>
              <div className="w-px h-3.5 bg-slate-800" />
              <button
                onClick={onOpenReportModal}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all font-semibold whitespace-nowrap"
                title="Gerar Relatório Executivo em PDF para Impressão"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden lg:inline text-[11px]">PDF</span>
              </button>
            </div>

            {/* Tool Icon Buttons (Gatilhos, Grade, Módulos) */}
            <div className="flex items-center gap-1 bg-slate-950/80 rounded-xl p-0.5 border border-slate-800 shrink-0">
              <button
                onClick={onOpenAlertSettings}
                className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-500/20 rounded-lg transition-all shrink-0"
                title="Configurar Gatilhos e Alertas em Tempo Real"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {onToggleLayoutGridMode && (
                <button
                  onClick={onToggleLayoutGridMode}
                  className={`p-1.5 rounded-lg transition-all shrink-0 ${
                    layoutGridMode
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={layoutGridMode ? 'Modo Lista 100% largura' : 'Modo Grade Executiva 2 Colunas'}
                >
                  {layoutGridMode ? <Maximize2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                </button>
              )}

              <button
                onClick={onOpenCustomizer}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all shrink-0"
                title="Personalizar Módulos Visíveis no Painel"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notifications Bell Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 text-slate-300 hover:text-white bg-slate-950/80 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all relative shrink-0"
                title="Central de Alertas e Notificações"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Central de Alertas em Tempo Real</span>
                    </div>
                    <button
                      onClick={onRequestPushPermission}
                      className="text-[10px] text-emerald-400 hover:underline font-semibold"
                    >
                      Ativar Push
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Nenhum alerta recente.</p>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => onMarkNotificationRead(notif.id)}
                          className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                            notif.read
                              ? 'bg-slate-950/40 border-slate-850 opacity-70'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                              {notif.type === 'danger' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                              {notif.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                              {notif.type === 'info' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{notif.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-snug">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Selector Pill */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-850 border border-slate-800 transition-all text-xs"
                title="Alternar Perfil de Acesso & Permissões"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {currentUser.name[0]}
                </div>
                <div className="text-left hidden sm:block max-w-[100px] xl:max-w-[130px]">
                  <span className="font-bold text-white block text-[11px] truncate leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate leading-tight">
                    {currentUser.title.split(' ')[0]}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* User Dropdown Switcher */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1 border-b border-slate-800">
                    Alternar Papel de Acesso
                  </div>
                  <div className="space-y-1">
                    {USERS.map((user) => {
                      const isSelected = user.id === currentUser.id;
                      const badge = roleLabels[user.role];
                      return (
                        <button
                          key={user.id}
                          onClick={() => {
                            onSelectUser(user);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'bg-slate-800 text-white font-semibold'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white shrink-0 text-xs">
                            {user.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="truncate text-xs">{user.name}</span>
                              {isSelected && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded border mt-0.5 ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: CONTEXTUAL SUB-BAR (Integrated, responsive and scrollable) */}
      {activeScreen === 'dashboard' ? (
        <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-1.5 border-t border-slate-800/80 bg-slate-950/95 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-inner">
          {/* Department Filter Tabs */}
          <div className="flex items-center gap-1 shrink-0">
            {departmentTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedDepartment === tab.dept;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectDepartment(tab.dept)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? tab.activeBg
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? tab.iconColor : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0 mx-1" />

          {/* Quick Drawer Trigger */}
          {onOpenQuickNav && (
            <button
              onClick={onOpenQuickNav}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-bold shrink-0 transition-all active:scale-95 whitespace-nowrap shadow-sm"
              title="Abrir gaveta de atalhos rápidos com busca de módulos"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atalhos ({totalWidgetsCount})</span>
            </button>
          )}

          {/* Horizontal Quick Shortcut Pills for Visible Widgets */}
          {widgets && widgets.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {widgets
                .filter((w) => w.visible)
                .map((w) => {
                  const meta = getWidgetMeta(w.id, w.department, w.title);
                  const Icon = meta.icon;
                  const isFocused = focusedWidgetId === w.id;

                  return (
                    <div key={w.id} className="relative flex items-center shrink-0">
                      <button
                        onClick={() => onFocusWidget?.(w.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                          isFocused
                            ? 'bg-slate-800 text-white border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/40 font-bold'
                            : `bg-slate-900/70 text-slate-300 border-slate-800/80 ${meta.border} hover:bg-slate-850 hover:text-white`
                        }`}
                        title={`Destacar ${w.title}`}
                      >
                        <Icon className={`w-3 h-3 ${meta.color} shrink-0`} />
                        <span>{meta.shortTitle}</span>
                      </button>

                      {onScrollToWidget && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onScrollToWidget(w.id);
                          }}
                          className="ml-0.5 p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                          title={`Rolar até ${w.title}`}
                        >
                          <ArrowDownRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* Sub-bar when on Catalog Studio or Fees Screen */
        <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-1.5 border-t border-slate-800/80 bg-slate-950/95 flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center gap-2 text-slate-400 font-medium truncate">
            <span className="text-slate-300 font-bold">
              {activeScreen === 'catalog-studio' ? 'Estúdio de Fichas Técnicas & CMV' : 'Gestão Centralizada de Taxas & Canais'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-400 text-[11px]">
              {activeScreen === 'catalog-studio'
                ? `${totalProductsCount} produtos cadastrados com cálculo em tempo real de margens e CMV.`
                : `${totalChannelsCount} modalidades de comissões e repasses de delivery e maquininhas.`}
            </span>
          </div>

          <button
            onClick={() => onSelectScreen?.('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all shrink-0 ml-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voltar à Visão Geral</span>
          </button>
        </div>
      )}
    </header>
  );
};
