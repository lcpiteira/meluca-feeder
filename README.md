# MelucaFeeder 🐕

Aplicação web para gestão de refeições da Meluca, pensada para correr no GitHub Pages.

## Funcionalidades

- **Registo de produção**: Quando cozinhas, adicionas o número de refeições produzidas
- **Dedução automática**: 2 refeições por dia (8h e 21h), calculadas automaticamente
- **Alerta de stock baixo**: Notificação via Telegram quando o stock atinge o limite configurado
- **Histórico**: Registo de todas as operações (produção, deduções automáticas, ajustes manuais)
- **PWA**: Pode ser instalada como app no telemóvel

## Como usar

1. Faz fork ou cria um repositório no GitHub
2. Activa GitHub Pages nas Settings (branch `main`, pasta `/`)
3. Acede à app pelo URL do GitHub Pages
4. Configura o Telegram para receber notificações (ver abaixo)

## Configurar Notificações Telegram

1. Abre o Telegram e procura o [@BotFather](https://t.me/BotFather)
2. Envia `/newbot` e segue as instruções para criar um bot
3. Copia o **token** que o BotFather te dá
4. Abre uma conversa com o teu bot e envia qualquer mensagem
5. Acede a `https://api.telegram.org/bot<TOKEN>/getUpdates` para obter o **Chat ID**
6. Na app, cola o token e o chat ID nas configurações

## Lógica de dedução automática

A app não tem servidor. Cada vez que abres a app, calcula quantas refeições deveriam ter sido consumidas desde a última visita (com base nos horários das 8h e 21h) e deduz automaticamente. Enquanto a app está aberta, verifica a cada minuto.

## Deploy no GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USER/melucafeeder.git
git push -u origin main
```

Depois, em Settings > Pages, selecciona a branch `main` e a pasta root `/`.

## Tecnologias

- HTML, CSS, JavaScript vanilla
- LocalStorage para persistência
- Telegram Bot API para notificações
- Zero dependências
