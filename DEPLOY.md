# Deploy — Moove Growth Analyzer

Guia para publicar o analyzer com planos compartilháveis e PDF interativo na Vercel.

## Pré-requisitos

- Conta [Vercel](https://vercel.com)
- Domínios DNS configuráveis (ex.: `analyzer.moove.com.br` e `plano.moove.com.br`)
- Node.js 18+

## 1. Instalar dependências

```bash
cd MooveGrowthAnalyzer
npm install
```

## 2. Criar Vercel KV (storage dos planos)

1. No dashboard Vercel, abra o projeto (ou crie um novo importando este repositório).
2. Vá em **Storage → Create Database → KV**.
3. Nome sugerido: `moove-plans-kv`.
4. Clique em **Connect to Project** e selecione este projeto.
5. A Vercel injeta automaticamente `KV_REST_API_URL`, `KV_REST_API_TOKEN` e `KV_URL`.

## 3. Variáveis de ambiente

Em **Project Settings → Environment Variables**, configure:

| Variável | Exemplo | Obrigatório |
|---|---|---|
| `SHARE_BASE_URL` | `https://plano.moove.com.br` | Sim |
| `PLAN_TTL_DAYS` | `90` | Não (padrão 90) |
| `MOOVE_CTA_URL` | `https://wa.me/5511999999999` | Não |

Copie `.env.example` para `.env.local` para desenvolvimento local com `vercel dev`.

## 4. Deploy

```bash
npx vercel --prod
```

Ou conecte o repositório GitHub à Vercel para deploy automático a cada push.

## 5. Configurar dois domínios

No projeto Vercel, **Settings → Domains**:

| Domínio | Uso |
|---|---|
| `analyzer.moove.com.br` | Ferramenta de análise (`/`) |
| `plano.moove.com.br` | Planos compartilhados (`/p/{id}`) |

Ambos apontam para o **mesmo projeto**. O rewrite em `vercel.json` mapeia `/p/:id` para a página pública.

### DNS (exemplo)

Para cada subdomínio, crie um registro **CNAME** apontando para `cname.vercel-dns.com` (ou use os nameservers da Vercel no domínio raiz).

## 6. Desenvolvimento local

```bash
npm run dev
```

Isso inicia `dev-server.js` em `http://localhost:3000` com API + arquivos estáticos + roteamento `/p/:id`.

Para emular o ambiente Vercel completo (requer login CLI):

```bash
npm run dev:vercel
```

## 7. Fluxo pós-análise

1. Usuário completa o wizard e clica em **Gerar análise**.
2. O front monta um `planSnapshot` (persona, funil, KPIs, gráficos em base64).
3. `POST /api/plans` salva no KV e retorna `{ id, url }`.
4. Painel **Compartilhar com cliente** exibe o link `https://plano.moove.com.br/p/{id}`.
5. Cliente abre o link → `GET /api/plans/{id}` → página read-only.
6. **Baixar PDF interativo** gera PDF com gráficos embutidos e campos editáveis (Anotações).

## 8. Estrutura do projeto

```
api/plans/          → POST (criar) e GET [id] (ler)
lib/plan-store.js   → Abstração Vercel KV + fallback memória
public/             → HTML, CSS, JS estáticos
public/p/           → Página pública de plano compartilhado
public/js/engine.js → Motor de geração do plano
public/js/pdf-export.js → PDF interativo (pdf-lib)
```

## 9. Limites e segurança

- Payload máximo: **500 KB** por plano
- IDs: **UUID v4** (não sequenciais)
- TTL padrão: **90 dias** (configurável via `PLAN_TTL_DAYS`)
- Links são **públicos** — quem tem o link acessa o plano

## 10. Troubleshooting

| Problema | Solução |
|---|---|
| `Plano não encontrado` | KV expirou ou ID inválido; refaça a análise |
| POST retorna 500 | Verifique se KV está conectado ao projeto |
| PDF sem gráficos | Aguarde charts renderizarem antes do snapshot; recarregue e baixe novamente |
| Link com domínio errado | Ajuste `SHARE_BASE_URL` e redeploy |
