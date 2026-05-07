(function () {
    'use strict';

    // === Shared references ===
    var FIREBASE_CONFIG = MelucaShared.FIREBASE_CONFIG;
    var INGREDIENT_POOL = MelucaShared.INGREDIENT_POOL;
    var initAvatarPicker = MelucaShared.initAvatarPicker;
    var setAvatarPreview = MelucaShared.setAvatarPreview;
    var getAvatarFromPicker = MelucaShared.getAvatarFromPicker;

    var SETTINGS_KEY = 'melucafeeder_settings';

    var currentRecipe = [];

    var KIBBLE_BRANDS = [
        { value: 'royal_canin', label: 'Royal Canin' },
        { value: 'purina_proplan', label: 'Purina Pro Plan' },
        { value: 'hills', label: "Hill's Science Plan" },
        { value: 'eukanuba', label: 'Eukanuba' },
        { value: 'advance', label: 'Advance (Affinity)' },
        { value: 'acana', label: 'Acana' },
        { value: 'orijen', label: 'Orijen' },
        { value: 'brit_care', label: 'Brit Care' },
        { value: 'brit_premium', label: 'Brit Premium' },
        { value: 'ownat', label: 'Ownat' },
        { value: 'libra', label: 'Libra' },
        { value: 'criadores', label: 'Criadores' },
        { value: 'gosbi', label: 'Gosbi' },
        { value: 'true_instinct', label: 'True Instinct' },
        { value: 'taste_wild', label: 'Taste of the Wild' },
        { value: 'farmina', label: 'Farmina N&D' },
        { value: 'virbac', label: 'Virbac Veterinary HPM' },
        { value: 'specific', label: 'Specific' },
        { value: 'nutro', label: 'Nutro' },
        { value: 'wolfood', label: 'Wolfood' },
        { value: 'prozoo', label: 'Pro Zoo' },
        { value: 'ultima', label: 'Ultima' },
        { value: 'pedigree', label: 'Pedigree' },
        { value: 'friskies', label: 'Friskies' },
        { value: 'other', label: 'Outra' }
    ];

    var KIBBLE_LIFE_STAGES = [
        { value: 'puppy', label: 'ðŸ¶ Puppy / Junior' },
        { value: 'adult', label: 'ðŸ• Adulto' },
        { value: 'senior', label: 'ðŸ•â€ðŸ¦º SÃ©nior (7+)' }
    ];

    var KIBBLE_PROTEINS = [
        { value: 'chicken', label: 'ðŸ— Frango' },
        { value: 'lamb', label: 'ðŸ‘ Borrego' },
        { value: 'beef', label: 'ðŸ¥© Vaca' },
        { value: 'duck', label: 'ðŸ¦† Pato' },
        { value: 'salmon', label: 'ðŸŸ SalmÃ£o' },
        { value: 'fish', label: 'ðŸ  Peixe' },
        { value: 'turkey', label: 'ðŸ¦ƒ Peru' },
        { value: 'pork', label: 'ðŸ· Porco' },
        { value: 'venison', label: 'ðŸ¦Œ Veado' },
        { value: 'rabbit', label: 'ðŸ‡ Coelho' },
        { value: 'mixed', label: 'ðŸ– Misto' }
    ];

    var KIBBLE_SPECIAL = [
        { value: 'none', label: 'Nenhuma' },
        { value: 'sterilized', label: 'âœ‚ï¸ Esterilizado / Castrado' },
        { value: 'hypoallergenic', label: 'ðŸ¤§ HipoalergÃ©nico' },
        { value: 'sensitive', label: 'ðŸ«„ DigestÃ£o sensÃ­vel' },
        { value: 'light', label: 'âš–ï¸ Light / Controlo de peso' },
        { value: 'grain_free', label: 'ðŸŒ¾ Grain Free' },
        { value: 'dermatology', label: 'ðŸ§´ DermatolÃ³gico' },
        { value: 'renal', label: 'ðŸ’§ Renal' },
        { value: 'joint', label: 'ðŸ¦´ ArticulaÃ§Ãµes' }
    ];

    var db = null;
    var currentUser = null;
    var currentDogId = null;

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        db = firebase.database();
    } catch (e) {
        console.error('Firebase init error in settings:', e);
    }

    var loginSection = document.getElementById('loginSection');
    var profilePanel = document.getElementById('profilePanel');
    var alertPanel = document.getElementById('alertPanel');
    var telegramPanel = document.getElementById('telegramPanel');
    var recipePanel = document.getElementById('recipePanel');
    var feedingPanel = document.getElementById('feedingPanel');
    var kibblePanel = document.getElementById('kibblePanel');
    var weightPanel = document.getElementById('weightPanel');
    var invitePanel = document.getElementById('invitePanel');
    var actionsPanel = document.getElementById('actionsPanel');
    var dogNameSubtitle = document.getElementById('dogNameSubtitle');
    var saveSettingsBtn = document.getElementById('saveSettings');
    var testNotificationBtn = document.getElementById('testNotification');
    var generateInviteBtn = document.getElementById('generateInvite');
    var inviteResultEl = document.getElementById('inviteResult');
    var membersListEl = document.getElementById('membersList');
    var toastEl = document.getElementById('toast');

    var profileNameEl = document.getElementById('profileName');
    var profileBreedEl = document.getElementById('profileBreed');
    var profileBreedBtnEl = document.getElementById('profileBreedBtn');
    var profileBirthdayEl = document.getElementById('profileBirthday');
    var profileBirthdayBtnEl = document.getElementById('profileBirthdayBtn');
    var profileColorEl = document.getElementById('profileColor');
    var profileNeuteredEl = document.getElementById('profileNeutered');
    var profileChipEl = document.getElementById('profileChip');
    var shareDurationBtnEl = document.getElementById('shareDurationBtn');

    var alertThresholdEl = document.getElementById('alertThreshold');
    var telegramTokenEl = document.getElementById('telegramToken');
    var telegramChatIdEl = document.getElementById('telegramChatId');
    var recipeIngredientsEl = document.getElementById('recipeIngredients');
    var addIngredientBtnEl = document.getElementById('addIngredientBtn');
    var kibbleBrandEl = document.getElementById('kibbleBrand');
    var kibbleBrandBtnEl = document.getElementById('kibbleBrandBtn');
    var kibbleLifeStageEl = document.getElementById('kibbleLifeStage');
    var kibbleLifeStageBtnEl = document.getElementById('kibbleLifeStageBtn');
    var kibbleProteinEl = document.getElementById('kibbleProtein');
    var kibbleProteinBtnEl = document.getElementById('kibbleProteinBtn');
    var kibbleSpecialEl = document.getElementById('kibbleSpecial');
    var kibbleSpecialBtnEl = document.getElementById('kibbleSpecialBtn');
    var kibbleAmountEl = document.getElementById('kibbleAmount');
    var kibbleMealsEl = document.getElementById('kibbleMeals');
    var kibbleBagSizeEl = document.getElementById('kibbleBagSize');
    var targetWeightEl = document.getElementById('targetWeight');

    var currentFeedingMode = 'homemade';

    // Wait for auth state
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            currentUser = user;
            currentDogId = localStorage.getItem('melucafeeder_currentDog');
            if (currentDogId) {
                showSettings();
            } else {
                dogNameSubtitle.textContent = 'Nenhum cÃ£o seleccionado';
                showToast('Volta Ã  app principal para seleccionar um cÃ£o');
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
        feedingPanel.style.display = '';
        recipePanel.style.display = '';
        kibblePanel.style.display = '';
        weightPanel.style.display = '';
        invitePanel.style.display = '';
        sharePanel.style.display = '';
        actionsPanel.style.display = '';

        // Load dog name + profile
        db.ref('dogs/' + currentDogId).once('value', function (snap) {
            var dog = snap.val() || {};
            dogNameSubtitle.textContent = dog.name || 'ConfiguraÃ§Ãµes do cÃ£o';
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
        currentRecipe = migrateRecipe(s.recipe);
        renderRecipeIngredients();
        targetWeightEl.value = s.targetWeight || '';

        // Feeding mode
        currentFeedingMode = s.feedingMode || 'homemade';
        setFeedingMode(currentFeedingMode);

        // Kibble settings
        var k = s.kibble || {};
        kibbleAmountEl.value = k.amount || 150;
        kibbleMealsEl.value = k.mealsPerDay || 2;
        kibbleBagSizeEl.value = k.bagSize || 12;
        setDropdownValue(kibbleBrandBtnEl, kibbleBrandEl, k.brand, KIBBLE_BRANDS);
        setDropdownValue(kibbleLifeStageBtnEl, kibbleLifeStageEl, k.lifeStage, KIBBLE_LIFE_STAGES);
        setDropdownValue(kibbleProteinBtnEl, kibbleProteinEl, k.protein, KIBBLE_PROTEINS);
        setDropdownValue(kibbleSpecialBtnEl, kibbleSpecialEl, k.special, KIBBLE_SPECIAL);
    }

    function setDropdownValue(btn, input, value, options) {
        if (value) {
            input.value = value;
            var opt = options.find(function (o) { return o.value === value; });
            if (opt) {
                btn.textContent = opt.label;
                btn.classList.add('has-value');
            }
        }
    }

    function setFeedingMode(mode) {
        currentFeedingMode = mode;
        document.querySelectorAll('.feeding-mode-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });
        recipePanel.style.display = mode === 'homemade' ? '' : 'none';
        kibblePanel.style.display = mode === 'kibble' ? '' : 'none';
    }

    function migrateRecipe(recipe) {
        if (Array.isArray(recipe)) return recipe.slice();
        if (!recipe || typeof recipe !== 'object') return [{ id: 'chicken', amount: 50 }, { id: 'rice', amount: 50 }, { id: 'peas', amount: 25 }, { id: 'egg', amount: 0.5 }];
        var arr = [];
        Object.keys(recipe).forEach(function (key) {
            if (recipe[key] > 0) arr.push({ id: key, amount: recipe[key] });
        });
        return arr.length > 0 ? arr : [{ id: 'chicken', amount: 50 }, { id: 'rice', amount: 50 }, { id: 'peas', amount: 25 }, { id: 'egg', amount: 0.5 }];
    }

    var getIngredient = MelucaShared.getIngredient;

    function renderRecipeIngredients() {
        if (currentRecipe.length === 0) {
            recipeIngredientsEl.innerHTML = '<p class="empty-history">Sem ingredientes. Adiciona pelo menos um.</p>';
            return;
        }
        recipeIngredientsEl.innerHTML = currentRecipe.map(function (item, idx) {
            var ing = getIngredient(item.id);
            var step = ing.unit === 'un' ? '0.5' : (ing.unit === 'ml' ? '1' : '5');
            return '<div class="recipe-ingredient-row">' +
                '<span class="recipe-ing-icon">' + ing.icon + '</span>' +
                '<span class="recipe-ing-name">' + escapeHtml(ing.name) + '</span>' +
                '<input type="number" class="recipe-ing-amount" data-idx="' + idx + '" min="0" step="' + step + '" value="' + item.amount + '">' +
                '<span class="recipe-ing-unit">' + ing.unit + '</span>' +
                '<button class="recipe-ing-remove" data-idx="' + idx + '">âœ•</button>' +
                '</div>';
        }).join('');

        recipeIngredientsEl.querySelectorAll('.recipe-ing-amount').forEach(function (input) {
            input.addEventListener('change', function () {
                var i = parseInt(input.getAttribute('data-idx'), 10);
                currentRecipe[i].amount = parseFloat(input.value) || 0;
            });
        });

        recipeIngredientsEl.querySelectorAll('.recipe-ing-remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var i = parseInt(btn.getAttribute('data-idx'), 10);
                currentRecipe.splice(i, 1);
                renderRecipeIngredients();
            });
        });
    }

    function populateProfile(name, p) {
        profileNameEl.value = name || '';
        profileBreedEl.value = p.breed || '';
        if (p.breed) {
            profileBreedBtnEl.textContent = p.breed;
            profileBreedBtnEl.classList.add('has-value');
        } else {
            profileBreedBtnEl.textContent = 'Seleccionar raÃ§a';
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
        var neuteredLabel = profileNeuteredEl.closest('.dog-checkbox-label');
        if (neuteredLabel) {
            if (p.neutered) neuteredLabel.classList.add('checked');
            else neuteredLabel.classList.remove('checked');
        }
        profileChipEl.value = p.chip || '';
        var sexRadios = document.querySelectorAll('input[name="profileSex"]');
        sexRadios.forEach(function (r) {
            r.checked = (r.value === p.sex);
            var label = r.closest('.dog-radio-label');
            if (label) {
                if (r.value === p.sex) label.classList.add('selected');
                else label.classList.remove('selected');
            }
        });
        // Avatar
        setAvatarPreview('profile', p.avatar);
        initAvatarPicker('profile');
    }

    function handleSave() {
        // Save profile
        var profileSexRadio = document.querySelector('input[name="profileSex"]:checked');
        var profileUpdates = {};
        profileUpdates['dogs/' + currentDogId + '/name'] = profileNameEl.value.trim() || 'CÃ£o';
        profileUpdates['dogs/' + currentDogId + '/profile'] = {
            breed: profileBreedEl.value || '',
            sex: profileSexRadio ? profileSexRadio.value : '',
            birthday: profileBirthdayEl.value || '',
            color: profileColorEl.value.trim(),
            neutered: profileNeuteredEl.checked,
            chip: profileChipEl.value.trim(),
            avatar: getAvatarFromPicker('profile')
        };

        // Save settings
        var settings = {
            alertThreshold: parseInt(alertThresholdEl.value, 10) || 5,
            telegramToken: telegramTokenEl.value.trim(),
            telegramChatId: telegramChatIdEl.value.trim(),
            feedingMode: currentFeedingMode,
            recipe: currentRecipe.filter(function (item) { return item.amount > 0; }),
            kibble: {
                brand: kibbleBrandEl.value || '',
                lifeStage: kibbleLifeStageEl.value || '',
                protein: kibbleProteinEl.value || '',
                special: kibbleSpecialEl.value || '',
                amount: parseInt(kibbleAmountEl.value, 10) || 150,
                mealsPerDay: parseInt(kibbleMealsEl.value, 10) || 2,
                bagSize: parseFloat(kibbleBagSizeEl.value) || 12
            },
            targetWeight: parseFloat(targetWeightEl.value) || null
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        profileUpdates['dogs/' + currentDogId + '/settings'] = settings;

        if (db && currentDogId) {
            db.ref().update(profileUpdates);
        }

        dogNameSubtitle.textContent = profileNameEl.value.trim() || 'CÃ£o';
        showToast('ConfiguraÃ§Ãµes guardadas');
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
            showToast('CÃ³digo gerado: ' + code + ' (expira em 24h)');
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
                var roleLabel = m.role === 'owner' ? 'ðŸ‘‘ Owner' : 'ðŸ‘¤ Membro';

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
        showSettingsModal('Queres remover "' + name + '" deste cÃ£o?', function () {
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
                        text: 'ðŸ§ª Teste MelucaFeeder: NotificaÃ§Ãµes a funcionar!',
                        parse_mode: 'HTML'
                    })
                });
                if (response.ok) success++;
            } catch (e) { /* continue */ }
        }

        if (success === chatIds.length) {
            showToast('NotificaÃ§Ã£o enviada para ' + success + ' destinatÃ¡rio(s)!');
        } else if (success > 0) {
            showToast('Enviada para ' + success + '/' + chatIds.length + ' destinatÃ¡rios');
        } else {
            showToast('Erro ao enviar notificaÃ§Ã£o');
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
        'Sem raÃ§a definida', 'Akita Inu', 'Australian Shepherd', 'Basset Hound', 'Beagle',
        'Bichon FrisÃ©', 'Border Collie', 'Boxer', 'Braco AlemÃ£o', 'Bulldog FrancÃªs',
        'Bulldog InglÃªs', 'Bull Terrier', 'Caniche', 'CÃ£o de Ãgua PortuguÃªs',
        'CÃ£o de Castro Laboreiro', 'CÃ£o da Serra da Estrela', 'CÃ£o de Fila de SÃ£o Miguel',
        'Cavalier King Charles', 'Chihuahua', 'Cocker Spaniel', 'Dachshund', 'DÃ¡lmata',
        'Dobermann', 'Golden Retriever', 'Husky Siberiano', 'Jack Russell Terrier',
        'Labrador Retriever', 'Lulu da PomerÃ¢nia', 'Malinois', 'MaltÃªs', 'Pastor AlemÃ£o',
        'PequinÃªs', 'Perdigueiro PortuguÃªs', 'Pincher Miniatura', 'Pitbull',
        'Podengo PortuguÃªs', 'Rafeiro do Alentejo', 'Rottweiler', 'Samoiedo',
        'SÃ£o Bernardo', 'Schnauzer', 'Setter IrlandÃªs', 'Shar Pei', 'Shiba Inu',
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
            var monthNames = ['Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
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

    // Collapsible sections
    document.querySelectorAll('[data-toggle-section]').forEach(function (header) {
        header.addEventListener('click', function () {
            var section = header.closest('.settings-section');
            if (section) section.classList.toggle('collapsed');
        });
    });

    // Events
    saveSettingsBtn.addEventListener('click', handleSave);
    testNotificationBtn.addEventListener('click', handleTestNotification);
    generateInviteBtn.addEventListener('click', handleGenerateInvite);
    generateShareBtn.addEventListener('click', handleGenerateShare);
    copyShareLinkBtn.addEventListener('click', handleCopyShareLink);

    addIngredientBtnEl.addEventListener('click', function () {
        var usedIds = currentRecipe.map(function (item) { return item.id; });
        var available = INGREDIENT_POOL.filter(function (ing) { return usedIds.indexOf(ing.id) === -1; });
        if (available.length === 0) {
            showToast('Todos os ingredientes jÃ¡ foram adicionados');
            return;
        }
        var options = available.map(function (ing) { return { value: ing.id, label: ing.icon + ' ' + ing.name }; });
        showDropdown('Adicionar ingrediente', options, '', function (value) {
            var ing = getIngredient(value);
            var defaultAmount = ing.unit === 'un' ? 1 : (ing.unit === 'ml' ? 5 : 50);
            currentRecipe.push({ id: value, amount: defaultAmount });
            renderRecipeIngredients();
        });
    });

    profileBirthdayBtnEl.addEventListener('click', function () {
        var initDate = profileBirthdayEl.value || null;
        showDatePicker(function (dateStr) {
            profileBirthdayEl.value = dateStr;
            profileBirthdayBtnEl.textContent = formatPickedDate(dateStr);
            profileBirthdayBtnEl.classList.add('has-value');
        }, { initialDate: initDate });
    });

    profileBreedBtnEl.addEventListener('click', function () {
        showDropdown('RaÃ§a', BREED_OPTIONS, profileBreedEl.value, function (value) {
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

    // Feeding mode toggle
    document.querySelectorAll('.feeding-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setFeedingMode(btn.getAttribute('data-mode'));
        });
    });

    // Kibble dropdowns
    kibbleBrandBtnEl.addEventListener('click', function () {
        showDropdown('Marca de RaÃ§Ã£o', KIBBLE_BRANDS, kibbleBrandEl.value, function (value, label) {
            kibbleBrandEl.value = value;
            kibbleBrandBtnEl.textContent = label;
            kibbleBrandBtnEl.classList.add('has-value');
        });
    });

    kibbleLifeStageBtnEl.addEventListener('click', function () {
        showDropdown('Fase de Vida', KIBBLE_LIFE_STAGES, kibbleLifeStageEl.value, function (value, label) {
            kibbleLifeStageEl.value = value;
            kibbleLifeStageBtnEl.textContent = label;
            kibbleLifeStageBtnEl.classList.add('has-value');
        }, { searchable: false });
    });

    kibbleProteinBtnEl.addEventListener('click', function () {
        showDropdown('ProteÃ­na Principal', KIBBLE_PROTEINS, kibbleProteinEl.value, function (value, label) {
            kibbleProteinEl.value = value;
            kibbleProteinBtnEl.textContent = label;
            kibbleProteinBtnEl.classList.add('has-value');
        }, { searchable: false });
    });

    kibbleSpecialBtnEl.addEventListener('click', function () {
        showDropdown('Necessidade Especial', KIBBLE_SPECIAL, kibbleSpecialEl.value, function (value, label) {
            kibbleSpecialEl.value = value;
            kibbleSpecialBtnEl.textContent = label;
            kibbleSpecialBtnEl.classList.add('has-value');
        }, { searchable: false });
    });

    // Radio button toggle (selected class)
    document.querySelectorAll('.dog-radio-label').forEach(function (label) {
        label.addEventListener('click', function () {
            var group = label.closest('.dog-form-radio-group');
            if (group) group.querySelectorAll('.dog-radio-label').forEach(function (l) { l.classList.remove('selected'); });
            label.classList.add('selected');
        });
    });

    // Checkbox toggle (checked class)
    document.querySelectorAll('.dog-checkbox-label').forEach(function (label) {
        label.addEventListener('click', function () {
            setTimeout(function () {
                var input = label.querySelector('input[type="checkbox"]');
                if (input && input.checked) label.classList.add('checked');
                else label.classList.remove('checked');
            }, 0);
        });
    });
})();
