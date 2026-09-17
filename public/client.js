// public/client.js
const socket = io();

socket.on('connect', function() {
    console.log('Соединение установлено. Отправляю регистрацию ИГРОКА...');
    socket.emit('register', { type: 'PLAYER' });
});

socket.on('error_msg', function(msg) {
    alert(msg);
});

socket.on('disconnect', function(reason) {
    if (reason === 'io server disconnect') {
        document.body.innerHTML = '<h1 style="color:red;padding:50px;">Сервер отклонил подключение.</h1>';
    }
});

var screens = {
    waiting: document.getElementById('ui-waiting'),
    name: document.getElementById('ui-name'),
    draft: document.getElementById('ui-draft'),
    summary: document.getElementById('ui-summary'),
    scan: document.getElementById('ui-scan'),
    results: document.getElementById('ui-results'),
    landing: document.getElementById('ui-landing')
};

var mySocketId = null;
var myNameSubmitted = false;
var lastDescentRole = null;

var rolesRu = {
    'PILOT': 'Пилот',
    'ENGINEER': 'Инженер',
    'ASTRO': 'Астрофизик',
    'XENO': 'Ксенобиолог',
    'DIRECTOR': 'Директор'
};

function showScreen(name) {
    Object.values(screens).forEach(function(s) {
        if (s) s.classList.remove('active');
    });
    if (screens[name]) screens[name].classList.add('active');
}

// --- ГЛАВНЫЙ ОБРАБОТЧИК ---
socket.on('state_update', function(state) {
    mySocketId = state.mySocketId;
    var playersCount = state.playersCount || 0;
    var requiredPlayers = state.requiredPlayers || 10;
    var countEl = document.getElementById('count');
    if (countEl) countEl.innerText = playersCount + '/' + requiredPlayers;

    if (state.isMaster) {
        document.body.innerHTML = '<h1 style="color:red;padding:50px;">Откройте /master.html</h1>';
        return;
    }

    if (state.phase === 'WAITING') {
        lastDescentRole = null;
        handleWaiting(playersCount, requiredPlayers);
    } else if (state.phase === 'PHASE_1_ROLES') {
        lastDescentRole = null;
        handlePhase1(state);
    } else if (state.phase === 'PHASE_2_SCAN') {
        lastDescentRole = null;
        if (state.votingFinished) {
            showScreen('results');
            renderResults(state);
        } else {
            showScreen('scan');
            renderScanPhase(state);
        }
    } else if (state.phase === 'PHASE_3_DESCENT') {
        showScreen('landing');
        renderDescentPhase(state);
    } else if (state.phase === 'PHASE_4_RECON' || state.phase === 'PHASE_5_END') {
        lastDescentRole = null;
        showScreen('waiting');
        document.querySelector('#ui-waiting h1').innerText = 'Игра завершена!';
    } else {
        lastDescentRole = null;
        showScreen('waiting');
        document.querySelector('#ui-waiting h1').innerText = 'Фаза: ' + state.phase;
    }
});

// --- ФАЗА ОЖИДАНИЯ ---
function handleWaiting(current, max) {
    showScreen('waiting');
    var h1 = document.querySelector('#ui-waiting h1');
    if (current < max) {
        h1.innerText = 'Ожидание игроков...';
    } else {
        h1.innerText = 'Лобби заполнено. Ждем ведущего...';
    }
}

// --- ФАЗА 1: ДРАФТ ---
function handlePhase1(state) {
    var myData = state.players[mySocketId];
    if (!myData) return;
    var allPlayers = Object.values(state.players);
    var req = state.requiredPlayers || 10;
    var everyoneNamed = allPlayers.length >= req && allPlayers.every(function(p) { return p.name !== null; });
    var everyonePicked = allPlayers.length >= req && allPlayers.every(function(p) { return p.role !== null; });

    if (everyonePicked) {
        showScreen('summary');
        renderSummary(state);
        return;
    }
    if (state.turnQueue && state.turnQueue.length > 0 && !everyonePicked) {
        showScreen('draft');
        renderDraft(state);
        return;
    }
    if (!everyoneNamed) {
        showScreen('name');
        var namedCount = allPlayers.filter(function(p) { return p.name !== null; }).length;
        var waitText = document.getElementById('waiting-names');
        if (waitText) waitText.innerText = 'Ожидаем... (' + namedCount + '/' + req + ')';
        var input = document.getElementById('name-input');
        var btn = document.querySelector('#ui-name button');
        if (myData.name === null && !myNameSubmitted) {
            if (input) input.disabled = false;
            if (btn) btn.disabled = false;
        } else {
            if (input) input.disabled = true;
            if (btn) btn.disabled = true;
        }
    }
}

function renderDraft(state) {
    var board = document.getElementById('draft-board');
    var statusText = document.getElementById('draft-status');
    if (!board || !statusText) return;
    board.innerHTML = '';

    var currentTurnSocket = state.turnQueue[state.currentTurnIndex];
    var isMyTurn = currentTurnSocket === mySocketId;
    var currentPlayerName = '???';
    if (state.players[currentTurnSocket] && state.players[currentTurnSocket].name) {
        currentPlayerName = state.players[currentTurnSocket].name;
    }

    if (isMyTurn) {
        statusText.innerHTML = '<div class="my-turn-banner">ВАША ОЧЕРЕДЬ! Выберите команду и роль</div>';
    } else {
        statusText.innerHTML = '<p>Сейчас выбирает: <strong style="color:#66fcf1">' + currentPlayerName + '</strong></p>';
    }

    var teamCounts = state.teamCounts || {};
    var maxTeamSize = state.maxTeamSize || 5;
    var reqTeams = state.requiredTeams || 2;

    for (var tId = 0; tId < reqTeams; tId++) {
        var col = document.createElement('div');
        col.className = 'team-column';
        var teamName = state.teams[tId] ? state.teams[tId].name : ('Команда ' + tId);
        var currentCount = teamCounts[tId] || 0;
        col.innerHTML = '<h3>' + teamName + ' (' + currentCount + '/' + maxTeamSize + ')</h3>';

        var isTeamFull = currentCount >= maxTeamSize;
        if (isTeamFull) {
            var w = document.createElement('div');
            w.style.color = '#e94560';
            w.style.marginBottom = '10px';
            w.style.fontSize = '12px';
            w.innerText = 'Команда заполнена';
            col.appendChild(w);
        }

        var takenRoles = [];
        Object.values(state.players).forEach(function(p) {
            if (p.team === tId) takenRoles.push(p.role);
        });

        var rolesList = ['PILOT', 'ENGINEER', 'ASTRO', 'XENO', 'DIRECTOR'];
        rolesList.forEach(function(role) {
            var btn = document.createElement('button');
            btn.className = 'role-btn';
            var btnText = rolesRu[role] || role;

            if (takenRoles.indexOf(role) !== -1) {
                btn.classList.add('taken');
                btn.disabled = true;
                var whoName = '???';
                Object.values(state.players).forEach(function(p) {
                    if (p.team === tId && p.role === role && p.name) whoName = p.name;
                });
                btnText += ' (' + whoName + ')';
            } else {
                btn.disabled = !isMyTurn || isTeamFull;
                btn.onclick = (function(t, r) {
                    return function() { window.pickRole(t, r); };
                })(tId, role);
            }
            btn.innerText = btnText;
            col.appendChild(btn);
        });
        board.appendChild(col);
    }
}

function renderSummary(state) {
    var layout = document.querySelector('.summary-layout');
    if (!layout) return;
    layout.innerHTML = '';
    var reqTeams = state.requiredTeams || 2;

    for (var tId = 0; tId < reqTeams; tId++) {
        var card = document.createElement('div');
        card.className = 'team-card';

        var header = document.createElement('h3');
        var nameSpan = document.createElement('span');
        nameSpan.id = 'team' + tId + '-name';
        nameSpan.innerText = state.teams[tId] ? state.teams[tId].name : ('Команда ' + tId);

        var renameBtn = document.createElement('button');
        renameBtn.className = 'btn-small';
        renameBtn.innerText = '✏️';
        renameBtn.onclick = (function(id) {
            return function() { window.promptRenameTeam(id); };
        })(tId);

        header.appendChild(nameSpan);
        header.appendChild(renameBtn);

        var table = document.createElement('table');
        table.id = 'team' + tId + '-table';
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);

        card.appendChild(header);
        card.appendChild(table);
        layout.appendChild(card);

        tbody.innerHTML = '<tr><th>Имя</th><th>Роль</th></tr>';
        Object.values(state.players).forEach(function(p) {
            if (p.team === tId) {
                var tr = document.createElement('tr');
                var tdN = document.createElement('td');
                tdN.innerText = p.name;
                var tdR = document.createElement('td');
                var rn = rolesRu[p.role] || p.role;
                tdR.innerText = rn;
                tr.appendChild(tdN);
                tr.appendChild(tdR);
                tbody.appendChild(tr);
            }
        });
    }
}

// --- ФАЗА 2: РАЗВЕДКА ---
function renderScanPhase(state) {
    var myData = state.players[mySocketId];
    if (!myData) return;

    document.getElementById('scan-role').innerText = rolesRu[myData.role] || myData.role;
    document.getElementById('scan-team').innerText = state.teams[myData.team] ? state.teams[myData.team].name : '-';

    var energyEl = document.getElementById('scan-energy');
    energyEl.innerText = myData.energy;
    energyEl.style.color = myData.energy < 15 ? '#e94560' : '#66fcf1';
    document.getElementById('scan-science').innerText = myData.science;

    var statusMsg = document.getElementById('scan-status-msg');
    if (state.votingStarted) {
        statusMsg.innerText = 'ЭНЕРГИЯ НА ИСХОДЕ! ГОЛОСОВАНИЕ!';
    } else {
        statusMsg.innerText = 'Тратьте энергию на разведку (мин. остаток 15)';
    }

    var thead = document.getElementById('scan-thead');
    var tbody = document.getElementById('scan-tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    var costs = state.scanCosts || {};
    var names = state.paramNames || {};
    var paramKeys = ['diameter', 'mass', 'atmosphere', 'magneticField', 'water', 'biomarkers'];

    var trHead = document.createElement('tr');
    var thName = document.createElement('th');
    thName.innerText = 'Планета';
    trHead.appendChild(thName);

    paramKeys.forEach(function(key) {
        var th = document.createElement('th');
        th.innerHTML = (names[key] || key) + '<span class="cost-label">Цена: ' + (costs[key] || '?') + ' ⚡</span>';
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    state.planets.forEach(function(planet) {
        var tr = document.createElement('tr');
        var tdName = document.createElement('td');
        tdName.innerText = planet.name;
        tdName.style.fontWeight = 'bold';
        tdName.style.color = '#66fcf1';
        tr.appendChild(tdName);

        paramKeys.forEach(function(key) {
            var td = document.createElement('td');
            var isRevealed = planet[key] !== undefined;

            if (isRevealed) {
                td.className = 'cell-revealed';
                if (typeof planet[key] === 'boolean') {
                    td.innerText = planet[key] ? 'Да' : 'Нет';
                } else if (Array.isArray(planet[key])) {
                    td.innerText = planet[key].length > 0 ? planet[key].join(', ') : 'Нет';
                } else {
                    td.innerText = planet[key];
                }
            } else {
                td.className = 'cell-hidden';
                if (!state.votingStarted && myData.energy >= costs[key]) {
                    var btn = document.createElement('button');
                    btn.className = 'scan-btn';
                    btn.innerText = 'Разведать (-' + costs[key] + '⚡)';
                    btn.onclick = (function(pId, pKey) {
                        return function() { window.scanParam(pId, pKey); };
                    })(planet.id, key);
                    td.appendChild(btn);
                } else {
                    td.innerText = '???';
                }
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    var voteBlock = document.getElementById('vote-block');
    if (state.votingStarted && !state.votingFinished) {
        voteBlock.style.display = 'block';
        renderVoteButtons(state);
    } else {
        voteBlock.style.display = 'none';
    }
}

function renderVoteButtons(state) {
    var container = document.getElementById('vote-buttons');
    container.innerHTML = '';
    var myData = state.players[mySocketId];
    if (!myData) return;

    var myTeamVotes = state.votes[myData.team] || {};
    var alreadyVoted = myTeamVotes[mySocketId] !== undefined;

    if (alreadyVoted) {
        var p = document.createElement('p');
        p.innerText = 'Вы отдали свой голос. Ожидаем остальных...';
        p.style.color = '#4ecca3';
        p.style.fontSize = '18px';
        container.appendChild(p);
        return;
    }

    var voteWeight = myData.role === 'DIRECTOR' ? 2 : 1;
    var info = document.createElement('p');
    info.innerText = 'Ваш вес голоса: ' + voteWeight;
    info.style.color = '#f9ed69';
    container.appendChild(info);

    state.planets.forEach(function(planet) {
        var btn = document.createElement('button');
        btn.innerText = planet.name;
        btn.onclick = (function(pId) {
            return function() { window.votePlanet(pId); };
        })(planet.id);
        container.appendChild(btn);
    });
}

function renderResults(state) {
    var tbody = document.querySelector('#results-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    var results = state.voteResults || [];
    results.forEach(function(r) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td style="color:#66fcf1;font-weight:bold;">' + r.teamName + '</td>' +
            '<td style="color:#4ecca3;font-size:16px;">' + r.planetName + '</td>' +
            '<td>' + r.totalVotes + '</td>' +
            '<td style="font-size:12px;">' + r.voters + '</td>';
        tbody.appendChild(tr);
    });
}

// =====================================================================
// ФАЗА 3: СПУСК АППАРАТА (полностью переписана без несуществующих классов)
// =====================================================================

function renderDescentPhase(state) {
    var myData = state.players[mySocketId];
    if (!myData) return;
    var ds = state.descentState;
    if (!ds) return;

    var container = document.getElementById('ui-landing');

    // Строим UI только один раз при входе в фазу или смене роли
    if (lastDescentRole !== myData.role) {
        lastDescentRole = myData.role;
        buildDescentUI(container, myData, state);
    }

    // Обновляем HUD
    var lvl = document.getElementById('desc-level');
    var sts = document.getElementById('desc-status');
    var tmr = document.getElementById('desc-time');

    if (lvl) lvl.innerText = (ds.currentLine + 1) + ' / ' + ds.totalLines;
    if (tmr) tmr.innerText = Math.ceil(ds.timeLeft / 1000) + 'с';

    if (sts) {
        if (ds.status === 'fail') {
            sts.innerText = 'ПРОВАЛ: ' + ds.reason;
            sts.style.color = '#e94560';
        } else if (ds.status === 'success') {
            sts.innerText = 'ПОСАДКА УСПЕШНА!';
            sts.style.color = '#4ecca3';
        } else {
            sts.innerText = 'Спуск...';
            sts.style.color = '#66fcf1';
        }
    }

    drawCanvas(ds);
}

function buildDescentUI(container, myData, state) {
    container.innerHTML = '';
    container.className = 'screen active descent-container';

    var teamName = state.teams[myData.team] ? state.teams[myData.team].name : '-';

    // HUD
    var hud = document.createElement('div');
    hud.className = 'descent-hud';
    hud.innerHTML = '<div><h2>Спуск аппарата</h2>' +
        '<p>Роль: <strong>' + (rolesRu[myData.role] || myData.role) + '</strong> | Команда: <strong>' + teamName + '</strong></p>' +
        '<p>Уровень: <strong id="desc-level">1/30</strong> | Время: <strong id="desc-time">20с</strong></p></div>' +
        '<div id="desc-status" class="status-msg">Спуск...</div>';
    container.appendChild(hud);

    // Canvas
    var canvas = document.createElement('canvas');
    canvas.id = 'desc-canvas';
    canvas.width = 600;
    canvas.height = 400;
    canvas.style.border = '2px solid #45a29e';
    canvas.style.background = '#000';
    canvas.style.borderRadius = '5px';
    canvas.style.display = 'block';
    canvas.style.margin = '20px auto';
    container.appendChild(canvas);

    // Управление по ролям
    var ctrl = document.createElement('div');
    ctrl.className = 'descent-controls';
    ctrl.id = 'desc-controls';
    ctrl.style.textAlign = 'center';
    ctrl.style.marginTop = '20px';
    ctrl.style.display = 'flex';
    ctrl.style.gap = '10px';
    ctrl.style.justifyContent = 'center';
    ctrl.style.flexWrap = 'wrap';

    if (myData.role === 'PILOT') {
        var pilotWrap = document.createElement('div');
        pilotWrap.style.display = 'flex';
        pilotWrap.style.flexDirection = 'column';
        pilotWrap.style.alignItems = 'center';
        pilotWrap.style.gap = '5px';

        var btnUp = document.createElement('button');
        btnUp.className = 'scan-btn';
        btnUp.innerText = 'Вверх';
        btnUp.onmousedown = function() { sendD({ x: 0, y: -1 }); };
        btnUp.onmouseup = function() { sendD({ x: 0, y: 0 }); };
        btnUp.ontouchstart = function(e) { e.preventDefault(); sendD({ x: 0, y: -1 }); };
        btnUp.ontouchend = function(e) { e.preventDefault(); sendD({ x: 0, y: 0 }); };

        var lrWrap = document.createElement('div');
        lrWrap.style.display = 'flex';
        lrWrap.style.gap = '10px';

        var btnLeft = document.createElement('button');
        btnLeft.className = 'scan-btn';
        btnLeft.innerText = 'Влево';
        btnLeft.onmousedown = function() { sendD({ x: -1, y: 0 }); };
        btnLeft.onmouseup = function() { sendD({ x: 0, y: 0 }); };
        btnLeft.ontouchstart = function(e) { e.preventDefault(); sendD({ x: -1, y: 0 }); };
        btnLeft.ontouchend = function(e) { e.preventDefault(); sendD({ x: 0, y: 0 }); };

        var btnRight = document.createElement('button');
        btnRight.className = 'scan-btn';
        btnRight.innerText = 'Вправо';
        btnRight.onmousedown = function() { sendD({ x: 1, y: 0 }); };
        btnRight.onmouseup = function() { sendD({ x: 0, y: 0 }); };
        btnRight.ontouchstart = function(e) { e.preventDefault(); sendD({ x: 1, y: 0 }); };
        btnRight.ontouchend = function(e) { e.preventDefault(); sendD({ x: 0, y: 0 }); };

        lrWrap.appendChild(btnLeft);
        lrWrap.appendChild(btnRight);
        pilotWrap.appendChild(btnUp);
        pilotWrap.appendChild(lrWrap);
        ctrl.appendChild(pilotWrap);

        // Клавиатура для пилота
        document.onkeydown = function(e) {
            if (e.key === 'ArrowLeft') sendD({ x: -1, y: 0 });
            if (e.key === 'ArrowRight') sendD({ x: 1, y: 0 });
            if (e.key === 'ArrowUp') sendD({ x: 0, y: -1 });
        };
        document.onkeyup = function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                sendD({ x: 0, y: 0 });
            }
        };
    } else if (myData.role === 'ENGINEER') {
        var btnBoost = document.createElement('button');
        btnBoost.className = 'scan-btn';
        btnBoost.innerText = 'УСКОРЕНИЕ';
        btnBoost.onmousedown = function() { sendD({ boost: true }); };
        btnBoost.onmouseup = function() { sendD({ boost: false }); };
        btnBoost.ontouchstart = function(e) { e.preventDefault(); sendD({ boost: true }); };
        btnBoost.ontouchend = function(e) { e.preventDefault(); sendD({ boost: false }); };

        var btnStab = document.createElement('button');
        btnStab.className = 'scan-btn';
        btnStab.innerText = 'СТАБИЛИЗАЦИЯ';
        btnStab.onmousedown = function() { sendD({ stabilize: true }); };
        btnStab.onmouseup = function() { sendD({ stabilize: false }); };
        btnStab.ontouchstart = function(e) { e.preventDefault(); sendD({ stabilize: true }); };
        btnStab.ontouchend = function(e) { e.preventDefault(); sendD({ stabilize: false }); };

        ctrl.appendChild(btnBoost);
        ctrl.appendChild(btnStab);
        document.onkeydown = null;
        document.onkeyup = null;
    } else if (myData.role === 'DIRECTOR') {
        var wrapDir = document.createElement('div');
        wrapDir.style.textAlign = 'center';
        var warnDir = document.createElement('p');
        warnDir.style.color = '#e94560';
        warnDir.style.fontSize = '12px';
        warnDir.innerText = 'Без печати стабильность падает на 50%!';
        var btnStamp = document.createElement('button');
        btnStamp.className = 'scan-btn hold-btn';
        btnStamp.innerText = 'УДЕРЖИВАТЬ ПЕЧАТЬ';
        btnStamp.style.padding = '20px';
        btnStamp.style.fontSize = '18px';
        btnStamp.style.background = '#e94560';
        btnStamp.style.color = 'white';
        btnStamp.onmousedown = function() { sendD({ stampActive: true }); };
        btnStamp.onmouseup = function() { sendD({ stampActive: false }); };
        btnStamp.ontouchstart = function(e) { e.preventDefault(); sendD({ stampActive: true }); };
        btnStamp.ontouchend = function(e) { e.preventDefault(); sendD({ stampActive: false }); };
        wrapDir.appendChild(warnDir);
        wrapDir.appendChild(btnStamp);
        ctrl.appendChild(wrapDir);
        document.onkeydown = null;
        document.onkeyup = null;
    } else if (myData.role === 'ASTRO') {
        var btnFocus = document.createElement('button');
        btnFocus.className = 'scan-btn hold-btn';
        btnFocus.innerText = 'УДЕРЖИВАТЬ ФОКУС';
        btnFocus.style.padding = '20px';
        btnFocus.style.fontSize = '18px';
        btnFocus.style.background = '#e94560';
        btnFocus.style.color = 'white';
        btnFocus.onmousedown = function() { sendD({ focused: true }); };
        btnFocus.onmouseup = function() { sendD({ focused: false }); };
        btnFocus.ontouchstart = function(e) { e.preventDefault(); sendD({ focused: true }); };
        btnFocus.ontouchend = function(e) { e.preventDefault(); sendD({ focused: false }); };
        ctrl.appendChild(btnFocus);
        document.onkeydown = null;
        document.onkeyup = null;
    } else if (myData.role === 'XENO') {
        var btnSync = document.createElement('button');
        btnSync.className = 'scan-btn hold-btn';
        btnSync.innerText = 'СИНХРОНИЗАЦИЯ';
        btnSync.style.padding = '20px';
        btnSync.style.fontSize = '18px';
        btnSync.style.background = '#e94560';
        btnSync.style.color = 'white';
        btnSync.onmousedown = function() { sendD({ synced: true }); };
        btnSync.onmouseup = function() { sendD({ synced: false }); };
        btnSync.ontouchstart = function(e) { e.preventDefault(); sendD({ synced: true }); };
        btnSync.ontouchend = function(e) { e.preventDefault(); sendD({ synced: false }); };
        ctrl.appendChild(btnSync);
        document.onkeydown = null;
        document.onkeyup = null;
    } else {
        document.onkeydown = null;
        document.onkeyup = null;
    }

    container.appendChild(ctrl);
}

function drawCanvas(ds) {
    var canvas = document.getElementById('desc-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;

    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, W, H);

    if (ds.status === 'fail') {
        ctx.fillStyle = '#e94560';
        ctx.font = '30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('КРУШЕНИЕ!', W / 2, H / 2);
        return;
    }
    if (ds.status === 'success') {
        ctx.fillStyle = '#4ecca3';
        ctx.font = '30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ПОСАДКА УСПЕШНА!', W / 2, H / 2);
        return;
    }

    // Препятствия
    var obstacles = ds.obstacles || [];
    obstacles.forEach(function(o) {
        ctx.fillStyle = o.type === 'moving' ? '#e94560' : '#1f2833';
        var ox = (o.x / 100) * W;
        var ow = (o.width / 100) * W;
        if (o.type === 'static') {
            var oy1 = (o.yStart / 100) * H;
            var oy2 = (o.yEnd / 100) * H;
            ctx.fillRect(ox, oy1, ow, oy2 - oy1);
        } else {
            var oy = (o.y / 100) * H;
            ctx.fillRect(ox, oy - 10, ow, 20);
        }
    });

    // Мишень
    if (ds.targetPosition) {
        ctx.fillStyle = '#f9ed69';
        ctx.beginPath();
        ctx.arc((ds.targetPosition.x / 100) * W, H - 30, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ЦЕЛЬ', (ds.targetPosition.x / 100) * W, H - 27);
    }

    // Корабль
    if (ds.shipPosition) {
        ctx.fillStyle = '#66fcf1';
        var sx = (ds.shipPosition.x / 100) * W;
        var sy = (ds.shipPosition.y / 100) * H;
        ctx.fillRect(sx - 10, sy - 10, 20, 20);
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▼', sx, sy + 4);
    }
}

window.sendD = function(data) {
    data.type = 'DESCENT_ACTION';
    socket.emit('action', data);
};

// --- ОБЩИЕ ДЕЙСТВИЯ ---
window.submitName = function() {
    var input = document.getElementById('name-input');
    if (!input) return;
    var name = input.value.trim();
    if (name.length > 0) {
        socket.emit('action', { type: 'SET_NAME', name: name });
        myNameSubmitted = true;
        input.disabled = true;
        var btn = document.querySelector('#ui-name button');
        if (btn) btn.disabled = true;
    }
};

window.pickRole = function(teamId, role) {
    socket.emit('action', { type: 'SELECT_ROLE', teamId: teamId, role: role });
};

window.promptRenameTeam = function(teamId) {
    var newName = prompt('Введите новое название лаборатории:');
    if (newName && newName.trim().length > 0) {
        socket.emit('action', { type: 'RENAME_TEAM', teamId: teamId, newName: newName.trim() });
    }
};

window.scanParam = function(planetId, paramKey) {
    socket.emit('action', { type: 'SCAN_PARAM', planetId: planetId, paramKey: paramKey });
};

window.votePlanet = function(planetId) {
    socket.emit('action', { type: 'VOTE_PLANET', planetId: planetId });
};