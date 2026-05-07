(function () {
    'use strict';

    const SETTINGS_KEY = 'melucafeeder_settings';

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
    let currentUser = null;
    let currentDogId = null;

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        db = firebase.database();
    } catch (e) {
        console.error('Firebase init error in settings:', e);
    }

    const loginSection = document.getElementById('loginSection');
    const alertPanel = document.getElementById('alertPanel');
    const telegramPanel = document.getElementById('telegramPanel');
    const recipePanel = document.getElementById('recipePanel');
    const weightPanel = document.getElementById('weightPanel');
    const invitePanel = document.getElementById('invitePanel');
    const actionsPanel = document.getElementById('actionsPanel');
    const dogNameSubtitle = document.getElementById('dogNameSubtitle');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const testNotificationBtn = document.getElementById('testNotification');
    const generateInviteBtn = document.getElementById('generateInvite');
    const inviteResultEl = document.getElementById('inviteResult');
    const membersListEl = document.getElementById('membersList');
    const toastEl = document.getElementById('toast');

    const alertThresholdEl = document.getElementById('alertThreshold');
    const telegramTokenEl = document.getElementById('telegramToken');
    const telegramChatIdEl = document.getElementById('telegramChatId');
    const recipeChickenEl = document.getElementById('recipeChicken');
    const recipeRiceEl = document.getElementById('recipeRice');
    const recipePeasEl = document.getElementById('recipePeas');
    const recipeEggEl = document.getElementById('recipeEgg');
    const targetWeightEl = document.getElementById('targetWeight');

    // Wait for auth state
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            currentUser = user;
            currentDogId = localStorage.getItem('melucafeeder_currentDog');
            if (currentDogId) {
                showSettings();
            } else {
                dogNameSubtitle.textContent = 'Nenhum cão seleccionado';
                showToast('Volta à app principal para seleccionar um cão');
            }
        } else {
            // Not logged in
            loginSection.style.display = '';
            dogNameSubtitle.textContent = 'Acesso restrito';
        }
    });

    function showSettings() {
        loginSection.style.display = 'none';
        alertPanel.style.display = '';
        telegramPanel.style.display = '';
        recipePanel.style.display = '';
        weightPanel.style.display = '';
        invitePanel.style.display = '';
        actionsPanel.style.display = '';

        // Load dog name
        db.ref('dogs/' + currentDogId + '/name').once('value', function (snap) {
            dogNameSubtitle.textContent = snap.val() || 'Configurações do cão';
        });

        // Load settings
        db.ref('dogs/' + currentDogId + '/settings').once('value', function (snapshot) {
            var s = snapshot.val() || {};
            populateFields(s);
        });

        // Load members
        loadMembers();
    }

    function populateFields(s) {
        alertThresholdEl.value = s.alertThreshold || 5;
        telegramTokenEl.value = s.telegramToken || '';
        telegramChatIdEl.value = s.telegramChatId || '';
        var recipe = s.recipe || { chicken: 50, rice: 50, peas: 25, egg: 0.5 };
        recipeChickenEl.value = recipe.chicken;
        recipeRiceEl.value = recipe.rice;
        recipePeasEl.value = recipe.peas;
        recipeEggEl.value = recipe.egg;
        targetWeightEl.value = s.targetWeight || '';
    }

    function handleSave() {
        var settings = {
            alertThreshold: parseInt(alertThresholdEl.value, 10) || 5,
            telegramToken: telegramTokenEl.value.trim(),
            telegramChatId: telegramChatIdEl.value.trim(),
            recipe: {
                chicken: parseFloat(recipeChickenEl.value) || 0,
                rice: parseFloat(recipeRiceEl.value) || 0,
                peas: parseFloat(recipePeasEl.value) || 0,
                egg: parseFloat(recipeEggEl.value) || 0
            },
            targetWeight: parseFloat(targetWeightEl.value) || null
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        if (db && currentDogId) {
            db.ref('dogs/' + currentDogId + '/settings').set(settings);
        }

        showToast('Configurações guardadas');
    }

    function handleGenerateInvite() {
        var code = generateCode();
        var invite = {
            dogId: currentDogId,
            createdBy: currentUser.uid,
            expiresAt: Date.now() + 86400000 // 24h
        };

        db.ref('invites/' + code).set(invite).then(function () {
            inviteResultEl.textContent = code;
            inviteResultEl.classList.add('visible');
            showToast('Código gerado: ' + code + ' (expira em 24h)');
        });
    }

    function generateCode() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function loadMembers() {
        db.ref('dogs/' + currentDogId + '/members').once('value', function (snap) {
            var members = snap.val() || {};
            var html = '<h3 style="margin-top: 16px; font-size: 0.85rem; color: var(--text-light);">Membros actuais</h3>';
            Object.keys(members).forEach(function (uid) {
                var m = members[uid];
                var roleLabel = m.role === 'owner' ? '👑 Owner' : '👤 Membro';
                html += '<div class="vet-item"><span>' + escapeHtml(m.name || uid) + '</span><span class="vet-type">' + roleLabel + '</span></div>';
            });
            membersListEl.innerHTML = html;
        });
    }

    async function handleTestNotification() {
        var token = telegramTokenEl.value.trim();
        var chatIdRaw = telegramChatIdEl.value.trim();

        if (!token || !chatIdRaw) {
            showToast('Configura o Telegram primeiro');
            return;
        }

        var chatIds = chatIdRaw.split(',').map(function (id) { return id.trim(); }).filter(Boolean);
        var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
        var success = 0;

        for (var i = 0; i < chatIds.length; i++) {
            try {
                var response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatIds[i],
                        text: '🧪 Teste MelucaFeeder: Notificações a funcionar!',
                        parse_mode: 'HTML'
                    })
                });
                if (response.ok) success++;
            } catch (e) { /* continue */ }
        }

        if (success === chatIds.length) {
            showToast('Notificação enviada para ' + success + ' destinatário(s)!');
        } else if (success > 0) {
            showToast('Enviada para ' + success + '/' + chatIds.length + ' destinatários');
        } else {
            showToast('Erro ao enviar notificação');
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        setTimeout(function () { toastEl.classList.remove('show'); }, 3000);
    }

    // Events
    saveSettingsBtn.addEventListener('click', handleSave);
    testNotificationBtn.addEventListener('click', handleTestNotification);
    generateInviteBtn.addEventListener('click', handleGenerateInvite);
})();
