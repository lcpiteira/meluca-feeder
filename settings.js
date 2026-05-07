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
        sharePanel.style.display = '';
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

        // Load active shares
        loadActiveShares();
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
            var currentRole = (members[currentUser.uid] && members[currentUser.uid].role) || '';
            var isOwner = currentRole === 'owner';

            membersListEl.innerHTML = '<h3 style="margin-top: 16px; font-size: 0.85rem; color: var(--text-light);">Membros actuais</h3>';

            Object.keys(members).forEach(function (uid) {
                var m = members[uid];
                var roleLabel = m.role === 'owner' ? '👑 Owner' : '👤 Membro';

                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)';

                var info = document.createElement('div');
                info.innerHTML = '<strong style="font-size:0.9rem">' + escapeHtml(m.name || uid) + '</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">' + roleLabel + '</span>';
                row.appendChild(info);

                if (isOwner && uid !== currentUser.uid) {
                    var btn = document.createElement('button');
                    btn.textContent = 'Remover';
                    btn.style.cssText = 'background:none;border:1px solid var(--danger);color:var(--danger);font-size:0.75rem;padding:4px 10px;border-radius:6px;cursor:pointer';
                    btn.addEventListener('click', function () {
                        handleRemoveMember(uid, m.name || uid);
                    });
                    row.appendChild(btn);
                }

                membersListEl.appendChild(row);
            });
        });
    }

    function handleRemoveMember(uid, name) {
        showSettingsModal('Queres remover "' + name + '" deste cão?', function () {
            var updates = {};
            updates['dogs/' + currentDogId + '/members/' + uid] = null;
            updates['users/' + uid + '/dogs/' + currentDogId] = null;
            db.ref().update(updates).then(function () {
                showToast(name + ' removido');
                loadMembers();
            });
        });
    }

    function showSettingsModal(message, onConfirm) {
        // Create modal if not present
        var overlay = document.getElementById('settingsModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'settingsModalOverlay';
            overlay.className = 'modal-overlay';
            overlay.style.display = 'none';
            overlay.innerHTML = '<div class="modal-card"><p class="modal-message" id="settingsModalMessage"></p>' +
                '<div class="modal-actions"><button class="btn btn-secondary" id="settingsModalCancel">Cancelar</button>' +
                '<button class="btn btn-danger" id="settingsModalConfirm">Confirmar</button></div></div>';
            document.body.appendChild(overlay);
        }

        var msgEl = document.getElementById('settingsModalMessage');
        var confirmBtn = document.getElementById('settingsModalConfirm');
        var cancelBtn = document.getElementById('settingsModalCancel');

        msgEl.textContent = message;
        overlay.style.display = '';

        function cleanup() {
            overlay.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlay);
        }

        function handleConfirm() { cleanup(); onConfirm(); }
        function handleCancel() { cleanup(); }
        function handleOverlay(e) { if (e.target === overlay) cleanup(); }

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlay);
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

    // === Share Link ===
    var sharePanel = document.getElementById('sharePanel');
    var shareDurationEl = document.getElementById('shareDuration');
    var generateShareBtn = document.getElementById('generateShare');
    var shareResultEl = document.getElementById('shareResult');
    var shareLinkTextEl = document.getElementById('shareLinkText');
    var copyShareLinkBtn = document.getElementById('copyShareLink');
    var shareExpiryEl = document.getElementById('shareExpiry');
    var activeSharesListEl = document.getElementById('activeSharesList');

    function handleGenerateShare() {
        var days = parseInt(shareDurationEl.value, 10) || 7;
        var token = generateShareToken();
        var expiresAt = Date.now() + (days * 86400000);

        var share = {
            dogId: currentDogId,
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            expiresAt: expiresAt
        };

        db.ref('shares/' + token).set(share).then(function () {
            var baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
            var link = baseUrl + 'view.html?t=' + token;
            shareLinkTextEl.value = link;
            shareResultEl.style.display = '';

            var expDate = new Date(expiresAt);
            shareExpiryEl.textContent = 'Expira a ' + expDate.getDate() + '/' + (expDate.getMonth() + 1) + '/' + expDate.getFullYear();

            showToast('Link gerado!');
            loadActiveShares();
        });
    }

    function generateShareToken() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz23456789';
        var token = '';
        for (var i = 0; i < 12; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    function handleCopyShareLink() {
        shareLinkTextEl.select();
        navigator.clipboard.writeText(shareLinkTextEl.value).then(function () {
            showToast('Link copiado!');
        }).catch(function () {
            document.execCommand('copy');
            showToast('Link copiado!');
        });
    }

    function loadActiveShares() {
        db.ref('shares').orderByChild('dogId').equalTo(currentDogId).once('value', function (snap) {
            var shares = snap.val() || {};
            var now = Date.now();
            var active = [];
            Object.keys(shares).forEach(function (token) {
                var s = shares[token];
                if (s.expiresAt > now) {
                    active.push({ token: token, expiresAt: s.expiresAt });
                }
            });

            if (active.length === 0) {
                activeSharesListEl.innerHTML = '';
                return;
            }

            var html = '<h3 style="margin-top: 16px; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Links activos</h3>';
            active.forEach(function (s) {
                var exp = new Date(s.expiresAt);
                var expStr = exp.getDate() + '/' + (exp.getMonth() + 1) + '/' + exp.getFullYear();
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">' +
                    '<span style="font-size:0.8rem;color:var(--text-light)">Expira: ' + expStr + '</span>' +
                    '<button class="btn-revoke-share" data-token="' + s.token + '" style="background:none;border:1px solid var(--danger);color:var(--danger);font-size:0.7rem;padding:3px 8px;border-radius:6px;cursor:pointer">Revogar</button>' +
                    '</div>';
            });
            activeSharesListEl.innerHTML = html;

            activeSharesListEl.querySelectorAll('.btn-revoke-share').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var token = btn.getAttribute('data-token');
                    db.ref('shares/' + token).remove().then(function () {
                        showToast('Link revogado');
                        loadActiveShares();
                    });
                });
            });
        });
    }

    // Events
    saveSettingsBtn.addEventListener('click', handleSave);
    testNotificationBtn.addEventListener('click', handleTestNotification);
    generateInviteBtn.addEventListener('click', handleGenerateInvite);
    generateShareBtn.addEventListener('click', handleGenerateShare);
    copyShareLinkBtn.addEventListener('click', handleCopyShareLink);
})();
