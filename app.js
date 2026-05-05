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
    const calcChickenEl = document.getElementById('calcChicken');
    const calcRiceEl = document.getElementById('calcRice');
    const calcPeasEl = document.getElementById('calcPeas');
    const calcEggsEl = document.getElementById('calcEggs');
    const calcBtnEl = document.getElementById('calcBtn');
    const calcResultEl = document.getElementById('calcResult');
    const calcResultNumberEl = document.getElementById('calcResultNumber');
    const calcResultDetailEl = document.getElementById('calcResultDetail');
    const weightInputEl = document.getElementById('weightInput');
    const weightBtnEl = document.getElementById('weightBtn');
    const weightLastEl = document.getElementById('weightLast');
    const weightChartEl = document.getElementById('weightChart');
    const weightHistoryEl = document.getElementById('weightHistory');

    let weightData = [];

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

            // Listen for settings changes
            loadSettingsFromFirebase();

            // Listen for weight data
            db.ref('weight').orderByChild('date').on('value', function (snapshot) {
                const data = snapshot.val();
                if (data) {
                    weightData = Object.values(data).sort(function (a, b) {
                        return new Date(a.date) - new Date(b.date);
                    });
                } else {
                    weightData = [];
                }
                renderWeight();
                checkWeightReminder();
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
        return { alertThreshold: 5, telegramToken: '', telegramChatId: '', recipe: { chicken: 50, rice: 50, peas: 25, egg: 0.5 } };
    }

    function loadSettingsFromFirebase() {
        if (!db) return;
        db.ref('settings').on('value', function (snapshot) {
            const cloudSettings = snapshot.val();
            if (cloudSettings) {
                settings = cloudSettings;
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            }
        });
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
        calcBtnEl.addEventListener('click', handleCalculate);
        weightBtnEl.addEventListener('click', handleWeightAdd);
        weightInputEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleWeightAdd();
        });
    }

    function handleCalculate() {
        const recipe = settings.recipe || {
            chicken: 50,
            rice: 50,
            peas: 25,
            egg: 0.5
        };

        const chicken = parseFloat(calcChickenEl.value) || 0;
        const rice = parseFloat(calcRiceEl.value) || 0;
        const peas = parseFloat(calcPeasEl.value) || 0;
        const eggs = parseFloat(calcEggsEl.value) || 0;

        const meals = [];
        const details = [];

        if (recipe.chicken > 0 && chicken > 0) {
            const m = Math.floor(chicken / recipe.chicken);
            meals.push(m);
            details.push('Frango: ' + m + ' refeições (' + recipe.chicken + 'g/ref)');
        }
        if (recipe.rice > 0 && rice > 0) {
            const m = Math.floor(rice / recipe.rice);
            meals.push(m);
            details.push('Arroz: ' + m + ' refeições (' + recipe.rice + 'g/ref)');
        }
        if (recipe.peas > 0 && peas > 0) {
            const m = Math.floor(peas / recipe.peas);
            meals.push(m);
            details.push('Ervilhas: ' + m + ' refeições (' + recipe.peas + 'g/ref)');
        }
        if (recipe.egg > 0 && eggs > 0) {
            const m = Math.floor(eggs / recipe.egg);
            meals.push(m);
            details.push('Ovos: ' + m + ' refeições (' + recipe.egg + ' un/ref)');
        }

        if (meals.length === 0) {
            showToast('Introduz pelo menos um ingrediente');
            return;
        }

        const minMeals = Math.min.apply(null, meals);
        calcResultNumberEl.textContent = minMeals;
        calcResultDetailEl.innerHTML = details.join('<br>');
        calcResultEl.style.display = '';
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

    // === Weight Tracking ===
    function handleWeightAdd() {
        const weight = parseFloat(weightInputEl.value);
        if (isNaN(weight) || weight <= 0) {
            showToast('Introduz um peso válido');
            return;
        }

        const entry = {
            weight: weight,
            date: new Date().toISOString()
        };

        if (db) {
            db.ref('weight').push(entry);
        }

        weightInputEl.value = '';
        showToast(weight + ' kg registado');
    }

    function renderWeight() {
        if (weightData.length === 0) {
            weightLastEl.textContent = '';
            weightHistoryEl.innerHTML = '<p class="empty-history">Sem registos de peso</p>';
            clearChart();
            return;
        }

        const last = weightData[weightData.length - 1];
        const lastDate = new Date(last.date);
        const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
        const daysText = daysAgo === 0 ? 'hoje' : daysAgo === 1 ? 'ontem' : 'há ' + daysAgo + ' dias';
        weightLastEl.innerHTML = '<span class="weight-current">' + last.weight + ' kg</span> <span class="weight-date">(' + daysText + ')</span>';

        // Render last entries
        const recent = weightData.slice(-10).reverse();
        weightHistoryEl.innerHTML = recent.map(function (e) {
            const d = new Date(e.date);
            return '<div class="weight-entry"><span>' + e.weight + ' kg</span><span class="date">' + formatDateTime(d) + '</span></div>';
        }).join('');

        drawChart();
    }

    function clearChart() {
        const ctx = weightChartEl.getContext('2d');
        ctx.clearRect(0, 0, weightChartEl.width, weightChartEl.height);
    }

    function drawChart() {
        const canvas = weightChartEl;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);

        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const padding = { top: 20, right: 20, bottom: 30, left: 45 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        ctx.clearRect(0, 0, w, h);

        if (weightData.length < 2) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
            ctx.font = '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Regista pelo menos 2 pesos para ver o gráfico', w / 2, h / 2);
            return;
        }

        const data = weightData.slice(-20);
        const weights = data.map(function (e) { return e.weight; });
        const minW = Math.min.apply(null, weights) - 0.5;
        const maxW = Math.max.apply(null, weights) + 0.5;
        const range = maxW - minW || 1;

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
        const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim() || '#818cf8';
        const dotColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#6366f1';
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(255,255,255,0.08)';

        // Grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (var i = 0; i <= 4; i++) {
            var y = padding.top + chartH - (chartH * i / 4);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();

            var label = (minW + range * i / 4).toFixed(1);
            ctx.fillStyle = textColor;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(label, padding.left - 6, y + 3);
        }

        // Date labels
        ctx.fillStyle = textColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        var firstDate = new Date(data[0].date);
        var lastDate = new Date(data[data.length - 1].date);
        ctx.fillText(formatShortDate(firstDate), padding.left, h - 8);
        ctx.fillText(formatShortDate(lastDate), padding.left + chartW, h - 8);

        // Line
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        var points = [];
        for (var j = 0; j < data.length; j++) {
            var x = padding.left + (chartW * j / (data.length - 1));
            var yVal = padding.top + chartH - (chartH * (data[j].weight - minW) / range);
            points.push({ x: x, y: yVal });
            if (j === 0) ctx.moveTo(x, yVal);
            else ctx.lineTo(x, yVal);
        }
        ctx.stroke();

        // Gradient fill
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        var gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Dots
        for (var k = 0; k < points.length; k++) {
            ctx.beginPath();
            ctx.arc(points[k].x, points[k].y, 4, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
            ctx.fill();
        }
    }

    function formatShortDate(date) {
        return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0');
    }

    function checkWeightReminder() {
        if (weightData.length === 0) return;
        var last = weightData[weightData.length - 1];
        var daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
        var reminderKey = 'melucafeeder_weight_reminder_sent';
        var lastReminder = localStorage.getItem(reminderKey);
        var today = new Date().toISOString().slice(0, 10);

        if (daysSince >= 7 && lastReminder !== today) {
            localStorage.setItem(reminderKey, today);
            sendNotification('⚖️ MelucaFeeder: Já passaram ' + daysSince + ' dias desde a última pesagem. Hora de pesar a Meluca!');
        }
    }

    // === Theme Toggle ===
    function initTheme() {
        const saved = localStorage.getItem('melucafeeder_theme');
        const themeToggle = document.getElementById('themeToggle');
        if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '☀️';
        }

        themeToggle.addEventListener('click', function () {
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('melucafeeder_theme', 'dark');
                themeToggle.textContent = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('melucafeeder_theme', 'light');
                themeToggle.textContent = '☀️';
            }
        });
    }

    // === Start ===
    initTheme();
    init();
})();
