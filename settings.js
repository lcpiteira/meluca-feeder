(function () {
    'use strict';

    const SETTINGS_KEY = 'melucafeeder_settings';
    const AUTH_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // SHA-256 of "1234"

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCiuXz2z5ShCOOkzXmIMTm0i99Dae8IRaA",
        authDomain: "melucafeeder.firebaseapp.com",
        databaseURL: "https://melucafeeder-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "melucafeeder",
        storageBucket: "melucafeeder.firebasestorage.app",
        messagingSenderId: "314126208675",
        appId: "1:314126208675:web:424edf29c499aa168db916"
    };

    let db = null;
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        db = firebase.database();
    } catch (e) {
        console.error('Firebase init error in settings:', e);
    }

    const loginSection = document.getElementById('loginSection');
    const settingsPanel = document.getElementById('settingsPanel');
    const alertPanel = document.getElementById('alertPanel');
    const telegramPanel = document.getElementById('telegramPanel');
    const actionsPanel = document.getElementById('actionsPanel');
    const loginBtn = document.getElementById('loginBtn');
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    const loginError = document.getElementById('loginError');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const testNotificationBtn = document.getElementById('testNotification');
    const toastEl = document.getElementById('toast');

    const alertThresholdEl = document.getElementById('alertThreshold');
    const telegramTokenEl = document.getElementById('telegramToken');
    const telegramChatIdEl = document.getElementById('telegramChatId');

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return {
            alertThreshold: 5,
            telegramToken: '',
            telegramChatId: ''
        };
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function handleLogin() {
        const user = loginUser.value.trim();
        const pass = loginPass.value;

        if (user !== 'admin') {
            loginError.textContent = 'Utilizador ou password incorrectos';
            return;
        }

        const hash = await sha256(pass);
        if (hash !== AUTH_HASH) {
            loginError.textContent = 'Utilizador ou password incorrectos';
            return;
        }

        loginError.textContent = '';
        showSettings();
    }

    function showSettings() {
        loginSection.style.display = 'none';
        settingsPanel.style.display = '';
        alertPanel.style.display = '';
        telegramPanel.style.display = '';
        actionsPanel.style.display = '';

        // Load from Firebase first, fallback to localStorage
        if (db) {
            db.ref('settings').once('value', function (snapshot) {
                const s = snapshot.val() || loadSettings();
                alertThresholdEl.value = s.alertThreshold || 5;
                telegramTokenEl.value = s.telegramToken || '';
                telegramChatIdEl.value = s.telegramChatId || '';
            });
        } else {
            const s = loadSettings();
            alertThresholdEl.value = s.alertThreshold || 5;
            telegramTokenEl.value = s.telegramToken || '';
            telegramChatIdEl.value = s.telegramChatId || '';
        }
    }

    function handleSave() {
        const settings = {
            alertThreshold: parseInt(alertThresholdEl.value, 10) || 5,
            telegramToken: telegramTokenEl.value.trim(),
            telegramChatId: telegramChatIdEl.value.trim()
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        if (db) {
            db.ref('settings').set(settings);
        }

        showToast('Configurações guardadas');
    }

    async function handleTestNotification() {
        const token = telegramTokenEl.value.trim();
        const chatId = telegramChatIdEl.value.trim();

        if (!token || !chatId) {
            showToast('Configura o Telegram primeiro');
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: '🧪 Teste MelucaFeeder: Notificações a funcionar!',
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                showToast('Notificação enviada com sucesso!');
            } else {
                showToast('Erro ao enviar notificação');
            }
        } catch (e) {
            showToast('Erro de ligação ao Telegram');
        }
    }

    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        setTimeout(function () {
            toastEl.classList.remove('show');
        }, 3000);
    }

    // Events
    loginBtn.addEventListener('click', handleLogin);
    loginPass.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleLogin();
    });
    loginUser.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') loginPass.focus();
    });
    saveSettingsBtn.addEventListener('click', handleSave);
    testNotificationBtn.addEventListener('click', handleTestNotification);
})();
