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
    const MAX_AUTO_DEDUCTIONS = 4;

    // === State ===
    let state = { stock: 0, lastProcessed: 0 };
    let settings = loadLocalSettings();
    let history = [];
    let weightData = [];
    let vetData = [];
    let healthNotes = [];
    let calendarMonth = new Date().getMonth();
    let calendarYear = new Date().getFullYear();

    let db = null;
    let auth = null;
    let currentUser = null;
    let currentDogId = null;
    let userDogs = {};
    let firstLoad = true;
    let listeners = []; // Firebase listener refs for cleanup

    // === DOM: Auth ===
    const loginScreenEl = document.getElementById('loginScreen');
    const dogsScreenEl = document.getElementById('dogsScreen');
    const appMainEl = document.getElementById('appMain');
    const googleLoginBtn = document.getElementById('googleLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnDogs = document.getElementById('logoutBtnDogs');
    const userNameEl = document.getElementById('userName');
    const userNameDogsEl = document.getElementById('userNameDogs');
    const dogsListEl = document.getElementById('dogsList');
    const appDogNameEl = document.getElementById('appDogName');
    const backToDogsBtn = document.getElementById('backToDogs');
    const newDogNameEl = document.getElementById('newDogName');
    const createDogBtnEl = document.getElementById('createDogBtn');
    const inviteCodeEl = document.getElementById('inviteCode');
    const joinDogBtnEl = document.getElementById('joinDogBtn');

    // === DOM: App ===
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
    const ruptureInfoEl = document.getElementById('ruptureInfo');
    const shoppingTargetEl = document.getElementById('shoppingTarget');
    const shoppingBtnEl = document.getElementById('shoppingBtn');
    const shoppingListEl = document.getElementById('shoppingList');
    const vetTypeEl = document.getElementById('vetType');
    const vetDescEl = document.getElementById('vetDesc');
    const vetDateEl = document.getElementById('vetDate');
    const vetNextDateEl = document.getElementById('vetNextDate');
    const vetAddBtnEl = document.getElementById('vetAddBtn');
    const vetUpcomingEl = document.getElementById('vetUpcoming');
    const vetHistoryEl = document.getElementById('vetHistory');
    const healthNoteTextEl = document.getElementById('healthNoteText');
    const healthNoteBtnEl = document.getElementById('healthNoteBtn');
    const healthNotesListEl = document.getElementById('healthNotesList');
    const calPrevEl = document.getElementById('calPrev');
    const calNextEl = document.getElementById('calNext');
    const calMonthEl = document.getElementById('calMonth');
    const calendarGridEl = document.getElementById('calendarGrid');

    // === Firebase Init ===
    function initFirebase() {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        auth = firebase.auth();

        // Handle redirect result (in case popup didn't communicate back)
        auth.getRedirectResult().then(function (result) {
            if (result.user) {
                console.log('Got redirect result:', result.user.email);
            }
        }).catch(function (err) {
            console.error('Redirect result error:', err);
        });

        // Auth state listener
        auth.onAuthStateChanged(function (user) {
            console.log('Auth state changed:', user ? user.email : 'null');
            if (user) {
                currentUser = user;
                onUserLoggedIn(user);
            } else {
                currentUser = null;
                showLogin();
            }
        });
    }

    // === Auth Functions ===
    function handleGoogleLogin() {
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function (err) {
            console.error('Login error:', err.code, err.message);
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
                showToast('Popup bloqueado. A tentar redirect...');
                auth.signInWithRedirect(provider);
            } else {
                showToast('Erro: ' + err.code);
            }
        });
    }

    function handleLogout() {
        detachListeners();
        auth.signOut();
    }

    function showLogin() {
        loginScreenEl.style.display = '';
        dogsScreenEl.style.display = 'none';
        appMainEl.style.display = 'none';
    }

    function showDogsScreen() {
        loginScreenEl.style.display = 'none';
        dogsScreenEl.style.display = '';
        appMainEl.style.display = 'none';
        renderDogsList();
    }

    function showApp() {
        loginScreenEl.style.display = 'none';
        dogsScreenEl.style.display = 'none';
        appMainEl.style.display = '';
    }

    function onUserLoggedIn(user) {
        userNameEl.textContent = user.displayName || user.email;
        userNameDogsEl.textContent = user.displayName || user.email;

        // Ensure user profile exists
        db.ref('users/' + user.uid).once('value', function (snap) {
            if (!snap.exists()) {
                db.ref('users/' + user.uid).set({
                    name: user.displayName || '',
                    email: user.email || '',
                    dogs: {}
                });
            }
        });

        // Load user's dogs
        db.ref('users/' + user.uid + '/dogs').on('value', function (snap) {
            userDogs = snap.val() || {};
            var dogIds = Object.keys(userDogs);

            if (dogIds.length === 0) {
                // Check if there's legacy data to migrate
                checkAndMigrateLegacyData(user);
            } else {
                // Always show dogs screen (unless already viewing a dog)
                if (!currentDogId || !userDogs[currentDogId]) {
                    showDogsScreen();
                } else {
                    renderDogsList();
                }
            }
        });
    }

    // === Migration: Legacy data → Dog structure ===
    function checkAndMigrateLegacyData(user) {
        db.ref('state').once('value', function (snap) {
            if (snap.exists()) {
                // Legacy data found — migrate to a new dog
                migrateToNewDog(user, snap.val());
            } else {
                showDogsScreen();
            }
        });
    }

    function migrateToNewDog(user, legacyState) {
        var dogId = db.ref('dogs').push().key;
        var updates = {};

        // Create dog
        updates['dogs/' + dogId + '/name'] = 'Meluca';
        updates['dogs/' + dogId + '/createdBy'] = user.uid;
        updates['dogs/' + dogId + '/members/' + user.uid] = { role: 'owner', name: user.displayName || user.email };
        updates['dogs/' + dogId + '/state'] = legacyState;

        // Link user to dog
        updates['users/' + user.uid + '/dogs/' + dogId] = true;

        db.ref().update(updates).then(function () {
            // Now migrate history, weight, vet, healthNotes, settings
            return Promise.all([
                migrateNode('history', dogId),
                migrateNode('weight', dogId),
                migrateNode('vet', dogId),
                migrateNode('healthNotes', dogId),
                migrateNode('settings', dogId)
            ]);
        }).then(function () {
            // Remove legacy root nodes
            return db.ref().update({
                'state': null,
                'history': null,
                'weight': null,
                'vet': null,
                'healthNotes': null,
                'settings': null
            });
        }).then(function () {
            showToast('Dados migrados com sucesso!');
            showDogsScreen();
        }).catch(function (err) {
            console.error('Migration error:', err);
            showToast('Erro na migração');
            showDogsScreen();
        });
    }

    function migrateNode(nodeName, dogId) {
        return db.ref(nodeName).once('value').then(function (snap) {
            if (snap.exists()) {
                return db.ref('dogs/' + dogId + '/' + nodeName).set(snap.val());
            }
        });
    }

    // === Dog Management ===
    function handleCreateDog() {
        var name = newDogNameEl.value.trim();
        if (!name) {
            showToast('Introduz o nome do cão');
            return;
        }

        var dogId = db.ref('dogs').push().key;
        var updates = {};
        updates['dogs/' + dogId + '/name'] = name;
        updates['dogs/' + dogId + '/createdBy'] = currentUser.uid;
        updates['dogs/' + dogId + '/members/' + currentUser.uid] = { role: 'owner', name: currentUser.displayName || currentUser.email };
        updates['dogs/' + dogId + '/state'] = { stock: 0, lastProcessed: 0 };
        updates['dogs/' + dogId + '/settings'] = { alertThreshold: 5, telegramToken: '', telegramChatId: '', recipe: { chicken: 50, rice: 50, peas: 25, egg: 0.5 } };
        updates['users/' + currentUser.uid + '/dogs/' + dogId] = true;

        db.ref().update(updates).then(function () {
            newDogNameEl.value = '';
            showToast(name + ' criado!');
            // Dogs screen will refresh via the on('value') listener
        });
    }

    function handleJoinDog() {
        var code = inviteCodeEl.value.trim().toUpperCase();
        if (!code || code.length < 4) {
            showToast('Código inválido');
            return;
        }

        db.ref('invites/' + code).once('value', function (snap) {
            var invite = snap.val();
            if (!invite) {
                showToast('Código não encontrado');
                return;
            }
            if (invite.expiresAt && invite.expiresAt < Date.now()) {
                showToast('Código expirado');
                return;
            }

            var dogId = invite.dogId;
            var updates = {};
            updates['dogs/' + dogId + '/members/' + currentUser.uid] = { role: 'member', name: currentUser.displayName || currentUser.email };
            updates['users/' + currentUser.uid + '/dogs/' + dogId] = true;
            updates['invites/' + code] = null; // Remove used invite

            db.ref().update(updates).then(function () {
                inviteCodeEl.value = '';
                showToast('Juntaste-te com sucesso!');
                // Dogs screen will refresh via the on('value') listener
            });
        });
    }

    function selectDog(dogId) {
        if (currentDogId === dogId && appMainEl.style.display !== 'none') return;

        // Detach old listeners
        detachListeners();

        currentDogId = dogId;
        localStorage.setItem('melucafeeder_currentDog', dogId);
        firstLoad = true;

        // Set dog name in header
        db.ref('dogs/' + dogId + '/name').once('value', function (snap) {
            appDogNameEl.textContent = snap.val() || 'MelucaFeeder';
        });

        showApp();
        render();
        attachDogListeners(dogId);
    }

    let dogsListRenderToken = 0;

    function renderDogsList() {
        var dogIds = Object.keys(userDogs);
        dogsListRenderToken++;
        var myToken = dogsListRenderToken;

        if (dogIds.length === 0) {
            dogsListEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Ainda não tens nenhum cão registado.</p>';
            return;
        }

        dogsListEl.innerHTML = '';
        dogIds.forEach(function (id) {
            db.ref('dogs/' + id).once('value', function (snap) {
                // Ignore if a newer render has been triggered
                if (myToken !== dogsListRenderToken) return;

                var dog = snap.val();
                if (!dog) return;

                var role = (dog.members && dog.members[currentUser.uid]) ? dog.members[currentUser.uid].role : '';
                var roleLabel = role === 'owner' ? 'Dono' : 'Membro';

                var card = document.createElement('div');
                card.className = 'dog-card';
                card.innerHTML = '<div class="dog-card-info">' +
                    '<span class="dog-card-avatar">🐕</span>' +
                    '<div><div class="dog-card-name">' + escapeHtml(dog.name || 'Cão') + '</div>' +
                    '<div class="dog-card-role">' + roleLabel + '</div></div>' +
                    '</div><span class="dog-card-arrow">›</span>';
                card.addEventListener('click', function () {
                    selectDog(id);
                });
                dogsListEl.appendChild(card);
            });
        });
    }

    // === Firebase Listeners (per dog) ===
    function dogRef(path) {
        return db.ref('dogs/' + currentDogId + '/' + path);
    }

    function attachDogListeners(dogId) {
        var stateRef = dogRef('state');
        stateRef.on('value', function (snapshot) {
            var cloudState = snapshot.val();
            if (cloudState) {
                var cloudProcessed = cloudState.lastProcessed || 0;
                if (cloudProcessed >= state.lastProcessed || firstLoad) {
                    state.stock = cloudState.stock || 0;
                    state.lastProcessed = cloudProcessed;
                }

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
        listeners.push({ ref: stateRef, event: 'value' });

        var historyRef = dogRef('history');
        historyRef.orderByChild('date').limitToLast(50).on('value', function (snapshot) {
            var data = snapshot.val();
            if (data) {
                history = Object.values(data).sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });
                renderHistory();
                renderCalendar();
            } else {
                history = [];
                renderHistory();
                renderCalendar();
            }
        });
        listeners.push({ ref: historyRef, event: 'value' });

        var settingsRef = dogRef('settings');
        settingsRef.on('value', function (snapshot) {
            var cloudSettings = snapshot.val();
            if (cloudSettings) {
                settings = cloudSettings;
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            }
        });
        listeners.push({ ref: settingsRef, event: 'value' });

        var weightRef = dogRef('weight');
        weightRef.orderByChild('date').on('value', function (snapshot) {
            var data = snapshot.val();
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
        listeners.push({ ref: weightRef, event: 'value' });

        var vetRef = dogRef('vet');
        vetRef.on('value', function (snapshot) {
            var data = snapshot.val();
            vetData = data ? Object.entries(data).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
            vetData.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
            renderVet();
            checkVetReminders();
        });
        listeners.push({ ref: vetRef, event: 'value' });

        var healthRef = dogRef('healthNotes');
        healthRef.on('value', function (snapshot) {
            var data = snapshot.val();
            healthNotes = data ? Object.entries(data).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
            healthNotes.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
            renderHealthNotes();
        });
        listeners.push({ ref: healthRef, event: 'value' });
    }

    function detachListeners() {
        listeners.forEach(function (l) {
            l.ref.off(l.event);
        });
        listeners = [];
    }

    // === Settings ===
    function loadLocalSettings() {
        try {
            var raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { alertThreshold: 5, telegramToken: '', telegramChatId: '', recipe: { chicken: 50, rice: 50, peas: 25, egg: 0.5 } };
    }

    // === Firebase Write ===
    function saveState() {
        if (db && currentDogId) {
            dogRef('state').set({
                stock: state.stock,
                lastProcessed: state.lastProcessed
            });
        }
    }

    function addHistoryEntry(type, quantity, description) {
        var entry = {
            type: type,
            quantity: quantity,
            description: description,
            date: new Date().toISOString()
        };
        history.unshift(entry);

        if (db && currentDogId) {
            dogRef('history').push(entry);
        }
    }

    // === Auto Deduction Logic ===
    function processAutoDeductions() {
        if (state.lastProcessed === 0) return;

        var now = new Date();
        var lastProcessed = new Date(state.lastProcessed);

        if (lastProcessed > now) {
            state.lastProcessed = now.getTime();
            saveState();
            return;
        }

        var deducted = 0;
        var cursor = new Date(lastProcessed);
        cursor = getNextMealTime(cursor);

        while (cursor <= now && deducted < MAX_AUTO_DEDUCTIONS) {
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
        var d = new Date(fromDate);
        var hour = d.getHours();
        var result = new Date(d);

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
        var now = new Date();
        var morningToday = new Date(now);
        morningToday.setHours(MORNING_HOUR, 0, 0, 0);
        var eveningToday = new Date(now);
        eveningToday.setHours(EVENING_HOUR, 0, 0, 0);

        var nextMorning, nextEvening;

        if (now < morningToday) {
            nextMorning = morningToday;
        } else {
            var tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(MORNING_HOUR, 0, 0, 0);
            nextMorning = tomorrow;
        }

        if (now < eveningToday) {
            nextEvening = eveningToday;
        } else {
            var tomorrowEve = new Date(now);
            tomorrowEve.setDate(tomorrowEve.getDate() + 1);
            tomorrowEve.setHours(EVENING_HOUR, 0, 0, 0);
            nextEvening = tomorrowEve;
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

        var chatIds = String(settings.telegramChatId).split(',').map(function (id) { return id.trim(); }).filter(Boolean);
        var url = 'https://api.telegram.org/bot' + settings.telegramToken + '/sendMessage';

        for (var i = 0; i < chatIds.length; i++) {
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatIds[i],
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (e) {
                console.error('Notification error for chat ' + chatIds[i] + ':', e);
            }
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
            var days = Math.floor(state.stock / 2);
            stockStatusEl.textContent = '≈ ' + days + ' dias de autonomia';
            stockStatusEl.style.color = '';
        }

        var meals = getNextMealTimes();
        nextMorningEl.textContent = formatRelativeTime(meals.nextMorning);
        nextEveningEl.textContent = formatRelativeTime(meals.nextEvening);

        renderRuptureInfo();
        renderHistory();

        if (state.lastProcessed > 0) {
            lastUpdateEl.textContent = formatDateTime(new Date(state.lastProcessed));
        }
    }

    function renderRuptureInfo() {
        if (state.stock <= 0) {
            ruptureInfoEl.innerHTML = '<span class="rupture-danger">Sem stock disponível</span>';
            return;
        }
        var daysLeft = state.stock / 2;
        var ruptureDate = new Date();
        ruptureDate.setDate(ruptureDate.getDate() + Math.floor(daysLeft));
        var day = String(ruptureDate.getDate()).padStart(2, '0');
        var month = String(ruptureDate.getMonth() + 1).padStart(2, '0');

        var cls = daysLeft <= 3 ? 'rupture-danger' : daysLeft <= 7 ? 'rupture-warning' : 'rupture-ok';
        ruptureInfoEl.innerHTML = '<span class="' + cls + '">Stock acaba a <strong>' + day + '/' + month + '</strong> (' + Math.floor(daysLeft) + ' dias)</span>';
    }

    function renderHistory() {
        if (history.length === 0) {
            historyListEl.innerHTML = '<p class="empty-history">Sem registos</p>';
            return;
        }

        historyListEl.innerHTML = history.slice(0, 20).map(function (entry) {
            var typeClass = entry.quantity > 0 ? 'add' : 'deduct';
            var sign = entry.quantity > 0 ? '+' : '';
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
        var labels = {
            syncing: '⟳ A sincronizar...',
            synced: '✓ Sincronizado',
            error: '✗ Erro de sync',
            offline: '○ Apenas local'
        };
        syncStatusEl.textContent = labels[status] || '';
    }

    // === Events ===
    function bindEvents() {
        // Auth
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        logoutBtnDogs.addEventListener('click', handleLogout);
        backToDogsBtn.addEventListener('click', function () {
            detachListeners();
            currentDogId = null;
            showDogsScreen();
        });
        createDogBtnEl.addEventListener('click', handleCreateDog);
        joinDogBtnEl.addEventListener('click', handleJoinDog);
        newDogNameEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleCreateDog();
        });
        inviteCodeEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleJoinDog();
        });

        // App
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
        shoppingBtnEl.addEventListener('click', handleShoppingList);
        vetAddBtnEl.addEventListener('click', handleVetAdd);
        healthNoteBtnEl.addEventListener('click', handleHealthNote);
        healthNoteTextEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleHealthNote();
        });
        calPrevEl.addEventListener('click', function () { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(); });
        calNextEl.addEventListener('click', function () { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(); });

        // Tab navigation
        document.querySelectorAll('.tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
                tab.classList.add('active');
                document.getElementById('tab-' + tab.getAttribute('data-tab')).classList.add('active');

                if (tab.getAttribute('data-tab') === 'weight' && weightData.length >= 2) {
                    setTimeout(drawChart, 50);
                }
            });
        });

        // Init calendar + vet date
        renderCalendar();
        vetDateEl.value = new Date().toISOString().slice(0, 10);
    }

    // === Handlers ===
    function handleCalculate() {
        var recipe = settings.recipe || { chicken: 50, rice: 50, peas: 25, egg: 0.5 };
        var chicken = parseFloat(calcChickenEl.value) || 0;
        var rice = parseFloat(calcRiceEl.value) || 0;
        var peas = parseFloat(calcPeasEl.value) || 0;
        var eggs = parseFloat(calcEggsEl.value) || 0;

        var meals = [];
        var details = [];

        if (recipe.chicken > 0 && chicken > 0) {
            var m = Math.floor(chicken / recipe.chicken);
            meals.push(m);
            details.push('Frango: ' + m + ' refeições (' + recipe.chicken + 'g/ref)');
        }
        if (recipe.rice > 0 && rice > 0) {
            var m2 = Math.floor(rice / recipe.rice);
            meals.push(m2);
            details.push('Arroz: ' + m2 + ' refeições (' + recipe.rice + 'g/ref)');
        }
        if (recipe.peas > 0 && peas > 0) {
            var m3 = Math.floor(peas / recipe.peas);
            meals.push(m3);
            details.push('Ervilhas: ' + m3 + ' refeições (' + recipe.peas + 'g/ref)');
        }
        if (recipe.egg > 0 && eggs > 0) {
            var m4 = Math.floor(eggs / recipe.egg);
            meals.push(m4);
            details.push('Ovos: ' + m4 + ' refeições (' + recipe.egg + ' un/ref)');
        }

        if (meals.length === 0) {
            showToast('Introduz pelo menos um ingrediente');
            return;
        }

        var minMeals = Math.min.apply(null, meals);
        calcResultNumberEl.textContent = minMeals;
        calcResultDetailEl.innerHTML = details.join('<br>');
        calcResultEl.style.display = '';
    }

    function handleAdd() {
        var qty = parseInt(addQuantityEl.value, 10);
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

    // === Shopping List ===
    function handleShoppingList() {
        var target = parseInt(shoppingTargetEl.value, 10);
        if (isNaN(target) || target < 1) {
            showToast('Introduz um número válido de refeições');
            return;
        }

        var recipe = settings.recipe || { chicken: 50, rice: 50, peas: 25, egg: 0.5 };
        var items = [];
        if (recipe.chicken > 0) {
            var totalChicken = recipe.chicken * target;
            items.push({ name: 'Frango', display: totalChicken >= 1000 ? (totalChicken / 1000).toFixed(1) + ' kg' : totalChicken + ' g' });
        }
        if (recipe.rice > 0) {
            var totalRice = recipe.rice * target;
            items.push({ name: 'Arroz', display: totalRice >= 1000 ? (totalRice / 1000).toFixed(1) + ' kg' : totalRice + ' g' });
        }
        if (recipe.peas > 0) {
            var totalPeas = recipe.peas * target;
            items.push({ name: 'Ervilhas', display: totalPeas >= 1000 ? (totalPeas / 1000).toFixed(1) + ' kg' : totalPeas + ' g' });
        }
        if (recipe.egg > 0) {
            var totalEggs = Math.ceil(recipe.egg * target);
            items.push({ name: 'Ovos', display: totalEggs + ' un' });
        }

        shoppingListEl.style.display = '';
        shoppingListEl.innerHTML = '<div class="shopping-header">' + target + ' refeições</div>' +
            items.map(function (item) {
                return '<div class="shopping-item"><span class="shopping-name">' + item.name + '</span><span class="shopping-amount">' + item.display + '</span></div>';
            }).join('');
    }

    // === Vet Records ===
    function handleVetAdd() {
        var type = vetTypeEl.value;
        var desc = vetDescEl.value.trim();
        var date = vetDateEl.value;
        var nextDate = vetNextDateEl.value;

        if (!desc) { showToast('Adiciona uma descrição'); return; }
        if (!date) { showToast('Selecciona a data'); return; }

        var entry = { type: type, description: desc, date: date, nextDate: nextDate || null, createdAt: new Date().toISOString() };
        if (db && currentDogId) dogRef('vet').push(entry);

        vetDescEl.value = '';
        vetNextDateEl.value = '';
        showToast('Registo veterinário adicionado');
    }

    function renderVet() {
        var typeLabels = { consulta: '🩺 Consulta', vacina: '💉 Vacina', desparasitacao: '🪱 Desparasitação', outro: '📋 Outro' };
        var today = new Date().toISOString().slice(0, 10);
        var upcoming = vetData.filter(function (e) { return e.nextDate && e.nextDate >= today; })
            .sort(function (a, b) { return a.nextDate.localeCompare(b.nextDate); });

        if (upcoming.length > 0) {
            vetUpcomingEl.innerHTML = '<h3>Próximos</h3>' + upcoming.map(function (e) {
                var d = e.nextDate.split('-');
                return '<div class="vet-item upcoming"><span class="vet-type">' + (typeLabels[e.type] || e.type) +
                    '</span><span>' + escapeHtml(e.description) + '</span><span class="date">' + d[2] + '/' + d[1] + '/' + d[0] + '</span></div>';
            }).join('');
        } else {
            vetUpcomingEl.innerHTML = '';
        }

        if (vetData.length === 0) {
            vetHistoryEl.innerHTML = '<p class="empty-history">Sem registos veterinários</p>';
            return;
        }
        vetHistoryEl.innerHTML = '<h3>Histórico</h3>' + vetData.slice(0, 20).map(function (e) {
            var d = e.date.split('-');
            return '<div class="vet-item"><span class="vet-type">' + (typeLabels[e.type] || e.type) +
                '</span><span>' + escapeHtml(e.description) + '</span><span class="date">' + d[2] + '/' + d[1] + '/' + d[0] + '</span></div>';
        }).join('');
    }

    function checkVetReminders() {
        var today = new Date().toISOString().slice(0, 10);
        var reminderKey = 'melucafeeder_vet_reminder_' + today;
        if (localStorage.getItem(reminderKey)) return;

        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        var tomorrowStr = tomorrow.toISOString().slice(0, 10);

        var upcoming = vetData.filter(function (e) {
            return e.nextDate && (e.nextDate === today || e.nextDate === tomorrowStr);
        });

        if (upcoming.length > 0) {
            localStorage.setItem(reminderKey, '1');
            var msgs = upcoming.map(function (e) {
                var when = e.nextDate === today ? 'HOJE' : 'AMANHÃ';
                return when + ': ' + e.description;
            });
            sendNotification('🏥 MelucaFeeder: Lembretes veterinários\n' + msgs.join('\n'));
        }
    }

    // === Health Notes ===
    function handleHealthNote() {
        var text = healthNoteTextEl.value.trim();
        if (!text) { showToast('Escreve uma nota'); return; }

        if (db && currentDogId) dogRef('healthNotes').push({ text: text, date: new Date().toISOString() });
        healthNoteTextEl.value = '';
        showToast('Nota adicionada');
    }

    function renderHealthNotes() {
        if (healthNotes.length === 0) {
            healthNotesListEl.innerHTML = '<p class="empty-history">Sem notas de saúde</p>';
            return;
        }
        healthNotesListEl.innerHTML = healthNotes.slice(0, 30).map(function (e) {
            var d = new Date(e.date);
            return '<div class="health-note-item"><span class="health-note-text">' + escapeHtml(e.text) + '</span><span class="date">' + formatDateTime(d) + '</span></div>';
        }).join('');
    }

    // === Meal Calendar ===
    function renderCalendar() {
        var monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        calMonthEl.textContent = monthNames[calendarMonth] + ' ' + calendarYear;

        var lastDay = new Date(calendarYear, calendarMonth + 1, 0);
        var startDow = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;

        var mealCounts = {};
        history.forEach(function (e) {
            if (e.quantity < 0) {
                var d = new Date(e.date);
                if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
                    var key = d.getDate();
                    mealCounts[key] = (mealCounts[key] || 0) + Math.abs(e.quantity);
                }
            }
        });

        var html = '<div class="cal-header">S</div><div class="cal-header">T</div><div class="cal-header">Q</div><div class="cal-header">Q</div><div class="cal-header">S</div><div class="cal-header">S</div><div class="cal-header">D</div>';
        for (var i = 0; i < startDow; i++) html += '<div class="cal-empty"></div>';

        var today = new Date();
        for (var day = 1; day <= lastDay.getDate(); day++) {
            var count = mealCounts[day] || 0;
            var isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
            var isPast = new Date(calendarYear, calendarMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            var cls = 'cal-day';
            if (isToday) cls += ' cal-today';
            if (isPast) {
                if (count >= 2) cls += ' cal-ok';
                else if (count === 1) cls += ' cal-partial';
                else cls += ' cal-missed';
            }
            html += '<div class="' + cls + '"><span class="cal-num">' + day + '</span>' + (count > 0 ? '<span class="cal-count">' + count + '</span>' : '') + '</div>';
        }
        calendarGridEl.innerHTML = html;
    }

    // === Weight Tracking ===
    function handleWeightAdd() {
        var weight = parseFloat(weightInputEl.value);
        if (isNaN(weight) || weight <= 0) {
            showToast('Introduz um peso válido');
            return;
        }

        if (db && currentDogId) {
            dogRef('weight').push({ weight: weight, date: new Date().toISOString() });
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

        var last = weightData[weightData.length - 1];
        var lastDate = new Date(last.date);
        var daysAgo = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
        var daysText = daysAgo === 0 ? 'hoje' : daysAgo === 1 ? 'ontem' : 'há ' + daysAgo + ' dias';
        weightLastEl.innerHTML = '<span class="weight-current">' + last.weight + ' kg</span> <span class="weight-date">(' + daysText + ')</span>';

        var recent = weightData.slice(-10).reverse();
        weightHistoryEl.innerHTML = recent.map(function (e) {
            var d = new Date(e.date);
            return '<div class="weight-entry"><span>' + e.weight + ' kg</span><span class="date">' + formatDateTime(d) + '</span></div>';
        }).join('');

        drawChart();
    }

    function clearChart() {
        var ctx = weightChartEl.getContext('2d');
        ctx.clearRect(0, 0, weightChartEl.width, weightChartEl.height);
    }

    function drawChart() {
        var canvas = weightChartEl;
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;

        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);

        var w = canvas.offsetWidth;
        var h = canvas.offsetHeight;
        var padding = { top: 20, right: 20, bottom: 30, left: 45 };
        var chartW = w - padding.left - padding.right;
        var chartH = h - padding.top - padding.bottom;

        ctx.clearRect(0, 0, w, h);

        if (weightData.length < 2) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
            ctx.font = '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Regista pelo menos 2 pesos para ver o gráfico', w / 2, h / 2);
            return;
        }

        var data = weightData.slice(-20);
        var weights = data.map(function (e) { return e.weight; });
        var targetWeight = settings.targetWeight ? parseFloat(settings.targetWeight) : null;

        var allValues = weights.slice();
        if (targetWeight) allValues.push(targetWeight);
        var minW = Math.min.apply(null, allValues) - 0.5;
        var maxW = Math.max.apply(null, allValues) + 0.5;
        var range = maxW - minW || 1;

        var textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
        var lineColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim() || '#818cf8';
        var dotColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#6366f1';
        var gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(255,255,255,0.08)';

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (var i = 0; i <= 4; i++) {
            var y = padding.top + chartH - (chartH * i / 4);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();
            ctx.fillStyle = textColor;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((minW + range * i / 4).toFixed(1), padding.left - 6, y + 3);
        }

        if (targetWeight) {
            var targetY = padding.top + chartH - (chartH * (targetWeight - minW) / range);
            ctx.beginPath();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 1.5;
            ctx.moveTo(padding.left, targetY);
            ctx.lineTo(padding.left + chartW, targetY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#f472b6';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Obj: ' + targetWeight + ' kg', padding.left + 4, targetY - 5);
        }

        ctx.fillStyle = textColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatShortDate(new Date(data[0].date)), padding.left, h - 8);
        ctx.fillText(formatShortDate(new Date(data[data.length - 1].date)), padding.left + chartW, h - 8);

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
            if (j === 0) ctx.moveTo(x, yVal); else ctx.lineTo(x, yVal);
        }
        ctx.stroke();

        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        var gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

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
            sendNotification('⚖️ MelucaFeeder: Já passaram ' + daysSince + ' dias desde a última pesagem. Hora de pesar!');
        }
    }

    // === Schedule ===
    function scheduleNextCheck() {
        setInterval(function () {
            var previousStock = state.stock;
            processAutoDeductions();
            if (state.stock !== previousStock) render();
        }, 60000);
    }

    // === Utilities ===
    function formatRelativeTime(date) {
        var now = new Date();
        var diff = date - now;
        var hours = Math.floor(diff / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        if (hours > 0) return 'em ' + hours + 'h ' + minutes + 'min';
        return 'em ' + minutes + 'min';
    }

    function formatDateTime(date) {
        var day = String(date.getDate()).padStart(2, '0');
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var hours = String(date.getHours()).padStart(2, '0');
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return day + '/' + month + ' ' + hours + ':' + minutes;
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

    // === Theme Toggle ===
    function initTheme() {
        var saved = localStorage.getItem('melucafeeder_theme');
        var themeToggle = document.getElementById('themeToggle');
        if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '☀️';
        }

        themeToggle.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme');
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
    bindEvents();
    scheduleNextCheck();
    initFirebase();
})();
