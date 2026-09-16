// public/client.js

const socket = io();

socket.on('connect', function() {
    console.log('Соединение установлено. Отправляю регистрацию ИГРОКА...');
    socket.emit('register', { type: 'PLAYER' });
});

socket.on('error_msg', function(msg) { alert(msg); });

socket.on('disconnect', function(reason) {
    if (reason === 'io server disconnect') {
        document.body.innerHTML = '<h1 style="color:red; padding:50px;">Сервер отклонил подключение.</h1>';
    }
});

const screens = {
    waiting: document.getElementById('ui-waiting'),
    name: document.getElementById('ui-name'),
    draft: document.getElementById('ui-draft'),
    summary: document.getElementById('ui-summary'),
    scan: document.getElementById('ui-scan'),
    results: document.getElementById('ui-results')
};

let mySocketId = null;
let myNameSubmitted = false;

const rolesRu = {
    'PILOT': '🚀 Пилот', 'ENGINEER': '🔧 Инженер',
    'ASTRO': '🔭 Астрофизик', 'XENO': '🧬 Ксенобиолог', 'DIRECTOR': '💼 Директор'
};

function showScreen(name) {
    Object.values(screens).forEach(function(s) { if (s) s.classList.remove('active'); });
    if (screens[name]) screens[name].classList.add('active');
}

// --- ГЛАВНЫЙ ОБРАБОТЧИК ---

socket.on('state_update', function(state) {
    mySocketId = state.mySocketId;
    const playersCount = state.playersCount || 0;
    const requiredPlayers = state.requiredPlayers || 10;
    const countEl = document.getElementById('count');
    if (countEl) countEl.innerText = playersCount + '/' + requiredPlayers;

    if (state.isMaster) {
        document.body.innerHTML = '<h1 style="color:red; padding:50px;">Откройте /master.html</h1>';
        return;
    }

    // 🆕 РОУТЕР ФАЗ
    if (state.phase === 'WAITING') {
        handleWaiting(playersCount, requiredPlayers);
    }
    else if (state.phase === 'PHASE_1_ROLES') {
        handlePhase1(state);
    }
    else if (state.phase === 'PHASE_2_SCAN') {
        // Если голосование завершено - показываем итоги
        if (state.votingFinished) {
            showScreen('results');
            renderResults(state);
        } else {
            showScreen('scan');
            renderScanPhase(state);
        }
    }
    else {
        showScreen('waiting');
        document.querySelector('#ui-waiting h1').innerText = 'Фаза: ' + state.phase;
    }
});


// --- ФАЗА ОЖИДАНИЯ ---

function handleWaiting(current, max) {
    showScreen('waiting');
    const h1 = document.querySelector('#ui-waiting h1');
    h1.innerText = current < max ? 'Ожидание игроков...' : 'Лобби заполнено. Ждем ведущего...';
}


// --- ФАЗА 1: ДРАФТ ---

function handlePhase1(state) {
    const myData = state.players[mySocketId];
    if (!myData) return;
    const allPlayers = Object.values(state.players);
    const req = state.requiredPlayers || 10;
    const everyoneNamed = allPlayers.length >= req && allPlayers.every(function(p) { return p.name !== null; });
    const everyonePicked = allPlayers.length >= req && allPlayers.every(function(p) { return p.role !== null; });

    // 🆕 Все выбрали -> показываем сводную таблицу ВСЕМ
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
        const namedCount = allPlayers.filter(function(p) { return p.name !== null; }).length;
        const waitText = document.getElementById('waiting-names');
        if (waitText) waitText.innerText = 'Ожидаем... (' + namedCount + '/' + req + ')';
        const input = document.getElementById('name-input');
        const btn = document.querySelector('#ui-name button');
        if (myData.name === null && !myNameSubmitted) {
            if (input) input.disabled = false; if (btn) btn.disabled = false;
        } else {
            if (input) input.disabled = true; if (btn) btn.disabled = true;
        }
    }
}

function renderDraft(state) {
    const board = document.getElementById('draft-board');
    const statusText = document.getElementById('draft-status');
    if (!board || !statusText) return;
    board.innerHTML = '';

    const currentTurnSocket = state.turnQueue[state.currentTurnIndex];
    const isMyTurn = currentTurnSocket === mySocketId;
    const currentPlayerName = state.players[currentTurnSocket] ? state.players[currentTurnSocket].name : '???';

    if (isMyTurn) {
        statusText.innerHTML = '<div class="my-turn-banner">⚠️ ВАША ОЧЕРЕДЬ! Выберите команду и роль</div>';
    } else {
        statusText.innerHTML = '<p>Сейчас выбирает: <strong style="color:#66fcf1">' + currentPlayerName + '</strong></p>';
    }

    const teamCounts = state.teamCounts || {};
    const maxTeamSize = state.maxTeamSize || 5;
    const reqTeams = state.requiredTeams || 2;

    for (let tId = 0; tId < reqTeams; tId++) {
        const col = document.createElement('div');
        col.className = 'team-column';
        const teamName = state.teams[tId] ? state.teams[tId].name : ('Команда ' + tId);
        const currentCount = teamCounts[tId] || 0;
        col.innerHTML = '<h3>' + teamName + ' (' + currentCount + '/' + maxTeamSize + ')</h3>';

        const isTeamFull = currentCount >= maxTeamSize;
        if (isTeamFull) {
            const w = document.createElement('div');
            w.style.color = '#e94560'; w.style.marginBottom = '10px'; w.style.fontSize = '12px';
            w.innerText = '⛔ Команда заполнена';
            col.appendChild(w);
        }

        const takenRoles = [];
        Object.values(state.players).forEach(function(p) { if (p.team === tId) takenRoles.push(p.role); });
        const rolesList = ['PILOT', 'ENGINEER', 'ASTRO', 'XENO', 'DIRECTOR'];

        rolesList.forEach(function(role) {
            const btn = document.createElement('button');
            btn.className = 'role-btn';
            let btnText = rolesRu[role] || role;
            if (takenRoles.indexOf(role) !== -1) {
                btn.classList.add('taken'); btn.disabled = true;
                let whoName = '???';
                Object.values(state.players).forEach(function(p) { if (p.team === tId && p.role === role && p.name) whoName = p.name; });
                btnText += ' (' + whoName + ')';
            } else {
                btn.disabled = !isMyTurn || isTeamFull;
                btn.onclick = (function(t, r) { return function() { window.pickRole(t, r); }; })(tId, role);
            }
            btn.innerText = btnText;
            col.appendChild(btn);
        });
        board.appendChild(col);
    }
}

function renderSummary(state) {
    const layout = document.querySelector('.summary-layout');
    if (!layout) return;
    layout.innerHTML = '';
    const reqTeams = state.requiredTeams || 2;
    for (let tId = 0; tId < reqTeams; tId++) {
        const card = document.createElement('div'); card.className = 'team-card';
        const header = document.createElement('h3');
        const nameSpan = document.createElement('span'); nameSpan.id = 'team' + tId + '-name';
        nameSpan.innerText = state.teams[tId] ? state.teams[tId].name : ('Команда ' + tId);
        const renameBtn = document.createElement('button'); renameBtn.className = 'btn-small'; renameBtn.innerText = '✏️';
        renameBtn.onclick = (function(id) { return function() { window.promptRenameTeam(id); }; })(tId);
        header.appendChild(nameSpan); header.appendChild(renameBtn);
        const table = document.createElement('table'); table.id = 'team' + tId + '-table';
        const tbody = document.createElement('tbody'); table.appendChild(tbody);
        card.appendChild(header); card.appendChild(table); layout.appendChild(card);
        tbody.innerHTML = '<tr><th>Имя</th><th>Роль</th></tr>';
        Object.values(state.players).forEach(function(p) {
            if (p.team === tId) {
                const tr = document.createElement('tr');
                const tdN = document.createElement('td'); tdN.innerText = p.name;
                const tdR = document.createElement('td');
                let rn = rolesRu[p.role] || p.role; rn = rn.replace(/[^a-zA-Zа-яА-ЯЁё\s]/g, '').trim();
                tdR.innerText = rn;
                tr.appendChild(tdN); tr.appendChild(tdR); tbody.appendChild(tr);
            }
        });
    }
}


// --- ФАЗА 2: РАЗВЕДКА ---

function renderScanPhase(state) {
    const myData = state.players[mySocketId];
    if (!myData) return;

    document.getElementById('scan-role').innerText = rolesRu[myData.role] || myData.role;
    document.getElementById('scan-team').innerText = state.teams[myData.team] ? state.teams[myData.team].name : '-';

    const energyEl = document.getElementById('scan-energy');
    energyEl.innerText = myData.energy;
    energyEl.style.color = myData.energy < 15 ? '#e94560' : '#66fcf1';
    document.getElementById('scan-science').innerText = myData.science;

    const statusMsg = document.getElementById('scan-status-msg');
    if (state.votingStarted) {
        statusMsg.innerText = '🗳️ ЭНЕРГИЯ НА ИСХОДЕ! ГОЛОСОВАНИЕ!';
    } else {
        statusMsg.innerText = 'Тратьте энергию на разведку (мин. остаток 15)';
    }

    const thead = document.getElementById('scan-thead');
    const tbody = document.getElementById('scan-tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const costs = state.scanCosts || {};
    const names = state.paramNames || {};
    const paramKeys = ['diameter', 'mass', 'atmosphere', 'magneticField', 'water', 'biomarkers'];

    const trHead = document.createElement('tr');
    const thName = document.createElement('th'); thName.innerText = 'Планета'; trHead.appendChild(thName);
    paramKeys.forEach(function(key) {
        const th = document.createElement('th');
        th.innerHTML = (names[key] || key) + '<span class="cost-label">Цена: ' + (costs[key] || '?') + ' ⚡</span>';
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    state.planets.forEach(function(planet) {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.innerText = planet.name;
        tdName.style.fontWeight = 'bold';
        tdName.style.color = '#66fcf1';
        tr.appendChild(tdName);

        paramKeys.forEach(function(key) {
            const td = document.createElement('td');
            const isRevealed = planet[key] !== undefined;

            if (isRevealed) {
                td.className = 'cell-revealed';
                if (typeof planet[key] === 'boolean') {
                    td.innerText = planet[key] ? '✅ Да' : '❌ Нет';
                } else if (Array.isArray(planet[key])) {
                    td.innerText = planet[key].length > 0 ? planet[key].join(', ') : 'Нет';
                } else {
                    td.innerText = planet[key];
                }
            } else {
                td.className = 'cell-hidden';
                if (!state.votingStarted && myData.energy >= costs[key]) {
                    const btn = document.createElement('button');
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

    const voteBlock = document.getElementById('vote-block');
    if (state.votingStarted && !state.votingFinished) {
        voteBlock.style.display = 'block';
        renderVoteButtons(state);
    } else {
        voteBlock.style.display = 'none';
    }
}

function renderVoteButtons(state) {
    const container = document.getElementById('vote-buttons');
    container.innerHTML = '';
    const myData = state.players[mySocketId];
    if (!myData) return;

    const myTeamVotes = state.votes[myData.team] || {};
    const alreadyVoted = myTeamVotes[mySocketId] !== undefined;

    if (alreadyVoted) {
        const p = document.createElement('p');
        p.innerText = '✅ Вы отдали свой голос. Ожидаем остальных...';
        p.style.color = '#4ecca3';
        p.style.fontSize = '18px';
        container.appendChild(p);
        return;
    }

    const voteWeight = myData.role === 'DIRECTOR' ? 2 : 1;
    const info = document.createElement('p');
    info.innerText = 'Ваш вес голоса: ' + voteWeight;
    info.style.color = '#f9ed69';
    container.appendChild(info);

    state.planets.forEach(function(planet) {
        const btn = document.createElement('button');
        btn.innerText = planet.name;
        btn.onclick = (function(pId) {
            return function() { window.votePlanet(pId); };
        })(planet.id);
        container.appendChild(btn);
    });
}

// 🆕 РЕНДЕРИНГ ИТОГОВ ГОЛОСОВАНИЯ
function renderResults(state) {
    const tbody = document.querySelector('#results-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const results = state.voteResults || [];
    results.forEach(function(r) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td style="color:#66fcf1; font-weight:bold;">' + r.teamName + '</td>' +
            '<td style="color:#4ecca3; font-size:16px;">' + r.planetName + '</td>' +
            '<td>' + r.totalVotes + '</td>' +
            '<td style="font-size:12px;">' + r.voters + '</td>';
        tbody.appendChild(tr);
    });
}


// --- ДЕЙСТВИЯ ИГРОКА ---

window.submitName = function() {
    const input = document.getElementById('name-input');
    if (!input) return;
    const name = input.value.trim();
    if (name.length > 0) {
        // Проблема 4: XSS-защита - экранирование имени на клиенте перед отправкой
        const safeName = name.replace(/[<>"'&]/g, function(char) {
            var entities = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'};
            return entities[char];
        });
        socket.emit('action', { type: 'SET_NAME', name: safeName });
        myNameSubmitted = true;
        input.disabled = true;
        const btn = document.querySelector('#ui-name button');
        if (btn) btn.disabled = true;
    }
};

window.pickRole = function(teamId, role) {
    socket.emit('action', { type: 'SELECT_ROLE', teamId: teamId, role: role });
};

window.promptRenameTeam = function(teamId) {
    const newName = prompt('Введите новое название лаборатории:');
    if (newName && newName.trim().length > 0) {
        // Проблема 4: XSS-защита для названия команды
        const safeName = newName.trim().replace(/[<>"'&]/g, function(char) {
            var entities = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'};
            return entities[char];
        });
        socket.emit('action', { type: 'RENAME_TEAM', teamId: teamId, newName: safeName });
    }
};

window.scanParam = function(planetId, paramKey) {
    socket.emit('action', { type: 'SCAN_PARAM', planetId: planetId, paramKey: paramKey });
};

window.votePlanet = function(planetId) {
    socket.emit('action', { type: 'VOTE_PLANET', planetId: planetId });
};