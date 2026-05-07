// === Shared Constants & Utilities ===
// Used by app.js, settings.js, view.js

var MelucaShared = (function () {
    'use strict';

    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyCiuXz2z5ShCOOkzXmIMTm0i99Dae8IRaA",
        authDomain: "melucafeeder.firebaseapp.com",
        databaseURL: "https://melucafeeder-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "melucafeeder",
        storageBucket: "melucafeeder.firebasestorage.app",
        messagingSenderId: "314126208675",
        appId: "1:314126208675:web:424edf29c499aa168db916"
    };

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

    var DOG_ICONS = ['🐕', '🐶', '🐩', '🦮', '🐕‍🦺', '🐾', '🐺', '🦊', '🐻', '🐼', '🦁', '🐯', '🐗', '🐴', '🦄', '🐰', '🐱', '🐈'];

    var KIBBLE_BRANDS_MAP = {
        royal_canin: 'Royal Canin', purina_proplan: 'Purina Pro Plan', hills: "Hill's",
        eukanuba: 'Eukanuba', advance: 'Advance', acana: 'Acana', orijen: 'Orijen',
        brit_care: 'Brit Care', brit_premium: 'Brit Premium', ownat: 'Ownat',
        libra: 'Libra', criadores: 'Criadores', gosbi: 'Gosbi',
        true_instinct: 'True Instinct', taste_wild: 'Taste of the Wild',
        farmina: 'Farmina N&D', virbac: 'Virbac', specific: 'Specific',
        nutro: 'Nutro', wolfood: 'Wolfood', prozoo: 'Pro Zoo',
        ultima: 'Ultima', pedigree: 'Pedigree', friskies: 'Friskies', other: 'Outra'
    };

    function getIngredient(id) {
        for (var i = 0; i < INGREDIENT_POOL.length; i++) {
            if (INGREDIENT_POOL[i].id === id) return INGREDIENT_POOL[i];
        }
        return { id: id, name: id, icon: '📦', unit: 'g' };
    }

    function initAvatarPicker(prefix) {
        var preview = document.getElementById(prefix + 'AvatarPreview');
        var iconEl = document.getElementById(prefix + 'AvatarIcon');
        var photoEl = document.getElementById(prefix + 'AvatarPhoto');
        var typeEl = document.getElementById(prefix + 'AvatarType');
        var valueEl = document.getElementById(prefix + 'AvatarValue');
        var fileEl = document.getElementById(prefix + 'AvatarFile');
        var optionsEl = document.getElementById(prefix + 'AvatarOptions');
        var gridEl = document.getElementById(prefix + 'AvatarGrid');
        var photoBtnEl = document.getElementById(prefix + 'AvatarPhotoBtn');
        if (!preview) return;

        gridEl.innerHTML = DOG_ICONS.map(function (icon) {
            var sel = icon === valueEl.value ? ' selected' : '';
            return '<button type="button" class="avatar-icon-option' + sel + '" data-icon="' + icon + '">' + icon + '</button>';
        }).join('');

        preview.addEventListener('click', function () {
            optionsEl.style.display = optionsEl.style.display === 'none' ? '' : 'none';
        });

        gridEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.avatar-icon-option');
            if (!btn) return;
            var icon = btn.getAttribute('data-icon');
            typeEl.value = 'icon';
            valueEl.value = icon;
            iconEl.textContent = icon;
            iconEl.style.display = '';
            photoEl.style.display = 'none';
            gridEl.querySelectorAll('.avatar-icon-option').forEach(function (b) { b.classList.remove('selected'); });
            btn.classList.add('selected');
            optionsEl.style.display = 'none';
        });

        photoBtnEl.addEventListener('click', function () { fileEl.click(); });

        fileEl.addEventListener('change', function () {
            var file = fileEl.files[0];
            if (!file) return;
            compressPhoto(file, function (dataUrl) {
                typeEl.value = 'photo';
                valueEl.value = dataUrl;
                photoEl.src = dataUrl;
                photoEl.style.display = '';
                iconEl.style.display = 'none';
                optionsEl.style.display = 'none';
                gridEl.querySelectorAll('.avatar-icon-option').forEach(function (b) { b.classList.remove('selected'); });
            });
            fileEl.value = '';
        });
    }

    function compressPhoto(file, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var size = 64;
                canvas.width = size;
                canvas.height = size;
                var ctx = canvas.getContext('2d');
                var sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (sw > sh) { sx = (sw - sh) / 2; sw = sh; }
                else { sy = (sh - sw) / 2; sh = sw; }
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
                callback(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function setAvatarPreview(prefix, avatar) {
        var iconEl = document.getElementById(prefix + 'AvatarIcon');
        var photoEl = document.getElementById(prefix + 'AvatarPhoto');
        var typeEl = document.getElementById(prefix + 'AvatarType');
        var valueEl = document.getElementById(prefix + 'AvatarValue');
        if (!iconEl) return;
        var a = avatar || { type: 'icon', value: '🐕' };
        typeEl.value = a.type;
        valueEl.value = a.value;
        if (a.type === 'photo') {
            photoEl.src = a.value;
            photoEl.style.display = '';
            iconEl.style.display = 'none';
        } else {
            iconEl.textContent = a.value || '🐕';
            iconEl.style.display = '';
            photoEl.style.display = 'none';
        }
        var gridEl = document.getElementById(prefix + 'AvatarGrid');
        if (gridEl) {
            gridEl.querySelectorAll('.avatar-icon-option').forEach(function (b) {
                if (a.type === 'icon' && b.getAttribute('data-icon') === a.value) b.classList.add('selected');
                else b.classList.remove('selected');
            });
        }
    }

    function getAvatarFromPicker(prefix) {
        var typeEl = document.getElementById(prefix + 'AvatarType');
        var valueEl = document.getElementById(prefix + 'AvatarValue');
        if (!typeEl) return { type: 'icon', value: '🐕' };
        return { type: typeEl.value, value: valueEl.value };
    }

    return {
        FIREBASE_CONFIG: FIREBASE_CONFIG,
        INGREDIENT_POOL: INGREDIENT_POOL,
        DOG_ICONS: DOG_ICONS,
        KIBBLE_BRANDS_MAP: KIBBLE_BRANDS_MAP,
        getIngredient: getIngredient,
        initAvatarPicker: initAvatarPicker,
        compressPhoto: compressPhoto,
        setAvatarPreview: setAvatarPreview,
        getAvatarFromPicker: getAvatarFromPicker
    };
})();
