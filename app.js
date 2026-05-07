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

    var INGREDIENT_POOL = [
        { id: 'chicken', name: 'Frango', icon: '🍗', unit: 'g' },
        { id: 'turkey', name: 'Peru', icon: '🦃', unit: 'g' },
        { id: 'beef', name: 'Vaca', icon: '🥩', unit: 'g' },
        { id: 'pork', name: 'Porco', icon: '🥓', unit: 'g' },
        { id: 'fish', name: 'Peixe', icon: '🐟', unit: 'g' },
        { id: 'liver', name: 'Fígado', icon: '🫀', unit: 'g' },
        { id: 'tripe', name: 'Dobrada', icon: '🫘', unit: 'g' },
        { id: 'rice', name: 'Arroz', icon: '🍚', unit: 'g' },
        { id: 'pasta', name: 'Massa', icon: '🍝', unit: 'g' },
        { id: 'oats', name: 'Aveia', icon: '🌾', unit: 'g' },
        { id: 'sweet_potato', name: 'Batata-doce', icon: '🍠', unit: 'g' },
        { id: 'potato', name: 'Batata', icon: '🥔', unit: 'g' },
        { id: 'peas', name: 'Ervilhas', icon: '🫛', unit: 'g' },
        { id: 'carrot', name: 'Cenoura', icon: '🥕', unit: 'g' },
        { id: 'broccoli', name: 'Brócolos', icon: '🥦', unit: 'g' },
        { id: 'spinach', name: 'Espinafres', icon: '🥬', unit: 'g' },
        { id: 'pumpkin', name: 'Abóbora', icon: '🎃', unit: 'g' },
        { id: 'zucchini', name: 'Courgette', icon: '🥒', unit: 'g' },
        { id: 'green_beans', name: 'Feijão verde', icon: '🫘', unit: 'g' },
        { id: 'apple', name: 'Maçã', icon: '🍎', unit: 'g' },
        { id: 'banana', name: 'Banana', icon: '🍌', unit: 'g' },
        { id: 'blueberry', name: 'Mirtilo', icon: '🫐', unit: 'g' },
        { id: 'egg', name: 'Ovo', icon: '🥚', unit: 'un' },
        { id: 'oil', name: 'Azeite', icon: '🫒', unit: 'ml' },
        { id: 'coconut_oil', name: 'Óleo de coco', icon: '🥥', unit: 'ml' },
        { id: 'supplement', name: 'Suplemento', icon: '💊', unit: 'g' },
        { id: 'yogurt', name: 'Iogurte natural', icon: '🥛', unit: 'g' },
        { id: 'cheese', name: 'Queijo fresco', icon: '🧀', unit: 'g' }
    ];

    // === State ===
    let state = { stock: 0, lastProcessed: 0 };
    let settings = loadLocalSettings();
    let history = [];
    let weightData = [];
    let vetData = [];
    let healthNotes = [];
    let heatCycles = [];
    let calendarMonth = new Date().getMonth();
    let calendarYear = new Date().getFullYear();

    let db = null;
    let auth = null;
    let currentUser = null;
    let currentDogId = null;
    let userDogs = {};
    let firstLoad = true;
    let listeners = []; // Firebase listener refs for cleanup
    let migrating = false; // Guard against double migration
    let testMode = false; // Easter egg test mode

    // === DOM: Auth ===
    const loadingScreenEl = document.getElementById('loadingScreen');
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
    const dashHomemadeActionsEl = document.getElementById('dashHomemadeActions');
    const dashKibbleActionsEl = document.getElementById('dashKibbleActions');
    const addBagBtnEl = document.getElementById('addBagBtn');
    const kibbleBagDescEl = document.getElementById('kibbleBagDesc');
    const kibbleManualDeductEl = document.getElementById('kibbleManualDeduct');
    const kibbleManualAddEl = document.getElementById('kibbleManualAdd');
    const feedingSummaryIconEl = document.getElementById('feedingSummaryIcon');
    const feedingSummaryModeEl = document.getElementById('feedingSummaryMode');
    const feedingSummaryDetailEl = document.getElementById('feedingSummaryDetail');
    const historyListEl = document.getElementById('historyList');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const toastEl = document.getElementById('toast');
    const syncStatusEl = document.getElementById('syncStatus');
    const calcIngredientsEl = document.getElementById('calcIngredients');
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
    const prepHomemadeEl = document.getElementById('prepHomemade');
    const prepKibbleEl = document.getElementById('prepKibble');
    const kibbleInfoEl = document.getElementById('kibbleInfo');
    const kibbleStockEl = document.getElementById('kibbleStock');
    const kibbleCalcBtnEl = document.getElementById('kibbleCalcBtn');
    const kibbleCalcResultEl = document.getElementById('kibbleCalcResult');
    const kibbleCalcDaysEl = document.getElementById('kibbleCalcDays');
    const kibbleCalcDetailEl = document.getElementById('kibbleCalcDetail');
    const kibbleDaysTargetEl = document.getElementById('kibbleDaysTarget');
    const kibbleShopBtnEl = document.getElementById('kibbleShopBtn');
    const kibbleShopResultEl = document.getElementById('kibbleShopResult');
    const vetTypeEl = document.getElementById('vetType');
    const vetTypeBtnEl = document.getElementById('vetTypeBtn');
    const vetDescEl = document.getElementById('vetDesc');
    const vetDateEl = document.getElementById('vetDate');
    const vetDateBtnEl = document.getElementById('vetDateBtn');
    const vetNextDateEl = document.getElementById('vetNextDate');
    const vetNextDateBtnEl = document.getElementById('vetNextDateBtn');
    const vetAddBtnEl = document.getElementById('vetAddBtn');
    const vetUpcomingEl = document.getElementById('vetUpcoming');
    const vetHistoryEl = document.getElementById('vetHistory');
    const healthNoteTextEl = document.getElementById('healthNoteText');
    const healthNoteBtnEl = document.getElementById('healthNoteBtn');
    const healthNotesListEl = document.getElementById('healthNotesList');
    const heatStatusEl = document.getElementById('heatStatus');
    const heatFormEl = document.getElementById('heatForm');
    const heatActiveEl = document.getElementById('heatActive');
    const heatStartDateEl = document.getElementById('heatStartDate');
    const heatEndDateEl = document.getElementById('heatEndDate');
    const heatStartBtnEl = document.getElementById('heatStartBtn');
    const heatEndBtnEl = document.getElementById('heatEndBtn');
    const heatStartDateBtnEl = document.getElementById('heatStartDateBtn');
    const heatEndDateBtnEl = document.getElementById('heatEndDateBtn');
    const heatTimelineEl = document.getElementById('heatTimeline');
    const heatCalendarEl = document.getElementById('heatCalendar');
    const heatHistoryEl = document.getElementById('heatHistory');
    const calPrevEl = document.getElementById('calPrev');
    const calNextEl = document.getElementById('calNext');
    const calMonthEl = document.getElementById('calMonth');
    const calendarGridEl = document.getElementById('calendarGrid');

    // === Firebase Init ===
    function initFirebase() {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        auth = firebase.auth();

        // Persist session across browser restarts (user stays logged in until explicit logout)
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

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
    var easterEggTaps = 0;
    var easterEggTimer = null;

    function handleEasterEgg() {
        easterEggTaps++;
        clearTimeout(easterEggTimer);
        easterEggTimer = setTimeout(function () { easterEggTaps = 0; }, 3000);
        if (easterEggTaps >= 7) {
            easterEggTaps = 0;
            clearTimeout(easterEggTimer);
            testMode = true;
            currentUser = {
                uid: 'ECcs5Zyq9BNIXZlWrXtfruSyE3G2',
                displayName: 'Luis Piteira',
                email: 'test@melucafeeder.dev'
            };
            showToast('🔧 Modo teste activado');
            onUserLoggedIn(currentUser);
        }
    }

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
        if (testMode) {
            testMode = false;
            currentUser = null;
            showLogin();
            return;
        }
        auth.signOut();
    }

    function showLogin() {
        loadingScreenEl.style.display = 'none';
        loginScreenEl.style.display = '';
        dogsScreenEl.style.display = 'none';
        appMainEl.style.display = 'none';
    }

    function showDogsScreen() {
        loadingScreenEl.style.display = 'none';
        loginScreenEl.style.display = 'none';
        dogsScreenEl.style.display = '';
        appMainEl.style.display = 'none';
        renderDogsList();
    }

    function showApp() {
        loadingScreenEl.style.display = 'none';
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
        if (migrating) return;
        migrating = true;

        db.ref('state').once('value', function (snap) {
            if (snap.exists()) {
                // Legacy data found — migrate to a new dog
                migrateToNewDog(user, snap.val());
            } else {
                migrating = false;
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
        updates['dogs/' + dogId + '/onboardingComplete'] = true;
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
            migrating = false;
            showToast('Dados migrados com sucesso!');
        }).catch(function (err) {
            migrating = false;
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
        updates['dogs/' + dogId + '/onboardingComplete'] = false;
        updates['dogs/' + dogId + '/members/' + currentUser.uid] = { role: 'owner', name: currentUser.displayName || currentUser.email };
        updates['dogs/' + dogId + '/state'] = { stock: 0, lastProcessed: 0 };
        updates['dogs/' + dogId + '/settings'] = { alertThreshold: 5, telegramToken: '', telegramChatId: '', feedingMode: 'homemade', recipe: [], kibble: { brand: '', lifeStage: '', protein: '', special: '', amount: 150, mealsPerDay: 2 } };
        updates['users/' + currentUser.uid + '/dogs/' + dogId] = true;

        db.ref().update(updates).then(function () {
            newDogNameEl.value = '';
            showToast(name + ' criado!');
            selectDog(dogId);
        });
    }

    // === Setup Wizard ===
    function showSetupWizard(dogId, resumeData) {
        var overlay = document.getElementById('setupWizardOverlay');
        if (!overlay) return;
        overlay.style.display = '';

        // Reset all wizard form fields to blank state
        var breedBtn = document.getElementById('setupBreedBtn');
        var breedInput = document.getElementById('setupBreed');
        var birthdayBtn = document.getElementById('setupBirthdayBtn');
        var birthdayInput = document.getElementById('setupBirthday');
        if (breedBtn) { breedBtn.textContent = 'Raça'; breedBtn.classList.remove('has-value'); }
        if (breedInput) breedInput.value = '';
        if (birthdayBtn) { birthdayBtn.textContent = 'Seleccionar data'; birthdayBtn.classList.remove('has-value'); }
        if (birthdayInput) birthdayInput.value = '';
        var colorEl = document.getElementById('setupColor');
        var chipEl = document.getElementById('setupChip');
        var neuteredEl = document.getElementById('setupNeutered');
        if (colorEl) colorEl.value = '';
        if (chipEl) chipEl.value = '';
        if (neuteredEl) { neuteredEl.checked = false; var lbl = neuteredEl.closest('.dog-checkbox-label'); if (lbl) lbl.classList.remove('checked'); }
        document.querySelectorAll('input[name="setupSex"]').forEach(function (r) { r.checked = false; r.closest('.dog-radio-label').classList.remove('selected'); });
        var kibbleBrandBtn = document.getElementById('setupKibbleBrandBtn');
        if (kibbleBrandBtn) { kibbleBrandBtn.textContent = 'Seleccionar marca'; kibbleBrandBtn.classList.remove('has-value'); }
        var kibbleBrand = document.getElementById('setupKibbleBrand');
        if (kibbleBrand) kibbleBrand.value = '';
        var kibbleAmount = document.getElementById('setupKibbleAmount');
        if (kibbleAmount) kibbleAmount.value = '150';
        var kibbleMeals = document.getElementById('setupKibbleMeals');
        if (kibbleMeals) kibbleMeals.value = '2';
        var kibbleBagSize = document.getElementById('setupKibbleBagSize');
        if (kibbleBagSize) kibbleBagSize.value = '12';
        var kibbleCurrentKg = document.getElementById('setupKibbleCurrentKg');
        if (kibbleCurrentKg) kibbleCurrentKg.value = '0';
        var homemadeStock = document.getElementById('setupHomemadeStock');
        if (homemadeStock) homemadeStock.value = '0';

        // Get dog name for subtitle
        db.ref('dogs/' + dogId + '/name').once('value', function (snap) {
            var sub = document.getElementById('setupSubtitle');
            if (sub) sub.textContent = 'Configura o perfil de ' + (snap.val() || 'o teu cão');
        });

        var rd = resumeData || {};
        var wizardMode = rd.mode || 'homemade';
        var selectedIngredients = rd.ingredients ? rd.ingredients.slice() : [];
        var wizardRecipe = rd.recipe ? rd.recipe.slice() : [];
        var currentStepId = rd.step || 'setupStepProfile';
        var wizardProfile = rd.profile || {};
        var allStepEls = overlay.querySelectorAll('.setup-step');
        var WIZARD_KIBBLE_BRANDS = [
            { value: 'royal_canin', label: 'Royal Canin' }, { value: 'purina_proplan', label: 'Purina Pro Plan' }, { value: 'hills', label: "Hill's Science Plan" }, { value: 'eukanuba', label: 'Eukanuba' }, { value: 'advance', label: 'Advance (Affinity)' }, { value: 'acana', label: 'Acana' }, { value: 'orijen', label: 'Orijen' }, { value: 'brit_care', label: 'Brit Care' }, { value: 'brit_premium', label: 'Brit Premium' }, { value: 'ownat', label: 'Ownat' }, { value: 'libra', label: 'Libra' }, { value: 'criadores', label: 'Criadores' }, { value: 'gosbi', label: 'Gosbi' }, { value: 'true_instinct', label: 'True Instinct' }, { value: 'taste_wild', label: 'Taste of the Wild' }, { value: 'farmina', label: 'Farmina N&D' }, { value: 'other', label: 'Outra' }
        ];

        function hideAllSteps() {
            allStepEls.forEach(function (el) { el.classList.remove('active'); });
        }

        function showStep(id) {
            hideAllSteps();
            document.getElementById(id).classList.add('active');
            currentStepId = id;
        }

        function renderProgress(current, total) {
            var progressEl = document.getElementById('setupProgress');
            var html = '';
            for (var i = 1; i <= total; i++) {
                var cls = i < current ? 'done' : (i === current ? 'active' : '');
                html += '<span class="setup-progress-dot ' + cls + '"></span>';
            }
            progressEl.innerHTML = html;
        }

        function getProfileFromForm() {
            var sexRadio = document.querySelector('input[name="setupSex"]:checked');
            return {
                breed: document.getElementById('setupBreed').value || '',
                sex: sexRadio ? sexRadio.value : '',
                birthday: document.getElementById('setupBirthday').value || '',
                color: document.getElementById('setupColor').value.trim(),
                neutered: document.getElementById('setupNeutered').checked,
                chip: document.getElementById('setupChip').value.trim()
            };
        }

        function restoreProfileForm(p) {
            if (p.breed) {
                document.getElementById('setupBreed').value = p.breed;
                document.getElementById('setupBreedBtn').textContent = p.breed;
                document.getElementById('setupBreedBtn').classList.add('has-value');
            }
            if (p.sex) {
                var radio = document.querySelector('input[name="setupSex"][value="' + p.sex + '"]');
                if (radio) {
                    radio.checked = true;
                    radio.closest('.dog-radio-label').classList.add('selected');
                }
            }
            if (p.birthday) {
                document.getElementById('setupBirthday').value = p.birthday;
                document.getElementById('setupBirthdayBtn').textContent = formatPickedDate(p.birthday);
                document.getElementById('setupBirthdayBtn').classList.add('has-value');
            }
            if (p.color) document.getElementById('setupColor').value = p.color;
            if (p.neutered) {
                document.getElementById('setupNeutered').checked = true;
                var lbl = document.getElementById('setupNeutered').closest('.dog-checkbox-label');
                if (lbl) lbl.classList.add('checked');
            }
            if (p.chip) document.getElementById('setupChip').value = p.chip;
        }

        function saveOnboardingState() {
            var data = {
                mode: wizardMode,
                step: currentStepId,
                ingredients: selectedIngredients,
                profile: getProfileFromForm()
            };
            if (wizardRecipe.length > 0) data.recipe = wizardRecipe;
            if (wizardMode === 'kibble') {
                data.kibble = {
                    brand: document.getElementById('setupKibbleBrand').value || '',
                    amount: document.getElementById('setupKibbleAmount').value || '150',
                    meals: document.getElementById('setupKibbleMeals').value || '2',
                    bagSize: document.getElementById('setupKibbleBagSize').value || '12',
                    currentKg: document.getElementById('setupKibbleCurrentKg').value || '0'
                };
            }
            db.ref('dogs/' + dogId + '/onboarding').set(data);
        }

        function saveProfileToDB() {
            var profile = getProfileFromForm();
            db.ref('dogs/' + dogId + '/profile').set(profile);
            return profile;
        }

        function renderIngredientGrid() {
            var gridEl = document.getElementById('setupIngredientGrid');
            gridEl.innerHTML = INGREDIENT_POOL.map(function (ing) {
                var sel = selectedIngredients.indexOf(ing.id) !== -1 ? ' selected' : '';
                return '<div class="setup-ing-card' + sel + '" data-ing="' + ing.id + '">' +
                    '<span class="setup-ing-card-icon">' + ing.icon + '</span>' +
                    '<span>' + escapeHtml(ing.name) + '</span>' +
                    '</div>';
            }).join('');

            gridEl.querySelectorAll('.setup-ing-card').forEach(function (card) {
                card.addEventListener('click', function () {
                    var id = card.getAttribute('data-ing');
                    var idx = selectedIngredients.indexOf(id);
                    if (idx !== -1) {
                        selectedIngredients.splice(idx, 1);
                        card.classList.remove('selected');
                    } else {
                        selectedIngredients.push(id);
                        card.classList.add('selected');
                    }
                });
            });
        }

        function renderWizardRecipe() {
            // Build recipe from selected ingredients, preserving amounts from previous state
            var oldAmounts = {};
            wizardRecipe.forEach(function (r) { oldAmounts[r.id] = r.amount; });
            wizardRecipe = selectedIngredients.map(function (id) {
                var ing = getIngredient(id);
                var defaultAmt = oldAmounts[id] !== undefined ? oldAmounts[id] : (ing.unit === 'un' ? 1 : (ing.unit === 'ml' ? 5 : 50));
                return { id: id, amount: defaultAmt };
            });

            var listEl = document.getElementById('setupRecipeList');
            listEl.innerHTML = wizardRecipe.map(function (item, idx) {
                var ing = getIngredient(item.id);
                return '<div class="recipe-ingredient-row">' +
                    '<span class="recipe-ing-icon">' + ing.icon + '</span>' +
                    '<span class="recipe-ing-name">' + escapeHtml(ing.name) + '</span>' +
                    '<input type="number" class="recipe-ing-amount" data-idx="' + idx + '" min="0" step="' + (ing.unit === 'un' ? '0.5' : '5') + '" value="' + item.amount + '">' +
                    '<span class="recipe-ing-unit">' + ing.unit + '</span>' +
                    '</div>';
            }).join('');

            listEl.querySelectorAll('.recipe-ing-amount').forEach(function (input) {
                input.addEventListener('change', function () {
                    var i = parseInt(input.getAttribute('data-idx'), 10);
                    wizardRecipe[i].amount = parseFloat(input.value) || 0;
                });
            });
        }

        function setWizardMode(mode) {
            wizardMode = mode;
            document.getElementById('setupModeHomemade').classList.toggle('active', mode === 'homemade');
            document.getElementById('setupModeKibble').classList.toggle('active', mode === 'kibble');
        }

        function completeOnboarding(settingsUpdate, stockMeals, stockDesc) {
            var updates = {};
            updates['dogs/' + dogId + '/settings'] = settingsUpdate;
            updates['dogs/' + dogId + '/onboarding'] = null;
            updates['dogs/' + dogId + '/onboardingComplete'] = true;
            if (stockMeals > 0) {
                updates['dogs/' + dogId + '/state'] = { stock: stockMeals, lastProcessed: Date.now() };
            }
            db.ref().update(updates).then(function () {
                if (stockMeals > 0) {
                    state.stock = stockMeals;
                    state.lastProcessed = Date.now();
                    addHistoryEntry('production', stockMeals, stockDesc);
                    render();
                }
            });
            overlay.style.display = 'none';
            showToast('Alimentação configurada!');
        }

        function saveHomemade() {
            var finalRecipe = wizardRecipe.filter(function (r) { return r.amount > 0; });
            var initialStock = parseInt(document.getElementById('setupHomemadeStock').value, 10) || 0;

            completeOnboarding({
                alertThreshold: 5,
                telegramToken: '',
                telegramChatId: '',
                feedingMode: 'homemade',
                recipe: finalRecipe,
                kibble: { brand: '', lifeStage: '', protein: '', special: '', amount: 150, mealsPerDay: 2, bagSize: 12 }
            }, initialStock, 'Stock inicial: ' + initialStock + ' refeições');
        }

        function saveKibble() {
            var amount = parseInt(document.getElementById('setupKibbleAmount').value, 10) || 150;
            var mealsPerDay = parseInt(document.getElementById('setupKibbleMeals').value, 10) || 2;
            var bagSize = parseFloat(document.getElementById('setupKibbleBagSize').value) || 12;
            var currentKg = parseFloat(document.getElementById('setupKibbleCurrentKg').value) || 0;
            var mealsFromStock = currentKg > 0 ? Math.floor((currentKg * 1000) / amount) : 0;

            completeOnboarding({
                alertThreshold: 5,
                telegramToken: '',
                telegramChatId: '',
                feedingMode: 'kibble',
                recipe: [{ id: 'chicken', amount: 50 }, { id: 'rice', amount: 50 }, { id: 'peas', amount: 25 }, { id: 'egg', amount: 0.5 }],
                kibble: {
                    brand: document.getElementById('setupKibbleBrand').value || '',
                    lifeStage: '',
                    protein: '',
                    special: '',
                    amount: amount,
                    mealsPerDay: mealsPerDay,
                    bagSize: bagSize
                }
            }, mealsFromStock, 'Stock inicial: ' + currentKg + 'kg (' + mealsFromStock + ' refeições)');
        }

        function skipWizard() {
            var updates = {};
            updates['dogs/' + dogId + '/onboarding'] = null;
            updates['dogs/' + dogId + '/onboardingComplete'] = true;
            db.ref().update(updates);
            overlay.style.display = 'none';
            showToast('Podes configurar mais tarde nas definições');
        }

        // Bind events
        document.getElementById('setupModeHomemade').onclick = function () { setWizardMode('homemade'); };
        document.getElementById('setupModeKibble').onclick = function () { setWizardMode('kibble'); };
        document.getElementById('setupSkip').onclick = skipWizard;

        // Profile step: breed dropdown + date picker + radio/checkbox interactivity
        document.getElementById('setupBreedBtn').onclick = function () {
            showDropdown('Raça', BREED_OPTIONS, document.getElementById('setupBreed').value, function (value) {
                document.getElementById('setupBreed').value = value;
                document.getElementById('setupBreedBtn').textContent = value;
                document.getElementById('setupBreedBtn').classList.add('has-value');
            });
        };
        document.getElementById('setupBirthdayBtn').onclick = function () {
            showDatePicker(function (dateStr) {
                document.getElementById('setupBirthday').value = dateStr;
                document.getElementById('setupBirthdayBtn').textContent = formatPickedDate(dateStr);
                document.getElementById('setupBirthdayBtn').classList.add('has-value');
            });
        };
        document.querySelectorAll('input[name="setupSex"]').forEach(function (r) {
            r.addEventListener('change', function () {
                document.querySelectorAll('input[name="setupSex"]').forEach(function (rb) {
                    rb.closest('.dog-radio-label').classList.toggle('selected', rb.checked);
                });
            });
        });
        var setupNeuteredEl = document.getElementById('setupNeutered');
        if (setupNeuteredEl) {
            setupNeuteredEl.addEventListener('change', function () {
                var lbl = setupNeuteredEl.closest('.dog-checkbox-label');
                if (lbl) lbl.classList.toggle('checked', setupNeuteredEl.checked);
            });
        }

        // Profile → Mode
        document.getElementById('setupNextProfile').onclick = function () {
            saveProfileToDB();
            renderProgress(2, wizardMode === 'homemade' ? 4 : 3);
            showStep('setupStep1');
            saveOnboardingState();
        };

        // Mode → back to profile
        document.getElementById('setupBackMode').onclick = function () {
            renderProgress(1, wizardMode === 'homemade' ? 4 : 3);
            showStep('setupStepProfile');
            saveOnboardingState();
        };

        document.getElementById('setupNext1').onclick = function () {
            if (wizardMode === 'homemade') {
                renderProgress(3, 4);
                renderIngredientGrid();
                showStep('setupStep2Ingredients');
            } else {
                renderProgress(3, 3);
                showStep('setupStep2Kibble');
                if (rd.kibble) {
                    document.getElementById('setupKibbleBrand').value = rd.kibble.brand || '';
                    if (rd.kibble.brand) {
                        var match = WIZARD_KIBBLE_BRANDS.find(function (b) { return b.value === rd.kibble.brand; });
                        if (match) {
                            document.getElementById('setupKibbleBrandBtn').textContent = match.label;
                            document.getElementById('setupKibbleBrandBtn').classList.add('has-value');
                        }
                    }
                    document.getElementById('setupKibbleAmount').value = rd.kibble.amount || '150';
                    document.getElementById('setupKibbleMeals').value = rd.kibble.meals || '2';
                    document.getElementById('setupKibbleBagSize').value = rd.kibble.bagSize || '12';
                    document.getElementById('setupKibbleCurrentKg').value = rd.kibble.currentKg || '0';
                }
            }
            saveOnboardingState();
        };

        // Homemade flow
        document.getElementById('setupBackIng').onclick = function () {
            renderProgress(2, 4);
            showStep('setupStep1');
            saveOnboardingState();
        };
        document.getElementById('setupNextIng').onclick = function () {
            if (selectedIngredients.length === 0) {
                showToast('Selecciona pelo menos um ingrediente');
                return;
            }
            renderProgress(4, 4);
            renderWizardRecipe();
            showStep('setupStep3Amounts');
            saveOnboardingState();
        };
        document.getElementById('setupBackAmounts').onclick = function () {
            renderProgress(3, 4);
            showStep('setupStep2Ingredients');
            wizardRecipe.forEach(function (item, idx) {
                var input = document.querySelector('#setupRecipeList .recipe-ing-amount[data-idx="' + idx + '"]');
                if (input) item.amount = parseFloat(input.value) || 0;
            });
            renderIngredientGrid();
            saveOnboardingState();
        };
        document.getElementById('setupFinishHomemade').onclick = saveHomemade;

        // Kibble flow
        document.getElementById('setupBackKibble').onclick = function () {
            renderProgress(2, 3);
            showStep('setupStep1');
            saveOnboardingState();
        };
        document.getElementById('setupFinishKibble').onclick = saveKibble;

        // Kibble brand dropdown
        document.getElementById('setupKibbleBrandBtn').onclick = function () {
            showDropdown('Marca de Ração', WIZARD_KIBBLE_BRANDS, document.getElementById('setupKibbleBrand').value, function (value, label) {
                document.getElementById('setupKibbleBrand').value = value;
                document.getElementById('setupKibbleBrandBtn').textContent = label;
                document.getElementById('setupKibbleBrandBtn').classList.add('has-value');
            });
        };

        // Init / Resume
        setWizardMode(wizardMode);

        // Restore profile form if resuming
        if (rd.profile) restoreProfileForm(rd.profile);

        // Determine where to resume
        if (currentStepId === 'setupStep1') {
            renderProgress(2, wizardMode === 'homemade' ? 4 : 3);
            showStep('setupStep1');
        } else if (currentStepId === 'setupStep2Ingredients') {
            restoreProfileForm(wizardProfile);
            renderProgress(3, 4);
            renderIngredientGrid();
            showStep('setupStep2Ingredients');
        } else if (currentStepId === 'setupStep3Amounts') {
            restoreProfileForm(wizardProfile);
            renderProgress(4, 4);
            renderWizardRecipe();
            showStep('setupStep3Amounts');
        } else if (currentStepId === 'setupStep2Kibble') {
            restoreProfileForm(wizardProfile);
            renderProgress(3, 3);
            showStep('setupStep2Kibble');
            if (rd.kibble) {
                document.getElementById('setupKibbleBrand').value = rd.kibble.brand || '';
                if (rd.kibble.brand) {
                    var match = WIZARD_KIBBLE_BRANDS.find(function (b) { return b.value === rd.kibble.brand; });
                    if (match) {
                        document.getElementById('setupKibbleBrandBtn').textContent = match.label;
                        document.getElementById('setupKibbleBrandBtn').classList.add('has-value');
                    }
                }
                document.getElementById('setupKibbleAmount').value = rd.kibble.amount || '150';
                document.getElementById('setupKibbleMeals').value = rd.kibble.meals || '2';
                document.getElementById('setupKibbleBagSize').value = rd.kibble.bagSize || '12';
                document.getElementById('setupKibbleCurrentKg').value = rd.kibble.currentKg || '0';
            }
        } else {
            // Default: profile step
            renderProgress(1, 4);
            showStep('setupStepProfile');
        }
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

        // Set dog name in header + check onboarding
        db.ref('dogs/' + dogId).once('value', function (snap) {
            var dog = snap.val() || {};
            appDogNameEl.textContent = dog.name || 'MelucaFeeder';
            var p = dog.profile || {};
            var parts = [];
            if (p.breed) parts.push(p.breed);
            if (p.sex) parts.push(p.sex === 'M' ? '♂ Macho' : '♀ Fêmea');
            if (p.birthday) parts.push(calcAge(p.birthday));
            var subtitleEl = document.getElementById('appDogSubtitle');
            if (subtitleEl) subtitleEl.textContent = parts.join(' · ');

            // Hide heat tab for male dogs
            var heatTabBtn = document.querySelector('.tab[data-tab="heat"]');
            var heatTabContent = document.getElementById('tab-heat');
            var isMale = p.sex === 'M';
            if (heatTabBtn) heatTabBtn.style.display = isMale ? 'none' : '';
            if (heatTabContent && isMale) {
                heatTabContent.classList.remove('active');
                if (heatTabBtn && heatTabBtn.classList.contains('active')) {
                    heatTabBtn.classList.remove('active');
                    var dashTab = document.querySelector('.tab[data-tab="dashboard"]');
                    if (dashTab) dashTab.classList.add('active');
                    document.getElementById('tab-dashboard').classList.add('active');
                }
            }

            // Check if onboarding is incomplete (only for dogs explicitly marked as not complete)
            if (dog.onboardingComplete === false) {
                showSetupWizard(dogId, dog.onboarding || null);
            }
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

                var p = dog.profile || {};
                var subtitle = [];
                if (p.breed) subtitle.push(p.breed);
                if (p.sex) subtitle.push(p.sex === 'M' ? '♂' : '♀');
                if (p.birthday) {
                    var age = calcAge(p.birthday);
                    subtitle.push(age);
                }
                var subtitleStr = subtitle.length > 0 ? '<div class="dog-card-details">' + escapeHtml(subtitle.join(' · ')) + '</div>' : '';

                var card = document.createElement('div');
                card.className = 'dog-card';
                card.innerHTML = '<div class="dog-card-info">' +
                    '<span class="dog-card-avatar">🐕</span>' +
                    '<div><div class="dog-card-name">' + escapeHtml(dog.name || 'Cão') + '</div>' +
                    subtitleStr +
                    '<div class="dog-card-role">' + roleLabel + '</div></div>' +
                    '</div><div class="dog-card-actions">' +
                    '<button class="btn-delete-dog" title="Remover cão">🗑️</button>' +
                    '<span class="dog-card-arrow">›</span></div>';

                card.addEventListener('click', function () {
                    selectDog(id);
                });
                card.querySelector('.btn-delete-dog').addEventListener('click', function (e) {
                    e.stopPropagation();
                    handleDeleteDog(id, dog.name, role);
                });
                dogsListEl.appendChild(card);
            });
        });
    }

    function handleDeleteDog(dogId, dogName, role) {
        var message = role === 'owner'
            ? 'Tens a certeza que queres eliminar "' + dogName + '"? Todos os dados (histórico, peso, saúde) serão apagados permanentemente.'
            : 'Queres sair de "' + dogName + '"? Deixarás de ter acesso a este cão.';

        showModal(message, function () {
            if (role === 'owner') {
                db.ref('dogs/' + dogId + '/members').once('value', function (snap) {
                    var members = snap.val() || {};
                    var updates = {};
                    updates['dogs/' + dogId] = null;
                    Object.keys(members).forEach(function (uid) {
                        updates['users/' + uid + '/dogs/' + dogId] = null;
                    });
                    db.ref().update(updates).then(function () {
                        if (currentDogId === dogId) currentDogId = null;
                        showToast(dogName + ' eliminado');
                    });
                });
            } else {
                var updates = {};
                updates['dogs/' + dogId + '/members/' + currentUser.uid] = null;
                updates['users/' + currentUser.uid + '/dogs/' + dogId] = null;
                db.ref().update(updates).then(function () {
                    if (currentDogId === dogId) currentDogId = null;
                    showToast('Saíste de ' + dogName);
                });
            }
        });
    }

    // === Custom Modal ===
    function showModal(message, onConfirm) {
        var overlay = document.getElementById('modalOverlay');
        var msgEl = document.getElementById('modalMessage');
        var confirmBtn = document.getElementById('modalConfirm');
        var cancelBtn = document.getElementById('modalCancel');

        msgEl.textContent = message;
        overlay.style.display = '';

        function cleanup() {
            overlay.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlay);
        }

        function handleConfirm() {
            cleanup();
            onConfirm();
        }

        function handleCancel() {
            cleanup();
        }

        function handleOverlay(e) {
            if (e.target === overlay) cleanup();
        }

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlay);
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
            var startDow = (firstDay.getDay() + 6) % 7; // Monday = 0

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

    var VET_TYPE_OPTIONS = [
        { value: 'consulta', label: '🩺 Consulta' },
        { value: 'vacina', label: '💉 Vacina' },
        { value: 'desparasitacao', label: '💊 Desparasitação' },
        { value: 'outro', label: '📋 Outro' }
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

        function handleSearch() {
            renderOptions(searchEl.value);
        }

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

        if (showSearch) {
            setTimeout(function () { searchEl.focus(); }, 50);
        }
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
                renderCalcIngredients();
                updatePrepMode();
                updateDashboardMode();
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

        var heatRef = dogRef('heatCycles');
        heatRef.on('value', function (snapshot) {
            var data = snapshot.val();
            heatCycles = data ? Object.entries(data).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
            heatCycles.sort(function (a, b) { return new Date(b.startDate) - new Date(a.startDate); });
            renderHeatCycle();
        });
        listeners.push({ ref: heatRef, event: 'value' });
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
        return { alertThreshold: 5, telegramToken: '', telegramChatId: '', feedingMode: 'homemade', recipe: [{ id: 'chicken', amount: 50 }, { id: 'rice', amount: 50 }, { id: 'peas', amount: 25 }, { id: 'egg', amount: 0.5 }], kibble: { brand: '', lifeStage: '', protein: '', special: '', amount: 150, mealsPerDay: 2 } };
    }

    function migrateRecipe(recipe) {
        if (Array.isArray(recipe)) return recipe;
        if (!recipe || typeof recipe !== 'object') return [{ id: 'chicken', amount: 50 }, { id: 'rice', amount: 50 }, { id: 'peas', amount: 25 }, { id: 'egg', amount: 0.5 }];
        var arr = [];
        Object.keys(recipe).forEach(function (key) {
            if (recipe[key] > 0) arr.push({ id: key, amount: recipe[key] });
        });
        return arr.length > 0 ? arr : [{ id: 'chicken', amount: 50 }, { id: 'rice', amount: 50 }, { id: 'peas', amount: 25 }, { id: 'egg', amount: 0.5 }];
    }

    function getIngredient(id) {
        for (var i = 0; i < INGREDIENT_POOL.length; i++) {
            if (INGREDIENT_POOL[i].id === id) return INGREDIENT_POOL[i];
        }
        return { id: id, name: id, icon: '📦', unit: 'g' };
    }

    function renderCalcIngredients() {
        var recipe = migrateRecipe(settings.recipe);
        if (recipe.length === 0) {
            calcIngredientsEl.innerHTML = '<p class="empty-history">Sem ingredientes na receita. Configura a receita nas definições do cão.</p>';
            return;
        }
        calcIngredientsEl.innerHTML = recipe.map(function (item) {
            var ing = getIngredient(item.id);
            var step = ing.unit === 'un' ? '1' : (ing.unit === 'ml' ? '1' : '10');
            return '<div class="calc-row">' +
                '<span class="calc-icon">' + ing.icon + '</span>' +
                '<label>' + escapeHtml(ing.name) + ' (' + ing.unit + ')</label>' +
                '<input type="number" data-ingredient="' + item.id + '" min="0" value="0" step="' + step + '" class="calc-input">' +
                '</div>';
        }).join('');
    }

    function updatePrepMode() {
        var mode = settings.feedingMode || 'homemade';
        var prepCtaEl = document.getElementById('prepCta');
        if (mode === 'homemade') {
            var recipe = migrateRecipe(settings.recipe);
            var hasRecipe = recipe.some(function (r) { return r.amount > 0; });
            prepHomemadeEl.style.display = hasRecipe ? '' : 'none';
            prepKibbleEl.style.display = 'none';
            if (prepCtaEl) prepCtaEl.style.display = hasRecipe ? 'none' : '';
        } else {
            prepHomemadeEl.style.display = 'none';
            prepKibbleEl.style.display = '';
            if (prepCtaEl) prepCtaEl.style.display = 'none';
            renderKibbleInfo();
        }
    }

    function renderKibbleInfo() {
        var k = settings.kibble || {};
        var parts = [];
        if (k.brand) {
            var brandLabel = k.brand;
            var KIBBLE_BRANDS_MAP = { royal_canin: 'Royal Canin', purina_proplan: 'Purina Pro Plan', hills: "Hill's", eukanuba: 'Eukanuba', advance: 'Advance', acana: 'Acana', orijen: 'Orijen', brit_care: 'Brit Care', brit_premium: 'Brit Premium', ownat: 'Ownat', libra: 'Libra', criadores: 'Criadores', gosbi: 'Gosbi', true_instinct: 'True Instinct', taste_wild: 'Taste of the Wild', farmina: 'Farmina N&D', virbac: 'Virbac', specific: 'Specific', nutro: 'Nutro', wolfood: 'Wolfood', prozoo: 'Pro Zoo', ultima: 'Ultima', pedigree: 'Pedigree', friskies: 'Friskies', other: 'Outra' };
            parts.push('<strong>' + escapeHtml(KIBBLE_BRANDS_MAP[k.brand] || k.brand) + '</strong>');
        }
        if (k.amount && k.mealsPerDay) {
            parts.push(k.amount + 'g × ' + k.mealsPerDay + ' refeições/dia = ' + (k.amount * k.mealsPerDay) + 'g/dia');
        }
        kibbleInfoEl.innerHTML = parts.length > 0 ? '<div class="kibble-info-card">' + parts.join('<br>') + '</div>' : '<p class="empty-history">Configura a ração nas definições do cão.</p>';
    }

    function handleKibbleCalc() {
        var k = settings.kibble || {};
        var amount = k.amount || 150;
        var mealsPerDay = k.mealsPerDay || 2;
        var dailyGrams = amount * mealsPerDay;
        var stockKg = parseFloat(kibbleStockEl.value) || 0;
        if (stockKg <= 0) { showToast('Introduz a quantidade de ração disponível'); return; }
        var stockGrams = stockKg * 1000;
        var days = Math.floor(stockGrams / dailyGrams);
        kibbleCalcDaysEl.textContent = days;
        kibbleCalcDetailEl.innerHTML = stockKg + ' kg ÷ ' + dailyGrams + ' g/dia = ' + days + ' dias<br>(' + (amount * mealsPerDay) + 'g por dia, ' + mealsPerDay + ' refeições de ' + amount + 'g)';
        kibbleCalcResultEl.style.display = '';
    }

    function handleKibbleShop() {
        var k = settings.kibble || {};
        var amount = k.amount || 150;
        var mealsPerDay = k.mealsPerDay || 2;
        var dailyGrams = amount * mealsPerDay;
        var days = parseInt(kibbleDaysTargetEl.value, 10) || 30;
        if (days < 1) { showToast('Introduz um número válido de dias'); return; }
        var totalGrams = dailyGrams * days;
        var totalKg = (totalGrams / 1000).toFixed(1);
        kibbleShopResultEl.style.display = '';
        kibbleShopResultEl.innerHTML = '<div class="shopping-header">' + days + ' dias</div>' +
            '<div class="shopping-item"><span class="shopping-name">🥣 Ração</span><span class="shopping-amount">' + totalKg + ' kg</span></div>' +
            '<div class="shopping-item"><span class="shopping-name">📦 Sacos de 2kg</span><span class="shopping-amount">' + Math.ceil(totalGrams / 2000) + '</span></div>' +
            '<div class="shopping-item"><span class="shopping-name">📦 Sacos de 7kg</span><span class="shopping-amount">' + Math.ceil(totalGrams / 7000) + '</span></div>' +
            '<div class="shopping-item"><span class="shopping-name">📦 Sacos de 12kg</span><span class="shopping-amount">' + Math.ceil(totalGrams / 12000) + '</span></div>';
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
        // Show welcome card for brand new dogs (no history yet)
        var welcomeCardEl = document.getElementById('welcomeCard');
        if (welcomeCardEl) {
            var isNewDog = state.stock === 0 && history.length === 0;
            welcomeCardEl.style.display = isNewDog ? '' : 'none';
        }

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
            var mealsPerDay = (settings.feedingMode === 'kibble' && settings.kibble) ? (settings.kibble.mealsPerDay || 2) : 2;
            var days = Math.floor(state.stock / mealsPerDay);
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
        var mealsPerDay = (settings.feedingMode === 'kibble' && settings.kibble) ? (settings.kibble.mealsPerDay || 2) : 2;
        var daysLeft = state.stock / mealsPerDay;
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
        var loginTitle = document.querySelector('#loginScreen h1');
        if (loginTitle) loginTitle.addEventListener('click', handleEasterEgg);
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
        addBagBtnEl.addEventListener('click', handleAddBag);
        kibbleManualDeductEl.addEventListener('click', handleManualDeduct);
        kibbleManualAddEl.addEventListener('click', handleManualAdd);
        calcBtnEl.addEventListener('click', handleCalculate);
        weightBtnEl.addEventListener('click', handleWeightAdd);
        weightInputEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleWeightAdd();
        });
        shoppingBtnEl.addEventListener('click', handleShoppingList);
        kibbleCalcBtnEl.addEventListener('click', handleKibbleCalc);
        kibbleShopBtnEl.addEventListener('click', handleKibbleShop);
        vetAddBtnEl.addEventListener('click', handleVetAdd);
        healthNoteBtnEl.addEventListener('click', handleHealthNote);
        healthNoteTextEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleHealthNote();
        });

        // Dropdown buttons
        vetTypeBtnEl.addEventListener('click', function () {
            showDropdown('Tipo de Registo', VET_TYPE_OPTIONS, vetTypeEl.value, function (value, label) {
                vetTypeEl.value = value;
                vetTypeBtnEl.textContent = label;
                vetTypeBtnEl.classList.add('has-value');
            }, { searchable: false });
        });

        // Date picker buttons
        vetDateBtnEl.addEventListener('click', function () {
            showDatePicker(function (dateStr) {
                vetDateEl.value = dateStr;
                vetDateBtnEl.textContent = formatPickedDate(dateStr);
                vetDateBtnEl.classList.add('has-value');
            });
        });
        vetNextDateBtnEl.addEventListener('click', function () {
            showDatePicker(function (dateStr) {
                vetNextDateEl.value = dateStr;
                vetNextDateBtnEl.textContent = formatPickedDate(dateStr);
                vetNextDateBtnEl.classList.add('has-value');
            }, { allowFuture: true });
        });
        heatStartBtnEl.addEventListener('click', handleHeatStart);
        heatEndBtnEl.addEventListener('click', handleHeatEnd);
        heatStartDateBtnEl.addEventListener('click', function () {
            showDatePicker(function (dateStr) {
                heatStartDateEl.value = dateStr;
                heatStartDateBtnEl.textContent = formatPickedDate(dateStr);
                heatStartDateBtnEl.classList.add('has-value');
            });
        });
        heatEndDateBtnEl.addEventListener('click', function () {
            showDatePicker(function (dateStr) {
                heatEndDateEl.value = dateStr;
                heatEndDateBtnEl.textContent = formatPickedDate(dateStr);
                heatEndDateBtnEl.classList.add('has-value');
            });
        });
        calPrevEl.addEventListener('click', function () { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(); });
        calNextEl.addEventListener('click', function () { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(); });

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

        // Init calendar + vet date + calc ingredients
        renderCalendar();
        renderCalcIngredients();
        updatePrepMode();
        updateDashboardMode();
        var todayStr = new Date().toISOString().slice(0, 10);
        vetDateEl.value = todayStr;
        vetDateBtnEl.textContent = formatPickedDate(todayStr);
        vetDateBtnEl.classList.add('has-value');
    }

    // === Handlers ===
    function handleCalculate() {
        var recipe = migrateRecipe(settings.recipe);
        var meals = [];
        var details = [];

        recipe.forEach(function (item) {
            var ing = getIngredient(item.id);
            var inputEl = calcIngredientsEl.querySelector('[data-ingredient="' + item.id + '"]');
            var available = inputEl ? parseFloat(inputEl.value) || 0 : 0;
            if (item.amount > 0 && available > 0) {
                var m = Math.floor(available / item.amount);
                meals.push(m);
                details.push(ing.icon + ' ' + ing.name + ': ' + m + ' refeições (' + item.amount + ' ' + ing.unit + '/ref)');
            }
        });

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

    function handleAddBag() {
        var k = settings.kibble || {};
        var bagSize = k.bagSize || 12;
        var amount = k.amount || 150;
        var mealsPerDay = k.mealsPerDay || 2;
        var bagGrams = bagSize * 1000;
        var mealsFromBag = Math.floor(bagGrams / amount);
        state.stock += mealsFromBag;
        state.lastProcessed = Date.now();
        saveState();
        addHistoryEntry('production', mealsFromBag, 'Saca ' + bagSize + 'kg: +' + mealsFromBag + ' refeições');
        render();
        showToast('+' + mealsFromBag + ' refeições (' + bagSize + 'kg)');
    }

    function updateDashboardMode() {
        var mode = settings.feedingMode || 'homemade';
        dashHomemadeActionsEl.style.display = mode === 'homemade' ? '' : 'none';
        dashKibbleActionsEl.style.display = mode === 'kibble' ? '' : 'none';

        // Feeding summary card
        if (mode === 'kibble') {
            var k = settings.kibble || {};
            var bagSize = k.bagSize || 12;
            kibbleBagDescEl.textContent = 'Saca de ' + bagSize + ' kg (' + Math.floor((bagSize * 1000) / (k.amount || 150)) + ' refeições)';
            feedingSummaryIconEl.textContent = '🥣';
            feedingSummaryModeEl.textContent = 'Ração';
            var parts = [];
            var KIBBLE_BRANDS_MAP = { royal_canin: 'Royal Canin', purina_proplan: 'Purina Pro Plan', hills: "Hill's", eukanuba: 'Eukanuba', advance: 'Advance', acana: 'Acana', orijen: 'Orijen', brit_care: 'Brit Care', brit_premium: 'Brit Premium', ownat: 'Ownat', libra: 'Libra', criadores: 'Criadores', gosbi: 'Gosbi', true_instinct: 'True Instinct', taste_wild: 'Taste of the Wild', farmina: 'Farmina N&D', virbac: 'Virbac', specific: 'Specific', nutro: 'Nutro', wolfood: 'Wolfood', prozoo: 'Pro Zoo', ultima: 'Ultima', pedigree: 'Pedigree', friskies: 'Friskies', other: 'Outra' };
            if (k.brand) parts.push(KIBBLE_BRANDS_MAP[k.brand] || k.brand);
            if (k.amount && k.mealsPerDay) parts.push(k.amount + 'g × ' + k.mealsPerDay + '/dia');
            feedingSummaryDetailEl.textContent = parts.length > 0 ? parts.join(' · ') : 'Configurar nas definições';
        } else {
            feedingSummaryIconEl.textContent = '🍳';
            feedingSummaryModeEl.textContent = 'Caseira';
            var recipe = migrateRecipe(settings.recipe);
            var count = recipe.filter(function (r) { return r.amount > 0; }).length;
            feedingSummaryDetailEl.textContent = count > 0 ? count + ' ingredientes por refeição' : 'Configurar receita';
        }
    }

    // === Shopping List ===
    function handleShoppingList() {
        var target = parseInt(shoppingTargetEl.value, 10);
        if (isNaN(target) || target < 1) {
            showToast('Introduz um número válido de refeições');
            return;
        }

        var recipe = migrateRecipe(settings.recipe);
        var items = [];
        recipe.forEach(function (item) {
            if (item.amount > 0) {
                var ing = getIngredient(item.id);
                var total = item.amount * target;
                var display;
                if (ing.unit === 'un') {
                    display = Math.ceil(total) + ' un';
                } else if (ing.unit === 'ml') {
                    display = total >= 1000 ? (total / 1000).toFixed(1) + ' L' : total + ' ml';
                } else {
                    display = total >= 1000 ? (total / 1000).toFixed(1) + ' kg' : total + ' g';
                }
                items.push({ name: ing.icon + ' ' + ing.name, display: display });
            }
        });

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
        vetNextDateBtnEl.textContent = 'Seleccionar data';
        vetNextDateBtnEl.classList.remove('has-value');
        vetTypeEl.value = 'consulta';
        vetTypeBtnEl.textContent = '🩺 Consulta';
        // Reset date to today
        var todayStr = new Date().toISOString().slice(0, 10);
        vetDateEl.value = todayStr;
        vetDateBtnEl.textContent = formatPickedDate(todayStr);
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

    // === Heat Cycle ===
    // Typical cycle phases (days from start):
    // Proestro (sangramento): ~9 days
    // Estro (fértil): day 9-15 (~6 days)
    // Diestro (pós-cio): day 15-75 (~60 days)
    // Anestro (repouso): until next cycle (~4-8 months total between cios)
    var HEAT_BLEED_DAYS = 9;
    var HEAT_FERTILE_START = 9;
    var HEAT_FERTILE_END = 15;
    var HEAT_CYCLE_INTERVAL = 180; // ~6 months between starts

    function handleHeatStart() {
        var dateStr = heatStartDateEl.value;
        if (!dateStr) { showToast('Selecciona a data de início'); return; }
        if (db && currentDogId) {
            dogRef('heatCycles').push({
                startDate: dateStr,
                endDate: null
            });
        }
        heatStartDateEl.value = '';
        showToast('Cio registado');
    }

    function handleHeatEnd() {
        var dateStr = heatEndDateEl.value;
        if (!dateStr) { showToast('Selecciona a data de fim'); return; }

        // Find the latest active cycle (no endDate)
        var active = heatCycles.find(function (c) { return !c.endDate; });
        if (!active) { showToast('Nenhum cio activo'); return; }

        if (db && currentDogId) {
            dogRef('heatCycles/' + active.id + '/endDate').set(dateStr);
        }
        heatEndDateEl.value = '';
        showToast('Fim do sangramento registado');
    }

    function renderHeatCycle() {
        var activeCycle = heatCycles.find(function (c) { return !c.endDate; });
        var lastCompleted = heatCycles.find(function (c) { return !!c.endDate; });

        // Status card
        renderHeatStatus(activeCycle, lastCompleted);

        // Show/hide forms
        if (activeCycle) {
            heatFormEl.style.display = 'none';
            heatActiveEl.style.display = '';
            heatEndDateBtnEl.textContent = 'Seleccionar data';
            heatEndDateBtnEl.classList.remove('has-value');
            heatEndDateEl.value = '';
        } else {
            heatFormEl.style.display = '';
            heatActiveEl.style.display = 'none';
            heatStartDateBtnEl.textContent = 'Seleccionar data';
            heatStartDateBtnEl.classList.remove('has-value');
            heatStartDateEl.value = '';
        }

        // Timeline
        renderHeatTimeline(activeCycle, lastCompleted);

        // Calendar
        renderHeatCalendar(activeCycle);

        // History
        renderHeatHistory();

        // Next prediction
        renderHeatPrediction(lastCompleted);
    }

    function renderHeatStatus(activeCycle, lastCompleted) {
        if (activeCycle) {
            var start = new Date(activeCycle.startDate);
            var today = new Date();
            var daysSinceStart = Math.floor((today - start) / 86400000);

            var phase, phaseClass;
            if (daysSinceStart < HEAT_BLEED_DAYS) {
                phase = '🩸 Sangramento (Proestro)';
                phaseClass = 'bleeding';
            } else if (daysSinceStart < HEAT_FERTILE_END) {
                phase = '⚠️ Período Fértil (Estro)';
                phaseClass = 'fertile';
            } else {
                phase = '💜 Pós-cio (Diestro)';
                phaseClass = 'diestrus';
            }

            heatStatusEl.innerHTML = '<div class="heat-status-card" style="border-color:' + getPhaseColor(phaseClass) + '">' +
                '<div class="heat-status-phase">' + phase + '</div>' +
                '<div class="heat-status-detail">Dia ' + (daysSinceStart + 1) + ' desde início (' + formatDateShort(start) + ')</div>' +
                '</div>';
        } else if (lastCompleted) {
            var lastStart = new Date(lastCompleted.startDate);
            var daysSince = Math.floor((new Date() - lastStart) / 86400000);
            heatStatusEl.innerHTML = '<div class="heat-status-card">' +
                '<div class="heat-status-phase">😴 Anestro (Repouso)</div>' +
                '<div class="heat-status-detail">' + daysSince + ' dias desde o último cio</div>' +
                '</div>';
        } else {
            heatStatusEl.innerHTML = '<div class="heat-status-card">' +
                '<div class="heat-status-phase">Sem registos</div>' +
                '<div class="heat-status-detail">Regista o primeiro cio para acompanhar o ciclo</div>' +
                '</div>';
        }
    }

    function renderHeatTimeline(activeCycle, lastCompleted) {
        var cycle = activeCycle || lastCompleted;
        if (!cycle) { heatTimelineEl.innerHTML = ''; return; }

        var bleedDays = HEAT_BLEED_DAYS;
        if (cycle.endDate) {
            bleedDays = Math.max(1, Math.floor((new Date(cycle.endDate) - new Date(cycle.startDate)) / 86400000));
        }
        var fertileDays = HEAT_FERTILE_END - bleedDays;
        if (fertileDays < 1) fertileDays = 6;
        var diestrusDays = 60;
        var total = bleedDays + fertileDays + diestrusDays;

        heatTimelineEl.innerHTML = '<div class="heat-phase-bar">' +
            '<div class="heat-phase-segment bleeding" style="flex:' + bleedDays + '">Sangramento (' + bleedDays + 'd)</div>' +
            '<div class="heat-phase-segment fertile" style="flex:' + fertileDays + '">Fértil (' + fertileDays + 'd)</div>' +
            '<div class="heat-phase-segment diestrus" style="flex:' + diestrusDays + '">Diestro (' + diestrusDays + 'd)</div>' +
            '</div>' +
            '<div class="heat-phase-legend">' +
            '<span class="heat-legend-item"><span class="heat-legend-dot" style="background:#ef4444"></span> Sangramento</span>' +
            '<span class="heat-legend-item"><span class="heat-legend-dot" style="background:#f59e0b"></span> Fértil</span>' +
            '<span class="heat-legend-item"><span class="heat-legend-dot" style="background:#6366f1"></span> Diestro</span>' +
            '</div>';
    }

    function renderHeatCalendar(activeCycle) {
        var cycle = activeCycle || (heatCycles.length > 0 ? heatCycles[0] : null);
        if (!cycle) { heatCalendarEl.innerHTML = ''; return; }

        var start = new Date(cycle.startDate);
        var bleedEnd = cycle.endDate ? new Date(cycle.endDate) : addDays(start, HEAT_BLEED_DAYS);
        var fertileEnd = addDays(bleedEnd, HEAT_FERTILE_END - HEAT_BLEED_DAYS);

        // Show 2 months from start
        var calStart = new Date(start.getFullYear(), start.getMonth(), 1);
        var calEnd = new Date(start.getFullYear(), start.getMonth() + 2, 0);
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var months = [];
        var d = new Date(calStart);
        while (d <= calEnd) {
            var m = d.getMonth();
            var y = d.getFullYear();
            if (!months.length || months[months.length - 1].month !== m) {
                months.push({ month: m, year: y, days: [] });
            }
            var cls = 'heat-cal-day';
            var dd = new Date(d);
            dd.setHours(0, 0, 0, 0);
            if (dd >= start && dd < bleedEnd) cls += ' bleeding';
            else if (dd >= bleedEnd && dd < fertileEnd) cls += ' fertile';
            else if (dd >= fertileEnd && dd < addDays(start, 75)) cls += ' diestrus';
            if (dd.getTime() === today.getTime()) cls += ' today';
            months[months.length - 1].days.push({ date: new Date(d), cls: cls });
            d.setDate(d.getDate() + 1);
        }

        var monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        var weekdays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

        var html = '';
        months.forEach(function (mo) {
            html += '<div class="heat-cal-header"><span>' + monthNames[mo.month] + ' ' + mo.year + '</span></div>';
            html += '<div class="heat-cal-grid">';
            weekdays.forEach(function (w) { html += '<span class="heat-cal-weekday">' + w + '</span>'; });

            var firstDow = (mo.days[0].date.getDay() + 6) % 7;
            for (var i = 0; i < firstDow; i++) html += '<span class="heat-cal-day empty"></span>';
            mo.days.forEach(function (day) {
                html += '<span class="' + day.cls + '">' + day.date.getDate() + '</span>';
            });
            html += '</div>';
        });

        heatCalendarEl.innerHTML = html;
    }

    function renderHeatHistory() {
        if (heatCycles.length === 0) {
            heatHistoryEl.innerHTML = '<p class="empty-history">Sem registos</p>';
            return;
        }
        heatHistoryEl.innerHTML = heatCycles.map(function (c) {
            var start = formatDateShort(new Date(c.startDate));
            var end = c.endDate ? formatDateShort(new Date(c.endDate)) : 'em curso';
            var duration = '';
            if (c.endDate) {
                var days = Math.floor((new Date(c.endDate) - new Date(c.startDate)) / 86400000);
                duration = days + ' dias de sangramento';
            }
            return '<div class="heat-history-item">' +
                '<span class="heat-history-dates">' + start + ' → ' + end + '</span>' +
                '<span class="heat-history-duration">' + duration + '</span>' +
                '</div>';
        }).join('');
    }

    function renderHeatPrediction(lastCompleted) {
        if (!lastCompleted) return;

        // Calculate average interval if we have multiple cycles
        var intervals = [];
        for (var i = 0; i < heatCycles.length - 1; i++) {
            if (heatCycles[i].startDate && heatCycles[i + 1].startDate) {
                var diff = Math.abs(new Date(heatCycles[i].startDate) - new Date(heatCycles[i + 1].startDate));
                intervals.push(Math.floor(diff / 86400000));
            }
        }
        var avgInterval = intervals.length > 0
            ? Math.round(intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length)
            : HEAT_CYCLE_INTERVAL;

        var lastStart = new Date(heatCycles[0].startDate);
        if (!heatCycles[0].endDate) return; // Still active, no prediction needed

        var nextDate = addDays(lastStart, avgInterval);
        var daysUntil = Math.floor((nextDate - new Date()) / 86400000);

        var predHtml = '<div class="heat-next-prediction">';
        if (daysUntil > 0) {
            predHtml += '📅 Próximo cio previsto: <strong>' + formatDateShort(nextDate) + '</strong> (daqui a ~' + daysUntil + ' dias)';
        } else {
            predHtml += '⚠️ Próximo cio previsto para <strong>' + formatDateShort(nextDate) + '</strong> (pode estar atrasado)';
        }
        if (intervals.length > 0) {
            predHtml += '<br><span style="font-size:0.75rem;color:var(--text-muted)">Intervalo médio: ' + avgInterval + ' dias</span>';
        }
        predHtml += '</div>';

        heatTimelineEl.insertAdjacentHTML('afterend', predHtml);
    }

    function addDays(date, days) {
        var d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    function getPhaseColor(phase) {
        if (phase === 'bleeding') return '#ef4444';
        if (phase === 'fertile') return '#f59e0b';
        if (phase === 'diestrus') return '#6366f1';
        return '#64748b';
    }

    function formatDateShort(d) {
        return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
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

    function calcAge(birthday) {
        var b = new Date(birthday);
        var now = new Date();
        var years = now.getFullYear() - b.getFullYear();
        var months = now.getMonth() - b.getMonth();
        if (months < 0 || (months === 0 && now.getDate() < b.getDate())) {
            years--;
            months += 12;
        }
        if (now.getDate() < b.getDate()) months--;
        if (months < 0) months = 0;
        if (years >= 1) return years + (years === 1 ? ' ano' : ' anos');
        return months + (months === 1 ? ' mês' : ' meses');
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
