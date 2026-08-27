# Plano de Melhorias 2 — Portal MicroEduca

> Base: documento **`MICROEDUCA.docx`**, enviado pelo cliente depois de usar o
> portal em produção.
> Execução: branch `melhorias-doc2`, ambiente de teste `microeduca-dev`
> (**https://microeduca-app-production.up.railway.app**), com uma cópia
> completa dos dados de produção.

---

## STATUS

| Fase | O que entrega | Commit | Testes |
|---|---|---|---|
| A | publicar em produção — resolve (e) e (f) para os usuários reais | **pendente** | — |
| B | prazo de "novo" configurável e orientações de liberação (c, d) | `485461f` | 12/12 |
| C | registro de acessos ao portal (a) | `724e608` | 14/14 |
| D | formulário por vídeo (a, b) | `8703515` | 16/16 |
| E | grupos "Em treinamento" e "Efetivos" (g) | `f5ba210` | 18/18 |
| F | quadro de avisos por grupo (g) | `10a0d29` | 17/17 |
| G | chat assíncrono entre usuário e administração (g) | `002cfd3` | 15/15 |
| H | home em pastas e visibilidade no servidor (g) | `b7eeaab` | 10/10 |
| — | regressão geral e segurança, ao final | — | 31/32 |

O 32º caso foi um teste mal escrito, não um defeito: eu esperava 403 em
`GET /announcements?all=true` para usuário comum, mas o correto é 200 com a
lista já filtrada — o `all=true` é ignorado para quem não é admin, e o aviso
destinado a outro grupo não vem junto. Conferido.

A Fase A continua pendente e é a mais urgente: **enquanto o branch não subir,
os colaboradores continuam enxergando treinamentos de setores que não são os
deles em produção.** Ela depende de duas ações que só o dono da conta pode
fazer — rotacionar as credenciais expostas e definir `DATABASE_URL` e
`JWT_SECRET` no serviço de produção.

---

## Fase A — o que falta fazer, na ordem

Tudo abaixo é no projeto **MicroEduca** (produção), não no `microeduca-dev`.
Nenhum destes passos foi executado: exigem credenciais e decisões que são do
dono da conta.

### 1. Rotacionar as credenciais expostas

O `.env` esteve num repositório público e continua no histórico do Git. Trocar
o arquivo não basta — as chaves antigas seguem lá.

- **Postgres de produção:** no Railway, serviço Postgres › *Settings* ›
  rotacionar a senha. Se a variável do app estiver como
  `DATABASE_URL=${{Postgres.DATABASE_URL}}`, a nova senha se propaga sozinha;
  se estiver colada como texto, atualize à mão.
- **Vimeo:** gerar um novo par client ID/secret em
  developer.vimeo.com e revogar o antigo.

### 2. Variáveis no serviço de produção

O `.env` saiu do versionamento; sem estas duas o servidor não sobe:

- `DATABASE_URL` — de preferência a referência `${{Postgres.DATABASE_URL}}`
- `JWT_SECRET` — uma cadeia aleatória longa, diferente da do ambiente de teste

### 3. Volume em `/data`

Criar o volume no serviço de produção e montá-lo em `/data`. A migração dos
arquivos de `bytea` para o volume roda sozinha no boot
(`migrarArquivosParaVolume`, em `server/index.mjs`), já validada com os 35
arquivos reais no ambiente de teste.

Depois do primeiro boot, conferir `GET /api/files-storage/status`: deve
responder `no_banco = 0`.

### 4. Merge e publicação

Merge de `melhorias-doc2` em `main`. A produção está conectada ao GitHub e
publica sozinha ao receber o push.

### 5. Avisar a MICRO antes

**O deploy desloga todos os usuários uma vez**, porque as sessões antigas não
têm token. Ninguém perde progresso — é só entrar de novo.

### 6. Conferir depois de publicar

- Repetir a consulta de visibilidade para **Vinicius Santos**: deve devolver
  **3 pastas**, não 154.
- Abrir um PDF e uma imagem, para confirmar que os arquivos migraram.
- Entrar como um colaborador comum e conferir que a home abre em pastas.

### Opcional, sem pressa

Depois que os arquivos estiverem no volume, um `VACUUM FULL` na tabela `files`
de produção recupera cerca de 84 MB — o banco era 88% blobs de arquivo.

---

## Fase H — home em pastas

O pedido era abrir a home mostrando só os nomes das pastas, com os vídeos
aparecendo depois de entrar.

**`src/components/NavegadorDePastas.tsx`** monta a árvore a partir dos vídeos
que o servidor liberou para aquele usuário. A consequência é que uma pasta sem
nenhum conteúdo visível não existe na navegação — que era exatamente como
setores alheios apareciam na listagem anterior, com nome e tudo, só vazios.

A posição vai na URL (`?pasta=…&modulo=…`): o botão voltar do navegador
funciona e o endereço de uma pasta pode ser guardado ou enviado a alguém.

A aba "Por Categoria", que renderizava toda pasta com filhos mesmo sem
conteúdo liberado, foi substituída por essa navegação. "Todos os Vídeos" e
"Continuar assistindo" continuam onde estavam.

### Visibilidade movida para o servidor

`GET /api/modules` e `GET /api/categories` devolviam a estrutura inteira do
portal para qualquer usuário autenticado, e cabia ao navegador esconder o que
não era dele. Agora ambos filtram pelas mesmas regras dos vídeos.

Medido na cópia dos dados de produção, com os 51 usuários reais:

| | antes | depois |
|---|---|---|
| pastas devolvidas a um colaborador | 154 (todas) | 44,3 em média |
| Vinicius Santos, o usuário das capturas | 154 | 3 — as que lhe foram concedidas |
| categorias devolvidas | 10 (todas) | só as atribuídas |

Os ancestrais de uma pasta concedida entram na resposta mesmo sem serem
concedidos, senão a trilha até ela ficaria quebrada. Verificado nos 21 usuários
que têm pastas visíveis: nenhuma pasta órfã.

### Layout

A referência enviada é a captura do sistema de Almoxarifado da Micro
(`word/media/image9.png` do documento). Traço a traço, o que foi reproduzido:

| No modelo | No portal |
|---|---|
| faixa marrom cheia, marca em branco à esquerda | cabeçalho `bg-primary`, "MICROEDUCA · PORTAL DE TREINAMENTO" |
| navegação em segunda linha, versalete espaçado, sublinhado na aba atual | mesma barra, com `aria-current` na página aberta |
| cartões de indicador: número grande, rótulo em versalete, borda colorida à esquerda | os quatro indicadores da home |
| seções com título em versalete e contador ao lado | "PASTAS 6", "AULAS 16" no navegador |
| etiqueta de situação em versalete, contornada | "CONCLUÍDO" / "45%" nas aulas |
| data e informação secundária alinhadas à direita | duração e situação à direita de cada linha |

As cores saem das variáveis de marca que já estavam no `tailwind.config.ts`;
o marrom do cabeçalho é o mesmo `rgb(139, 76, 75)` do logotipo da Micro.

### Critério de "vídeos recentes" às claras

O item (c) pede o período informado claramente, com o número de dias. Estava
só no `title` do selo — aparecia ao passar o mouse. Agora é uma linha visível
na tela: *"Aulas publicadas nos últimos 7 dias aparecem com o selo Novo"*, com
o número vindo da configuração, não fixo no código.

### Duração por extenso

`formatDurationLong` caía no formato de relógio abaixo de uma hora, e a mesma
lista misturava "1h 50min 53s" com "13:06". Agora é sempre por extenso.
Afeta todas as telas que mostram carga horária.

---

## Verificação

Bateria de API contra o ambiente de teste, com limpeza por id — **nunca** os
scripts antigos do scratchpad, cuja limpeza apaga todos os vídeos, e o banco de
teste hoje tem a cópia da produção.

Conferência no navegador em cada fase: os três defeitos mais chatos desta
rodada (diálogo sem rolagem, edição de módulo inalcançável, ausência de menu no
telefone) só apareceram navegando.


---

## Correção — envio de vídeos ao Vimeo

Regressão minha, da Fase 1 do documento anterior: ao exigir token em todas as
rotas da API, cinco chamadas ficaram para trás porque não passavam pela camada
`src/lib/api.ts` e sim por `fetch` cru, sem o cabeçalho `Authorization`.

| Chamada | Onde | Resultado |
|---|---|---|
| `GET /vimeo-token/status` | tela de upload | 401 — a tela concluía "token não configurado" **sempre** |
| `POST /vimeo-upload` | tela de upload | 401 |
| `GET /vimeo-thumbnail/:id` | tela de upload e `AdminVideos` | 401 |
| `DELETE /vimeo/:id` | `AdminVideos` | 401 |
| `POST /videos/fix-module-category-sync` | `AdminVideos` | 401 |

O efeito visível era o pior possível para diagnosticar: a tela acusava falta da
variável mesmo quando ela existia, porque nunca chegava a perguntar ao servidor.
As cinco passaram a usar `api.*`, que injeta o token.

No mesmo caminho, a isenção de autenticação da leitura de arquivo cobria só
`GET`. O player usa `HEAD` para descobrir o tipo do arquivo antes de decidir
como exibi-lo, e levava 401. Agora `HEAD` entra na mesma isenção.

A mensagem da tela também foi reescrita: dizia só o nome da variável, sem
explicar que o *access token* é diferente do Client ID e do Client Secret —
que é exatamente a confusão que aconteceu.
