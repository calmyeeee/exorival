// public/master.js
const socket = io();

socket.on('connect', function() {
    socket.emit('register', { type: 'MASTER' });
});

const phasesRu = {
    'WAITING': 'ОЖИДАНИЕ ИГРОКОВ',
    'PHASE_1_ROLES': 'ФАЗА 1: ВЫБОР РОЛЕЙ',
    'PHASE_2_SCAN': 'ФАЗА 2: РАЗВЕДКА ПЛАНЕТ',
    'PHASE_3_DESCENT': 'ФАЗА 3: СПУСК АППАРАТА',
    'PHASE_4_RECON': 'ФАЗА 4: РАЗВЕДКА НА ПОВЕРХНОСТИ',
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

    // Мониторинг Фазы 3
    const monitor = document.getElementById('descent-monitor');
    if (state.phase === 'PHASE_3_DESCENT') {
        if (monitor) monitor.style.display = 'block';
        renderDescentMonitor(state);
    } else {
        if (monitor) monitor.style.display = 'none';
    }
});

function generatePlayerButtons(state) {
    const c = document.getElementById('players-btns'); c.innerHTML = '';
    const min = state.requiredTeams * 3; const max = state.requiredTeams * 5;
    for (let i = min; i <= max; i++) {
        const b = document.createElement('button'); b.innerText = i;
        if (i === state.requiredPlayers) b.classList.add('active-btn');
        b.onclick = (function(v){return function(){setPlayers(v);};})(i);
        c.appendChild(b);
    }
}

function renderPlayersTable(state) {
    const tb = document.querySelector('#players-table tbody'); tb.innerHTML = '';
    const pl = Object.entries(state.players || {});
    document.getElementById('players-count').innerText = pl.length;
    const rr = {'PILOT':'Пилот','ENGINEER':'Инженер','ASTRO':'Астрофизик','XENO':'Ксенобиолог','DIRECTOR':'Директор'};

    pl.forEach(function(e) {
        const id=e[0]; const p=e[1]; const tr=document.createElement('tr');
        const tn=(p.team!==null&&p.team!==undefined&&state.teams[p.team])?state.teams[p.team].name:'-';
        let sc='', st=p.status||'Ожидание';
        if(st==='Голосует')sc='status-voting';
        else if(st==='Проголосовал')sc='status-voted';
        else if(st==='Готов')sc='status-ready';
        else if(st.indexOf('Спуск')!==-1||st==='Играет')sc='status-voting';

        tr.innerHTML='<td title="'+id+'">'+id.substring(0,6)+'...</td>'+
            '<td>'+(p.name||'<i style="color:#666">-</i>')+'</td>'+
            '<td>'+tn+'</td>'+
            '<td>'+(rr[p.role]||'-')+'</td>'+
            '<td style="color:'+(p.energy<30?'#e94560':'#4ecca3')+'">'+(p.energy!==undefined?p.energy:'-')+' ⚡</td>'+
            '<td style="color:#f9ed69">'+(p.science!==undefined?p.science:'-')+' 🔬</td>'+
            '<td class="'+sc+'">'+st+'</td>';
        tb.appendChild(tr);
    });
}

function renderDescentMonitor(state) {
    const c = document.getElementById('descent-teams-info');
    if (!c || !state.allDescentStates) return;
    c.innerHTML = '';
    for (let t = 0; t < state.requiredTeams; t++) {
        const ds = state.allDescentStates[t];
        const tn = state.teams[t] ? state.teams[t].name : 'Команда ' + t;
        const d = document.createElement('div');
        d.style.cssText = 'border:1px solid #0f3460;padding:10px;margin-bottom:10px;border-radius:4px;';
        let col = '#66fcf1', txt = 'Линия ' + (ds.currentLine+1) + '/' + ds.totalLines + ' | Время: ' + Math.ceil(ds.timeLeft/1000) + 'с';
        if (ds.status === 'fail') { col = '#e94560'; txt = '❌ ПРОВАЛ: ' + ds.reason; }
        if (ds.status === 'success') { col = '#4ecca3'; txt = '✅ УСПЕШНО'; }
        d.innerHTML = '<strong>' + tn + '</strong>: <span style="color:' + col + '">' + txt + '</span>';
        c.appendChild(d);
    }
}

function updateControls(state) {
    const btn = document.getElementById('btn-next-phase');
    const desc = document.getElementById('phase-desc');
    const pc = Object.keys(state.players || {}).length;
    const mr = state.requiredTeams * 3;
    const req = Math.max(state.requiredPlayers, mr);

    if (state.phase === 'WAITING') {
        if (pc >= req) { desc.innerText='✅ Собрано '+pc; btn.disabled=false; btn.innerText='▶️ НАЧАТЬ ФАЗУ 1'; }
        else { desc.innerText='⏳ Ожидание... ('+pc+'/'+req+')'; btn.disabled=true; btn.innerText='⛔ НЕДОСТАТОЧНО ИГРОКОВ'; }
    } else if (state.phase === 'PHASE_1_ROLES') {
        desc.innerText='Идет выбор ролей.'; btn.disabled=false; btn.innerText='▶️ К ФАЗЕ 2';
    } else if (state.phase === 'PHASE_2_SCAN') {
        if (state.votingFinished) { desc.innerText='✅ Голосование завершено!'; btn.disabled=false; btn.innerText='▶️ К ФАЗЕ 3 (СПУСК)'; }
        else if (state.votingStarted) { desc.innerText='🗳️ Голосование...'; btn.disabled=false; btn.innerText='▶️ ПРИНУДИТЕЛЬНО К ФАЗЕ 3'; }
        else { desc.innerText='Разведка планет.'; btn.disabled=false; btn.innerText='▶️ ПРИНУДИТЕЛЬНО К ФАЗЕ 3'; }
    } else if (state.phase === 'PHASE_3_DESCENT') {
        desc.innerText='🚀 Идет спуск аппарата!'; btn.disabled=false; btn.innerText='▶️ ПРИНУДИТЕЛЬНО К ФАЗЕ 4';
    } else if (state.phase === 'PHASE_4_RECON') {
        desc.innerText='Разведка на поверхности.'; btn.disabled=false; btn.innerText='▶️ ЗАВЕРШИТЬ';
    } else {
        desc.innerText='Матч завершен.'; btn.disabled=true; btn.innerText='ИГРА ОКОНЧЕНА';
    }
}

window.setTeams = function(c) {
    socket.emit('action', { type: 'SET_REQUIRED_TEAMS', count: c });
    document.querySelectorAll('#teams-btns button').forEach(function(b){b.classList.remove('active-btn');});
    event.target.classList.add('active-btn');
};
window.setPlayers = function(c) { socket.emit('action', { type: 'SET_REQUIRED_PLAYERS', count: c }); };
window.setPlanets = function(c) {
    socket.emit('action', { type: 'SET_PLANET_COUNT', count: c });
    document.querySelectorAll('#planets-btns button').forEach(function(b){b.classList.remove('active-btn');});
    event.target.classList.add('active-btn');
};
window.advancePhase = function() {
    if (confirm('Перевести на следующую фазу?')) socket.emit('action', { type: 'ADVANCE_PHASE' });
};
window.restartPhase3 = function() {
    if (confirm('Перезапустить спуск для всех команд?')) socket.emit('action', { type: 'RESTART_PHASE_3' });
};