// public/client.js
const socket = io();

socket.on('connect', function() {
    socket.emit('register', { type: 'PLAYER' });
});
socket.on('error_msg', function(msg) { alert(msg); });
socket.on('disconnect', function(reason) {
    if (reason === 'io server disconnect') {
        document.body.innerHTML = '<h1 style="color:red;padding:50px;">Сервер отклонил подключение.</h1>';
    }
});

const screens = {
    waiting: document.getElementById('ui-waiting'),
    name: document.getElementById('ui-name'),
    draft: document.getElementById('ui-draft'),
    summary: document.getElementById('ui-summary'),
    scan: document.getElementById('ui-scan'),
    results: document.getElementById('ui-results'),
    landing: document.getElementById('ui-landing')
};

let mySocketId = null;
let myNameSubmitted = false;
let lastDescentRole = null;

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
    const pc = state.playersCount || 0;
    const rp = state.requiredPlayers || 10;
    const ce = document.getElementById('count');
    if (ce) ce.innerText = pc + '/' + rp;

    if (state.isMaster) return;

    if (state.phase === 'WAITING') {
        lastDescentRole = null;
        showScreen('waiting');
        document.querySelector('#ui-waiting h1').innerText = pc < rp ? 'Ожидание игроков...' : 'Лобби заполнено. Ждем ведущего...';
    } else if (state.phase === 'PHASE_1_ROLES') {
        lastDescentRole = null;
        handlePhase1(state);
    } else if (state.phase === 'PHASE_2_SCAN') {
        lastDescentRole = null;
        if (state.votingFinished) { showScreen('results'); renderResults(state); }
        else { showScreen('scan'); renderScanPhase(state); }
    } else if (state.phase === 'PHASE_3_DESCENT') {
        showScreen('landing');
        renderDescentPhase(state);
    } else {
        lastDescentRole = null;
        showScreen('waiting');
        document.querySelector('#ui-waiting h1').innerText = '🏆 Игра завершена!';
    }
});

// --- ФАЗА 1 ---
function handlePhase1(state) {
    const md = state.players[mySocketId];
    if (!md) return;
    const ap = Object.values(state.players);
    const req = state.requiredPlayers || 10;
    const en = ap.length >= req && ap.every(function(p) { return p.name !== null; });
    const ep = ap.length >= req && ap.every(function(p) { return p.role !== null; });

    if (ep) { showScreen('summary'); renderSummary(state); return; }
    if (state.turnQueue && state.turnQueue.length > 0 && !ep) { showScreen('draft'); renderDraft(state); return; }
    if (!en) {
        showScreen('name');
        const nc = ap.filter(function(p) { return p.name !== null; }).length;
        const wt = document.getElementById('waiting-names');
        if (wt) wt.innerText = 'Ожидаем... (' + nc + '/' + req + ')';
        const inp = document.getElementById('name-input');
        const btn = document.querySelector('#ui-name button');
        if (md.name === null && !myNameSubmitted) { if(inp)inp.disabled=false; if(btn)btn.disabled=false; }
        else { if(inp)inp.disabled=true; if(btn)btn.disabled=true; }
    }
}

function renderDraft(state) {
    const board = document.getElementById('draft-board');
    const st = document.getElementById('draft-status');
    if (!board || !st) return;
    board.innerHTML = '';
    const cts = state.turnQueue[state.currentTurnIndex];
    const imt = cts === mySocketId;
    const cpn = state.players[cts] ? state.players[cts].name : '???';
    st.innerHTML = imt ? '<div class="my-turn-banner">⚠️ ВАША ОЧЕРЕДЬ!</div>' : '<p>Выбирает: <strong style="color:#66fcf1">' + cpn + '</strong></p>';

    const tc = state.teamCounts || {};
    const mts = state.maxTeamSize || 5;
    for (let t = 0; t < state.requiredTeams; t++) {
        const col = document.createElement('div'); col.className = 'team-column';
        const tn = state.teams[t] ? state.teams[t].name : 'Команда ' + t;
        const cc = tc[t] || 0;
        col.innerHTML = '<h3>' + tn + ' (' + cc + '/' + mts + ')</h3>';
        if (cc >= mts) { const w=document.createElement('div'); w.style.color='#e94560'; w.innerText='⛔ Заполнена'; col.appendChild(w); }
        const tr = [];
        Object.values(state.players).forEach(function(p){if(p.team===t)tr.push(p.role);});
        ['PILOT','ENGINEER','ASTRO','XENO','DIRECTOR'].forEach(function(r){
            const b=document.createElement('button'); b.className='role-btn'; let txt=rolesRu[r];
            if(tr.indexOf(r)!==-1){b.classList.add('taken');b.disabled=true;let wn='???';Object.values(state.players).forEach(function(p){if(p.team===t&&p.role===r&&p.name)wn=p.name;});txt+=' ('+wn+')';}
            else{b.disabled=!imt||cc>=mts;b.onclick=(function(ti,ro){return function(){window.pickRole(ti,ro);};})(t,r);}
            b.innerText=txt;col.appendChild(b);
        });
        board.appendChild(col);
    }
}

function renderSummary(state) {
    const l=document.querySelector('.summary-layout'); if(!l)return; l.innerHTML='';
    for(let t=0;t<state.requiredTeams;t++){
        const c=document.createElement('div');c.className='team-card';
        const h=document.createElement('h3');const s=document.createElement('span');s.innerText=state.teams[t]?state.teams[t].name:'Команда '+t;
        const rb=document.createElement('button');rb.className='btn-small';rb.innerText='✏️';rb.onclick=(function(id){return function(){window.promptRenameTeam(id);};})(t);
        h.appendChild(s);h.appendChild(rb);
        const tb=document.createElement('table');const tbd=document.createElement('tbody');tb.appendChild(tbd);
        c.appendChild(h);c.appendChild(tb);l.appendChild(c);
        tbd.innerHTML='<tr><th>Имя</th><th>Роль</th></tr>';
        Object.values(state.players).forEach(function(p){if(p.team===t){const r=document.createElement('tr');const n=document.createElement('td');n.innerText=p.name;const rl=document.createElement('td');rl.innerText=(rolesRu[p.role]||p.role).replace(/[^a-zA-Zа-яА-ЯЁё\s]/g,'').trim();r.appendChild(n);r.appendChild(rl);tbd.appendChild(r);}});
    }
}

// --- ФАЗА 2 ---
function renderScanPhase(state) {
    const md=state.players[mySocketId]; if(!md)return;
    document.getElementById('scan-role').innerText=rolesRu[md.role]||md.role;
    document.getElementById('scan-team').innerText=state.teams[md.team]?state.teams[md.team].name:'-';
    const ee=document.getElementById('scan-energy');ee.innerText=md.energy;ee.style.color=md.energy<15?'#e94560':'#66fcf1';
    document.getElementById('scan-science').innerText=md.science;
    document.getElementById('scan-status-msg').innerText=state.votingStarted?'🗳️ ГОЛОСОВАНИЕ!':'Тратьте энергию на разведку';
    const th=document.getElementById('scan-thead');const tb=document.getElementById('scan-tbody');th.innerHTML='';tb.innerHTML='';
    const cs=state.scanCosts||{};const ns=state.paramNames||{};const ks=['diameter','mass','atmosphere','magneticField','water','biomarkers'];
    const trh=document.createElement('tr');const thn=document.createElement('th');thn.innerText='Планета';trh.appendChild(thn);
    ks.forEach(function(k){const t=document.createElement('th');t.innerHTML=(ns[k]||k)+'<span class="cost-label">'+(cs[k]||'?')+' ⚡</span>';trh.appendChild(t);});
    th.appendChild(trh);
    state.planets.forEach(function(pl){
        const tr=document.createElement('tr');const td=document.createElement('td');td.innerText=pl.name;td.style.color='#66fcf1';tr.appendChild(td);
        ks.forEach(function(k){
            const t=document.createElement('td');
            if(pl[k]!==undefined){t.className='cell-revealed';if(typeof pl[k]==='boolean')t.innerText=pl[k]?'✅ Да':'❌ Нет';else if(Array.isArray(pl[k]))t.innerText=pl[k].length>0?pl[k].join(', '):'Нет';else t.innerText=pl[k];}
            else{t.className='cell-hidden';if(!state.votingStarted&&md.energy>=cs[k]){const b=document.createElement('button');b.className='scan-btn';b.innerText='Разведать (-'+cs[k]+'⚡)';b.onclick=(function(pid,pk){return function(){window.scanParam(pid,pk);};})(pl.id,k);t.appendChild(b);}else t.innerText='???';}
            tr.appendChild(t);
        });
        tb.appendChild(tr);
    });
    const vb=document.getElementById('vote-block');
    if(state.votingStarted&&!state.votingFinished){vb.style.display='block';renderVoteButtons(state);}else{vb.style.display='none';}
}

function renderVoteButtons(state) {
    const c=document.getElementById('vote-buttons');c.innerHTML='';const md=state.players[mySocketId];if(!md)return;
    const mv=state.votes[md.team]||{};
    if(mv[mySocketId]!==undefined){c.innerHTML='<p style="color:#4ecca3;font-size:18px;">✅ Вы проголосовали</p>';return;}
    const w=md.role==='DIRECTOR'?2:1;c.innerHTML='<p style="color:#f9ed69">Вес голоса: '+w+'</p>';
    state.planets.forEach(function(pl){const b=document.createElement('button');b.innerText=pl.name;b.onclick=(function(pid){return function(){window.votePlanet(pid);};})(pl.id);c.appendChild(b);});
}

function renderResults(state) {
    const tb=document.querySelector('#results-table tbody');if(!tb)return;tb.innerHTML='';
    (state.voteResults||[]).forEach(function(r){const tr=document.createElement('tr');tr.innerHTML='<td style="color:#66fcf1">'+r.teamName+'</td><td style="color:#4ecca3">'+r.planetName+'</td><td>'+r.totalVotes+'</td><td>'+r.voters+'</td>';tb.appendChild(tr);});
}


// =====================================================================
// 🆕 ФАЗА 3: СПУСК АППАРАТА (ПОЛНОСТЬЮ РАБОЧАЯ)
// =====================================================================

function renderDescentPhase(state) {
    const md = state.players[mySocketId];
    if (!md) return;
    const ds = state.descentState;
    if (!ds) return;

    const container = document.getElementById('ui-landing');

    // Строим UI только один раз при входе в фазу или смене роли
    if (lastDescentRole !== md.role) {
        lastDescentRole = md.role;
        buildDescentUI(container, md, state);
    }

    // Обновляем HUD
    const lvl = document.getElementById('desc-level');
    const sts = document.getElementById('desc-status');
    const tmr = document.getElementById('desc-time');

    if (lvl) lvl.innerText = (ds.currentLine + 1) + ' / ' + ds.totalLines;
    if (tmr) tmr.innerText = Math.ceil(ds.timeLeft / 1000) + 'с';

    if (sts) {
        if (ds.status === 'fail') { sts.innerText = '❌ ' + ds.reason; sts.style.color = '#e94560'; }
        else if (ds.status === 'success') { sts.innerText = '✅ ПОСАДКА УСПЕШНА!'; sts.style.color = '#4ecca3'; }
        else { sts.innerText = 'Спуск...'; sts.style.color = '#66fcf1'; }
    }

    drawCanvas(ds);
}

function buildDescentUI(container, myData, state) {
    container.innerHTML = '';
    container.className = 'screen active descent-container';

    const teamName = state.teams[myData.team] ? state.teams[myData.team].name : '-';

    // HUD
    const hud = document.createElement('div');
    hud.className = 'descent-hud';
    hud.innerHTML = '<div><h2>🚀 Спуск аппарата</h2>' +
        '<p>Роль: <strong>' + (rolesRu[myData.role]||myData.role) + '</strong> | Команда: <strong>' + teamName + '</strong></p>' +
        '<p>Уровень: <strong id="desc-level">1/30</strong> | Время: <strong id="desc-time">20с</strong></p></div>' +
        '<div id="desc-status" class="status-msg">Спуск...</div>';
    container.appendChild(hud);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'desc-canvas';
    canvas.width = 600;
    canvas.height = 400;
    canvas.style.border = '2px solid #45a29e';
    canvas.style.background = '#000';
    canvas.style.borderRadius = '5px';
    container.appendChild(canvas);

    // Управление по ролям
    const ctrl = document.createElement('div');
    ctrl.className = 'descent-controls';
    ctrl.id = 'desc-controls';

    if (myData.role === 'PILOT') {
        ctrl.innerHTML =
            '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;">' +
            '<button class="scan-btn" onmousedown="sendD({x:0,y:-1})" onmouseup="sendD({x:0,y:0})" ontouchstart="sendD({x:0,y:-1})" ontouchend="sendD({x:0,y:0})">⬆ Вверх</button>' +
            '<div style="display:flex;gap:10px;">' +
            '<button class="scan-btn" onmousedown="sendD({x:-1,y:0})" onmouseup="sendD({x:0,y:0})" ontouchstart="sendD({x:-1,y:0})" ontouchend="sendD({x:0,y:0})">⬅ Влево</button>' +
            '<button class="scan-btn" onmousedown="sendD({x:1,y:0})" onmouseup="sendD({x:0,y:0})" ontouchstart="sendD({x:1,y:0})" ontouchend="sendD({x:0,y:0})">➡ Вправо</button>' +
            '</div></div>';
    } else if (myData.role === 'ENGINEER') {
        ctrl.innerHTML =
            '<button class="scan-btn" onmousedown="sendD({boost:true})" onmouseup="sendD({boost:false})" ontouchstart="sendD({boost:true})" ontouchend="sendD({boost:false})">🔥 УСКОРЕНИЕ</button>' +
            '<button class="scan-btn" onmousedown="sendD({stabilize:true})" onmouseup="sendD({stabilize:false})" ontouchstart="sendD({stabilize:true})" ontouchend="sendD({stabilize:false})">⚖️ СТАБИЛИЗАЦИЯ</button>';
    } else if (myData.role === 'DIRECTOR') {
        ctrl.innerHTML =
            '<div style="text-align:center;"><p style="color:#e94560;font-size:12px;">Без печати стабильность падает на 50%!</p>' +
            '<button class="scan-btn hold-btn" onmousedown="sendD({stampActive:true})" onmouseup="sendD({stampActive:false})" ontouchstart="sendD({stampActive:true})" ontouchend="sendD({stampActive:false})">🖋️ УДЕРЖИВАТЬ ПЕЧАТЬ</button></div>';
    } else if (myData.role === 'ASTRO') {
        ctrl.innerHTML =
            '<button class="scan-btn hold-btn" onmousedown="sendD({focused:true})" onmouseup="sendD({focused:false})" ontouchstart="sendD({focused:true})" ontouchend="sendD({focused:false})">🔭 УДЕРЖИВАТЬ ФОКУС</button>';
    } else if (myData.role === 'XENO') {
        ctrl.innerHTML =
            '<button class="scan-btn hold-btn" onmousedown="sendD({synced:true})" onmouseup="sendD({synced:false})" ontouchstart="sendD({synced:true})" ontouchend="sendD({synced:false})">🧬 СИНХРОНИЗАЦИЯ</button>';
    }

    container.appendChild(ctrl);

    // Клавиатура для пилота
    if (myData.role === 'PILOT') {
        document.onkeydown = function(e) {
            if (e.key === 'ArrowLeft') sendD({x:-1,y:0});
            if (e.key === 'ArrowRight') sendD({x:1,y:0});
            if (e.key === 'ArrowUp') sendD({x:0,y:-1});
        };
        document.onkeyup = function(e) {
            if (['ArrowLeft','ArrowRight','ArrowUp'].indexOf(e.key) !== -1) sendD({x:0,y:0});
        };
    } else {
        document.onkeydown = null;
        document.onkeyup = null;
    }
}

function drawCanvas(ds) {
    const canvas = document.getElementById('desc-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, W, H);

    if (ds.status === 'fail') {
        ctx.fillStyle = '#e94560'; ctx.font = '30px monospace'; ctx.textAlign = 'center';
        ctx.fillText('КРУШЕНИЕ!', W/2, H/2); return;
    }
    if (ds.status === 'success') {
        ctx.fillStyle = '#4ecca3'; ctx.font = '30px monospace'; ctx.textAlign = 'center';
        ctx.fillText('ПОСАДКА УСПЕШНА!', W/2, H/2); return;
    }

    // Препятствия
    (ds.obstacles || []).forEach(function(o) {
        ctx.fillStyle = o.type === 'moving' ? '#e94560' : '#1f2833';
        const ox = (o.x / 100) * W;
        const ow = (o.width / 100) * W;
        if (o.type === 'static') {
            ctx.fillRect(ox, (o.yStart/100)*H, ow, ((o.yEnd-o.yStart)/100)*H);
        } else {
            ctx.fillRect(ox, (o.y/100)*H - 10, ow, 20);
        }
    });

    // Мишень
    if (ds.targetPosition) {
        ctx.fillStyle = '#f9ed69';
        ctx.beginPath();
        ctx.arc((ds.targetPosition.x/100)*W, H-30, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('ЦЕЛЬ', (ds.targetPosition.x/100)*W, H-27);
    }

    // Корабль
    if (ds.shipPosition) {
        ctx.fillStyle = '#66fcf1';
        const sx = (ds.shipPosition.x/100)*W;
        const sy = (ds.shipPosition.y/100)*H;
        ctx.fillRect(sx-10, sy-10, 20, 20);
        ctx.fillStyle = '#000'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('▼', sx, sy+4);
    }
}

window.sendD = function(data) {
    data.type = 'DESCENT_ACTION';
    socket.emit('action', data);
};


// --- ОБЩИЕ ДЕЙСТВИЯ ---
window.submitName = function() {
    const i=document.getElementById('name-input');if(!i)return;const n=i.value.trim();
    if(n.length>0){socket.emit('action',{type:'SET_NAME',name:n});myNameSubmitted=true;i.disabled=true;const b=document.querySelector('#ui-name button');if(b)b.disabled=true;}
};
window.pickRole = function(t,r){socket.emit('action',{type:'SELECT_ROLE',teamId:t,role:r});};
window.promptRenameTeam = function(t){const n=prompt('Новое название:');if(n&&n.trim().length>0)socket.emit('action',{type:'RENAME_TEAM',teamId:t,newName:n.trim()});};
window.scanParam = function(pid,pk){socket.emit('action',{type:'SCAN_PARAM',planetId:pid,paramKey:pk});};
window.votePlanet = function(pid){socket.emit('action',{type:'VOTE_PLANET',planetId:pid});};