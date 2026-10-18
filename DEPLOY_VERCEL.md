# Guia Rápido: Como Publicar o OmniPrice AI na Vercel

Este projeto já está **100% configurado e pronto** para deploy na **Vercel**, incluindo o frontend React (Vite) e as rotas de API com inteligência artificial (`/api/ai/*`) executando via Vercel Serverless Functions.

---

## Opção 1: Publicação Direta via GitHub (Recomendado)

1. **Suba este projeto para um repositório no seu GitHub**:
   ```bash
   git add .
   git commit -m "feat: preparação para deploy na Vercel"
   git push origin main
   ```

2. **Acesse a Vercel**:
   - Vá para [vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
   - Clique em **"Add New..."** > **"Project"**.
   - Selecione o repositório do OmniPrice AI e clique em **"Import"**.

3. **Configuração de Build (Automática)**:
   - A Vercel detectará automaticamente as configurações através do arquivo `vercel.json`:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

4. **Adicione as Variáveis de Ambiente (Environment Variables)**:
   Na seção **Environment Variables** antes do deploy, adicione:
   - `GEMINI_API_KEY`: Sua chave de API do Gemini (obtenha em [Google AI Studio](https://aistudio.google.com/app/apikey))
   *(Opcional: as credenciais do Firestore já estão configuradas no arquivo `firebase-applet-config.json`, mas você também pode preencher `VITE_FIREBASE_API_KEY`, etc. se desejar).*

5. **Clique em "Deploy"**:
   - Em menos de 2 minutos seu dashboard estará online com domínio próprio e HTTPS gratuito (ex: `https://omniprice-ai.vercel.app`).

---

## Opção 2: Publicação Instantânea via Vercel CLI (Terminal)

Se você utiliza o Node.js e a Vercel CLI no computador:

1. Instale a CLI da Vercel (caso não possua):
   ```bash
   npm i -g vercel
   ```

2. Na raiz deste projeto, execute:
   ```bash
   vercel
   ```

3. Siga as instruções no terminal (pressione Enter para aceitar as configurações padrões detectadas pelo `vercel.json`).

4. Para enviar para produção:
   ```bash
   vercel --prod
   ```

---

## Arquivos de Configuração Criados:
- `vercel.json`: Roteamento inteligente que direciona requisições `/api/*` para as Serverless Functions e todas as demais páginas para a SPA React.
- `api/index.ts`: Ponto de entrada das funções serverless da API na Vercel.
- `.vercelignore`: Otimiza o envio ignorando `node_modules` e pastas temporárias.
- `.env.example`: Modelo de variáveis de ambiente documentado.
