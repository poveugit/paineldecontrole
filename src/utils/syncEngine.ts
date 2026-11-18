import {
  ChannelFee,
  ExternalSyncConfig,
  ExternalSyncDiffItem,
  ExternalSyncProductInput,
  ExternalSyncRunLog,
  ProductItem,
} from '../types/pricing';
import { normalizeProduct, normalizeSearchText } from './pricingEngine';

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return cleaned || `item-${Date.now()}`;
}

export function generateSyncToken(): string {
  const bytes = new Uint8Array(18);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `omni_sl_${hex}`;
}

export function createDefaultSyncConfig(defaultChannelId = 'direct-zero'): ExternalSyncConfig {
  return {
    id: 'external_sync_config',
    enabled: true,
    sourceName: 'SuperLuna Supermercados',
    sourceUrl: 'https://www.superlunasupermercados.com.br/',
    storeBranchLabel: 'SuperLuna — Loja da Cidade',
    apiToken: generateSyncToken(),
    autoCreateNew: true,
    autoUpdateCost: true,
    autoRecalculateSellingPrice: true,
    defaultTargetMargin: 0.25,
    defaultTargetProfitBRL: 0,
    referenceChannelId: defaultChannelId,
    priceRounding: '90',
    minPriceChangeAlertPercent: 1,
    targetPaths: ['/p/categoria/4750/mercearia'],
  };
}

export function parseTargetPathsInput(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^['"`]+/, '')
        .replace(/['"`]+,?\s*$/, '')
        .replace(/,+\s*$/, '')
        .trim()
    )
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'));
}

export function parseMonetaryValue(val: unknown): number {
  if (typeof val === 'number') {
    return isFinite(val) && val > 0 ? Number(val.toFixed(2)) : 0;
  }
  if (typeof val !== 'string') return 0;
  let cleaned = val.replace(/R\$/gi, '').replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return 0;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isFinite(num) && num > 0 ? Number(num.toFixed(2)) : 0;
}

export function inferUnitFromName(name: string): string {
  const lower = normalizeSearchText(name);
  if (/\b\d+\s*kg\b|\bkg\b/.test(lower)) return 'kg';
  if (/\b\d+\s*g\b|\b\d+gr\b/.test(lower)) return 'un';
  if (/\b\d+\s*l\b|\blitro\b/.test(lower)) return 'l';
  if (/\b350\s*ml\b|\blata\b/.test(lower)) return 'lata';
  if (/\b\d+\s*ml\b/.test(lower)) return 'un';
  if (/\bcx\b|\bcaixa\b|\bfardo\b|\bpct\b|\bpacote\b/.test(lower)) return 'pct';
  return 'un';
}

export function inferCategoryFromName(name: string, fallback = 'Mercearia'): string {
  const lower = normalizeSearchText(name);
  if (/coca|guarana|fanta|sprite|refrigerante|suco|agua|cerveja|vinho|energetico|leite/.test(lower)) {
    return 'Bebidas';
  }
  if (/arroz|feijao|acucar|oleo|azeite|macarrao|farinha|cafe|sal|molho|tempero/.test(lower)) {
    return 'Mercearia';
  }
  if (/carne|frango|bovino|suino|picanha|alcatra|linguica|salsicha|bacon|peixe/.test(lower)) {
    return 'Açougue & Frios';
  }
  if (/queijo|mussarela|presunto|requeijao|manteiga|iogurte|mortadela/.test(lower)) {
    return 'Laticínios & Frios';
  }
  if (/sabao|detergente|amaciante|agua sanitaria|desinfetante|papel higienico|limpador/.test(lower)) {
    return 'Limpeza & Higiene';
  }
  if (/banana|maca|tomate|cebola|batata|alho|laranja|limao|hortifruti/.test(lower)) {
    return 'Hortifruti';
  }
  if (/biscoito|bolacha|chocolate|bombon|salgadinho|doces|sorvete/.test(lower)) {
    return 'Doces & Snacks';
  }
  return fallback;
}

export function computeResaleSellingPrice(
  cost: number,
  targetNetMargin: number,
  channelFeeRatePercent: number,
  rounding: 'none' | '90' | '99' = 'none',
  targetNetProfitBRL?: number
): number {
  const safeCost = Math.max(0, Number(cost) || 0);
  const fixedProfitBRL =
    typeof targetNetProfitBRL === 'number' && isFinite(targetNetProfitBRL) && targetNetProfitBRL > 0
      ? targetNetProfitBRL
      : 0;
  if (safeCost <= 0 && fixedProfitBRL <= 0) return 0;

  const feeDecimal = Math.min(0.60, Math.max(0, (Number(channelFeeRatePercent) || 0) / 100));
  let rawPrice = 0;

  if (fixedProfitBRL > 0) {
    const denominator = 1 - feeDecimal;
    rawPrice = denominator > 0.02 ? (safeCost + fixedProfitBRL) / denominator : safeCost + fixedProfitBRL;
  } else {
    const marginDecimal = Math.min(0.85, Math.max(0.01, Number(targetNetMargin) || 0.25));
    const denominator = 1 - marginDecimal - feeDecimal;
    rawPrice = denominator > 0.05 ? safeCost / denominator : safeCost * 2.5;
  }

  if (rounding === '90' && rawPrice >= 1) {
    const base90 = Math.floor(rawPrice) + 0.9;
    rawPrice = base90 >= rawPrice ? base90 : Math.floor(rawPrice) + 1.9;
  } else if (rounding === '99' && rawPrice >= 1) {
    const base99 = Math.floor(rawPrice) + 0.99;
    rawPrice = base99 >= rawPrice ? base99 : Math.floor(rawPrice) + 1.99;
  }

  return Number(rawPrice.toFixed(2));
}

function normalizeIncomingItem(raw: Record<string, unknown>): ExternalSyncProductInput | null {
  const name = String(
    raw.name ??
      raw.nome ??
      raw.title ??
      raw.titulo ??
      raw.descricao ??
      raw.description ??
      raw.produto ??
      ''
  ).trim();
  if (!name) return null;

  const regularPrice = parseMonetaryValue(
    raw.price ?? raw.preco ?? raw.valor ?? raw.precoVenda ?? raw.precoPor ?? raw.preco_de
  );
  const promoPrice = parseMonetaryValue(
    raw.promoPrice ?? raw.precoPromocao ?? raw.preco_promocao ?? raw.precoOferta ?? raw.oferta
  );

  const effectivePrice =
    promoPrice > 0 && (regularPrice <= 0 || promoPrice < regularPrice)
      ? promoPrice
      : regularPrice;

  if (effectivePrice <= 0) return null;

  const rawSku = raw.sku ?? raw.codigo ?? raw.codigoBarras ?? raw.ean ?? raw.gtin ?? raw.code ?? raw.id;
  const rawExternalId = raw.externalId ?? raw.id ?? raw.codigo ?? raw.sku ?? raw.ean;

  return {
    externalId: rawExternalId ? String(rawExternalId).trim() : undefined,
    sku: rawSku ? String(rawSku).trim() : undefined,
    ean: raw.ean ? String(raw.ean).trim() : undefined,
    name,
    category: raw.category
      ? String(raw.category).trim()
      : raw.categoria
      ? String(raw.categoria).trim()
      : undefined,
    price: effectivePrice,
    promoPrice: promoPrice > 0 ? promoPrice : undefined,
    unit: raw.unit ? String(raw.unit).trim() : raw.unidade ? String(raw.unidade).trim() : undefined,
    url: raw.url ? String(raw.url).trim() : raw.link ? String(raw.link).trim() : undefined,
    inStock: typeof raw.inStock === 'boolean' ? raw.inStock : true,
    storeBranch: raw.storeBranch ? String(raw.storeBranch).trim() : undefined,
  };
}

export function parseExternalCatalogPayload(rawTextOrArray: string | unknown[]): ExternalSyncProductInput[] {
  if (Array.isArray(rawTextOrArray)) {
    return rawTextOrArray
      .map((item) => (item && typeof item === 'object' ? normalizeIncomingItem(item as Record<string, unknown>) : null))
      .filter((x): x is ExternalSyncProductInput => x !== null);
  }

  const trimmed = String(rawTextOrArray || '').trim();
  if (!trimmed) return [];

  // 1. JSON Format (Array or Wrapper Object)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.products)
        ? parsed.products
        : Array.isArray(parsed?.items)
        ? parsed.items
        : Array.isArray(parsed?.produtos)
        ? parsed.produtos
        : [];
      return list
        .map((item: unknown) =>
          item && typeof item === 'object' ? normalizeIncomingItem(item as Record<string, unknown>) : null
        )
        .filter((x: ExternalSyncProductInput | null): x is ExternalSyncProductInput => x !== null);
    } catch {
      // Fall through to tabular parser
    }
  }

  // 2. CSV / TSV / Pipe-delimited Table
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const separator = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(';')
    ? ';'
    : firstLine.includes('|')
    ? '|'
    : ',';

  const splitRow = (line: string): string[] => {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === separator && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  };

  const firstCols = splitRow(lines[0]).map((c) => normalizeSearchText(c));
  const hasHeader =
    firstCols.some((c) => c.includes('nome') || c.includes('produto') || c.includes('name')) ||
    firstCols.some((c) => c.includes('preco') || c.includes('price') || c.includes('valor'));

  const startIndex = hasHeader ? 1 : 0;
  const colIdx = {
    sku: firstCols.findIndex((c) => c.includes('sku') || c.includes('codigo') || c.includes('ean') || c.includes('barra')),
    name: firstCols.findIndex((c) => c.includes('nome') || c.includes('produto') || c.includes('name') || c.includes('titulo')),
    price: firstCols.findIndex((c) => (c.includes('preco') || c.includes('price') || c.includes('valor')) && !c.includes('promo')),
    promo: firstCols.findIndex((c) => c.includes('promo') || c.includes('oferta')),
    category: firstCols.findIndex((c) => c.includes('categ') || c.includes('depto') || c.includes('secao')),
    unit: firstCols.findIndex((c) => c.includes('unid') || c === 'un' || c === 'unit'),
    url: firstCols.findIndex((c) => c.includes('url') || c.includes('link')),
  };

  const results: ExternalSyncProductInput[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length < 2) continue;

    let rawObj: Record<string, unknown>;
    if (hasHeader) {
      rawObj = {
        sku: colIdx.sku >= 0 ? cols[colIdx.sku] : undefined,
        name: colIdx.name >= 0 ? cols[colIdx.name] : cols[0],
        price: colIdx.price >= 0 ? cols[colIdx.price] : cols[1],
        promoPrice: colIdx.promo >= 0 ? cols[colIdx.promo] : undefined,
        category: colIdx.category >= 0 ? cols[colIdx.category] : undefined,
        unit: colIdx.unit >= 0 ? cols[colIdx.unit] : undefined,
        url: colIdx.url >= 0 ? cols[colIdx.url] : undefined,
      };
    } else if (cols.length >= 3 && parseMonetaryValue(cols[2]) > 0) {
      rawObj = {
        sku: cols[0],
        name: cols[1],
        price: cols[2],
        category: cols[3],
        unit: cols[4],
      };
    } else {
      rawObj = {
        name: cols[0],
        price: cols[1],
        category: cols[2],
      };
    }

    const normalized = normalizeIncomingItem(rawObj);
    if (normalized) results.push(normalized);
  }

  return results;
}

export function reconcileExternalCatalog(
  existingProducts: ProductItem[],
  incomingItems: ExternalSyncProductInput[],
  channels: ChannelFee[],
  config: ExternalSyncConfig,
  trigger: 'api_webhook' | 'manual_import' | 'browser_script'
): {
  updatedProducts: ProductItem[];
  productsToSave: ProductItem[];
  diffItems: ExternalSyncDiffItem[];
  runLog: ExternalSyncRunLog;
} {
  const refChannel =
    config.referenceChannelId === 'direct-zero'
      ? null
      : channels.find((c) => c.id === config.referenceChannelId) || channels[0] || null;
  const feeRate = refChannel ? Number(refChannel.totalRate) || 0 : 0;
  const nowIso = new Date().toISOString();

  // Deduplicate incoming items by externalId/sku/normalized name (latest wins)
  const dedupedMap = new Map<string, ExternalSyncProductInput>();
  for (const item of incomingItems) {
    const key =
      (item.externalId && `ext:${normalizeSearchText(item.externalId)}`) ||
      (item.sku && `sku:${normalizeSearchText(item.sku)}`) ||
      `name:${normalizeSearchText(item.name)}`;
    dedupedMap.set(key, item);
  }
  const uniqueIncoming = Array.from(dedupedMap.values());

  const nextProducts = [...existingProducts];
  const byExternalId = new Map<string, number>();
  const bySku = new Map<string, number>();
  const byName = new Map<string, number>();

  nextProducts.forEach((p, idx) => {
    if (p.externalId) byExternalId.set(normalizeSearchText(p.externalId), idx);
    if (p.sku) bySku.set(normalizeSearchText(p.sku), idx);
    byName.set(normalizeSearchText(p.name), idx);
  });

  const productsToSaveMap = new Map<string, ProductItem>();
  const diffItems: ExternalSyncDiffItem[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let priceIncreases = 0;
  let priceDecreases = 0;

  for (let i = 0; i < uniqueIncoming.length; i++) {
    const item = uniqueIncoming[i];
    const newCost = Number(item.price.toFixed(2));
    if (newCost <= 0) continue;

    const extKey = item.externalId ? normalizeSearchText(item.externalId) : '';
    const skuKey = item.sku ? normalizeSearchText(item.sku) : '';
    const nameKey = normalizeSearchText(item.name);

    let matchIdx = -1;
    if (extKey && byExternalId.has(extKey)) matchIdx = byExternalId.get(extKey)!;
    else if (skuKey && bySku.has(skuKey)) matchIdx = bySku.get(skuKey)!;
    else if (byName.has(nameKey)) matchIdx = byName.get(nameKey)!;

    if (matchIdx !== -1) {
      const existing = nextProducts[matchIdx];
      const oldCost = Number(existing.cost) || 0;
      const oldPrice = Number(existing.currentPrice) || 0;
      const costDiff = Number((newCost - oldCost).toFixed(2));
      const diffPercent = oldCost > 0 ? Number((((newCost - oldCost) / oldCost) * 100).toFixed(2)) : 0;

      if (Math.abs(costDiff) >= 0.01 && config.autoUpdateCost) {
        const marginToUse = Number(existing.targetNetMargin) || config.defaultTargetMargin || 0.25;
        const configProfitBRL =
          typeof config.defaultTargetProfitBRL === 'number' && config.defaultTargetProfitBRL > 0
            ? config.defaultTargetProfitBRL
            : undefined;
        const effectiveProfitBRL =
          configProfitBRL ??
          (typeof existing.targetNetProfitBRL === 'number' && existing.targetNetProfitBRL > 0
            ? existing.targetNetProfitBRL
            : undefined);
        const channelFeeForProd = existing.referenceChannelId
          ? channels.find((c) => c.id === existing.referenceChannelId)?.totalRate ?? feeRate
          : feeRate;

        const recalculatedPrice = config.autoRecalculateSellingPrice
          ? computeResaleSellingPrice(
              newCost,
              marginToUse,
              channelFeeForProd,
              config.priceRounding,
              effectiveProfitBRL
            )
          : oldPrice;

        const updatedProduct = normalizeProduct({
          ...existing,
          cost: newCost,
          previousCost: oldCost,
          currentPrice: recalculatedPrice,
          targetNetProfitBRL: effectiveProfitBRL,
          costMethod: 'manual',
          externalSource: 'superluna',
          externalId: item.externalId || existing.externalId || item.sku,
          externalUrl: item.url || existing.externalUrl,
          lastCostSyncAt: nowIso,
          ...(item.inStock !== undefined ? { active: item.inStock } : {}),
        });

        nextProducts[matchIdx] = updatedProduct;
        productsToSaveMap.set(updatedProduct.id, updatedProduct);
        updatedCount++;

        const action = costDiff > 0 ? 'cost_increased' : 'cost_decreased';
        if (costDiff > 0) priceIncreases++;
        else priceDecreases++;

        diffItems.push({
          action,
          productId: updatedProduct.id,
          sku: updatedProduct.sku || '',
          name: updatedProduct.name,
          category: updatedProduct.category,
          oldCost,
          newCost,
          oldPrice,
          newPrice: updatedProduct.currentPrice,
          diffPercent,
        });
      } else {
        unchangedCount++;
        // Link externalId if missing on matched product
        if (!existing.externalId && (item.externalId || item.sku)) {
          const linked = normalizeProduct({
            ...existing,
            externalSource: 'superluna',
            externalId: item.externalId || item.sku,
            externalUrl: item.url || existing.externalUrl,
            lastCostSyncAt: nowIso,
          });
          nextProducts[matchIdx] = linked;
          productsToSaveMap.set(linked.id, linked);
        }
        diffItems.push({
          action: 'unchanged',
          productId: existing.id,
          sku: existing.sku || '',
          name: existing.name,
          category: existing.category,
          oldCost,
          newCost,
          oldPrice,
          newPrice: oldPrice,
          diffPercent: 0,
        });
      }
    } else if (config.autoCreateNew) {
      const rawIdBase = item.externalId || item.sku || nameKey.slice(0, 24);
      const id = sanitizeFirestoreId(`prod-sl-${rawIdBase}-${Math.abs(hashShort(nameKey))}`);
      const sku = (item.sku || item.externalId || `SL-${Math.abs(hashShort(nameKey))}`).toUpperCase().slice(0, 24);
      const category = item.category || inferCategoryFromName(item.name);
      const unit = item.unit || inferUnitFromName(item.name);
      const configProfitBRL =
        typeof config.defaultTargetProfitBRL === 'number' && config.defaultTargetProfitBRL > 0
          ? config.defaultTargetProfitBRL
          : undefined;
      const sellingPrice = computeResaleSellingPrice(
        newCost,
        config.defaultTargetMargin,
        feeRate,
        config.priceRounding,
        configProfitBRL
      );

      const newProduct = normalizeProduct({
        id,
        sku,
        name: item.name,
        category,
        cost: newCost,
        previousCost: newCost,
        currentPrice: sellingPrice,
        targetNetMargin: config.defaultTargetMargin,
        targetNetProfitBRL: configProfitBRL,
        estimatedMonthlyUnits: 0,
        unit,
        currentStock: 0,
        minStock: 5,
        maxStock: 100,
        costMethod: 'manual',
        description: `Importado automaticamente de ${config.sourceName} (${config.storeBranchLabel}).`,
        isCustom: true,
        active: item.inStock ?? true,
        ingredients: [],
        stockHistory: [],
        referenceChannelId: config.referenceChannelId === 'direct-zero' ? undefined : config.referenceChannelId,
        externalSource: 'superluna',
        externalId: item.externalId || item.sku || sku,
        externalUrl: item.url,
        lastCostSyncAt: nowIso,
      });

      const insertedIdx = nextProducts.length;
      nextProducts.push(newProduct);
      if (newProduct.externalId) byExternalId.set(normalizeSearchText(newProduct.externalId), insertedIdx);
      if (newProduct.sku) bySku.set(normalizeSearchText(newProduct.sku), insertedIdx);
      byName.set(normalizeSearchText(newProduct.name), insertedIdx);

      productsToSaveMap.set(newProduct.id, newProduct);
      createdCount++;

      diffItems.push({
        action: 'created',
        productId: newProduct.id,
        sku: newProduct.sku || '',
        name: newProduct.name,
        category: newProduct.category,
        oldCost: null,
        newCost,
        oldPrice: null,
        newPrice: newProduct.currentPrice,
        diffPercent: 0,
      });
    }
  }

  // Keep change log compact (prioritize real price changes & creations, max 200 entries in runLog)
  const prioritizedChanges = [
    ...diffItems.filter((d) => d.action !== 'unchanged'),
    ...diffItems.filter((d) => d.action === 'unchanged').slice(0, 25),
  ].slice(0, 200);

  const runLog: ExternalSyncRunLog = {
    id: `sync-${Date.now()}`,
    timestamp: nowIso,
    source: 'superluna',
    sourceLabel: config.sourceName,
    trigger,
    totalReceived: uniqueIncoming.length,
    createdCount,
    updatedCount,
    unchangedCount,
    priceIncreases,
    priceDecreases,
    changes: prioritizedChanges,
  };

  return {
    updatedProducts: nextProducts,
    productsToSave: Array.from(productsToSaveMap.values()),
    diffItems,
    runLog,
  };
}

function hashShort(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h % 1000000;
}

export function buildBrowserExtractorScript(webhookUrl: string, apiToken: string): string {
  return `// ============================================================================
// EXTRATOR 1-CLIQUE SUPERLUNA -> OMNIPRICE AI
// 1. Abra https://www.superlunasupermercados.com.br/ no seu navegador
// 2. Selecione sua cidade/filial e navegue na categoria ou busca desejada
// 3. Clique em "Carregar mais" / role a página até exibir todos os produtos
// 4. Abra o Console (F12 -> Console), cole este código e aperte ENTER
// ============================================================================
(async function () {
  const WEBHOOK_URL = ${JSON.stringify(webhookUrl)};
  const SYNC_TOKEN = ${JSON.stringify(apiToken)};

  const parsePrice = (txt) => {
    const m = String(txt || '').match(/R\\$\\s*([0-9.]+,[0-9]{2})/);
    if (!m) return 0;
    return parseFloat(m[1].replace(/\\./g, '').replace(',', '.')) || 0;
  };

  const detectPageCategory = () => {
    const slugMatch = location.pathname.match(/\\/categoria\\/\\d+\\/([^/?#]+)/i);
    if (slugMatch && slugMatch[1]) {
      const slug = decodeURIComponent(slugMatch[1]).toLowerCase();
      if (slug.includes('mercearia')) return 'Mercearia';
      if (slug.includes('bebida')) return 'Bebidas';
      if (slug.includes('hortifruti') || slug.includes('feira')) return 'Hortifruti';
      if (slug.includes('acougue') || slug.includes('carne')) return 'Açougue & Frios';
      if (slug.includes('frio') || slug.includes('laticin')) return 'Laticínios & Frios';
      if (slug.includes('limpeza')) return 'Limpeza & Higiene';
      if (slug.includes('higiene') || slug.includes('perfumaria') || slug.includes('beleza')) return 'Limpeza & Higiene';
      if (slug.includes('padaria') || slug.includes('confeitaria')) return 'Padaria & Confeitaria';
      if (slug.includes('biscoito') || slug.includes('doce') || slug.includes('bomboniere')) return 'Doces & Snacks';
      if (slug.includes('pet')) return 'Pet Shop';
      return slug.split(/[-_]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    const h1 = document.querySelector('h1, .category-title, .breadcrumb li:last-child')?.textContent?.trim();
    if (h1 && h1.length >= 3 && h1.length <= 45) return h1;
    return undefined;
  };

  const pageCategory = detectPageCategory();
  const cards = Array.from(document.querySelectorAll('product-item, .product-item, [class*="product-item"]'));
  const seen = new Set();
  const products = [];

  for (const card of cards) {
    const titleEl = card.querySelector('.product-text-dt, h2, h3, h4, .product-name, a[title]');
    const rawName = (titleEl?.getAttribute('title') || titleEl?.textContent || '').replace(/\\s+/g, ' ').trim();
    if (!rawName || rawName.length < 3) continue;

    const codeEl = card.querySelector('.product-cdg');
    const rawCode = (codeEl?.textContent || '').replace(/[^0-9A-Za-z_-]/g, '').trim();

    const promoEl = card.querySelector('.product-price-promocao, .preco-promocao');
    const regularEl = card.querySelector('.product-price-car, .product-price-small, .info-produto');
    const promoPrice = parsePrice(promoEl?.textContent);
    const regularPrice = parsePrice(regularEl?.textContent || card.textContent);
    const price = promoPrice > 0 ? promoPrice : regularPrice;
    if (price <= 0) continue;

    const linkEl = card.querySelector('a[href]');
    const url = linkEl ? new URL(linkEl.getAttribute('href'), location.origin).href : location.href;
    const dedupKey = (rawCode || rawName.toLowerCase());
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    products.push({
      externalId: rawCode || undefined,
      sku: rawCode || undefined,
      name: rawName,
      category: pageCategory,
      price,
      promoPrice: promoPrice > 0 ? promoPrice : undefined,
      url
    });
  }

  if (products.length === 0) {
    console.warn('[OmniPrice] Nenhum produto encontrado nesta tela. Role a lista de produtos ou abra uma categoria.');
    return;
  }

  console.log('[OmniPrice] Extraídos ' + products.length + ' produtos da tela atual:', products);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': SYNC_TOKEN
      },
      body: JSON.stringify({ trigger: 'browser_script', source: 'superluna', products })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log('%c[OmniPrice] Sincronização concluída!', 'color:#10b981;font-weight:bold', data.run);
      alert('OmniPrice AI: ' + products.length + ' produtos sincronizados com sucesso!');
      return;
    }
    throw new Error(data.error || 'Erro HTTP ' + res.status);
  } catch (err) {
    console.warn('[OmniPrice] Envio direto bloqueado pela política de CORS/CSP do site. Gerando download JSON...', err);
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'superluna-catalogo-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  }
})();`;
}

export function buildPlaywrightCollectorScript(
  webhookUrl: string,
  apiToken: string,
  sourceUrl: string,
  targetPaths?: string[]
): string {
  const safePaths =
    targetPaths && targetPaths.length > 0
      ? targetPaths
      : ['/p/categoria/4750/mercearia'];

  return `// ============================================================================
// ROBÔ COLETOR AUTOMÁTICO 24/7 — SUPERLUNA -> OMNIPRICE AI
// Instalação única: npm init -y && npm install playwright && npx playwright install chromium
// 1ª execução (escolher cidade/filial): node coletor-superluna.mjs --configurar
// Execuções 24/7 (invisível):            node coletor-superluna.mjs
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const TARGET_URL = ${JSON.stringify(sourceUrl || 'https://www.superlunasupermercados.com.br/')};
const WEBHOOK_URL = ${JSON.stringify(webhookUrl)};
const SYNC_TOKEN = ${JSON.stringify(apiToken)};

// IMPORTANTE: cada link ou rota abaixo precisa ficar ENTRE ASPAS e separado por vírgula
const TARGET_PATHS = ${JSON.stringify(safePaths, null, 2)};

const args = process.argv.slice(2);
const isSetupMode = args.includes('--configurar') || args.includes('--setup');
const isVisibleMode = isSetupMode || args.includes('--visivel');
const PROFILE_DIR = path.resolve(process.cwd(), 'perfil-superluna');

function waitEnter(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(promptText, () => {
      rl.close();
      resolve();
    });
  });
}

function detectCategoryFromUrl(urlStr) {
  try {
    const pathname = new URL(urlStr, TARGET_URL).pathname;
    const slugMatch = pathname.match(/\\/categoria\\/\\d+\\/([^/?#]+)/i);
    if (slugMatch && slugMatch[1]) {
      const slug = decodeURIComponent(slugMatch[1]).toLowerCase();
      if (slug.includes('mercearia')) return 'Mercearia';
      if (slug.includes('bebida')) return 'Bebidas';
      if (slug.includes('hortifruti') || slug.includes('feira')) return 'Hortifruti';
      if (slug.includes('acougue') || slug.includes('carne')) return 'Açougue & Frios';
      if (slug.includes('frio') || slug.includes('laticin') || slug.includes('lacteo')) return 'Laticínios & Frios';
      if (slug.includes('limpeza')) return 'Limpeza & Higiene';
      if (slug.includes('higiene') || slug.includes('perfumaria') || slug.includes('beleza')) return 'Limpeza & Higiene';
      if (slug.includes('padaria') || slug.includes('confeitaria')) return 'Padaria & Confeitaria';
      if (slug.includes('matina') || slug.includes('lanche') || slug.includes('biscoito') || slug.includes('doce')) return 'Doces & Snacks';
      if (slug.includes('pet')) return 'Pet Shop';
      return slug.split(/[-_]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  } catch {
    // ignore
  }
  return undefined;
}

function parseNum(v) {
  if (typeof v === 'number') return isFinite(v) && v > 0 ? Number(v.toFixed(2)) : 0;
  if (typeof v !== 'string') return 0;
  const cleaned = v.replace(/R\\$/gi, '').replace(/[^\\d.,]/g, '').trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\\./g, '').replace(',', '.')
    : cleaned;
  const n = parseFloat(normalized);
  return isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
}

function extractProductsFromApiJson(payload, fallbackCategory, sourcePageUrl) {
  const found = [];
  const visited = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const name = node.nome || node.name || node.descricao || node.titulo || node.title || node.produtoNome;
    const rawPrice =
      node.precoPromocional ??
      node.precoOferta ??
      node.promoPrice ??
      node.precoVenda ??
      node.preco ??
      node.valor ??
      node.price;

    if (typeof name === 'string' && name.trim().length >= 3 && rawPrice !== undefined) {
      const price = parseNum(rawPrice);
      const regularPrice = parseNum(node.precoDe ?? node.precoNormal ?? node.precoOriginal ?? node.preco);
      if (price > 0) {
        const rawCode = node.codigoInterno ?? node.codigo ?? node.sku ?? node.ean ?? node.gtin ?? node.id ?? node.produtoId;
        const code = rawCode !== undefined && rawCode !== null ? String(rawCode).trim() : undefined;
        found.push({
          externalId: code || undefined,
          sku: code || undefined,
          name: name.replace(/\\s+/g, ' ').trim(),
          category: fallbackCategory,
          price,
          promoPrice: regularPrice > price ? price : undefined,
          url: typeof node.url === 'string' && node.url.startsWith('http') ? node.url : sourcePageUrl,
        });
      }
    }

    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') walk(val);
    }
  }

  walk(payload);
  return found;
}

async function waitForCatalogRender(page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.waitForFunction(
        () => {
          const cards = document.querySelectorAll(
            'product-item, .product-item, [class*="product-item"], app-product-card, app-card-produto, [class*="product-card"], [class*="card-produto"]'
          ).length;
          if (cards > 0) return true;
          const txt = document.body?.innerText || '';
          return /R\\$\\s*[0-9]+,[0-9]{2}/.test(txt);
        },
        { timeout: 14000 }
      );
      break;
    } catch {
      // Se houve redirecionamento do AWS WAF no meio, tenta aguardar mais uma vez
      await page.waitForTimeout(1500);
    }
  }
  await page.waitForTimeout(1800);
}

async function loadAllProductsWithLoadMore(page) {
  const MAX_CLICKS = 60;
  let noGrowthCount = 0;

  const countSignals = () =>
    page.evaluate(() => {
      const cards = document.querySelectorAll(
        'product-item, .product-item, [class*="product-item"], app-product-card, app-card-produto, [class*="product-card"], [class*="card-produto"]'
      ).length;
      const prices = (document.body?.innerText || '').match(/R\\$\\s*[0-9.]+,[0-9]{2}/g)?.length || 0;
      return Math.max(cards, prices);
    });

  for (let round = 0; round < MAX_CLICKS; round++) {
    const beforeCount = await countSignals();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);

    const clicked = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('button, a, [role="button"], .btn, [class*="load-more"], [class*="carregar"]')
      );
      for (const el of candidates) {
        const txt = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
        if (!/(carregar\\s*mais|ver\\s*mais|mostrar\\s*mais)/.test(txt)) continue;
        if (txt.length > 45) continue;

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
        const isDisabled =
          Boolean(el.disabled) ||
          el.getAttribute('aria-disabled') === 'true' ||
          el.classList.contains('disabled');

        if (!isVisible || isDisabled) continue;

        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
        return txt;
      }
      return null;
    });

    if (!clicked) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(900);
      const afterScroll = await countSignals();
      if (afterScroll <= beforeCount) break;
      continue;
    }

    let afterClickCount = beforeCount;
    for (let waitStep = 0; waitStep < 16; waitStep++) {
      await page.waitForTimeout(450);
      afterClickCount = await countSignals();
      if (afterClickCount > beforeCount) break;
    }

    console.log(\`[Coletor] Clicou em "\${clicked}" (\${beforeCount} -> \${afterClickCount} itens/preços)\`);

    if (afterClickCount <= beforeCount) {
      noGrowthCount++;
      if (noGrowthCount >= 2) break;
    } else {
      noGrowthCount = 0;
    }
  }
}

async function extractProductsFromPage(page, fallbackCategory) {
  return page.evaluate((pageCategory) => {
    const parsePrice = (txt) => {
      const m = String(txt || '').match(/R\\$\\s*([0-9.]+,[0-9]{2})/);
      if (!m) return 0;
      return parseFloat(m[1].replace(/\\./g, '').replace(',', '.')) || 0;
    };

    const list = [];
    const seen = new Set();

    // 1. Seletores específicos (Regex Solutions / SuperLuna / Angular)
    const primaryCards = Array.from(
      document.querySelectorAll(
        'product-item, .product-item, [class*="product-item"], app-product-card, app-card-produto, [class*="product-card"], [class*="card-produto"]'
      )
    );

    for (const card of primaryCards) {
      const titleEl = card.querySelector('.product-text-dt, h2, h3, h4, .product-name, [class*="name"], [class*="title"], a[title]');
      const name = (titleEl?.getAttribute('title') || titleEl?.textContent || '').replace(/\\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      const codeEl = card.querySelector('.product-cdg, [class*="sku"], [class*="codigo"]');
      const code = (codeEl?.textContent || '').replace(/[^0-9A-Za-z_-]/g, '').trim();

      const promoEl = card.querySelector('.product-price-promocao, .preco-promocao, [class*="promo"]');
      const regularEl = card.querySelector('.product-price-car, .product-price-small, .info-produto, [class*="price"], [class*="preco"]');
      const promoPrice = parsePrice(promoEl?.textContent);
      const regularPrice = parsePrice(regularEl?.textContent || card.textContent);
      const price = promoPrice > 0 ? promoPrice : regularPrice;
      if (price <= 0) continue;

      const linkEl = card.querySelector('a[href]');
      const url = linkEl ? new URL(linkEl.getAttribute('href'), location.origin).href : location.href;
      const dedup = code || name.toLowerCase();
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      list.push({
        externalId: code || undefined,
        sku: code || undefined,
        name,
        category: pageCategory,
        price,
        promoPrice: promoPrice > 0 ? promoPrice : undefined,
        url,
      });
    }

    if (list.length > 0) return list;

    // 2. Fallback inteligente: busca cards com link de produto + imagem + R$
    const productLinks = Array.from(
      document.querySelectorAll('a[href*="/p/"]:not([href*="/categoria/"]), a[href*="/produto"]')
    );
    for (const link of productLinks) {
      const card = link.closest('article, li, [class*="card"], [class*="item"], div') || link.parentElement;
      if (!card) continue;
      const cardText = (card.innerText || '').trim();
      if (cardText.length > 500) continue;
      const price = parsePrice(cardText);
      if (price <= 0) continue;

      const imgAlt = card.querySelector('img')?.getAttribute('alt')?.trim();
      const heading = card.querySelector('h1, h2, h3, h4, p, span')?.textContent?.replace(/\\s+/g, ' ').trim();
      const rawTitle = (link.getAttribute('title') || heading || imgAlt || '').replace(/\\s+/g, ' ').trim();
      if (!rawTitle || rawTitle.length < 3 || /^R\\$/.test(rawTitle)) continue;

      const url = new URL(link.getAttribute('href'), location.origin).href;
      const codeMatch = url.match(/\\/(?:p|produto)\\/(\\d+)/i);
      const code = codeMatch ? codeMatch[1] : undefined;
      const dedup = code || rawTitle.toLowerCase();
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      list.push({
        externalId: code,
        sku: code,
        name: rawTitle,
        category: pageCategory,
        price,
        url,
      });
    }

    return list;
  }, fallbackCategory);
}

async function run() {
  const firstTime = !fs.existsSync(PROFILE_DIR);
  if (firstTime && !isVisibleMode) {
    console.log('[Coletor] Perfil inicial ainda não configurado. Dica: se retornar 0 itens, rode uma vez com --configurar para selecionar sua loja/filial.');
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !isVisibleMode,
    locale: 'pt-BR',
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = context.pages()[0] || (await context.newPage());

  if (isSetupMode) {
    console.log('');
    console.log('====================================================================');
    console.log('MODO CONFIGURAÇÃO INICIAL DO SUPERLUNA');
    console.log('1. No navegador que abriu, selecione sua cidade / filial do SuperLuna.');
    console.log('2. Aguarde a vitrine de produtos com preços R$ carregar na tela.');
    console.log('3. Volte aqui no terminal e aperte ENTER para iniciar a coleta!');
    console.log('====================================================================');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitEnter('Pressione ENTER aqui depois de selecionar sua filial no site... ');
  }

  const catalogMap = new Map();
  let currentCategory = undefined;
  let currentSourceUrl = TARGET_URL;
  const apiCapturedItems = [];

  page.on('response', async (response) => {
    try {
      const ct = (response.headers()['content-type'] || '').toLowerCase();
      if (!ct.includes('application/json')) return;
      const respUrl = response.url().toLowerCase();
      if (
        respUrl.includes('google') ||
        respUrl.includes('facebook') ||
        respUrl.includes('clarity') ||
        respUrl.includes('/api/sync/')
      ) {
        return;
      }
      const json = await response.json();
      const extracted = extractProductsFromApiJson(json, currentCategory, currentSourceUrl);
      if (extracted.length > 0) {
        apiCapturedItems.push(...extracted);
      }
    } catch {
      // ignora respostas não-JSON ou redirecionadas
    }
  });

  for (const rawPath of TARGET_PATHS) {
    const cleanPath = String(rawPath || '').trim();
    if (!cleanPath) continue;

    const fullUrl = new URL(cleanPath, TARGET_URL).href;
    currentSourceUrl = fullUrl;
    currentCategory = detectCategoryFromUrl(fullUrl);
    apiCapturedItems.length = 0;

    console.log('[Coletor] Abrindo:', fullUrl);
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForCatalogRender(page);
    await loadAllProductsWithLoadMore(page);

    const domItems = await extractProductsFromPage(page, currentCategory);
    const mergedRouteItems = domItems.length > 0 ? domItems : apiCapturedItems;

    for (const item of mergedRouteItems) {
      const key = item.externalId || item.name.toLowerCase();
      catalogMap.set(key, item);
    }

    console.log(\`[Coletor] Coletados \${mergedRouteItems.length} itens em \${cleanPath}\`);

    if (mergedRouteItems.length === 0) {
      const diag = await page.evaluate(() => ({
        title: document.title,
        url: location.href,
        pricesCount: (document.body?.innerText || '').match(/R\\$\\s*[0-9.]+,[0-9]{2}/g)?.length || 0,
        snippet: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 180),
      }));
      console.log(\`[Coletor][Diagnóstico] Título: "\${diag.title}" | R$ na tela: \${diag.pricesCount} | Texto: "\${diag.snippet}"\`);
      await page.screenshot({ path: 'debug-superluna.png', fullPage: false }).catch(() => {});
    }
  }

  await context.close();

  const products = Array.from(catalogMap.values());
  if (products.length === 0) {
    console.log('');
    console.log('[Coletor] Nenhum produto encontrado (salvei debug-superluna.png na pasta para diagnóstico).');
    console.log('[Coletor] Se o site pediu para escolher a cidade/filial ou bloqueou o modo invisível, execute UMA VEZ:');
    console.log('           node coletor-superluna.mjs --configurar');
    return;
  }

  console.log(\`[Coletor] Total único extraído: \${products.length} produtos. Enviando para o OmniPrice AI...\`);

  for (let i = 0; i < products.length; i += 150) {
    const chunk = products.slice(i, i + 150);
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': SYNC_TOKEN,
      },
      body: JSON.stringify({
        trigger: 'api_webhook',
        source: 'superluna',
        products: chunk,
      }),
    });
    const result = await res.json();
    console.log(\`[Coletor] Lote \${Math.floor(i / 150) + 1} sincronizado:\`, result);
  }
}

run().catch((err) => {
  console.error('[Coletor] Falha na coleta:', err);
  process.exit(1);
});`;
}
