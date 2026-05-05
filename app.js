(function () {
    'use strict';

    // === Constants ===
    const STATE_KEY = 'melucafeeder_state';
    const SETTINGS_KEY = 'melucafeeder_settings';
    const HISTORY_KEY = 'melucafeeder_history';
    const PENDING_KEY = 'melucafeeder_pending';

    const MORNING_HOUR = 8;
    const EVENING_HOUR = 21;

    const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxzpUXd4Khz38ui0kDv3XD_1l_Lp__tjsETUihvXRuG-J1gDqSZQe3ULGmBOHmML98QzQ/exec';

    let state = loadState();
    let settings = loadSettings();
    let history = loadHistory();
    let pendingEntries = loadPending();
    let syncing = false;

    // === DOM Elements ===
    const stockCountEl = document.getElementById('stockCount');
    const stockStatusEl = document.getElementById('stockStatus');
    const nextMorningEl = document.getElementById('nextMorning');
    const nextEveningEl = document.getElementById('nextEvening');
    const addQuantityEl = document.getElementById('addQuantity');
    const addBtnEl = document.getElementById('addBtn');
    const manualDeductEl = document.getElementById('manualDeduct');
    const manualAddEl = document.getElementById('manualAdd');
    const historyListEl = document.getElementById('historyList');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const toastEl = document.getElementById('toast');
    const syncStatusEl = document.getElementById('syncStatus');

    // === Initialization ===
    async function init() {
        render();
        bindEvents();
        scheduleNextCheck();

        if (settings.sheetsUrl) {
            await syncFromCloud();
        }

        processAutoDeductions();
        render();
    }

    // === LocalStorage ===
    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { stock: 0, lastProcessed: Date.now() };
    }

    function saveState() {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        syncToCloud();
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { alertThreshold: 5, telegramToken: '', telegramChatId: '', sheetsUrl: DEFAULT_SHEETS_URL };
    }

    function loadHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return [];
    }

    function saveHistory() {
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    function loadPending() {
        try {
            const raw = localStorage.getItem(PENDING_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return [];
    }

    function savePending() {
        localStorage.setItem(PENDING_KEY, JSON.stringify(pendingEntries));
    }

    // === Google Sheets Sync ===
    async function syncToCloud() {
        if (!settings.sheetsUrl || syncing) return;

        syncing = true;
        updateSyncStatus('syncing');

        try {
            const payload = {
                action: 'sync',
                stock: state.stock,
                lastProcessed: state.lastProcessed,
                newEntries: pendingEntries
            };

            const response = await fetch(settings.sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                pendingEntries = [];
                savePending();
                updateSyncStatus('synced');
            } else {
                updateSyncStatus('error');
            }
        } catch (e) {
            console.error('Sync error:', e);
            updateSyncStatus('error');
        }

        syncing = false;
    }

    async function syncFromCloud() {
        if (!settings.sheetsUrl) return;

        updateSyncStatus('syncing');

        try {
            const response = await fetch(settings.sheetsUrl + '?action=getState');
            if (!response.ok) {
                updateSyncStatus('error');
                return;
            }

            const cloudState = await response.json();

            if (cloudState.lastProcessed && cloudState.lastProcessed > state.lastProcessed) {
                state.stock = cloudState.stock;
                state.lastProcessed = cloudState.lastProcessed;
                localStorage.setItem(STATE_KEY, JSON.stringify(state));
                processAutoDeductions();
                render();
            }

            const histResponse = await fetch(settings.sheetsUrl + '?action=getHistory');
            if (histResponse.ok) {
                const cloudHistory = await histResponse.json();
                if (cloudHistory.history && cloudHistory.history.length > 0) {
                    history = cloudHistory.history;
                    saveHistory();
                    renderHistory();
                }
            }

            if (pendingEntries.length > 0) {
                await syncToCloud();
            }

            updateSyncStatus('synced');
        } catch (e) {
            console.error('Sync from cloud error:', e);
            updateSyncStatus('error');
        }
    }

    function updateSyncStatus(status) {
        if (!syncStatusEl) return;
        syncStatusEl.className = 'sync-status ' + status;
        const labels = {
            syncing: '⟳ A sincronizar...',
            synced: '✓ Sincronizado',
            error: '✗ Erro de sync',
            offline: '○ Apenas local'
        };
        syncStatusEl.textContent = labels[status] || '';
    }

    // === Auto Deduction Logic ===
    function processAutoDeductions() {
        const now = new Date();
        const lastProcessed = new Date(state.lastProcessed);
        let deducted = 0;

        let cursor = new Date(lastProcessed);
        cursor = getNextMealTime(cursor);

        while (cursor <= now) {
            if (state.stock > 0) {
                state.stock--;
                deducted++;
            }
            cursor = getNextMealTime(cursor);
        }

        if (deducted > 0) {
            addHistoryEntry('auto', -deducted, `Dedução automática (${deducted} refeições)`);
            checkAlert();
        }

        state.lastProcessed = now.getTime();
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    function getNextMealTime(fromDate) {
        const d = new Date(fromDate);
        const hour = d.getHours();
        const result = new Date(d);

        if (hour < MORNING_HOUR) {
            result.setHours(MORNING_HOUR, 0, 0, 0);
        } else if (hour < EVENING_HOUR) {
            result.setHours(EVENING_HOUR, 0, 0, 0);
        } else {
            // Next day morning
            result.setDate(result.getDate() + 1);
            result.setHours(MORNING_HOUR, 0, 0, 0);
        }

        // If the result is the same as input (edge case at exact meal time), advance
        if (result.getTime() <= fromDate.getTime()) {
            if (result.getHours() === MORNING_HOUR) {
                result.setHours(EVENING_HOUR, 0, 0, 0);
            } else {
                result.setDate(result.getDate() + 1);
                result.setHours(MORNING_HOUR, 0, 0, 0);
            }
        }

        return result;
    }

    function getNextMealTimes() {
        const now = new Date();
        const nextMeal = getNextMealTime(now);
        const morningToday = new Date(now);
        morningToday.setHours(MORNING_HOUR, 0, 0, 0);
        const eveningToday = new Date(now);
        eveningToday.setHours(EVENING_HOUR, 0, 0, 0);

        let nextMorning, nextEvening;

        if (now < morningToday) {
            nextMorning = morningToday;
        } else {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(MORNING_HOUR, 0, 0, 0);
            nextMorning = tomorrow;
        }

        if (now < eveningToday) {
            nextEvening = eveningToday;
        } else {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(EVENING_HOUR, 0, 0, 0);
            nextEvening = tomorrow;
        }

        return { nextMorning, nextEvening };
    }

    // === Alert / Notification ===
    function checkAlert() {
        if (state.stock <= settings.alertThreshold && state.stock > 0) {
            sendNotification(
                `⚠️ MelucaFeeder: Stock baixo! Restam apenas ${state.stock} refeições.`
            );
        } else if (state.stock === 0) {
            sendNotification(
                `🚨 MelucaFeeder: Sem refeições em stock! A Meluca precisa de comida!`
            );
        }
    }

    async function sendNotification(message) {
        if (!settings.telegramToken || !settings.telegramChatId) {
            console.log('Notification not sent (Telegram not configured):', message);
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${settings.telegramToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: settings.telegramChatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('Telegram API error:', err);
                showToast('Erro ao enviar notificação');
                return false;
            }
            return true;
        } catch (e) {
            console.error('Notification error:', e);
            showToast('Erro de ligação ao Telegram');
            return false;
        }
    }

    // === History ===
    function addHistoryEntry(type, quantity, description) {
        const entry = {
            type,
            quantity,
            description,
            date: new Date().toISOString()
        };
        history.unshift(entry);
        saveHistory();

        pendingEntries.push(entry);
        savePending();
    }

    // === Render ===
    function render() {
        stockCountEl.textContent = state.stock;
        stockCountEl.className = 'stock-number';
        stockStatusEl.className = 'stock-status';

        if (state.stock === 0) {
            stockCountEl.classList.add('danger');
            stockStatusEl.textContent = 'Sem stock!';
            stockStatusEl.classList.add('danger');
        } else if (state.stock <= settings.alertThreshold) {
            stockCountEl.classList.add('warning');
            stockStatusEl.textContent = `Stock baixo (alerta: ${settings.alertThreshold})`;
            stockStatusEl.classList.add('warning');
        } else {
            const days = Math.floor(state.stock / 2);
            stockStatusEl.textContent = `≈ ${days} dias de autonomia`;
            stockStatusEl.style.color = '';
        }

        const { nextMorning, nextEvening } = getNextMealTimes();
        nextMorningEl.textContent = formatRelativeTime(nextMorning);
        nextEveningEl.textContent = formatRelativeTime(nextEvening);

        renderHistory();

        lastUpdateEl.textContent = formatDateTime(new Date(state.lastProcessed));

        if (!settings.sheetsUrl) {
            updateSyncStatus('offline');
        }
    }

    function renderHistory() {
        if (history.length === 0) {
            historyListEl.innerHTML = '<p class="empty-history">Sem registos</p>';
            return;
        }

        historyListEl.innerHTML = history.slice(0, 20).map(entry => {
            const typeClass = entry.quantity > 0 ? 'add' : 'deduct';
            const sign = entry.quantity > 0 ? '+' : '';
            return `
                <div class="history-item">
                    <span class="type ${typeClass}">${sign}${entry.quantity}</span>
                    <span>${escapeHtml(entry.description)}</span>
                    <span class="date">${formatDateTime(new Date(entry.date))}</span>
                </div>
            `;
        }).join('');
    }

    // === Events ===
    function bindEvents() {
        addBtnEl.addEventListener('click', handleAdd);
        addQuantityEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAdd();
        });
        manualDeductEl.addEventListener('click', handleManualDeduct);
        manualAddEl.addEventListener('click', handleManualAdd);
    }

    function handleAdd() {
        const qty = parseInt(addQuantityEl.value, 10);
        if (isNaN(qty) || qty < 1) {
            showToast('Introduz uma quantidade válida');
            return;
        }

        state.stock += qty;
        state.lastProcessed = Date.now();
        saveState();
        addHistoryEntry('production', qty, `Produção: +${qty} refeições`);
        addQuantityEl.value = '1';
        render();
        showToast(`+${qty} refeições adicionadas`);
    }

    function handleManualDeduct() {
        if (state.stock <= 0) {
            showToast('Stock já está a zero');
            return;
        }
        state.stock--;
        state.lastProcessed = Date.now();
        saveState();
        addHistoryEntry('manual', -1, 'Dedução manual');
        render();
        checkAlert();
        showToast('1 refeição removida');
    }

    function handleManualAdd() {
        state.stock++;
        state.lastProcessed = Date.now();
        saveState();
        addHistoryEntry('manual', 1, 'Adição manual');
        render();
        showToast('1 refeição adicionada');
    }

    // === Schedule ===
    function scheduleNextCheck() {
        setInterval(function () {
            const previousStock = state.stock;
            processAutoDeductions();
            if (state.stock !== previousStock) {
                render();
                syncToCloud();
            }
        }, 60000);
    }

    // === Utilities ===
    function formatRelativeTime(date) {
        const now = new Date();
        const diff = date - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (hours > 0) {
            return `em ${hours}h ${minutes}min`;
        }
        return `em ${minutes}min`;
    }

    function formatDateTime(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month} ${hours}:${minutes}`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        setTimeout(function () {
            toastEl.classList.remove('show');
        }, 3000);
    }

    // === Start ===
    init();
})();
