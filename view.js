(function () {
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

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    var db = firebase.database();

    var HEAT_BLEED_DAYS = 9;
    var HEAT_FERTILE_END = 15;
    var HEAT_CYCLE_INTERVAL = 180;

    var heatCycles = [];
    var weightDataCache = [];

    var loadingEl = document.getElementById('loadingScreen');
    var errorEl = document.getElementById('errorScreen');
    var errorMsgEl = document.getElementById('errorMessage');
    var viewMainEl = document.getElementById('viewMain');
    var dogNameEl = document.getElementById('viewDogName');

    // Get token from URL
    var params = new URLSearchParams(window.location.search);
    var token = params.get('t');

    if (!token) {
        showError('Link inválido.');
        return;
    }

    // Validate share token
    db.ref('shares/' + token).once('value', function (snap) {
        var share = snap.val();
        if (!share) {
            showError('Link inválido ou já não existe.');
            return;
        }
        if (share.expiresAt && share.expiresAt < Date.now()) {
            showError('Este link expirou.');
            return;
        }

        loadDogData(share.dogId);
    });

    function showError(msg) {
        loadingEl.style.display = 'none';
        errorMsgEl.textContent = msg;
        errorEl.style.display = '';
    }

    function loadDogData(dogId) {
        // Load dog name
        db.ref('dogs/' + dogId + '/name').once('value', function (snap) {
            dogNameEl.textContent = '🐶 ' + (snap.val() || 'Cão');
        });

        // Load state
        db.ref('dogs/' + dogId + '/state').on('value', function (snap) {
            var s = snap.val() || { stock: 0 };
            renderStock(s);
        });

        // Load history
        db.ref('dogs/' + dogId + '/history').orderByChild('date').limitToLast(30).on('value', function (snap) {
            var data = snap.val();
            var list = data ? Object.values(data).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }) : [];
            renderHistory(list);
        });

        // Load weight
        db.ref('dogs/' + dogId + '/weight').orderByChild('date').on('value', function (snap) {
            var data = snap.val();
            var list = data ? Object.values(data).sort(function (a, b) { return new Date(a.date) - new Date(b.date); }) : [];
            renderWeight(list);
        });

        // Load settings (for target weight)
        db.ref('dogs/' + dogId + '/settings').once('value', function (snap) {
            var s = snap.val() || {};
            window._viewSettings = s;
        });

        // Load vet
        db.ref('dogs/' + dogId + '/vet').on('value', function (snap) {
            var data = snap.val();
            var list = data ? Object.entries(data).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
            list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
            renderVet(list);
        });

        // Load health notes
        db.ref('dogs/' + dogId + '/healthNotes').on('value', function (snap) {
            var data = snap.val();
            var list = data ? Object.entries(data).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
            list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
            renderHealthNotes(list);
        });

        // Load heat cycles
        db.ref('dogs/' + dogId + '/heatCycles').on('value', function (snap) {
            var data = snap.val();
            heatCycles = data ? Object.entries(data).map(function (e) { return Object.assign({ id: e[0] }, e[1]); }) : [];
            heatCycles.sort(function (a, b) { return new Date(b.startDate) - new Date(a.startDate); });
            renderViewHeatCycle();
        });

        // Show app
        loadingEl.style.display = 'none';
        viewMainEl.style.display = '';

        // Tab navigation
        document.querySelectorAll('.tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
                tab.classList.add('active');
                document.getElementById('tab-' + tab.getAttribute('data-tab')).classList.add('active');

                // Redraw chart when weight tab becomes visible
                if (tab.getAttribute('data-tab') === 'v-weight' && weightDataCache.length >= 2) {
                    setTimeout(function () { drawViewChart(weightDataCache); }, 50);
                }
            });
        });
    }

    // === Render Functions ===
    function renderStock(state) {
        var el = document.getElementById('vStockCount');
        var statusEl = document.getElementById('vStockStatus');
        var ruptureEl = document.getElementById('vRuptureInfo');

        el.textContent = state.stock || 0;
        el.className = 'stock-number';
        if (state.stock <= 2) { el.classList.add('danger'); statusEl.textContent = 'Stock crítico'; statusEl.style.color = '#ef4444'; }
        else if (state.stock <= 5) { el.classList.add('warning'); statusEl.textContent = 'Stock baixo'; statusEl.style.color = '#f59e0b'; }
        else { statusEl.textContent = 'Stock OK'; statusEl.style.color = '#10b981'; }

        if (state.stock <= 0) {
            ruptureEl.innerHTML = '<span class="rupture-danger">Sem stock disponível</span>';
        } else {
            var daysLeft = state.stock / 2;
            var ruptureDate = new Date();
            ruptureDate.setDate(ruptureDate.getDate() + Math.floor(daysLeft));
            ruptureEl.innerHTML = '<span class="rupture-ok">Stock dura até ~' + formatDate(ruptureDate) + ' (' + Math.floor(daysLeft) + ' dias)</span>';
        }
    }

    function renderHistory(list) {
        var el = document.getElementById('vHistoryList');
        if (list.length === 0) {
            el.innerHTML = '<p class="empty-history">Sem registos</p>';
            return;
        }
        el.innerHTML = list.slice(0, 20).map(function (e) {
            var d = new Date(e.date);
            var icon = e.type === 'add' ? '📦' : (e.type === 'auto' ? '🤖' : '✋');
            return '<div class="history-item"><span class="hist-icon">' + icon + '</span>' +
                '<span class="hist-desc">' + escapeHtml(e.description) + '</span>' +
                '<span class="hist-date">' + formatDateTime(d) + '</span></div>';
        }).join('');
    }

    function renderWeight(list) {
        var lastEl = document.getElementById('vWeightLast');
        var histEl = document.getElementById('vWeightHistory');
        weightDataCache = list;

        if (list.length === 0) {
            lastEl.innerHTML = '<p class="empty-history">Sem registos de peso</p>';
            histEl.innerHTML = '';
            return;
        }

        var last = list[list.length - 1];
        lastEl.innerHTML = 'Último peso: <strong>' + last.weight + ' kg</strong> (' + formatDate(new Date(last.date)) + ')';

        // Chart
        if (list.length >= 2) {
            setTimeout(function () { drawViewChart(list); }, 100);
        }

        // History
        var reversed = list.slice().reverse();
        histEl.innerHTML = reversed.slice(0, 15).map(function (e) {
            return '<div class="weight-entry"><span>' + formatDate(new Date(e.date)) + '</span><span>' + e.weight + ' kg</span></div>';
        }).join('');
    }

    function drawViewChart(data) {
        var canvas = document.getElementById('vWeightChart');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var w = canvas.width = canvas.parentElement.offsetWidth;
        var h = canvas.height = 180;
        ctx.clearRect(0, 0, w, h);

        var weights = data.map(function (e) { return e.weight; });
        var min = Math.min.apply(null, weights) - 0.5;
        var max = Math.max.apply(null, weights) + 0.5;
        var range = max - min || 1;
        var pad = { t: 20, b: 30, l: 40, r: 16 };
        var cw = w - pad.l - pad.r;
        var ch = h - pad.t - pad.b;

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
            var gy = pad.t + (ch / 4) * g;
            ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((max - (range / 4) * g).toFixed(1), pad.l - 6, gy + 4);
        }

        // Line
        ctx.beginPath();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        data.forEach(function (e, i) {
            var x = pad.l + (i / (data.length - 1)) * cw;
            var y = pad.t + ch - ((e.weight - min) / range) * ch;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Points
        data.forEach(function (e, i) {
            var x = pad.l + (i / (data.length - 1)) * cw;
            var y = pad.t + ch - ((e.weight - min) / range) * ch;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#6366f1';
            ctx.fill();
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    function renderVet(list) {
        var upcomingEl = document.getElementById('vVetUpcoming');
        var histEl = document.getElementById('vVetHistory');

        var now = new Date();
        var upcoming = list.filter(function (e) { return e.nextDate && new Date(e.nextDate) >= now; });
        var past = list.filter(function (e) { return !e.nextDate || new Date(e.nextDate) < now; });

        if (upcoming.length > 0) {
            upcomingEl.innerHTML = '<h3 style="font-size: 0.75rem; color: var(--warning); margin-bottom: 8px;">PRÓXIMAS DATAS</h3>' +
                upcoming.map(function (e) {
                    return '<div class="vet-item"><span>📅 ' + escapeHtml(e.description || e.type) + '</span><span>' + formatDate(new Date(e.nextDate)) + '</span></div>';
                }).join('');
        } else {
            upcomingEl.innerHTML = '';
        }

        if (past.length === 0) {
            histEl.innerHTML = '<p class="empty-history">Sem registos veterinários</p>';
        } else {
            histEl.innerHTML = past.slice(0, 15).map(function (e) {
                var typeIcons = { consulta: '🩺', vacina: '💉', desparasitacao: '💊', outro: '📋' };
                var icon = typeIcons[e.type] || '📋';
                return '<div class="vet-item"><span>' + icon + ' ' + escapeHtml(e.description || '') + '</span><span>' + formatDate(new Date(e.date)) + '</span></div>';
            }).join('');
        }
    }

    function renderHealthNotes(list) {
        var el = document.getElementById('vHealthNotesList');
        if (list.length === 0) {
            el.innerHTML = '<p class="empty-history">Sem notas de saúde</p>';
            return;
        }
        el.innerHTML = list.slice(0, 20).map(function (e) {
            return '<div class="health-note-item"><span class="health-note-text">' + escapeHtml(e.text) + '</span><span class="date">' + formatDateTime(new Date(e.date)) + '</span></div>';
        }).join('');
    }

    // === Heat Cycle Rendering ===
    function renderViewHeatCycle() {
        var activeCycle = heatCycles.find(function (c) { return !c.endDate; });
        var lastCompleted = heatCycles.find(function (c) { return !!c.endDate; });

        renderViewHeatStatus(activeCycle, lastCompleted);
        renderViewHeatTimeline(activeCycle, lastCompleted);
        renderViewHeatCalendar(activeCycle);
        renderViewHeatHistory();
        renderViewHeatPrediction(lastCompleted);
    }

    function renderViewHeatStatus(activeCycle, lastCompleted) {
        var el = document.getElementById('vHeatStatus');
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

            var colors = { bleeding: '#ef4444', fertile: '#f59e0b', diestrus: '#6366f1' };
            el.innerHTML = '<div class="heat-status-card" style="border-color:' + (colors[phaseClass] || '#64748b') + '">' +
                '<div class="heat-status-phase">' + phase + '</div>' +
                '<div class="heat-status-detail">Dia ' + (daysSinceStart + 1) + ' desde início (' + formatDate(start) + ')</div>' +
                '</div>';
        } else if (lastCompleted) {
            var lastStart = new Date(lastCompleted.startDate);
            var daysSince = Math.floor((new Date() - lastStart) / 86400000);
            el.innerHTML = '<div class="heat-status-card">' +
                '<div class="heat-status-phase">😴 Anestro (Repouso)</div>' +
                '<div class="heat-status-detail">' + daysSince + ' dias desde o último cio</div>' +
                '</div>';
        } else {
            el.innerHTML = '<div class="heat-status-card">' +
                '<div class="heat-status-phase">Sem registos</div>' +
                '<div class="heat-status-detail">Ainda não há registos de cio</div>' +
                '</div>';
        }
    }

    function renderViewHeatTimeline(activeCycle, lastCompleted) {
        var el = document.getElementById('vHeatTimeline');
        var cycle = activeCycle || lastCompleted;
        if (!cycle) { el.innerHTML = ''; return; }

        var bleedDays = HEAT_BLEED_DAYS;
        if (cycle.endDate) {
            bleedDays = Math.max(1, Math.floor((new Date(cycle.endDate) - new Date(cycle.startDate)) / 86400000));
        }
        var fertileDays = HEAT_FERTILE_END - bleedDays;
        if (fertileDays < 1) fertileDays = 6;
        var diestrusDays = 60;

        el.innerHTML = '<div class="heat-phase-bar">' +
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

    function renderViewHeatCalendar(activeCycle) {
        var el = document.getElementById('vHeatCalendar');
        var cycle = activeCycle || (heatCycles.length > 0 ? heatCycles[0] : null);
        if (!cycle) { el.innerHTML = ''; return; }

        var start = new Date(cycle.startDate);
        var bleedEnd = cycle.endDate ? new Date(cycle.endDate) : addDays(start, HEAT_BLEED_DAYS);
        var fertileEnd = addDays(bleedEnd, HEAT_FERTILE_END - HEAT_BLEED_DAYS);

        var calStart = new Date(start.getFullYear(), start.getMonth(), 1);
        var calEnd = new Date(start.getFullYear(), start.getMonth() + 2, 0);
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var months = [];
        var d = new Date(calStart);
        while (d <= calEnd) {
            var m = d.getMonth();
            if (!months.length || months[months.length - 1].month !== m) {
                months.push({ month: m, year: d.getFullYear(), days: [] });
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

        el.innerHTML = html;
    }

    function renderViewHeatHistory() {
        var el = document.getElementById('vHeatHistory');
        if (heatCycles.length === 0) {
            el.innerHTML = '<p class="empty-history">Sem registos</p>';
            return;
        }
        el.innerHTML = heatCycles.map(function (c) {
            var start = formatDate(new Date(c.startDate));
            var end = c.endDate ? formatDate(new Date(c.endDate)) : 'em curso';
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

    function renderViewHeatPrediction(lastCompleted) {
        var el = document.getElementById('vHeatPrediction');
        if (!lastCompleted) { el.innerHTML = ''; return; }

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
        if (!heatCycles[0].endDate) { el.innerHTML = ''; return; }

        var nextDate = addDays(lastStart, avgInterval);
        var daysUntil = Math.floor((nextDate - new Date()) / 86400000);

        var html = '<div class="heat-next-prediction">';
        if (daysUntil > 0) {
            html += '📅 Próximo cio previsto: <strong>' + formatDate(nextDate) + '</strong> (daqui a ~' + daysUntil + ' dias)';
        } else {
            html += '⚠️ Próximo cio previsto para <strong>' + formatDate(nextDate) + '</strong> (pode estar atrasado)';
        }
        if (intervals.length > 0) {
            html += '<br><span style="font-size:0.75rem;color:var(--text-muted)">Intervalo médio: ' + avgInterval + ' dias</span>';
        }
        html += '</div>';
        el.innerHTML = html;
    }

    // === Helpers ===
    function formatDate(d) {
        return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    }

    function formatDateTime(d) {
        return d.getDate() + '/' + (d.getMonth() + 1) + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function addDays(date, days) {
        var d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }
})();
