(function () {
    'use strict';

    // === Firebase Config ===
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCiuXz2z5ShCOOkzXmIMTm0i99Dae8IRaA",
        authDomain: "melucafeeder.firebaseapp.com",
        databaseURL: "https://melucafeeder-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "melucafeeder",
        storageBucket: "melucafeeder.firebasestorage.app",
        messagingSenderId: "314126208675",
        appId: "1:314126208675:web:424edf29c499aa168db916"
    };

    // === Constants ===
    const SETTINGS_KEY = 'melucafeeder_settings';
    const MORNING_HOUR = 8;
    const EVENING_HOUR = 21;

    let state = { stock: 0, lastProcessed: 0 };
    let settings = loadSettings();
    let history = [];
    let db = null;
    let firstLoad = true;

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
    function init() {
        render();
        bindEvents();
        scheduleNextCheck();
        initFirebase();
    }

    function initFirebase() {
        if (FIREBASE_CONFIG.apiKey === 'PLACEHOLDER') {
            updateSyncStatus('offline');
            return;
        }

        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.database();
            updateSyncStatus('syncing');

            // Listen for state changes in real-time
            db.ref('state').on('value', function (snapshot) {
                const cloudState = snapshot.val();
                if (cloudState) {
                    state.stock = cloudState.stock || 0;
                    state.lastProcessed = cloudState.lastProcessed || 0;

                    // Only process deductions on first load
                    if (firstLoad) {
                        firstLoad = false;
                        processAutoDeductions();
                    }

                    render();
                    updateSyncStatus('synced');
                } else {
                    firstLoad = false;
                    updateSyncStatus('synced');
                }
            });

            // Listen for history changes
            db.ref('history').orderByChild('date').limitToLast(30).on('value', function (snapshot) {
                const data = snapshot.val();
                if (data) {
                    history = Object.values(data).sort(function (a, b) {
                        return new Date(b.date) - new Date(a.date);
                    });
                    renderHistory();
                }
            });
        } catch (e) {
            console.error('Firebase init error:', e);
            updateSyncStatus('error');
        }
    }

    // === Settings ===
    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { alertThreshold: 5, telegramToken: '', telegramChatId: '' };
    }

    // === Firebase Write ===
    function saveState() {
        if (db) {
            db.ref('state').set({
                stock: state.stock,
                lastProcessed: state.lastProcessed
            });
        }
    }

    function addHistoryEntry(type, quantity, description) {
        const entry = {
            type: type,
            quantity: quantity,
            description: description,
            date: new Date().toISOString()
        };
        history.unshift(entry);

        if (db) {
            db.ref('history').push(entry);
        }
    }

    // === Auto Deduction Logic ===
    function processAutoDeductions() {
        if (state.lastProcessed === 0) return;

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
            addHistoryEntry('auto', -deducted, 'Dedução automática (' + deducted + ' refeições)');
            state.lastProcessed = now.getTime();
            saveState();
            checkAlert();
        } else {
            state.lastProcessed = now.getTime();
            saveState();
        }
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
            result.setDate(result.getDate() + 1);
            result.setHours(MORNING_HOUR, 0, 0, 0);
        }

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

        return { nextMorning: nextMorning, nextEvening: nextEvening };
    }

    // === Alert / Notification ===
    function checkAlert() {
        if (state.stock <= settings.alertThreshold && state.stock > 0) {
            sendNotification('⚠️ MelucaFeeder: Stock baixo! Restam apenas ' + state.stock + ' refeições.');
        } else if (state.stock === 0) {
            sendNotification('🚨 MelucaFeeder: Sem refeições em stock! A Meluca precisa de comida!');
        }
    }

    async function sendNotification(message) {
        if (!settings.telegramToken || !settings.telegramChatId) {
            console.log('Notification not sent (Telegram not configured):', message);
            return;
        }

        try {
            const url = 'https://api.telegram.org/bot' + settings.telegramToken + '/sendMessage';
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
                console.error('Telegram API error:', await response.json());
                return false;
            }
            return true;
        } catch (e) {
            console.error('Notification error:', e);
            return false;
        }
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
            stockStatusEl.textContent = 'Stock baixo (alerta: ' + settings.alertThreshold + ')';
            stockStatusEl.classList.add('warning');
        } else {
            const days = Math.floor(state.stock / 2);
            stockStatusEl.textContent = '≈ ' + days + ' dias de autonomia';
            stockStatusEl.style.color = '';
        }

        const meals = getNextMealTimes();
        nextMorningEl.textContent = formatRelativeTime(meals.nextMorning);
        nextEveningEl.textContent = formatRelativeTime(meals.nextEvening);

        renderHistory();

        if (state.lastProcessed > 0) {
            lastUpdateEl.textContent = formatDateTime(new Date(state.lastProcessed));
        }
    }

    function renderHistory() {
        if (history.length === 0) {
            historyListEl.innerHTML = '<p class="empty-history">Sem registos</p>';
            return;
        }

        historyListEl.innerHTML = history.slice(0, 20).map(function (entry) {
            const typeClass = entry.quantity > 0 ? 'add' : 'deduct';
            const sign = entry.quantity > 0 ? '+' : '';
            return '<div class="history-item">' +
                '<span class="type ' + typeClass + '">' + sign + entry.quantity + '</span>' +
                '<span>' + escapeHtml(entry.description) + '</span>' +
                '<span class="date">' + formatDateTime(new Date(entry.date)) + '</span>' +
                '</div>';
        }).join('');
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
        addHistoryEntry('production', qty, 'Produção: +' + qty + ' refeições');
        addQuantityEl.value = '1';
        render();
        showToast('+' + qty + ' refeições adicionadas');
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
            return 'em ' + hours + 'h ' + minutes + 'min';
        }
        return 'em ' + minutes + 'min';
    }

    function formatDateTime(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return day + '/' + month + ' ' + hours + ':' + minutes;
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
