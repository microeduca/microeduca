# Playbook do Administrador — Portal MicroEduca

Guia prático de tudo que o administrador consegue fazer no portal, com foco
nos recursos novos. Escrito na ordem em que as tarefas costumam aparecer no
dia a dia.

**Sumário**

1. [Entrar e se orientar](#1-entrar-e-se-orientar)
2. [Publicar conteúdo](#2-publicar-conteúdo)
3. [Organizar a estrutura](#3-organizar-a-estrutura)
4. [Avaliações por módulo](#4-avaliações-por-módulo)
5. [Liberação programada](#5-liberação-programada)
6. [Gerenciar usuários e acessos](#6-gerenciar-usuários-e-acessos)
7. [Relatórios](#7-relatórios)
8. [Avisos e mensagens](#8-avisos-e-mensagens)
9. [Configurações](#9-configurações)
10. [Perguntas frequentes](#10-perguntas-frequentes)

---

## 1. Entrar e se orientar

Acesse o portal e entre com seu e-mail e senha. No primeiro acesso o sistema
pede aceite dos Termos de Uso.

O menu do topo tem cinco áreas:

| Menu | Para quê |
|---|---|
| **Dashboard** | visão rápida de uso e últimas visualizações |
| **Vídeos** | publicar e organizar todo o conteúdo |
| **Categorias & Módulos** | montar a estrutura de pastas e subpastas |
| **Usuários** | cadastrar pessoas e definir o que cada uma vê |
| **Relatórios** | números de utilização, com período e exportação |

> **Trocar a própria senha:** clique no seu nome, no canto superior direito.

### O que o Dashboard mostra

Quatro indicadores no topo — total de usuários, total de vídeos,
visualizações e **usuários ativos nos últimos 7 dias**. Abaixo, três blocos:
usuários mais ativos, conteúdos mais acessados e evolução de acessos.

Por fim, a tabela **Últimas visualizações**, com filtro por usuário e por
categoria, mostrando quem assistiu o quê e quando.

> O Dashboard é só leitura. Para gerenciar vídeos, use o menu **Vídeos** —
> antes essa listagem ficava embutida aqui e deixava a página quilométrica.

---

## 2. Publicar conteúdo

Há dois tipos de conteúdo, e a diferença importa.

### 2.1 Vídeo

**Vídeos → Enviar novo material → Vídeo (Vimeo)**

Preencha título, descrição, categorias, módulo/submódulo e envie o arquivo.
O vídeo sobe para o Vimeo e é incorporado ao portal automaticamente.

### 2.2 Arquivo como aula (PDF, imagem, documento)

Use quando o arquivo **é** o conteúdo: uma apostila, um protocolo, um manual.

**Vídeos → Enviar novo material → Arquivo (PDF/JPG/PNG)**

| Campo | Observação |
|---|---|
| Título | obrigatório |
| Descrição | opcional |
| Categoria | obrigatória |
| **Módulo / Subpasta** | é o que faz o arquivo ocupar a mesma posição de um vídeo na estrutura |
| **Liberação programada** | deixe vazio para liberar imediatamente |
| Arquivo | obrigatório |

O aluno abre o arquivo dentro do portal, sem baixar.

### 2.3 Material de apoio anexado a uma aula

Use quando o arquivo **acompanha** um vídeo: slides da apresentação, planilha
de exercício, checklist.

**Vídeos → localize a aula → menu ⋮ → Editar → campo "Materiais de apoio"**

Aceita **vários arquivos de uma vez**. O aluno vê os anexos listados abaixo do
player, ao assistir a aula.

### Formatos aceitos

PDF · JPEG · PNG · TXT · CSV · DOC · DOCX · XLS · XLSX · PPT · PPTX

### Como escolher entre aula e material de apoio

Se o aluno precisa **cumprir** aquele item, é aula — entra na contagem e na
carga horária da subpasta. Se é complemento de algo que ele já está
assistindo, é material de apoio.

---

## 3. Organizar a estrutura

> **Como o colaborador enxerga isso.** A página inicial dele abre mostrando só
> os nomes das pastas, com a contagem de conteúdos e a carga horária somada das
> subpastas; os vídeos aparecem quando ele entra. Pasta sem nenhum conteúdo
> liberado para aquela pessoa não aparece — nem o nome. Se você criar uma pasta
> e ela não surgir para ninguém, o motivo costuma ser esse: ainda não há vídeo
> liberado dentro dela.

**Menu Vídeos** tem duas visões, alternadas pelos botões no canto:

- **Hierárquico** — árvore de Categoria › Módulo › Submódulo, com totais
- **Lista** — tabela simples, com paginação

Na visão hierárquica você pode **arrastar as aulas** para reordenar dentro de
um módulo. Cada pasta mostra quantos vídeos tem e a **carga horária somada de
todos os descendentes** — uma pasta que só contém subpastas agora exibe o
total delas, e não mais "0min".

### Durações

Toda duração aparece em horas quando passa de 59 minutos:

- `7:02` — sete minutos e dois segundos
- `1h 25min 23s` — uma hora, vinte e cinco minutos e vinte e três segundos

### Criar categorias e módulos

**Categorias & Módulos**

- Coluna da esquerda: criar, renomear e excluir **categorias**
- Coluna da direita: a **árvore de módulos** da categoria selecionada

Para criar um submódulo, use o **+** na linha do módulo-pai. As setas ↑ ↓
reordenam. Use a busca quando a lista for longa.

> Um módulo só pode ser excluído se não tiver submódulos nem aulas dentro.

---

## 3.1 Ficha da aula: mentor e descrição

Ao cadastrar ou editar um vídeo — inclusive no envio ao Vimeo — a antiga
"Descrição" virou dois blocos:

**Sobre o mentor.** Nome, foto e um parágrafo sobre quem está dando a aula.
O nome tem sugestão automática: escolhendo alguém que já deu outra aula, a
biografia e a foto vêm junto, sem redigitar.

**Sobre a aula.** O que o colaborador vai aprender ali.

Os dois aparecem para o aluno logo abaixo do vídeo, na aba *Sobre*; os arquivos
vinculados ficam na aba *Materiais*, ao lado. Se você não preencher o mentor, o
bloco simplesmente não aparece — aulas antigas seguem mostrando só a descrição.

---

## 4. Avaliações por módulo

Permite anexar um formulário (Google Forms, Microsoft Forms, ou qualquer URL)
a um módulo.

1. **Categorias & Módulos**
2. Selecione a categoria
3. Clique no **lápis (✏️)** do módulo
4. Cole a URL no campo **"Link da avaliação (forms)"**
5. **Salvar**

O selo **"avaliação"** passa a aparecer ao lado do nome do módulo — é como
você identifica de relance quais já têm prova.

O aluno vê o botão **"Fazer avaliação do módulo"** dentro daquele bloco, em
Meus Cursos, e o formulário abre em nova aba.

Para remover, edite de novo e apague o campo.

> A avaliação é **por módulo**, não por aula: aparece uma vez, acima da lista
> de aulas do bloco.

---

## 5. Liberação programada

Existem dois tipos, e eles se combinam.

### 5.1 Para todo mundo

Define que um conteúdo só fica visível a partir de uma data, para todos.

| Onde | Como |
|---|---|
| Categoria | Categorias & Módulos → lápis na categoria |
| Módulo ou submódulo | Categorias & Módulos → lápis no módulo → campo de data |
| Aula | Vídeos → ⋮ → Editar → "Liberação programada" |
| Arquivo como aula | no próprio formulário de envio |

Vale a regra mais restritiva: se o módulo-pai ainda não liberou, nada dentro
dele aparece, mesmo que a aula já tenha data vencida.

### 5.2 Para uma pessoa específica

É o caso *"o Fulano só acessa a pasta Treinamentos a partir do dia tal"*.

1. **Usuários** → localize a pessoa → **⋮ → Editar**
2. Marque a categoria ou o módulo que ela terá acesso
3. Ao lado do item marcado aparece um **campo de data** — preencha
4. **Salvar Alterações**

Até a data, aquele conteúdo não aparece para essa pessoa — e continua normal
para todo mundo. Deixe a data vazia para liberar na hora.

---

## 6. Gerenciar usuários e acessos

**Menu Usuários**

A lista tem **busca por nome ou e-mail**, filtro por **perfil**, filtro por
**situação** e paginação de 15 em 15.

### Cadastrar

Botão **Novo Usuário**. Perfis disponíveis:

| Perfil | O que faz |
|---|---|
| **Usuário** | colaborador; vê o conteúdo liberado para ele |
| **Cliente** | perfil externo, com painel próprio |
| **Administrador** | acesso total ao portal |

### Definir o que a pessoa vê

No cadastro ou na edição:

- **Categorias de Acesso** — marque as pastas que ela verá
- **Módulos/Submódulos** — marque subpastas específicas

**A regra vale a pena entender:** se você marcar **algum** módulo dentro de
uma categoria, a pessoa passa a ver **somente** aqueles módulos. Se não marcar
nenhum, ela vê a categoria inteira.

> Exemplo do dia a dia: a pasta Setorial tem 5 subpastas e você quer liberar
> 3. Marque a categoria Setorial **e** as 3 subpastas. As outras 2 ficam
> invisíveis para essa pessoa.

Conceder um módulo concede automaticamente os submódulos dele.

### Inativar

**⋮ → Inativar acesso**

A pessoa **continua cadastrada**, com todo o histórico preservado para
auditoria, mas não consegue mais entrar. Quem estiver logado no momento é
desconectado. Para reverter, o mesmo menu oferece **Ativar acesso**.

> Você não consegue inativar nem excluir a si mesmo.

### Ver a atividade de uma pessoa

**⋮ → Ver perfil**

Mostra tudo que a pessoa assistiu, com filtro de **período** e botão de
exportação em **CSV**.

---

## 7. Relatórios

**Menu Relatórios**

No topo, escolha o período — por datas ou pelos atalhos **7 / 30 / 90 dias /
Tudo**. Todos os números abaixo respeitam o recorte.

Quatro indicadores: usuários ativos no período, horas consumidas,
visualizações e conclusões.

E quatro abas, **cada uma com exportação CSV**:

| Aba | Responde |
|---|---|
| **Por usuário** | quem mais usa, quantas horas, quando acessou pela última vez |
| **Por conteúdo** | quais aulas são mais vistas, e por quantas pessoas |
| **Por pasta** | quais categorias concentram o consumo |
| **Evolução** | acessos por dia, em gráfico de barras |

O CSV abre direto no Excel em português (separador `;`).

---

## 8. Avisos e mensagens

### Quadro de avisos — `/admin/avisos`

Recados que aparecem no topo da página inicial do colaborador.

- **Título e texto** — o texto respeita as quebras de linha que você digitar.
- **Para quem** — todos, só *Em treinamento* ou só *Efetivos*. Sem marcar
  nenhum grupo, vale para todos.
- **Vigência** — início e fim. O aviso aparece e some sozinho; não é preciso
  voltar para apagar.

Um aviso fora da vigência continua na sua lista de gestão, marcado como
encerrado, mas não aparece para ninguém.

### Mensagens — `/admin/mensagens`

Caixa de entrada com uma conversa por colaborador. A lista mostra a última
mensagem de cada um e quantas estão sem ler; use a busca para achar alguém
pelo nome.

- Abrir a conversa marca as mensagens daquela pessoa como lidas.
- **Enter** envia, **Shift+Enter** quebra a linha.
- O contador ao lado de *Mensagens*, no menu, soma tudo que está sem ler.
- Não é chat ao vivo — a tela se atualiza sozinha a cada dez segundos.

Cada conversa é entre um colaborador e a administração. Um colaborador nunca
alcança a conversa de outro.

---

## 9. Configurações

**Dashboard → Configurações**

- **Boas-vindas — Usuários** e **Boas-vindas — Clientes**: vídeo exibido no
  topo do painel de cada perfil
- **Materiais de apoio**: arquivos gerais, visíveis no painel do aluno, sem
  vínculo com uma aula específica
- **Vimeo**: conexão da conta usada para hospedar os vídeos

---

## 10. Perguntas frequentes

**Publiquei uma aula e o aluno não vê.**
Confira, nesta ordem: (1) a categoria está atribuída a ele? (2) você marcou
módulos específicos para essa pessoa — e a aula está fora deles? (3) há
liberação programada com data futura na aula, no módulo, na categoria ou no
próprio usuário?

**A pasta mostra "0 vídeos" mas tem conteúdo.**
Os vídeos podem estar em submódulos e a pasta estar recolhida. Clique nela
para expandir — a contagem e a carga horária já somam todos os descendentes.

**Preciso tirar alguém do portal sem perder o histórico.**
Use **Inativar acesso**, não Excluir. Excluir remove o cadastro e o histórico
junto.

**Dá para exportar os dados?**
Sim. Cada aba de Relatórios tem botão CSV, e o perfil individual de cada
usuário também.

**Qual a diferença entre "Categorias & Módulos" e a tela de módulos antiga?**
Use sempre **Categorias & Módulos**, a do menu. Existe uma segunda tela com a
mesma função fora do menu, mantida por compatibilidade.
