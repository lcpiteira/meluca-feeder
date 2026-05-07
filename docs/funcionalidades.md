# MelucaFeeder - Documentacao de Funcionalidades

## Visao Geral

O MelucaFeeder e uma aplicacao web progressiva (PWA) para gestao completa dos cuidados da Meluca. A aplicacao esta organizada em quatro separadores principais: **Dashboard**, **Preparacao**, **Peso** e **Saude**, alem de uma pagina de **Configuracoes** protegida por autenticacao.

A aplicacao funciona sem servidor backend proprio, utilizando Firebase Realtime Database para persistencia e sincronizacao de dados em tempo real entre dispositivos.

---

## 1. Dashboard

### 1.1 Visualizacao de Stock

**Descricao:** Mostra o numero atual de refeicoes em stock, com indicacao visual do estado.

**Comportamento:**
- Apresenta o numero de refeicoes disponivel em destaque no centro do ecra
- Calcula automaticamente os dias de autonomia (stock / 2 refeicoes por dia)
- Muda de cor conforme o estado:
  - **Verde:** stock normal (acima do limiar de alerta)
  - **Amarelo (warning):** stock igual ou abaixo do limiar configurado nas definicoes
  - **Vermelho (danger):** stock a zero, com animacao de pulsacao

**Dados utilizados:**
- `state.stock` - numero de refeicoes em stock
- `settings.alertThreshold` - limiar de alerta (por defeito: 5 refeicoes)

---

### 1.2 Previsao de Rotura de Stock

**Descricao:** Estima a data em que o stock se esgotara, assumindo 2 refeicoes diarias.

**Comportamento:**
- Calcula `dias restantes = stock / 2`
- Mostra a data prevista de rotura no formato DD/MM
- Indicacao visual:
  - **Vermelho:** 3 dias ou menos
  - **Amarelo:** 7 dias ou menos
  - **Normal:** mais de 7 dias
- Quando o stock e zero, mostra "Sem stock disponivel"

---

### 1.3 Proximas Refeicoes

**Descricao:** Indica quando sera a proxima refeicao da manha e da noite.

**Comportamento:**
- As refeicoes estao programadas para as **8h** (manha) e **21h** (noite)
- Mostra o tempo relativo ate cada refeicao (ex: "em 3h 45min")
- Se a refeicao de hoje ja passou, mostra a do dia seguinte

---

### 1.4 Adicionar Producao

**Descricao:** Permite registar a producao de novas refeicoes.

**Comportamento:**
- O utilizador introduz o numero de refeicoes preparadas
- Valor minimo: 1
- Ao clicar "Adicionar":
  - O stock e incrementado pela quantidade indicada
  - E criado um registo no historico com o tipo `production`
  - Aparece uma notificacao toast de confirmacao

---

### 1.5 Ajuste Manual

**Descricao:** Permite adicionar ou remover uma refeicao individualmente.

**Comportamento:**
- **"- 1 Refeicao"**: Reduz o stock em 1. Nao permite reduzir abaixo de zero. Verifica alertas apos deducao.
- **"+ 1 Refeicao"**: Incrementa o stock em 1.
- Cada operacao cria um registo no historico com o tipo `manual`

---

### 1.6 Calendario de Refeicoes

**Descricao:** Calendario mensal que mostra quantas refeicoes foram consumidas em cada dia.

**Comportamento:**
- Mostra o mes atual com navegacao para meses anteriores e seguintes
- Cada dia mostra o numero de refeicoes deduzidas automaticamente
- Cores por dia (apenas para dias passados):
  - **Verde (ok):** 2 ou mais refeicoes
  - **Amarelo (partial):** 1 refeicao
  - **Vermelho (missed):** 0 refeicoes
- O dia atual esta destacado
- Semana comeca a segunda-feira
- Legenda visual no fundo do calendario
- Os dados vem do historico de deducoes automaticas

---

### 1.7 Historico de Operacoes

**Descricao:** Lista cronologica das ultimas operacoes realizadas.

**Comportamento:**
- Mostra as 20 operacoes mais recentes
- Cada entrada exibe:
  - Quantidade (com sinal + ou -)
  - Descricao da operacao
  - Data e hora
- Tipos de operacao:
  - `production` - producao de refeicoes
  - `auto` - deducao automatica
  - `manual` - ajuste manual
- Cor verde para adicoes, cor de deducao para remocoes
- Dados sincronizados via Firebase (ultimos 30 registos)

---

## 2. Preparacao

### 2.1 Calculadora de Ingredientes

**Descricao:** Calcula quantas refeicoes completas podem ser preparadas com os ingredientes disponiveis.

**Comportamento:**
- Campos de entrada para cada ingrediente:
  - Frango (gramas)
  - Arroz (gramas)
  - Ervilhas (gramas)
  - Ovos (unidades)
- O calculo usa a receita configurada nas definicoes (quantidades por refeicao)
- Valores por defeito da receita:
  - Frango: 50g por refeicao
  - Arroz: 50g por refeicao
  - Ervilhas: 25g por refeicao
  - Ovos: 0.5 unidades por refeicao
- Resultado: o **minimo** entre as refeicoes possiveis por ingrediente (ingrediente limitante)
- Detalhe por ingrediente mostrando quantas refeicoes cada um permite
- Requer pelo menos um ingrediente introduzido

---

### 2.2 Lista de Compras

**Descricao:** Gera uma lista de compras para um numero alvo de refeicoes.

**Comportamento:**
- O utilizador define quantas refeicoes pretende preparar (por defeito: 14)
- Ao clicar "Gerar Lista", calcula as quantidades de cada ingrediente necessarias
- Para cada ingrediente da receita, multiplica a quantidade por refeicao pelo numero alvo
- Converte automaticamente gramas para quilogramas quando >= 1000g
- Mostra a lista formatada com nome do ingrediente e quantidade

---

## 3. Peso

### 3.1 Registo de Peso

**Descricao:** Permite registar o peso da Meluca ao longo do tempo.

**Comportamento:**
- Campo de entrada para o peso em quilogramas (passo de 0.1 kg)
- Cada registo e guardado com a data e hora atual
- Os dados sao persistidos no Firebase

---

### 3.2 Grafico de Evolucao de Peso

**Descricao:** Grafico de linha mostrando a evolucao do peso ao longo do tempo.

**Comportamento:**
- Mostra os ultimos 20 registos de peso
- Eixo Y: peso em kg (com escala automatica)
- Eixo X: datas dos registos
- Linha com gradiente de preenchimento
- Pontos individuais marcados no grafico
- Grelha de referencia com 4 linhas horizontais
- Se configurado, mostra uma **linha tracejada rosa** com o peso alvo (objectivo)
- Requer pelo menos 2 registos para desenhar o grafico
- Adapta-se ao pixel ratio do dispositivo para nitidez

---

### 3.3 Historico de Peso

**Descricao:** Lista dos ultimos registos de peso.

**Comportamento:**
- Mostra os 10 registos mais recentes
- Cada entrada mostra o peso e a data/hora
- Destaque do ultimo peso registado com indicacao de ha quantos dias foi feito

---

### 3.4 Lembrete de Pesagem

**Descricao:** Envia notificacao via Telegram se nao houver pesagem nos ultimos 7 dias.

**Comportamento:**
- Verificado automaticamente ao carregar a aplicacao
- Envia notificacao no maximo uma vez por dia
- Mensagem indica quantos dias passaram desde a ultima pesagem

---

## 4. Saude

### 4.1 Registo Veterinario

**Descricao:** Permite registar consultas, vacinas, desparasitacoes e outros eventos veterinarios.

**Comportamento:**
- Formulario com os campos:
  - **Tipo:** Consulta, Vacina, Desparasitacao ou Outro
  - **Descricao:** texto livre (obrigatorio)
  - **Data:** data do evento (obrigatorio, por defeito: hoje)
  - **Proxima data:** data do proximo evento/reforco (opcional)
- Cada registo e guardado no Firebase
- A data de hoje e pre-preenchida automaticamente

---

### 4.2 Proximos Eventos Veterinarios

**Descricao:** Lista de eventos veterinarios futuros agendados.

**Comportamento:**
- Filtra registos veterinarios que tenham uma "proxima data" igual ou posterior a hoje
- Ordena por data mais proxima primeiro
- Mostra o tipo (com icone), descricao e data

---

### 4.3 Historico Veterinario

**Descricao:** Lista de todos os eventos veterinarios passados.

**Comportamento:**
- Mostra ate 20 registos veterinarios
- Ordenados do mais recente para o mais antigo
- Cada entrada mostra tipo (com icone), descricao e data

---

### 4.4 Lembretes Veterinarios

**Descricao:** Notificacoes automaticas para eventos veterinarios proximos.

**Comportamento:**
- Verificado ao carregar a aplicacao
- Envia notificacao via Telegram para eventos agendados para **hoje** ou **amanha**
- Envia no maximo uma vez por dia (controlo por localStorage)
- A notificacao lista todos os eventos proximos com a indicacao "HOJE" ou "AMANHA"

---

### 4.5 Notas de Saude

**Descricao:** Registo livre de observacoes sobre a saude da Meluca.

**Comportamento:**
- Campo de texto para notas rapidas (ex: vomito, diarreia, alergia)
- Pode ser submetido com Enter ou clicando "Adicionar"
- Cada nota e guardada com a data e hora
- Mostra ate 30 notas, ordenadas da mais recente para a mais antiga
- Dados persistidos no Firebase

---

## 5. Configuracoes

### 5.1 Autenticacao

**Descricao:** Acesso as configuracoes protegido por login.

**Comportamento:**
- Formulario com utilizador e password
- Credenciais: `admin` / `1234`
- A password e verificada via hash SHA-256
- Apos autenticacao, os paineis de configuracao ficam visiveis

---

### 5.2 Limiar de Alerta

**Descricao:** Define o numero de refeicoes abaixo do qual o stock e considerado baixo.

**Comportamento:**
- Valor numerico (por defeito: 5)
- Quando o stock atinge este valor, o display muda para amarelo e sao enviadas notificacoes

---

### 5.3 Notificacoes Telegram

**Descricao:** Configuracao do bot Telegram para receber notificacoes.

**Comportamento:**
- Campos para:
  - **Bot Token:** token do bot criado com o BotFather
  - **Chat ID:** identificador do chat onde enviar mensagens
- Botao **"Testar Notificacao"** que envia uma mensagem de teste
- Instrucoes integradas sobre como obter o token e o chat ID
- As notificacoes sao enviadas nos seguintes eventos:
  - Stock baixo (igual ou abaixo do limiar)
  - Stock a zero
  - Lembretes veterinarios (hoje/amanha)
  - Lembrete de pesagem (7+ dias sem pesagem)

---

### 5.4 Receita (por refeicao)

**Descricao:** Define as quantidades de cada ingrediente por refeicao.

**Comportamento:**
- Campos editaveis para:
  - Frango (g) - por defeito: 50
  - Arroz (g) - por defeito: 50
  - Ervilhas (g) - por defeito: 25
  - Ovo (unidades) - por defeito: 0.5
- Estas quantidades sao usadas na calculadora de ingredientes e na lista de compras

---

### 5.5 Objectivo de Peso

**Descricao:** Define o peso alvo da Meluca.

**Comportamento:**
- Campo numerico com passo de 0.1 kg
- Quando definido, uma linha tracejada rosa e desenhada no grafico de evolucao de peso
- Serve como referencia visual para acompanhar o progresso

---

## 6. Funcionalidades Transversais

### 6.1 Deducao Automatica de Refeicoes

**Descricao:** Desconta automaticamente refeicoes nos horarios programados.

**Comportamento:**
- Horarios: **8h** (manha) e **21h** (noite)
- Ao abrir a aplicacao, calcula todas as refeicoes que deviam ter sido deduzidas desde a ultima visita
- Enquanto a app esta aberta, verifica a cada **60 segundos**
- Cada deducao reduz o stock em 1 (se stock > 0)
- Cria um registo no historico com o total deduzido
- Verifica alertas apos deducao

---

### 6.2 Sincronizacao Firebase

**Descricao:** Sincronizacao em tempo real de todos os dados via Firebase Realtime Database.

**Comportamento:**
- Dados sincronizados: estado (stock), historico, peso, registos veterinarios, notas de saude, configuracoes
- Listeners em tempo real (`.on('value')`) para atualizacoes instantaneas entre dispositivos
- Indicador de estado de sincronizacao no rodape:
  - "A sincronizar..." - a estabelecer ligacao
  - "Sincronizado" - dados atualizados
  - "Erro de sync" - falha de ligacao
  - "Apenas local" - Firebase nao configurado

---

### 6.3 Tema Claro/Escuro

**Descricao:** Alternancia entre tema escuro (por defeito) e tema claro.

**Comportamento:**
- Botao no canto superior direito do cabecalho
- Icone muda entre lua (escuro) e sol (claro)
- A preferencia e guardada em localStorage
- Todas as cores da interface adaptam-se ao tema escolhido

---

### 6.4 PWA (Progressive Web App)

**Descricao:** A aplicacao pode ser instalada como app nativa no telemovel.

**Comportamento:**
- Manifesto web configurado com nome, icones e cores
- Modo `standalone` - funciona como app independente
- Icone personalizado com a silhueta de um cao (favicon SVG)

---

### 6.5 Notificacoes Toast

**Descricao:** Mensagens temporarias de feedback ao utilizador.

**Comportamento:**
- Aparecem no fundo do ecra
- Desaparecem automaticamente apos 3 segundos
- Usadas para confirmar acoes e mostrar erros de validacao

---

## Arquitectura Tecnica

| Componente | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript vanilla |
| Persistencia local | LocalStorage (configuracoes e tema) |
| Persistencia na nuvem | Firebase Realtime Database |
| Notificacoes | Telegram Bot API |
| Hospedagem | GitHub Pages |
| Tipo de aplicacao | PWA (Progressive Web App) |
| Dependencias externas | Zero (apenas Firebase SDK via CDN) |

### Estrutura de Ficheiros

| Ficheiro | Descricao |
|---|---|
| `index.html` | Pagina principal com os 4 separadores |
| `app.js` | Toda a logica da aplicacao (~1000 linhas) |
| `settings.html` | Pagina de configuracoes |
| `settings.js` | Logica da pagina de configuracoes |
| `style.css` | Estilos da aplicacao (temas claro e escuro) |
| `manifest.json` | Configuracao PWA |
| `favicon.svg` | Icone da aplicacao (silhueta de cao) |
