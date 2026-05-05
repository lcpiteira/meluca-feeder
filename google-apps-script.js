/**
 * MelucaFeeder - Google Apps Script Backend
 * 
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 1. Abre o Google Sheets e cria uma nova folha de cálculo chamada "MelucaFeeder"
 * 2. Renomeia a primeira folha para "State"
 * 3. Cria uma segunda folha chamada "History"
 * 4. Na folha "State", coloca no A1: "stock" e B1: "0"
 *    No A2: "lastProcessed" e B2: a data/hora actual (ex: 2026-05-05T22:00:00.000Z)
 * 5. Na folha "History", coloca os cabeçalhos na linha 1:
 *    A1: "date" | B1: "type" | C1: "quantity" | D1: "description"
 * 6. Vai a Extensões > Apps Script
 * 7. Cola este código todo no editor (substitui o conteúdo existente)
 * 8. Grava com Ctrl+S
 * 9. Implantar > Nova implementação > App da Web
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa
 * 10. Copia o URL da implementação e cola nas configurações da app MelucaFeeder
 */

function doGet(e) {
  var action = e.parameter.action;

  if (action === 'getState') {
    return respond(getState());
  }

  if (action === 'getHistory') {
    return respond(getHistory());
  }

  if (action === 'sync') {
    var data = JSON.parse(e.parameter.data);
    return respond(fullSync(data));
  }

  return respond({ error: 'Invalid action' });
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;

  if (action === 'updateStock') {
    return respond(updateStock(data.stock, data.lastProcessed));
  }

  if (action === 'addHistory') {
    return respond(addHistoryEntry(data.entry));
  }

  if (action === 'sync') {
    return respond(fullSync(data));
  }

  return respond({ error: 'Invalid action' });
}

function getState() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('State');
  var stock = sheet.getRange('B1').getValue();
  var lastProcessed = sheet.getRange('B2').getValue();

  return {
    stock: Number(stock) || 0,
    lastProcessed: lastProcessed ? new Date(lastProcessed).getTime() : Date.now()
  };
}

function updateStock(stock, lastProcessed) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('State');
  sheet.getRange('B1').setValue(stock);
  sheet.getRange('B2').setValue(new Date(lastProcessed).toISOString());

  return { success: true, stock: stock, lastProcessed: lastProcessed };
}

function getHistory() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('History');
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return { history: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var history = data.map(function (row) {
    return {
      date: row[0],
      type: row[1],
      quantity: Number(row[2]),
      description: row[3]
    };
  }).reverse(); // Mais recentes primeiro

  return { history: history.slice(0, 50) };
}

function addHistoryEntry(entry) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('History');
  sheet.appendRow([
    entry.date || new Date().toISOString(),
    entry.type,
    entry.quantity,
    entry.description
  ]);

  return { success: true };
}

function fullSync(data) {
  // Update state
  updateStock(data.stock, data.lastProcessed);

  // Add history entries if any
  if (data.newEntries && data.newEntries.length > 0) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('History');
    data.newEntries.forEach(function (entry) {
      sheet.appendRow([
        entry.date || new Date().toISOString(),
        entry.type,
        entry.quantity,
        entry.description
      ]);
    });
  }

  return { success: true, stock: data.stock };
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
