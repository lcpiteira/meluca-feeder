# MelucaFeeder - Manual de Utilizacao

## Introducao

O MelucaFeeder e uma aplicacao para gerir as refeicoes e a saude da Meluca. Permite controlar o stock de refeicoes, planear cozinhados, acompanhar o peso e manter um registo de saude e consultas veterinarias.

A aplicacao funciona no browser e pode ser instalada no telemovel como uma app. Os dados sao sincronizados entre todos os dispositivos atraves do Firebase.

---

## Aceder a Aplicacao

1. Abre o browser no telemovel ou computador
2. Acede ao URL do GitHub Pages onde a app esta publicada (ex: `https://lcpiteira.github.io/meluca-feeder/`)
3. A app carrega e mostra o **Dashboard** como ecra principal

> **Dica:** Podes instalar a app no telemovel. No browser, procura a opcao "Adicionar ao ecra inicial" ou "Instalar aplicacao" para usares a app como se fosse nativa.

---

## Navegacao

A aplicacao tem **4 separadores** na parte superior:

| Separador | Funcao |
|---|---|
| **Dashboard** | Controlo do stock, proximas refeicoes, calendario e historico |
| **Preparacao** | Calculadora de ingredientes e lista de compras |
| **Peso** | Registo e evolucao do peso |
| **Saude** | Registos veterinarios e notas de saude |

Clica em cada separador para alternar entre as seccoes. No rodape encontras o link para as **Configuracoes**.

---

## Dashboard

### Ver o Stock Atual

Ao abrir a app, o numero central mostra quantas refeicoes estao em stock. Abaixo aparece uma estimativa dos dias de autonomia.

- **Numero verde:** stock normal
- **Numero amarelo:** stock baixo (perto do limiar de alerta)
- **Numero vermelho a piscar:** sem stock

Logo abaixo, a app mostra a **data estimada** em que o stock se vai esgotar.

### Proximas Refeicoes

A seccao mostra quando sera a proxima refeicao:
- **Manha:** as 8h
- **Noite:** as 21h

O tempo restante e apresentado no formato "em Xh Ymin".

### Registar Producao (quando cozinhas)

1. No campo "N.o refeicoes", introduz o numero de refeicoes que preparaste
2. Clica em **"+ Adicionar"**
3. O stock e atualizado e aparece uma confirmacao

### Ajuste Manual

Se precisares corrigir o stock:
- Clica **"- 1 Refeicao"** para remover uma refeicao
- Clica **"+ 1 Refeicao"** para adicionar uma refeicao

### Calendario de Refeicoes

O calendario mostra, para cada dia do mes, quantas refeicoes foram deduzidas:
- **Verde:** 2 refeicoes (dia completo)
- **Amarelo:** 1 refeicao (dia incompleto)
- **Vermelho:** 0 refeicoes (dia sem registo)

Usa os botoes **<** e **>** para navegar entre meses.

### Historico

No fundo do Dashboard, aparece a lista das ultimas 20 operacoes com a data, descricao e quantidade.

---

## Preparacao

### Calculadora de Ingredientes

Serve para saber quantas refeicoes consegues preparar com os ingredientes que tens disponiveis.

1. Acede ao separador **Preparacao**
2. Introduz as quantidades disponiveis de cada ingrediente:
   - **Frango** em gramas
   - **Arroz** em gramas
   - **Ervilhas** em gramas
   - **Ovos** em unidades
3. Clica **"Calcular Refeicoes"**
4. O resultado mostra o numero maximo de refeicoes completas possiveis

> **Nota:** O resultado e determinado pelo ingrediente mais limitante. Por exemplo, se tens frango para 10 refeicoes mas arroz para apenas 7, o resultado sera 7.

### Lista de Compras

Gera uma lista de compras com as quantidades exactas de ingredientes necessarios.

1. No campo "N.o refeicoes", indica quantas refeicoes queres preparar (por defeito: 14, equivalente a 1 semana)
2. Clica **"Gerar Lista"**
3. A lista mostra cada ingrediente com a quantidade total necessaria

As quantidades sao baseadas na receita configurada nas definicoes. Valores acima de 1000g sao apresentados em quilogramas.

---

## Peso

### Registar Peso

1. Acede ao separador **Peso**
2. Introduz o peso em quilogramas (ex: 9.3)
3. Clica **"Registar"**
4. O peso e guardado com a data e hora atual

### Grafico de Evolucao

Apos pelo menos 2 registos, aparece um grafico de linha mostrando a evolucao do peso ao longo do tempo. Se tiveres um peso alvo definido nas configuracoes, aparece como uma linha tracejada rosa.

### Historico de Peso

Abaixo do grafico, e apresentada uma lista dos ultimos 10 registos de peso.

### Lembretes de Pesagem

Se passarem 7 ou mais dias sem registar o peso, a app envia uma notificacao via Telegram a lembrar que e hora de pesar a Meluca.

---

## Saude

### Registar Evento Veterinario

1. Acede ao separador **Saude**
2. Selecciona o **tipo** de evento:
   - Consulta
   - Vacina
   - Desparasitacao
   - Outro
3. Escreve uma **descricao** (obrigatorio)
4. Selecciona a **data** do evento (por defeito: hoje)
5. Opcionalmente, indica a **proxima data** (ex: data do reforco da vacina)
6. Clica **"Registar"**

### Proximos Eventos

Se existirem eventos com data futura agendada, aparecem na seccao **"Proximos"** ordenados por proximidade.

### Historico Veterinario

Todos os eventos veterinarios passados sao listados cronologicamente (mais recente primeiro).

### Lembretes Automaticos

Se houver eventos veterinarios agendados para **hoje** ou **amanha**, a app envia automaticamente uma notificacao via Telegram. Este lembrete e enviado no maximo uma vez por dia.

### Notas de Saude

Para registar observacoes rapidas sobre a saude da Meluca:

1. Na seccao **"Notas de Saude"**, escreve a observacao (ex: "vomitou de manha", "comeu bem")
2. Clica **"Adicionar"** ou prime **Enter**
3. A nota e guardada com a data e hora

---

## Configuracoes

### Aceder as Configuracoes

1. Clica no link **"Configuracoes"** no rodape da app
2. Faz login com:
   - **Utilizador:** `admin`
   - **Password:** `1234`
3. Os paineis de configuracao ficam visiveis

### Limiar de Alerta de Stock

Define abaixo de quantas refeicoes o stock e considerado baixo.

1. Altera o valor no campo "Alerta quando stock atingir"
2. O valor por defeito e **5 refeicoes**

Quando o stock atinge este limiar, o display muda para amarelo e e enviada uma notificacao Telegram.

### Configurar Notificacoes Telegram

Para receber alertas no Telegram:

1. **Criar o bot:**
   - Abre o Telegram e procura o [@BotFather](https://t.me/BotFather)
   - Envia `/newbot` e segue as instrucoes
   - Copia o **token** que recebes

2. **Obter o Chat ID:**
   - Abre uma conversa com o teu bot e envia qualquer mensagem
   - Acede a `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Procura o campo `chat.id` na resposta

3. **Configurar na app:**
   - Cola o **Bot Token** no campo apropriado
   - Cola o **Chat ID** no segundo campo
   - Clica **"Testar Notificacao"** para verificar que funciona

### Receita (Ingredientes por Refeicao)

Define as quantidades de cada ingrediente por refeicao:

| Ingrediente | Valor por defeito |
|---|---|
| Frango | 50g |
| Arroz | 50g |
| Ervilhas | 25g |
| Ovo | 0.5 unidades |

Estes valores sao usados na calculadora de ingredientes e na lista de compras.

### Objectivo de Peso

Define o peso alvo da Meluca (ex: 9.5 kg). Este valor aparece como uma linha tracejada rosa no grafico de evolucao de peso.

### Guardar

Depois de alterar qualquer configuracao, clica **"Guardar Configuracoes"** para salvar. As configuracoes sao guardadas localmente e no Firebase.

---

## Funcionalidades Automaticas

### Deducao Automatica de Refeicoes

A app deduz automaticamente refeicoes do stock nos horarios programados:
- **8h** - refeicao da manha
- **21h** - refeicao da noite

**Como funciona:**
- Quando abres a app, ela calcula todas as refeicoes que deviam ter sido consumidas desde a ultima vez que a abriste e deduz de uma so vez
- Enquanto a app esta aberta, verifica a cada minuto se e hora de deduzir
- As deducoes so acontecem se houver stock disponivel

### Sincronizacao entre Dispositivos

Todos os dados sao sincronizados em tempo real atraves do Firebase:
- Se alterares algo num dispositivo, a mudanca aparece imediatamente noutro
- O estado da sincronizacao aparece no rodape:
  - **"Sincronizado"** - tudo actualizado
  - **"A sincronizar..."** - a ligar ao servidor
  - **"Erro de sync"** - problema de ligacao
  - **"Apenas local"** - Firebase nao configurado

### Tipos de Notificacao

| Notificacao | Quando e enviada |
|---|---|
| Stock baixo | Quando o stock atinge o limiar de alerta |
| Stock esgotado | Quando o stock chega a zero |
| Lembrete veterinario | Quando ha eventos agendados para hoje ou amanha |
| Lembrete de pesagem | Quando passam 7+ dias sem registar peso |

---

## Tema Claro / Escuro

A app suporta dois temas visuais:
- **Tema escuro** (por defeito) - fundo escuro, ideal para noite
- **Tema claro** - fundo claro, ideal para dia

Para alternar, clica no icone da **lua/sol** no canto superior direito do ecra. A preferencia e guardada automaticamente.

---

## Instalacao como App (PWA)

### Em Android (Chrome)

1. Abre a app no Chrome
2. Clica nos tres pontos (menu) no canto superior direito
3. Selecciona **"Adicionar ao ecra inicial"** ou **"Instalar aplicacao"**
4. Confirma a instalacao

### Em iOS (Safari)

1. Abre a app no Safari
2. Clica no icone de **partilha** (quadrado com seta para cima)
3. Selecciona **"Adicionar ao ecra inicial"**
4. Confirma clicando em **"Adicionar"**

Apos a instalacao, a app aparece como um icone no ecra do telemovel e abre em ecra inteiro, sem barra do browser.

---

## Deploy no GitHub Pages

Para publicar a tua propria instancia:

1. Faz fork do repositorio ou cria um novo no GitHub
2. Faz push dos ficheiros para a branch `main`
3. No GitHub, vai a **Settings > Pages**
4. Em "Source", selecciona a branch `main` e a pasta `/` (root)
5. Clica **Save**
6. Apos alguns minutos, a app estara disponivel no URL indicado

---

## Resolucao de Problemas

### A app nao sincroniza entre dispositivos
- Verifica se tens ligacao a internet
- O indicador no rodape deve mostrar "Sincronizado"
- Se mostrar "Erro de sync", recarrega a pagina

### Nao recebo notificacoes no Telegram
- Verifica se o Bot Token e o Chat ID estao correctos nas configuracoes
- Usa o botao "Testar Notificacao" para verificar
- Certifica-te de que enviaste uma mensagem ao bot antes de obter o Chat ID

### O stock nao deduz automaticamente
- A app precisa de ser aberta para as deducoes serem processadas
- Ao abrir, todas as refeicoes em atraso sao deduzidas de uma so vez
- Se o stock estiver a zero, nao ha nada para deduzir

### O grafico de peso nao aparece
- Sao necessarios pelo menos 2 registos de peso para o grafico ser desenhado
- Verifica se os registos foram guardados correctamente

### A app esta lenta
- Tenta recarregar a pagina
- Limpar a cache do browser pode ajudar
- A app funciona melhor com ligacao estavel a internet
