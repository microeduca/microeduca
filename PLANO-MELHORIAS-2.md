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
| A — publicar em produção | resolve (e) e (f) para os usuários reais | **pendente do cliente** | — |
| B — prazo de "novo" e ajuda de liberação (c, d) | `485461f` | 12/12 |
| C — registro de acessos ao portal (a) | `724e608` | 14/14 |
| D — formulário por vídeo (a, b) | `8703515` | 16/16 |
| E — grupos "Em treinamento" e "Efetivos" (g) | `f5ba210` | 18/18 |
| F — quadro de avisos por grupo (g) | `10a0d29` | 17/17 |
| G — chat assíncrono (g) | `002cfd3` | 15/15 |
| H — home em pastas e novo layout (g) | este commit | 10/10 + navegador |

A Fase A continua pendente e é a mais urgente: **enquanto o branch não subir,
os colaboradores continuam enxergando treinamentos de setores que não são os
deles em produção.** Ela depende de duas ações que só o dono da conta pode
fazer — rotacionar as credenciais expostas e definir `DATABASE_URL` e
`JWT_SECRET` no serviço de produção.

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

Cartões de indicador com borda colorida à esquerda, faixa de boas-vindas com
"Retomar de onde parou" e acesso direto ao chat, e listas agrupadas com
contadores — o modelo do sistema de Almoxarifado que o cliente enviou como
referência. As cores saem das variáveis de marca que já estavam no
`tailwind.config.ts`.

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
