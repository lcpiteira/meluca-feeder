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
    const profilePanel = document.getElementById('profilePanel');
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

    const profileNameEl = document.getElementById('profileName');
    const profileBreedEl = document.getElementById('profileBreed');
    const profileBreedBtnEl = document.getElementById('profileBreedBtn');
    const profileBirthdayEl = document.getElementById('profileBirthday');
    const profileBirthdayBtnEl = document.getElementById('profileBirthdayBtn');
    const profileColorEl = document.getElementById('profileColor');
    const profileNeuteredEl = document.getElementById('profileNeutered');
    const profileChipEl = document.getElementById('profileChip');
    const shareDurationBtnEl = document.getElementById('shareDurationBtn');

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
        profilePanel.style.display = '';
        alertPanel.style.display = '';
        telegramPanel.style.display = '';
        recipePanel.style.display = '';
        weightPanel.style.display = '';
        invitePanel.style.display = '';
        sharePanel.style.display = '';
        actionsPanel.style.display = '';

        // Load dog name + profile
        db.ref('dogs/' + currentDogId).once('value', function (snap) {
            var dog = snap.val() || {};
            dogNameSubtitle.textContent = dog.name || 'Configurações do cão';
            populateProfile(dog.name, dog.profile || {});
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

    function populateProfile(name, p) {
        profileNameEl.value = name || '';
        profileBreedEl.value = p.breed || '';
        if (p.breed) {
            profileBreedBtnEl.textContent = p.breed;
            profileBreedBtnEl.classList.add('has-value');
        } else {
            profileBreedBtnEl.textContent = 'Seleccionar raça';
            profileBreedBtnEl.classList.remove('has-value');
        }
        profileBirthdayEl.value = p.birthday || '';
        if (p.birthday) {
            profileBirthdayBtnEl.textContent = formatPickedDate(p.birthday);
            profileBirthdayBtnEl.classList.add('has-value');
        } else {
            profileBirthdayBtnEl.textContent = 'Seleccionar data';
            profileBirthdayBtnEl.classList.remove('has-value');
        }
        profileColorEl.value = p.color || '';
        profileNeuteredEl.checked = !!p.neutered;
        profileChipEl.value = p.chip || '';
        var sexRadios = document.querySelectorAll('input[name="profileSex"]');
        sexRadios.forEach(function (r) { r.checked = (r.value === p.sex); });
    }

    function handleSave() {
        // Save profile
        var profileSexRadio = document.querySelector('input[name="profileSex"]:checked');
        var profileUpdates = {};
        profileUpdates['dogs/' + currentDogId + '/name'] = profileNameEl.value.trim() || 'Cão';
        profileUpdates['dogs/' + currentDogId + '/profile'] = {
            breed: profileBreedEl.value || '',
            sex: profileSexRadio ? profileSexRadio.value : '',
            birthday: profileBirthdayEl.value || '',
            color: profileColorEl.value.trim(),
            neutered: profileNeuteredEl.checked,
            chip: profileChipEl.value.trim()
        };

        // Save settings
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

        profileUpdates['dogs/' + currentDogId + '/settings'] = settings;

        if (db && currentDogId) {
            db.ref().update(profileUpdates);
        }

        dogNameSubtitle.textContent = profileNameEl.value.trim() || 'Cão';
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

    // === Custom Dropdown ===
    var BREED_OPTIONS = [
        'Sem raça definida', 'Akita Inu', 'Australian Shepherd', 'Basset Hound', 'Beagle',
        'Bichon Frisé', 'Border Collie', 'Boxer', 'Braco Alemão', 'Bulldog Francês',
        'Bulldog Inglês', 'Bull Terrier', 'Caniche', 'Cão de Água Português',
        'Cão de Castro Laboreiro', 'Cão da Serra da Estrela', 'Cão de Fila de São Miguel',
        'Cavalier King Charles', 'Chihuahua', 'Cocker Spaniel', 'Dachshund', 'Dálmata',
        'Dobermann', 'Golden Retriever', 'Husky Siberiano', 'Jack Russell Terrier',
        'Labrador Retriever', 'Lulu da Pomerânia', 'Malinois', 'Maltês', 'Pastor Alemão',
        'Pequinês', 'Perdigueiro Português', 'Pincher Miniatura', 'Pitbull',
        'Podengo Português', 'Rafeiro do Alentejo', 'Rottweiler', 'Samoiedo',
        'São Bernardo', 'Schnauzer', 'Setter Irlandês', 'Shar Pei', 'Shiba Inu',
        'Shih Tzu', 'Springer Spaniel', 'Staffordshire Bull Terrier', 'Weimaraner',
        'West Highland Terrier', 'Whippet', 'Yorkshire Terrier', 'Outro'
    ];

    var SHARE_DURATION_OPTIONS = [
        { value: '1', label: '1 dia' },
        { value: '3', label: '3 dias' },
        { value: '7', label: '7 dias' },
        { value: '30', label: '30 dias' }
    ];

    function showDropdown(title, options, currentValue, onSelect, opts) {
        opts = opts || {};
        var overlay = document.getElementById('dropdownOverlay');
        var titleEl = document.getElementById('dropdownTitle');
        var searchEl = document.getElementById('dropdownSearch');
        var optionsEl = document.getElementById('dropdownOptions');
        var cancelBtn = document.getElementById('dropdownCancel');

        titleEl.textContent = title;
        overlay.style.display = '';

        var showSearch = opts.searchable !== false && options.length > 6;
        searchEl.style.display = showSearch ? '' : 'none';
        searchEl.value = '';

        function renderOptions(filter) {
            optionsEl.innerHTML = '';
            var filtered = options.filter(function (opt) {
                var label = typeof opt === 'string' ? opt : opt.label;
                if (!filter) return true;
                return label.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
            });

            filtered.forEach(function (opt) {
                var value = typeof opt === 'string' ? opt : opt.value;
                var label = typeof opt === 'string' ? opt : opt.label;
                var btn = document.createElement('button');
                btn.className = 'dropdown-option';
                btn.textContent = label;
                if (value === currentValue) btn.classList.add('selected');
                btn.addEventListener('click', function () {
                    cleanup();
                    onSelect(value, label);
                });
                optionsEl.appendChild(btn);
            });
        }

        function handleSearch() { renderOptions(searchEl.value); }
        function cleanup() {
            overlay.style.display = 'none';
            searchEl.removeEventListener('input', handleSearch);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlay);
        }
        function handleCancel() { cleanup(); }
        function handleOverlay(e) { if (e.target === overlay) cleanup(); }

        searchEl.addEventListener('input', handleSearch);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlay);

        renderOptions('');
        if (showSearch) setTimeout(function () { searchEl.focus(); }, 50);
    }

    // === Custom Date Picker ===
    function showDatePicker(onSelect, opts) {
        opts = opts || {};
        var allowFuture = opts.allowFuture || false;
        var initialDate = opts.initialDate ? new Date(opts.initialDate) : null;

        var overlay = document.getElementById('datePickerOverlay');
        var grid = document.getElementById('dpGrid');
        var label = document.getElementById('dpMonthLabel');
        var prevBtn = document.getElementById('dpPrev');
        var nextBtn = document.getElementById('dpNext');
        var cancelBtn = document.getElementById('dpCancel');

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var viewMonth = initialDate ? initialDate.getMonth() : today.getMonth();
        var viewYear = initialDate ? initialDate.getFullYear() : today.getFullYear();

        overlay.style.display = '';

        function renderMonth() {
            var monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            label.textContent = monthNames[viewMonth] + ' ' + viewYear;

            var firstDay = new Date(viewYear, viewMonth, 1);
            var lastDay = new Date(viewYear, viewMonth + 1, 0);
            var startDow = (firstDay.getDay() + 6) % 7;

            grid.innerHTML = '';
            for (var i = 0; i < startDow; i++) {
                var empty = document.createElement('button');
                empty.className = 'dp-day empty';
                grid.appendChild(empty);
            }
            for (var d = 1; d <= lastDay.getDate(); d++) {
                var btn = document.createElement('button');
                btn.className = 'dp-day';
                btn.textContent = d;
                var thisDate = new Date(viewYear, viewMonth, d);
                thisDate.setHours(0, 0, 0, 0);
                if (thisDate.getTime() === today.getTime()) btn.classList.add('today');

                var selectable = allowFuture || thisDate <= today;
                if (!selectable) btn.classList.add('future');

                if (initialDate) {
                    var initDay = new Date(initialDate);
                    initDay.setHours(0, 0, 0, 0);
                    if (thisDate.getTime() === initDay.getTime()) btn.classList.add('selected');
                }

                (function (dateObj, canSelect) {
                    if (canSelect) {
                        btn.addEventListener('click', function () {
                            var yyyy = dateObj.getFullYear();
                            var mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                            var dd = String(dateObj.getDate()).padStart(2, '0');
                            cleanup();
                            onSelect(yyyy + '-' + mm + '-' + dd);
                        });
                    }
                })(thisDate, selectable);

                grid.appendChild(btn);
            }
        }

        function cleanup() {
            overlay.style.display = 'none';
            prevBtn.removeEventListener('click', handlePrev);
            nextBtn.removeEventListener('click', handleNext);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlay);
        }

        function handlePrev() { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderMonth(); }
        function handleNext() { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderMonth(); }
        function handleCancel() { cleanup(); }
        function handleOverlay(e) { if (e.target === overlay) cleanup(); }

        prevBtn.addEventListener('click', handlePrev);
        nextBtn.addEventListener('click', handleNext);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlay);

        renderMonth();
    }

    function formatPickedDate(dateStr) {
        var parts = dateStr.split('-');
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    // Events
    saveSettingsBtn.addEventListener('click', handleSave);
    testNotificationBtn.addEventListener('click', handleTestNotification);
    generateInviteBtn.addEventListener('click', handleGenerateInvite);
    generateShareBtn.addEventListener('click', handleGenerateShare);
    copyShareLinkBtn.addEventListener('click', handleCopyShareLink);

    profileBirthdayBtnEl.addEventListener('click', function () {
        var initDate = profileBirthdayEl.value || null;
        showDatePicker(function (dateStr) {
            profileBirthdayEl.value = dateStr;
            profileBirthdayBtnEl.textContent = formatPickedDate(dateStr);
            profileBirthdayBtnEl.classList.add('has-value');
        }, { initialDate: initDate });
    });

    profileBreedBtnEl.addEventListener('click', function () {
        showDropdown('Raça', BREED_OPTIONS, profileBreedEl.value, function (value) {
            profileBreedEl.value = value;
            profileBreedBtnEl.textContent = value;
            profileBreedBtnEl.classList.add('has-value');
        });
    });

    shareDurationBtnEl.addEventListener('click', function () {
        showDropdown('Validade do Link', SHARE_DURATION_OPTIONS, shareDurationEl.value, function (value, label) {
            shareDurationEl.value = value;
            shareDurationBtnEl.textContent = label;
            shareDurationBtnEl.classList.add('has-value');
        }, { searchable: false });
    });
})();
