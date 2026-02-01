// ========================================
// Family Calendar - API Server (GAS)
// ========================================

const SPREADSHEET_ID = ''; // 空のままでも動きますが、共有したい場合は作成されたシートのIDをここに貼ってください

// スプレッドシートIDを取得または作成
function getOrCreateSpreadsheetId() {
  if (SPREADSHEET_ID) return SPREADSHEET_ID;
  
  let ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  
  if (!ssId) {
    ssId = setupSpreadsheet();
  }
  
  return ssId;
}

// スプレッドシートの初期設定
function setupSpreadsheet() {
  const ss = SpreadsheetApp.create('Family Calendar Data');
  const sheet = ss.getSheets()[0];
  sheet.setName('Events');
  
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, 7).setValues([
    ['ID', 'タイトル', '日付', '時間', 'カテゴリー', '説明', '作成日時']
  ]);
  
  // ヘッダーの書式設定
  sheet.getRange(1, 1, 1, 7)
    .setFontWeight('bold')
    .setBackground('#4a5568')
    .setFontColor('#ffffff');
  
  // 列幅を調整
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 300);
  sheet.setColumnWidth(7, 180);
  
  const ssId = ss.getId();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ssId);
  
  Logger.log('スプレッドシートを作成しました: ' + ss.getUrl());
  return ssId;
}

// スプレッドシートを取得
function getSpreadsheet() {
  const ssId = getOrCreateSpreadsheetId();
  try {
    return SpreadsheetApp.openById(ssId);
  } catch (e) {
    Logger.log('Failed to open spreadsheet: ' + e.message);
    throw new Error('データベースのオープンに失敗しました');
  }
}

// Eventsシートを取得
function getEventsSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('Events');
  
  if (!sheet) {
    Logger.log('Eventsシートが見つからないため作成します');
    sheet = ss.insertSheet('Events');
    setupSheetHeaders(sheet);
  }
  
  return sheet;
}

// ヘッダーのみを設定する内部関数
function setupSheetHeaders(sheet) {
  sheet.getRange(1, 1, 1, 7).setValues([
    ['ID', 'タイトル', '日付', '時間', 'カテゴリー', '説明', '作成日時']
  ]);
  sheet.getRange(1, 1, 1, 7)
    .setFontWeight('bold')
    .setBackground('#4a5568')
    .setFontColor('#ffffff');
}

// ========================================
// API エンドポイント (doPost)
// ========================================

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    let response;
    
    switch (action) {
      case 'getAllEvents':
        response = handleGetAllEvents();
        break;
      case 'addEvent':
        response = handleAddEvent(requestData);
        break;
      case 'updateEvent':
        response = handleUpdateEvent(requestData);
        break;
      case 'deleteEvent':
        response = handleDeleteEvent(requestData);
        break;
      case 'getSpreadsheetUrl':
        response = handleGetSpreadsheetUrl();
        break;
      default:
        response = { result: 'error', message: '不明なアクション: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doPost error: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({
        result: 'error',
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// ハンドラー関数
// ========================================

function handleGetAllEvents() {
  try {
    const sheet = getEventsSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { result: 'success', data: [] };
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    
    const events = data.map(row => ({
      id: row[0],
      title: row[1],
      date: formatDateToString(row[2]),
      time: row[3],
      category: row[4],
      description: row[5],
      createdAt: row[6]
    })).filter(event => event.id);
    
    return { result: 'success', data: events };
  } catch (error) {
    Logger.log('getAllEvents error: ' + error);
    return { result: 'error', message: error.message };
  }
}

function handleAddEvent(requestData) {
  try {
    const sheet = getEventsSheet();
    const id = Utilities.getUuid();
    const now = new Date();
    
    sheet.appendRow([
      id,
      requestData.title,
      "'" + requestData.date, // 文字列として保存
      requestData.time || '',
      requestData.category,
      requestData.description || '',
      now
    ]);
    
    return {
      result: 'success',
      id: id,
      message: 'イベントを追加しました'
    };
  } catch (error) {
    Logger.log('addEvent error: ' + error);
    return { result: 'error', message: '書き込み失敗: ' + error.toString() };
  }
}

function handleUpdateEvent(requestData) {
  try {
    const sheet = getEventsSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { result: 'error', message: 'イベントが見つかりません' };
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === requestData.id) {
        const rowNumber = i + 2;
        sheet.getRange(rowNumber, 2, 1, 5).setValues([[
          requestData.title,
          "'" + requestData.date, // 文字列として保存
          requestData.time || '',
          requestData.category,
          requestData.description || ''
        ]]);
        
        return {
          result: 'success',
          message: 'イベントを更新しました'
        };
      }
    }
    
    return { result: 'error', message: 'イベントが見つかりません' };
  } catch (error) {
    Logger.log('updateEvent error: ' + error);
    return {
      result: 'error',
      message: 'エラー: ' + error.message
    };
  }
}

function handleDeleteEvent(requestData) {
  try {
    const sheet = getEventsSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { result: 'error', message: 'イベントが見つかりません' };
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === requestData.eventId) {
        sheet.deleteRow(i + 2);
        return {
          result: 'success',
          message: 'イベントを削除しました'
        };
      }
    }
    
    return { result: 'error', message: 'イベントが見つかりません' };
  } catch (error) {
    Logger.log('deleteEvent error: ' + error);
    return {
      result: 'error',
      message: 'エラー: ' + error.message
    };
  }
}

function handleGetSpreadsheetUrl() {
  try {
    const ss = getSpreadsheet();
    return {
      result: 'success',
      url: ss.getUrl()
    };
  } catch (error) {
    return {
      result: 'error',
      message: error.message
    };
  }
}

// ========================================
// ヘルパー関数
// ========================================

function formatDateToString(date) {
  if (!date) return '';
  
  if (typeof date === 'string') return date;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
