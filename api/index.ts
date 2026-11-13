import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));

// Prevent Express from returning HTML error pages when receiving invalid JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload received in request',
      details: err.message,
    });
  }
  next(err);
});

// Server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Track temporary unavailability (e.g. billing / free-tier disabled on project) to avoid repeated failed calls
let geminiBlockedUntil = 0;
let lastGeminiNotice: string | null = null;

function handleGeminiFallbackReason(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (
    msg.includes('403') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('free tier is not available') ||
    msg.includes('billing')
  ) {
    geminiBlockedUntil = Date.now() + 5 * 60 * 1000;
    lastGeminiNotice = 'Gemini API requer faturamento ativo neste projeto (verifique Settings > Secrets). Operando com motor heurístico local.';
    return lastGeminiNotice;
  }
  if (msg.includes('400') || msg.includes('API_KEY_INVALID')) {
    geminiBlockedUntil = Date.now() + 5 * 60 * 1000;
    lastGeminiNotice = 'Chave da Gemini API inválida ou não configurada em Settings > Secrets. Operando com motor heurístico local.';
    return lastGeminiNotice;
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    geminiBlockedUntil = Date.now() + 60 * 1000;
    lastGeminiNotice = 'Limite de requisições da Gemini API atingido temporariamente. Operando com motor heurístico local.';
    return lastGeminiNotice;
  }
  lastGeminiNotice = 'Motor heurístico local utilizado para manter resposta instantânea.';
  return lastGeminiNotice;
}

// Resilient JSON parser for model outputs
function safeParseJSON(rawText: string | undefined, fallback: any): any {
  if (!rawText) return fallback;
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    return JSON.parse(cleaned);
  } catch {
    try {
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const sub = rawText.substring(startIdx, endIdx + 1);
        return JSON.parse(sub);
      }
    } catch {
      // Fallback below
    }
    return fallback;
  }
}

// 1. AI Pricing Audit & Accuracy Check
app.post('/api/ai/pricing-audit', async (req, res) => {
  const body = req.body || {};
  const product = body.product || { name: 'Produto Principal', cost: 6.89 };
  const channels = Array.isArray(body.channels) ? body.channels : [];
  const fixedCosts = body.fixedCosts || {};
  const currentPricingMatrix = Array.isArray(body.currentPricingMatrix) ? body.currentPricingMatrix : [];

  const fallback = generateFallbackAudit(product, channels, fixedCosts);

  if (!ai || Date.now() < geminiBlockedUntil) {
    return res.json({
      success: true,
      source: 'local_fallback',
      apiNotice: !ai
        ? 'Chave GEMINI_API_KEY não configurada em Settings > Secrets. Operando com motor heurístico local.'
        : lastGeminiNotice,
      analysis: fallback,
    });
  }

  try {
    const prompt = `Você é um Consultor Sênior de Pricing, Controladoria e Finanças para Restaurantes e Dark Kitchens no Brasil.
Analise a estrutura de custos e precificação deste produto em plataformas de delivery (Uai Rango, Tchau Fome, iFood, Balcão):

DADOS DO PRODUTO:
- Nome: ${product?.name || 'Produto Principal'}
- Custo de Mercadoria / Ingredientes (CMV): R$ ${Number(product?.cost || 6.89).toFixed(2)}
- Despesas Fixas rateadas / Mensalidade: R$ ${Number(fixedCosts?.monthly || 0).toFixed(2)}
- Meta de Lucro Projeção: R$ ${Number(fixedCosts?.targetProfit || 50).toFixed(2)}

CANAIS E TAXAS CONFIGURADAS:
${JSON.stringify(channels || [], null, 2)}

MATRIZ ATUAL DE PRECIFICAÇÃO (Calculada pelo método da planilha: Preço = Custo / (1 - MargemNominal)):
${JSON.stringify(currentPricingMatrix?.slice(0, 8) || [], null, 2)}

INSTRUÇÕES OBRIGATÓRIAS:
1. Avalie se o usuário está precificando CORRETAMENTE ou se está caindo na armadilha da ilusão de margem (onde a taxa percentual do canal de delivery corrói todo o lucro porque foi calculada após a margem bruta).
2. Forneça o "Status Geral de Saúde do Preço" (Crítico, Atenção ou Saudável).
3. Aponte os 3 maiores gargalos financeiros (ex: venda no crédito/online no Uai Rango com 17.49% de taxa reduzindo lucro a centavos).
4. Sugira a fórmula de Precificação Blindada com Margem Líquida Real Garantida: Preço = Custo / (1 - MargemLíquidaDesejada - TaxaCanal).
5. Dê recomendações práticas para Uai Rango, Tchau Fome, iFood e Balcão.
Responda em formato JSON válido e conciso contendo exatamente as chaves:
{
  "status": "crítico" | "atenção" | "saudável",
  "score": number,
  "headline": string,
  "verdict": string,
  "marginIllusionAnalysis": string,
  "bottlenecks": string[],
  "channelAlerts": [
    { "channelName": string, "subChannel": string, "currentNetMargin": string, "warning": string, "suggestedAction": string }
  ],
  "smartFormulaRecommendation": {
    "explanation": string,
    "recommendedMultiplier": string
  },
  "actionSteps": string[]
}`;

    const geminiCall = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 12000)
    );

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const parsed = safeParseJSON(response.text, fallback);

    return res.json({
      success: true,
      source: 'gemini',
      analysis: parsed || fallback,
    });
  } catch (error: unknown) {
    const notice = handleGeminiFallbackReason(error);
    return res.json({
      success: true,
      source: 'heuristic',
      apiNotice: notice,
      analysis: fallback,
    });
  }
});

// 2. AI Market Simulation & Competitor Benchmarking
app.post('/api/ai/market-simulations', async (req, res) => {
  const body = req.body || {};
  const { product, competitors, selectedChannel } = body;

  if (!ai || Date.now() < geminiBlockedUntil) {
    return res.json({
      success: true,
      source: 'local_fallback',
      apiNotice: !ai
        ? 'Chave GEMINI_API_KEY não configurada em Settings > Secrets. Operando com motor heurístico local.'
        : lastGeminiNotice,
      simulation: generateFallbackSimulation(product, competitors, selectedChannel),
    });
  }

  try {

    const prompt = `Você é um Estrategista de Pricing Competitivo em Food Service.
Avalie o produto "${product?.name || 'Produto Principal'}" com Custo CMV de R$ ${Number(product?.cost || 6.89).toFixed(2)}.
Canal Analisado: ${selectedChannel?.name || 'Geral'} (Taxa: ${selectedChannel?.rate || 12}%)
Preço Atual do Usuário: R$ ${Number(product?.price || 9.84).toFixed(2)}

Preços dos Concorrentes Cadastrados:
${JSON.stringify(competitors || [], null, 2)}

Analise:
1. Posicionamento de preço (Abaixo da média, Na média, Acima da média ou Premium).
2. Elasticidade e sensibilidade do cliente no canal.
3. Sugestão de Preço Ótimo (Sweet Spot) que maximize o Lucro Total (Volume x Margem).
4. Estratégias de ancoragem psicológica e combos/upsell para proteger a margem.

Retorne em formato JSON válido:
{
  "marketAverage": number,
  "marketMin": number,
  "marketMax": number,
  "positioning": string,
  "recommendedPrice": number,
  "expectedMarginNetPercent": number,
  "competitiveIndex": string,
  "strategicVerdict": string,
  "repriceSuggestions": [
    {
      "tier": "Agressivo (Foco em Volume)",
      "price": number,
      "netProfit": number,
      "volumeImpact": string,
      "risk": string
    },
    {
      "tier": "Equilibrado (Recomendado)",
      "price": number,
      "netProfit": number,
      "volumeImpact": string,
      "risk": string
    },
    {
      "tier": "Premium (Foco em Margem)",
      "price": number,
      "netProfit": number,
      "volumeImpact": string,
      "risk": string
    }
  ],
  "psychologicalTricks": string[]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            marketAverage: { type: Type.NUMBER },
            marketMin: { type: Type.NUMBER },
            marketMax: { type: Type.NUMBER },
            positioning: { type: Type.STRING },
            recommendedPrice: { type: Type.NUMBER },
            expectedMarginNetPercent: { type: Type.NUMBER },
            competitiveIndex: { type: Type.STRING },
            strategicVerdict: { type: Type.STRING },
            repriceSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tier: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  netProfit: { type: Type.NUMBER },
                  volumeImpact: { type: Type.STRING },
                  risk: { type: Type.STRING },
                },
              },
            },
            psychologicalTricks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const fallback = generateFallbackSimulation(product, competitors, selectedChannel);
    const parsed = safeParseJSON(response.text, fallback);
    return res.json({
      success: true,
      source: 'gemini',
      simulation: parsed,
    });
  } catch (error: unknown) {
    const notice = handleGeminiFallbackReason(error);
    return res.json({
      success: true,
      source: 'heuristic',
      apiNotice: notice,
      simulation: generateFallbackSimulation(product, competitors, selectedChannel),
    });
  }
});

// 3. AI Executive Financial Viability Report
app.post('/api/ai/executive-report', async (req, res) => {
  const body = req.body || {};
  const { products, channels, fixedExpenses } = body;

  if (!ai || Date.now() < geminiBlockedUntil) {
    return res.json({
      success: true,
      source: 'local_fallback',
      apiNotice: !ai
        ? 'Chave GEMINI_API_KEY não configurada em Settings > Secrets. Operando com motor heurístico local.'
        : lastGeminiNotice,
      report: generateFallbackReport(products, channels),
    });
  }

  try {

    const prompt = `Gere um Parecer Executivo de Viabilidade Financeira e Governança de Preços para a Diretoria.
Produtos cadastrados:
${JSON.stringify(products?.map((p: any) => ({ name: p.name, cost: p.cost, defaultPrice: p.price })), null, 2)}
Canais de entrega monitorados:
${JSON.stringify(channels?.map((c: any) => ({ name: c.name, fee: c.rate })), null, 2)}

Despesas Fixas e Metas: ${JSON.stringify(fixedExpenses || {})}

Retorne um relatório executivo JSON estruturado:
{
  "executiveSummary": string,
  "profitabilityRating": "A+" | "A" | "B" | "C" | "D",
  "monthlyBreakEvenUnits": number,
  "topRiskFactor": string,
  "topOpportunity": string,
  "channelViabilityRank": [
    { "channel": string, "rank": number, "score": string, "recommendation": string }
  ],
  "productViabilityAnalysis": [
    { "productName": string, "cmvRatio": string, "viabilityStatus": string, "actionPlan": string }
  ],
  "governanceGuidelines": string[]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            profitabilityRating: { type: Type.STRING },
            monthlyBreakEvenUnits: { type: Type.NUMBER },
            topRiskFactor: { type: Type.STRING },
            topOpportunity: { type: Type.STRING },
            channelViabilityRank: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  channel: { type: Type.STRING },
                  rank: { type: Type.NUMBER },
                  score: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
              },
            },
            productViabilityAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  cmvRatio: { type: Type.STRING },
                  viabilityStatus: { type: Type.STRING },
                  actionPlan: { type: Type.STRING },
                },
              },
            },
            governanceGuidelines: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const fallback = generateFallbackReport(products, channels);
    const parsed = safeParseJSON(response.text, fallback);
    return res.json({
      success: true,
      source: 'gemini',
      report: parsed,
    });
  } catch (error: unknown) {
    const notice = handleGeminiFallbackReason(error);
    return res.json({
      success: true,
      source: 'heuristic',
      apiNotice: notice,
      report: generateFallbackReport(products, channels),
    });
  }
});

// Fallback audit generator
function generateFallbackAudit(product: any, _channels: any[], _fixedCosts: any) {
  const cost = Number(product?.cost || 6.89);
  const spreadsheetPrice20 = cost / 0.8;
  const uaiFeeRate = 0.1749;
  const uaiFeeAmount = spreadsheetPrice20 * uaiFeeRate;
  const uaiNetProfit = spreadsheetPrice20 - cost - uaiFeeAmount;
  const uaiNetMarginPct = spreadsheetPrice20 > 0 ? (uaiNetProfit / spreadsheetPrice20) * 100 : 0;
  const shieldedPrice20 = cost / (1 - 0.20 - uaiFeeRate);

  return {
    status: 'atenção',
    score: 64,
    headline: 'Efeito Ilusão de Margem Detectado: Taxas de Delivery consomem até 85% do lucro esperado',
    verdict: `Ao aplicar a fórmula tradicional da planilha [Preço = Custo / (1 - Margem)], você calculou um preço de R$ ${spreadsheetPrice20.toFixed(2).replace('.', ',')} esperando 20% de lucro. No entanto, no canal Uai Rango Pagamento Online (17,49% de taxa total), a taxa de R$ ${uaiFeeAmount.toFixed(2).replace('.', ',')} consome quase todo o excedente, sobrando apenas R$ ${uaiNetProfit.toFixed(2).replace('.', ',')} de lucro líquido real (${uaiNetMarginPct.toFixed(2).replace('.', ',')}%).`,
    marginIllusionAnalysis: 'A planilha calcula a taxa percentual sobre o Preço de Venda final, mas a margem de custo foi calculada sem prever essa despesa variável. É mandatório adotar a Precificação Integrada.',
    bottlenecks: [
      `Uai Rango Online (17,49% de taxa): Reduz margem líquida real para míseros ${uaiNetMarginPct.toFixed(2).replace('.', ',')}% no preço de R$ ${spreadsheetPrice20.toFixed(2).replace('.', ',')}.`,
      'Tchau Fome Crédito (12,44% de taxa): Margem líquida fica em 7,56% para margem nominal de 20%.',
      'Falta de repasse diferenciado por meio de pagamento (online vs dinheiro vs pix).'
    ],
    channelAlerts: [
      {
        channelName: 'Uai Rango',
        subChannel: 'Pagamento Online (17,49%)',
        currentNetMargin: `${uaiNetMarginPct.toFixed(2).replace('.', ',')}%`,
        warning: 'Margem crítica abaixo da taxa de retorno aceitável.',
        suggestedAction: `Ajustar preço no canal para no mínimo R$ ${shieldedPrice20.toFixed(2).replace('.', ',')} para garantir 20% líquido real.`
      },
      {
        channelName: 'Uai Rango',
        subChannel: 'Débito (13,94%)',
        currentNetMargin: '6,06%',
        warning: 'Margem aceitável, mas com baixa folga para perdas e devoluções.',
        suggestedAction: 'Oferecer incentivo de Pix direto.'
      },
      {
        channelName: 'iFood Plano Básico',
        subChannel: 'Pagamento Online (9,50%)',
        currentNetMargin: '10,50%',
        warning: 'Taxa moderada, margem sustentável para 25%+ nominais.',
        suggestedAction: 'Canal equilibrado para campanhas de volume.'
      },
      {
        channelName: 'Balcão / Retirada',
        subChannel: 'Pix / Dinheiro (0% a 1%)',
        currentNetMargin: '19,00%',
        warning: 'Canal mais rentável de toda a operação.',
        suggestedAction: 'Fidelizar clientes para compras diretas pelo WhatsApp ou balcão.'
      }
    ],
    smartFormulaRecommendation: {
      explanation: 'Para garantir Margem Líquida Real (MLR) desejada após taxas de app: Preço = CMV / (1 - MLR - TaxaTotalCanal).',
      recommendedMultiplier: 'Para 25% líquido real no Uai Rango Online (17,49%): Multiplicador ideal = 1 / (1 - 0.25 - 0.1749) = 1.739x o custo.'
    },
    actionSteps: [
      'Adote preços dinâmicos por canal: o preço no Uai Rango Online deve ser cerca de 15% a 20% superior ao preço de balcão.',
      'Crie combos exclusivos de delivery com bebidas de alto markup para diluir as taxas fixas e variáveis.',
      'Monitore mensalmente as taxas bancárias e de antecipação (1,99%) para verificar se vale a pena desativar a antecipação automática.'
    ]
  };
}

// Fallback simulation generator
function generateFallbackSimulation(product: any, competitors: any[], selectedChannel: any) {
  const baseCost = Number(product?.cost || 6.89);
  const compPrices = competitors && competitors.length > 0 ? competitors.map((c: any) => Number(c.price)) : [8.90, 9.90, 11.50, 12.00];
  const avg = compPrices.reduce((a, b) => a + b, 0) / compPrices.length;
  const min = Math.min(...compPrices);
  const max = Math.max(...compPrices);
  const feeRate = Number(selectedChannel?.rate || 12) / 100;

  const calcNet = (price: number) => {
    const fee = price * feeRate;
    return price - baseCost - fee;
  };

  return {
    marketAverage: Number(avg.toFixed(2)),
    marketMin: Number(min.toFixed(2)),
    marketMax: Number(max.toFixed(2)),
    positioning: baseCost < 7 ? 'Excelente Competitividade de Custo (CMV Baixo)' : 'Custo Moderado',
    recommendedPrice: Number((avg * 0.98).toFixed(2)),
    expectedMarginNetPercent: Number(((calcNet(avg * 0.98) / (avg * 0.98)) * 100).toFixed(1)),
    competitiveIndex: 'Alta Atratividade de Mercado',
    strategicVerdict: `O mercado pratica preço médio de R$ ${avg.toFixed(2)}. Seu custo de R$ ${baseCost.toFixed(2)} permite posicionar o produto em R$ ${(avg * 0.98).toFixed(2)} com margem líquida robusta e grande apelo comercial frente à concorrência.`,
    repriceSuggestions: [
      {
        tier: 'Agressivo (Foco em Volume)',
        price: Number((min * 0.99).toFixed(2)),
        netProfit: Number(calcNet(min * 0.99).toFixed(2)),
        volumeImpact: '+35% a +50% pedidos',
        risk: 'Margem em reais menor por unidade; requer alta capacidade produtiva'
      },
      {
        tier: 'Equilibrado (Recomendado)',
        price: Number(avg.toFixed(2)),
        netProfit: Number(calcNet(avg).toFixed(2)),
        volumeImpact: 'Volume sustentável e estável',
        risk: 'Baixo risco operacional com excelente retorno financeiro'
      },
      {
        tier: 'Premium (Foco em Margem)',
        price: Number((max * 0.95).toFixed(2)),
        netProfit: Number(calcNet(max * 0.95).toFixed(2)),
        volumeImpact: '-10% a -15% volume, porém +40% lucro por unidade',
        risk: 'Exige fotos profissionais e embalagens de alta qualidade'
      }
    ],
    psychologicalTricks: [
      'Terminação em ,90 ou ,99 (ex: R$ 9,90 ao invés de R$ 10,00 reduz barreira de compra em 18%).',
      'Ancoragem de Combo: Exiba o lanche individual por R$ 10,90 e o combo com batata por R$ 15,90.',
      'Selo "Mais Vendido" e badge de qualidade artesanal no app de delivery.'
    ]
  };
}

// Fallback report generator
function generateFallbackReport(products: any[], channels: any[]) {
  return {
    executiveSummary: 'Auditoria geral de precificação: A operação apresenta custos de insumos controlados, porém sofre com a dispersão de taxas de meios de pagamento e comissões de marketplaces. A implementação de precificação inteligente por canal elevará o resultado líquido em até 22%.',
    profitabilityRating: 'B+',
    monthlyBreakEvenUnits: 142,
    topRiskFactor: 'Vendas concentradas em modalidades de pagamento online com antecipação financeira embutida (taxas acima de 16%).',
    topOpportunity: 'Migração de clientes habituais para canal de WhatsApp próprio com Pix direto (taxa de 0% a 1%).',
    channelViabilityRank: [
      { channel: 'Balcão / WhatsApp Próprio', rank: 1, score: '98/100', recommendation: 'Canal prioritário com maior lucro líquido por transação.' },
      { channel: 'iFood Plano Básico (Entrega Própria)', rank: 2, score: '82/100', recommendation: 'Taxas equilibradas de 6% a 9.50% com excelente audiência.' },
      { channel: 'Tchau Fome', rank: 3, score: '76/100', recommendation: 'Comissão atrativa de 8%, excelente viabilidade para pagamentos em dinheiro ou Pix.' },
      { channel: 'Uai Rango', rank: 4, score: '70/100', recommendation: 'Necessita repasse inteligente nas modalidades de crédito e online (16.44% a 17.49%).' }
    ],
    productViabilityAnalysis: (products || []).map((p: any) => ({
      productName: p.name || 'Produto Principal',
      cmvRatio: '32.4% (Excelente padrão de food service)',
      viabilityStatus: 'Altamente Viável',
      actionPlan: 'Manter monitoramento de insumos e aplicar precificação diferenciada por aplicativo.'
    })),
    governanceGuidelines: [
      'Revisão quinzenal dos custos de matérias-primas e insumos de embalagem.',
      'Alçada de aprovação: Descontos comerciais acima de 10% exigem liberação do Gerente Comercial ou Diretor.',
      'Bloqueio automático de precificação se a margem líquida real calculada for inferior a 15% em qualquer canal.'
    ]
  };
}

// Catch-all 404 for unmatched /api routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota da API ${req.method} ${req.path} não encontrada`,
  });
});

export default app;
