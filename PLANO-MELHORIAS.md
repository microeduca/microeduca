# Plano de Melhorias — Portal MicroEduca

> Base: documento **"Sugestões de Melhorias para o Portal MicroEduca"** (MICRO – Serviços de Anatomia Patológica e Citopatologia LTDA)
> Análise do código realizada em: **05/08/2026** — branch `main`, commit `0bafb36`

---

## 1. Análise do sistema

### Arquitetura

| Camada | Stack |
|---|---|
| Front | React 18 + Vite + TypeScript, shadcn/ui + Tailwind, React Router 6 |
| API | Express 5 em arquivo único — `server/index.mjs` (1.072 linhas, ~40 rotas) |
| Banco | Postgres (Railway), acesso direto via `pg` |
| Vídeo | Vimeo (OAuth + upload TUS + webhook) |
| Deploy | Railway — mesmo serviço serve `/api` e o `dist` do Vite |

**Modelo de dados:** `categories` → `modules` (auto-referencial via `parent_id`, hierarquia de N níveis) → `videos` (`module_id`, `category_ids[]`). Mais `profiles`, `view_history`, `video_progress`, `comments`, `files`, `settings`.

### Trabalho já feito, mas NÃO commitado

Havia **1.065 linhas modificadas** no working tree que já atacam boa parte do PDF:

- `formatDurationLong` / `formatDurationClock` (`src/lib/utils.ts`)
- `release_at` em categoria, módulo e vídeo
- `support_files` (jsonb) — material de apoio por aula
- `content_type: 'video' | 'file'` — arquivos como aula
- `assigned_modules` no perfil — acesso por submódulo
- Inativação de usuário
- Rankings no dashboard admin

**Isso não está commitado nem em produção.** É o ponto de partida do plano.

---

### Problemas críticos encontrados

#### 1. A API não tem autenticação. Nenhuma rota.
Achado mais grave — impacta diretamente o item 3 do PDF.

- `GET /api/profiles` faz `SELECT *` e devolve o `password_hash` de **todos** os usuários, para qualquer pessoa na internet, sem login.
- `POST /api/profiles` permite criar um admin sem autenticação. `DELETE /api/videos/:id` apaga qualquer vídeo.
- O login (`server/index.mjs:227`) devolve o usuário sem token; a sessão vive só no `localStorage` (`src/lib/auth.ts:27`).
- **Toda a regra de permissão (`assignedCategories`, `assignedModules`, `release_at`) roda no navegador.** Editar o `localStorage` para `role: "admin"` libera tudo.
- Pedir "acesso a apenas 3 de 5 subpastas" sobre essa base é escrever uma permissão que não existe de fato.
- `cors()` sem restrição de origem.

#### 2. `.env` está commitado no Git
Commit `e45db7b`, contendo `DATABASE_URL`, `VIMEO_CLIENT_ID` e `VIMEO_CLIENT_SECRET`.
As credenciais precisam ser **rotacionadas** — remover o arquivo agora não apaga o histórico.

#### 3. Nenhuma paginação no servidor — causa raiz das queixas de lentidão
(itens 1 e 4 do PDF)

- `GET /api/videos`, `/api/profiles` e `/api/view-history` devolvem a tabela inteira.
- Todas as telas baixam tudo e filtram em memória.
- O `AdminDashboard` carrega usuários + vídeos + histórico completo + 100 views a cada montagem.

#### 4. N+1 sequencial no carregamento de módulos
Em `src/hooks/useDashboardData.ts:26`, `src/pages/AdminUsers.tsx:33` e `AdminVideos` há um `for` com `await getModules(cat.id)` dentro — 20 categorias = 20 round-trips em série antes da tela renderizar.

#### 5. React Query instalado e nunca usado
Provisionado em `src/App.tsx:25`, mas há **zero** `useQuery` no projeto. É cache e estado de carregamento de graça, já pago.

#### 6. Schema se auto-corrige em runtime
`ensureModulesSchema()`, `ensureContentEnhancementColumns()` e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` rodam dentro dos handlers de POST/PUT, a cada requisição.
As migrations em `supabase/migrations/` estão defasadas e suas policies RLS são código morto (a API conecta direto no Postgres e ignora RLS).

#### 7. Arquivos guardados como `bytea` dentro do Postgres
`server/index.mjs:134` — tráfego em base64 por JSON com limite de 20 MB. Sem streaming, sem cache, sem range requests. Vai inchar o banco conforme o item "Upload de arquivos como aulas" for usado de verdade.

#### 8. Duas camadas de dados paralelas, uma quebrada
`src/lib/storage.ts` (a real) e `src/lib/supabase.ts` (legado — `saveVideoProgress` lança `Not implemented`).
E o `AdminMaterialUpload` importa `addVideo` justamente do arquivo legado.

#### 9. Duas fontes de verdade de progresso
`view_history` e `video_progress`. Dashboards leem uma, o player grava na outra. As "horas assistidas" podem divergir.

#### 10. `AdminVideos.tsx` tem 2.241 linhas
Com componentes (`SortableVideoRow`, `SortableTableRow`) declarados dentro do corpo do render — remontados a cada renderização, perdendo foco e estado.

#### 11. Bugs pontuais
- O filtro de categoria do dashboard mostra UUIDs crus em vez de nomes (`src/pages/AdminDashboard.tsx:289`).
- O card "Engajamento" mostra usuários *cadastrados* hoje, não ativos.

---

## 2. PDF × estado atual

| # | Pedido | Situação |
|---|---|---|
| 1 | Dashboard menos extenso | ❌ `AdminDashboard` ainda embute `<AdminVideoManagement/>` listando tudo |
| 1 | Ranking / horas por usuário / mais ativos | 🟡 Rankings existem (não commitados), sem filtro de período e calculados no cliente |
| 1 | Área de métricas gerenciais | ❌ Não existe |
| 2 | Duração em horas (1h 25min 23s) | 🟡 `formatDurationLong` pronto, usado em 3 telas; **8 arquivos ainda têm formatador local** |
| 2 | **Avaliações por módulo (link forms)** | ❌ **Nada implementado** |
| 2 | Tempo total por subpasta | 🟡 `AdminVideos.tsx:610` soma só os vídeos do próprio módulo, **não os descendentes**; e não aparece para o aluno |
| 2 | Upload de arquivos como aula | ✅ `content_type='file'` — mas o formulário só escolhe categoria, **não módulo**, e não tem liberação programada |
| 2 | Material de apoio por aula | ✅ `support_files` + `SupportFilesList` + `PdfViewer` |
| 3 | Inativar usuário | ✅ Funciona — mas o check no `Layout` puxa `/api/profiles` inteiro (vazando hashes) |
| 3 | **Acesso por subpasta** | 🟡 `assigned_modules` existe, porém: só no cliente; **`MeusCursos` ignora completamente**; e a lógica é `categoria OU módulo`, então dar a pasta "Setorial" libera as 5 subpastas — o oposto do pedido |
| 3 | **Liberação programada por usuário** | 🟡 `release_at` é **global**. O pedido é *"o usuário Fulano acessa a pasta Treinamentos a partir de tal data"* — isso não existe |
| 4 | Navegação / "onde estou" | ❌ Sem breadcrumb em lugar nenhum (só um comentário em `VideoPlayer.tsx:547`) |
| 4 | Feedback de carregamento | ❌ Telas principais (MeusCursos, AdminUsers, AdminDashboard, History) abrem em branco |
| 4 | Paginação / filtros / busca | 🟡 Parcial em AdminVideos e UserDashboard; tudo client-side |
| 5 | Relatórios completos | 🟡 Rankings básicos, sem período nem exportação |
| 5 | Atividade individual | 🟡 `AdminUserProfile` existe, básico |
| 5 | Trilhas / cronogramas | ❌ Depende dos itens da seção 3 |

---

## 3. Plano de execução

### Fase 0 — Estabilizar a base *(bloqueante, antes de qualquer feature)*

- [ ] **0.1** Rotacionar `DATABASE_URL` e as credenciais Vimeo; remover `.env` do índice, adicionar ao `.gitignore`
- [ ] **0.2** Revisar, testar e **commitar as 1.065 linhas pendentes** — hoje são um bloco não versionado que qualquer erro apaga
- [ ] **0.3** `GET /api/profiles`: trocar `SELECT *` por lista explícita de colunas, sem `password_hash`
- [ ] **0.4** Criar `GET /api/me` para o `Layout` checar `is_active` sem baixar todos os perfis

### Fase 1 — Autenticação e permissão no servidor *(fundação do item 3)*

- [ ] **1.1** Emitir JWT no `/api/login`; middleware `requireAuth` / `requireAdmin` em todas as rotas
- [ ] **1.2** Substituir o XHR **síncrono** de `src/lib/auth.ts:8` por `fetch` assíncrono
- [ ] **1.3** Mover a regra de visibilidade para SQL: `GET /api/videos` devolve apenas o que o usuário logado pode ver (categoria ∩ módulo ∩ `release_at`). O filtro no cliente vira apenas UX
- [ ] **1.4** Implementar a semântica de permissão decidida (ver "Decisão pendente") de forma que conceder a pasta pai não libere automaticamente as subpastas restritas
- [ ] **1.5** Nova tabela `user_content_access (user_id, scope_type, scope_id, release_at)` → liberação programada **por usuário**, com UI no cadastro/edição

### Fase 2 — Performance e navegação *(item 4)*

- [ ] **2.1** Paginação real: `?page` / `?limit` / `?search` em `/api/videos`, `/api/profiles`, `/api/view-history`
- [ ] **2.2** `GET /api/modules?categoryIds=a,b,c` em uma chamada → elimina os N+1 sequenciais
- [ ] **2.3** Adotar React Query nas telas principais (cache, `isLoading`, `isFetching`); trocar telas brancas por `<Skeleton/>`
- [ ] **2.4** Componente `<Breadcrumb>` Categoria › Módulo › Submódulo › Aula no player e nas listagens
- [ ] **2.5** Tirar `<AdminVideoManagement/>` do dashboard; dashboard vira só métricas, gestão fica em `/admin/videos`
- [ ] **2.6** Busca + paginação em `AdminUsers` e `History`

### Fase 3 — Conteúdo *(item 2)*

- [ ] **3.1** Unificar formatação de duração: eliminar os 8 `formatDuration`/`formatTime` locais em favor de `formatDurationLong` / `formatDurationClock`
- [ ] **3.2** Agregação **recursiva** de duração por módulo (subpasta soma todos os descendentes), idealmente como coluna calculada no endpoint — exibida também no lado do aluno
- [ ] **3.3** **Avaliações por módulo:** coluna `modules.evaluation_url`, campo na taxonomia, botão "Fazer avaliação" no módulo para o aluno
- [ ] **3.4** `AdminMaterialUpload`: adicionar seleção de **módulo/submódulo** e liberação programada; ampliar os MIME aceitos
- [ ] **3.5** Migrar `files` de `bytea` para armazenamento externo (Railway volume / S3), com `Cache-Control` e streaming

### Fase 4 — Relatórios *(itens 1 e 5)*

- [ ] **4.1** Endpoints agregados em SQL com filtro de período: `/api/reports/users`, `/api/reports/content`, `/api/reports/timeline`
- [ ] **4.2** Página `/admin/relatorios`: horas por usuário, conteúdos e pastas mais acessados, evolução no tempo, seletor de período, exportação CSV
- [ ] **4.3** Enriquecer `AdminUserProfile` (atividade individual completa + período + export)
- [ ] **4.4** Consolidar `view_history` e `video_progress` numa fonte de verdade única

### Fase 5 — Dívida técnica *(contínuo)*

- [ ] **5.1** Quebrar `AdminVideos.tsx` (2.241 linhas) e extrair os componentes `Sortable*` para fora do render
- [ ] **5.2** Remover `src/lib/supabase.ts`, `src/lib/mockData.ts` e `supabase/functions/` (código morto)
- [ ] **5.3** Consolidar as migrations num arquivo que reflita o schema real e remover os `ensure*` dos handlers

---

## Decisão pendente

O item **1.4** muda o comportamento para todos os usuários já cadastrados e tem duas leituras possíveis do pedido da MICRO:

**(A) Categoria libera tudo, exceto o que for restringido**
Marcar "Setorial" dá as 5 subpastas; para dar só 3, o admin desmarca 2.
→ Menos trabalho no dia a dia, mas erra para o lado permissivo.

**(B) Módulo marcado é o que vale**
Se o usuário tem qualquer módulo marcado numa categoria, só esses aparecem; sem módulo marcado, a categoria inteira.
→ Mais próximo do texto do PDF ("conceder acesso apenas a 3 das 5"), e erra para o lado restritivo.

**Padrão adotado se não houver definição em contrário: (B)** — leitura literal do documento e falha de forma segura.
