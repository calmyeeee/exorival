// public/master.js
const socket = io();

socket.on('connect', function() {
    socket.emit('register', { type: 'MASTER' });
});

const phasesRu = {
    'WAITING': 'ОЖИДАНИЕ ИГРОКОВ',
    'PHASE_1_ROLES': 'ФАЗА 1: ВЫБОР РОЛЕЙ',
    'PHASE_2_SCAN': 'ФАЗА 2: РАЗВЕДКА ПЛАНЕТ',
    'PHASE_3_PREP': 'ФАЗА 3: ПОДГОТОВКА',
    'PHASE_4_LANDING': 'ФАЗА 4: СПУСК',
    'PHASE_5_END': 'ФАЗА 5: ИТОГИ'
};

socket.on('state_update', function(state) {
    document.getElementById('current-phase').innerText = phasesRu[state.phase] || state.phase;
    document.getElementById('masters-count').innerText = Object.keys(state.masters || {}).length;

    document.getElementById('req-count').innerText = state.requiredPlayers;
    document.getElementById('req-teams').innerText = state.requiredTeams;
    document.getElementById('req-planets').innerText = state.planetCount || 6;
    document.getElementById('max-count').innerText = state.requiredPlayers;

    renderPlayersTable(state);
    updateControls(state);
    generatePlayerButtons(state);
});

function generatePlayerButtons(state) {
    const container = document.getElementById('players-btns');
    container.innerHTML = '';
    const minP = state.requiredTeams * 3;
    const maxP = state.requiredTeams * 5;
    for (let i = minP; i <= maxP; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        if (i === state.requiredPlayers) btn.classList.add('active-btn');
        btn.onclick = (function(val) { return function() { setPlayers(val); }; })(i);
        container.appendChild(btn);
    }
}

function renderPlayersTable(state) {
    const tbody = document.querySelector('#players-table tbody');
    tbody.innerHTML = '';
    const players = Object.entries(state.players || {});
    document.getElementById('players-count').innerText = players.length;

    const rolesRu = { 'PILOT': 'Пилот', 'ENGINEER': 'Инженер', 'ASTRO': 'Астрофизик', 'XENO': 'Ксенобиолог', 'DIRECTOR': 'Директор' };

    players.forEach(function(entry) {
        const id = entry[0];
        const p = entry[1];
        const tr = document.createElement('tr');
        const teamName = (p.team !== null && p.team !== undefined && state.teams[p.team]) ? state.teams[p.team].name : '-';

        // 🆕 Цветовая индикация статуса
        let statusClass = '';
        let statusText = p.status || 'Ожидание';
        if (statusText === 'Голосует') statusClass = 'status-voting';
        else if (statusText === 'Проголосовал') statusClass = 'status-voted';
        else if (statusText === 'Готов') statusClass = 'status-ready';

        tr.innerHTML = '<td title="' + id + '">' + id.substring(0, 6) + '...</td>' +
            '<td>' + (p.name || '<i style="color:#666">Не введено</i>') + '</td>' +
            '<td>' + teamName + '</td>' +
            '<td>' + (rolesRu[p.role] || '-') + '</td>' +
            '<td style="color:' + (p.energy < 30 ? '#e94560' : '#4ecca3') + '">' + (p.energy !== undefined ? p.energy : '-') + ' ⚡</td>' +
            '<td style="color:#f9ed69">' + (p.science !== undefined ? p.science : '-') + ' 🔬</td>' +
            '<td class="' + statusClass + '">' + statusText + '</td>';
        tbody.appendChild(tr);
    });
}

function updateControls(state) {
    const btn = document.getElementById('btn-next-phase');
    const desc = document.getElementById('phase-desc');
    const playersCount = Object.keys(state.players || {}).length;
    const minReq = state.requiredTeams * 3;
    const req = Math.max(state.requiredPlayers, minReq);

    if (state.phase === 'WAITING') {
        if (playersCount >= req) {
            desc.innerText = '✅ Собрано ' + playersCount + '. Можно начинать!';
            btn.disabled = false;
            btn.innerText = '▶️ НАЧАТЬ ФАЗУ 1 (ВЫБОР РОЛЕЙ)';
        } else {
            desc.innerText = '⏳ Ожидание... (' + playersCount + ' / ' + req + ')';
            btn.disabled = true;
            btn.innerText = '⛔ НЕДОСТАТОЧНО ИГРОКОВ';
        }
    } else if (state.phase === 'PHASE_1_ROLES') {
        desc.innerText = 'Идет выбор ролей. Ждите завершения.';
        btn.disabled = false; btn.innerText = '▶️ ПЕРЕЙТИ К ФАЗЕ 2 (РАЗВЕДКА)';
    } else if (state.phase === 'PHASE_2_SCAN') {
        if (state.votingFinished) {
            desc.innerText = '✅ Голосование завершено! Все выбрали планеты.';
            btn.disabled = false; btn.innerText = '▶️ ПЕРЕЙТИ К ФАЗЕ 3';
        } else if (state.votingStarted) {
            desc.innerText = '🗳️ Идет голосование! Ожидайте...';
            btn.disabled = false; btn.innerText = '▶️ ПРИНУДИТЕЛЬНО К ФАЗЕ 3';
        } else {
            desc.innerText = 'Идет разведка планет.';
            btn.disabled = false; btn.innerText = '▶️ ПРИНУДИТЕЛЬНО К ФАЗЕ 3';
        }
    } else if (state.phase === 'PHASE_3_PREP') {
        desc.innerText = 'Подготовка.';
        btn.disabled = false; btn.innerText = '▶️ ПЕРЕЙТИ К ФАЗЕ 4';
    } else if (state.phase === 'PHASE_4_LANDING') {
        desc.innerText = 'Спуск!';
        btn.disabled = false; btn.innerText = '▶️ ЗАВЕРШИТЬ';
    } else {
        desc.innerText = 'Матч завершен.';
        btn.disabled = true; btn.innerText = 'ИГРА ОКОНЧЕНА';
    }
}

window.setTeams = function(count) {
    socket.emit('action', { type: 'SET_REQUIRED_TEAMS', count: count });
    document.querySelectorAll('#teams-btns button').forEach(function(b) { b.classList.remove('active-btn'); });
    event.target.classList.add('active-btn');
};

window.setPlayers = function(count) {
    socket.emit('action', { type: 'SET_REQUIRED_PLAYERS', count: count });
};

window.setPlanets = function(count) {
    socket.emit('action', { type: 'SET_PLANET_COUNT', count: count });
    document.querySelectorAll('#planets-btns button').forEach(function(b) { b.classList.remove('active-btn'); });
    event.target.classList.add('active-btn');
};

window.advancePhase = function() {
    if (confirm('Перевести игру на следующую фазу?')) {
        socket.emit('action', { type: 'ADVANCE_PHASE' });
    }
};