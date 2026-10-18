# Navegação Rápida com Modo Foco, Animações Elásticas e Desduplicação de Widgets

Plano arquitetural e de interface para implementar a navegação rápida retrátil para todos os widgets da Visão Geral com modo de foco destacado, animações dinâmicas com efeito elástico e revelação sequencial em abas, gráficos e barras ilustrativas, além da remoção definitiva do widget duplicado da Calculadora de Precificação Blindada.

### User Review & Critical Decisions

> [!IMPORTANT]
> As preferências informadas pelo usuário na fase de esclarecimento foram incorporadas como diretrizes centrais da experiência:

- **Comportamento da Navegação Rápida**: Ao clicar em qualquer widget no menu rápido, o app abrirá o widget no **Modo de Foco Destacado** (Spotlight Modal/Full Focus) com backdrop escuro translúcido, mantendo também atalho para rolagem fluida e retorno instantâneo à visão geral.
- **Disposição Visual do Menu Rápido**: **Barra Lateral Flutuante Retrátil (Quick Widget Drawer/Dock)** acessível via botão dedicado no cabeçalho e aba retrátil na lateral da tela, listando todos os widgets ativos com seus respectivos ícones, nomes e atalhos de foco.
- **Estilo de Animação**: **Dinâmica com efeito elástico e revelação sequencial** (`spring physics` com Framer Motion em abas, transições de layout, barras de progresso que se expandem com elasticidade e gráficos Recharts animados com easing refinado).
- **Desduplicação de Widgets**: Identificação e remoção da entrada redundante da "Calculadora de Precificação Blindada & Ponto de Equilíbrio", saneando o estado local (`localStorage`) e garantindo uma única instância limpa no painel.

---

### 1. Overview & Core Concept

- **O Que Faz**:
  1. Cria um menu de navegação rápida retrátil (drawer/dock lateral flutuante e atalho superior) contendo todos os módulos/widgets da tela de Visão Geral.
  2. Implementa o **Modo Foco Destacado**, permitindo ao usuário abrir qualquer widget isoladamente em tela cheia com transição suave, sem perder o contexto do dashboard.
  3. Aplica animações elásticas nos botões de abas (com indicador deslizante `layoutId`), nas barras de progresso (CMV, margens, metas, canais) e nos gráficos (Recharts com duração de 900ms, easing `ease-out` e animação elástica ao trocar de aba ou produto).
  4. Remove permanentemente a redundância da Calculadora de Precificação Blindada, mantendo o widget `breakeven-calc` consolidado e limpando referências órfãs (`shielded-pricing`).

- **Público-Alvo**: Gestores financeiros, analistas de custos e proprietários de restaurantes/delivery que precisam de agilidade para pular diretamente para métricas críticas sem perder tempo com rolagem manual em telas extensas.
- **Valor Principal**: Eficiência operacional máxima na navegação, estética visual premium com feedback físico agradável e consistência de dados sem poluição visual por widgets duplicados.

---

### 2. User Experience & Visual Design

- **Fluxo do Usuário**:
  1. No topo do aplicativo (Header), ao lado das abas departamentais, o usuário visualiza o atalho rápido "Navegação Rápida / Módulos" com contador dinâmico de widgets ativos.
  2. Uma barra flutuante retrátil na borda lateral direita (ou acionada pelo cabeçalho) expande suavemente com efeito elástico (`spring: stiffness 300, damping 25`).
  3. Ao clicar em qualquer módulo da lista:
     - O app abre o widget em **Modo Foco Destacado**, elevando-o sobre a interface com fundo escurecido, ações de maximizar/fechar e atalho para rolar até sua posição no feed.
  4. Ao alternar entre as abas principais (Visão Geral, Financeiro, Comercial, Operações):
     - Um pill indicador com `layoutId="activeTabPill"` desliza elasticamente entre as opções.
     - O conteúdo da tela faz transição suave com leve escala (`0.98 -> 1.0`) e opacidade.
  5. Todas as barras ilustrativas (barras de progresso do CMV, composição do DRE, barras de canais de venda e velocímetro de metas) animam com preenchimento elástico da esquerda para a direita.
  6. Todos os gráficos (Recharts em Evolução de Preços, Sazonalidade de Custos, Rentabilidade Consolidada e Canais) animam com efeito de desenho fluido e barras crescentes.

- **Identidade Visual & Cores**:
  - *Tema Base*: Slate-950 (`#020617`), Slate-900 (`#0f172a`) e Slate-800 (`#1e293b`).
  - *Acentos*: Esmeralda (`#10b981`), Ciano (`#06b6d4`), Violeta (`#8b5cf6`) e Âmbar (`#f59e0b`).
  - *Tipografia*: Plus Jakarta Sans para interface e títulos; JetBrains Mono com números tabulares (`tabular-nums`) para dados financeiros.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Modo de Foco Destacado vs. Rolagem Simples**
  - *Abordagem Escolhida*: O clique no atalho abre o widget em um modal/spotlight de foco imersivo, com opção explícita de "Rolar até o widget no painel" e "Fechar foco".
  - *Por quê*: Responde diretamente à escolha do usuário no turno de esclarecimento, permitindo operar um simulador ou matriz sem distrações visuais da página longa.
  - *Alternativa Considerada*: Apenas rolagem suave com âncora `scrollIntoView` (mantida como opção secundária complementar).

- **Decisão 2: Barra Lateral Flutuante Retrátil para os Atalhos**
  - *Abordagem Escolhida*: Um botão flutuante discreto com badge lateral (com atalho no Header) que abre uma gaveta deslizante com a lista completa e categorizada de todos os widgets ativos.
  - *Por quê*: Não polui o topo horizontal com 14 botões espremidos, garantindo legibilidade perfeita e conformidade estrita com o Top Bar Contract (sem quebras de linha ou poluição visual).

- **Decisão 3: Desduplicação do Widget de Precificação Blindada**
  - *Abordagem Escolhida*: Sanear a lista `INITIAL_WIDGETS` e o hidratador de `localStorage` em `App.tsx` para garantir que `breakeven-calc` seja a única chave válida, expurgando `shielded-pricing` do array e desduplicando qualquer array gravado no navegador do usuário.
  - *Por quê*: Resolve a duplicidade mesmo para usuários que já abriram o app e possuem o estado salvo em cache.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Main Controller)                       │
├────────────────────────────────────────────────────────────────────────┤
│  State:                                                                │
│  - widgets: WidgetItem[] (Deduplicated: single breakeven-calc)         │
│  - focusedWidgetId: string | null (Spotlight Focus Mode)               │
│  - isQuickNavOpen: boolean (Retractable Quick Nav Drawer)              │
│  - selectedDepartment: DepartmentKey (Animated Tab Navigation)         │
├──────────────────┬─────────────────────────────┬───────────────────────┤
│                  │                             │                       │
│  ▼               ▼                             ▼                       ▼
┌──────────────┐ ┌───────────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Header.tsx  │ │ QuickNavDrawer.tsx        │ │ Widget Focus Overlay │ │ Animated Dashboard   │
│  - Animated  │ │ - Retractable floating    │ │ - Spotlight view for │ │ - Animated Tabs      │
│    Tabs      │ │   sidebar                 │ │   selected widget    │ │ - Motion Cards       │
│  - Quick Nav │ │ - All widgets grouped by  │ │ - Full interactive   │ │ - Animated Recharts  │
│    Trigger   │ │   department              │ │   state              │ │ - Animated Progress  │
│  - Motion    │ │ - Focus & Jump triggers   │ │ - Smooth escape/exit │ │   Bars               │
│    Pill      │ └───────────────────────────┘ └──────────────────────┘ └──────────────────────┘
└──────────────┘
```

#### Mapeamento de Modificações por Arquivo:
1. `src/utils/pricingEngine.ts`:
   - Remover qualquer duplicata residual de `shielded-pricing` em `INITIAL_WIDGETS`.
   - Garantir que `breakeven-calc` seja o identificador único canônico.
2. `src/components/Header.tsx`:
   - Adicionar animação elástica nas abas de departamento (`motion.div` com `layoutId="activeTabIndicator"` e transições dinâmicas).
   - Adicionar botão de acesso rápido "Atalhos de Módulos" que abre a barra lateral retrátil.
3. `src/components/QuickNavDrawer.tsx` (Novo componente):
   - Gaveta lateral flutuante retrátil com lista de todos os widgets da Visão Geral, agrupados por departamento com ícones e status de visibilidade.
   - Botões para "Focar Widget" e "Rolar até o Widget".
4. `src/components/WidgetFocusModal.tsx` (Novo componente):
   - Renderizador em modo de foco destacado com animação de escala e opacidade para o widget selecionado.
5. `src/App.tsx`:
   - Integrar `QuickNavDrawer` e `WidgetFocusModal`.
   - Adicionar filtro de desduplicação robusto no carregamento inicial de `widgets` em `localStorage`.
   - Implementar transição animada entre as abas com `motion.div` e `AnimatePresence`.
6. Componentes de Widgets com gráficos e barras ilustrativas:
   - `SpreadsheetMatrix.tsx`: Barras de margem com animação de largura elástica.
   - `DREWidget.tsx`: Barras de CMV, Taxas e Lucro com preenchimento animado via Framer Motion.
   - `ConsolidatedProfitabilityWidget.tsx`: Gráficos Recharts com animação ativada e barras de progresso animadas.
   - `PriceMarginEvolutionWidget.tsx`: Gráficos Recharts de linha/área com animação suave e transição elástica.
   - `CostSeasonalityWidget.tsx`: Recharts de sazonalidade com animação contínua.
   - `ProfitGoalsDashboardWidget.tsx`: Animação de velocímetro/gauge e barras de meta.
   - `ChannelComparisonWidget.tsx`: Barras de taxas e margens animadas.
