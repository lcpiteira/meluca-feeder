(function () {
    'use strict';

    // === State ===
    const STATE_KEY = 'melucafeeder_state';
    const SETTINGS_KEY = 'melucafeeder_settings';
    const HISTORY_KEY = 'melucafeeder_history';

    const MORNING_HOUR = 8;
    const EVENING_HOUR = 21;

    let state = loadState();
    let settings = loadSettings();
    let history = loadHistory();

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
    const alertThresholdEl = document.getElementById('alertThreshold');
    const telegramTokenEl = document.getElementById('telegramToken');
    const telegramChatIdEl = document.getElementById('telegramChatId');
    const testNotificationEl = document.getElementById('testNotification');
    const saveSettingsEl = document.getElementById('saveSettings');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const toastEl = document.getElementById('toast');

    // === Initialization ===
    function init() {
        processAutoDeductions();
        render();
        bindEvents();
        scheduleNextCheck();
    }

    // === Storage ===
    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { stock: 0, lastProcessed: Date.now() };
    }

    function saveState() {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { alertThreshold: 5, telegramToken: '', telegramChatId: '' };
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return [];
    }

    function saveHistory() {
        // Keep last 50 entries
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    // === Auto Deduction Logic ===
    function processAutoDeductions() {
        const now = new Date();
        const lastProcessed = new Date(state.lastProcessed);
        let deducted = 0;

        // Calculate all meal times between lastProcessed and now
        let cursor = new Date(lastProcessed);

        // Move to next meal time after lastProcessed
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
        saveState();
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
        history.unshift({
            type,
            quantity,
            description,
            date: new Date().toISOString()
        });
        saveHistory();
    }

    // === Render ===
    function render() {
        // Stock count
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

        // Next meals
        const { nextMorning, nextEvening } = getNextMealTimes();
        nextMorningEl.textContent = formatRelativeTime(nextMorning);
        nextEveningEl.textContent = formatRelativeTime(nextEvening);

        // History
        renderHistory();

        // Settings
        alertThresholdEl.value = settings.alertThreshold;
        telegramTokenEl.value = settings.telegramToken;
        telegramChatIdEl.value = settings.telegramChatId;

        // Last update
        lastUpdateEl.textContent = formatDateTime(new Date(state.lastProcessed));
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
        saveSettingsEl.addEventListener('click', handleSaveSettings);
        testNotificationEl.addEventListener('click', handleTestNotification);
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

    function handleSaveSettings() {
        settings.alertThreshold = parseInt(alertThresholdEl.value, 10) || 5;
        settings.telegramToken = telegramTokenEl.value.trim();
        settings.telegramChatId = telegramChatIdEl.value.trim();
        saveSettings();
        render();
        showToast('Configurações guardadas');
    }

    async function handleTestNotification() {
        settings.telegramToken = telegramTokenEl.value.trim();
        settings.telegramChatId = telegramChatIdEl.value.trim();

        if (!settings.telegramToken || !settings.telegramChatId) {
            showToast('Configura o Telegram primeiro');
            return;
        }

        const success = await sendNotification('🧪 Teste MelucaFeeder: Notificações a funcionar!');
        if (success) {
            showToast('Notificação enviada com sucesso!');
        }
    }

    // === Schedule ===
    function scheduleNextCheck() {
        // Check every minute for meal deductions
        setInterval(function () {
            const previousStock = state.stock;
            processAutoDeductions();
            if (state.stock !== previousStock) {
                render();
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
