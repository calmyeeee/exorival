/**
 * Клиентская часть Фазы 3 для ИНЖЕНЕРА
 * Управление: Три кнопки (К1+К2 = щит)
 */
class EngineerPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.buttons = { b1: false, b2: false, b3: false };
        this.initUI();
        this.setupListeners();
    }
    initUI() {
        document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;">
            <h1 style="color:#fff;">⚙️ ИНЖЕНЕР - Фаза 3</h1>
            <p style="color:#aaa;">Нажимайте кнопки. К1+К2 = ЩИТ!</p>
            <div style="display:flex;gap:20px;margin:40px;">
                <button id="btn1" data-btn="b1" style="width:100px;height:100px;border-radius:15px;border:none;font-size:20px;font-weight:bold;cursor:pointer;background:#ff6600;color:white;">К1<br/>🔥</button>
                <button id="btn2" data-btn="b2" style="width:100px;height:100px;border-radius:15px;border:none;font-size:20px;font-weight:bold;cursor:pointer;background:#0066ff;color:white;">К2<br/>🛡️</button>
                <button id="btn3" data-btn="b3" style="width:100px;height:100px;border-radius:15px;border:none;font-size:20px;font-weight:bold;cursor:pointer;background:#00cc00;color:white;">К3<br/>⚡</button>
            </div>
            <div id="shieldStatus" style="color:#ffff00;font-size:18px;"></div>
            <div id="status" style="color:#fff;margin-top:20px;">Системы в норме</div>
        </div>`;
        ['btn1','btn2','btn3'].forEach(id => {
            const btn = document.getElementById(id);
            const key = btn.dataset.btn;
            const press = () => { this.buttons[key] = true; btn.style.background = '#fff'; this.checkShield(); this.sendInput(); };
            const release = () => { this.buttons[key] = false; const colors = {b1:'#ff6600',b2:'#0066ff',b3:'#00cc00'}; btn.style.background = colors[key]; this.checkShield(); this.sendInput(); };
            btn.addEventListener('mousedown', press); btn.addEventListener('mouseup', release); btn.addEventListener('mouseleave', release);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(); });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); release(); });
        });
    }
    checkShield() {
        const s = document.getElementById('shieldStatus');
        s.textContent = (this.buttons.b1 && this.buttons.b2) ? '🛡️ ЩИТ АКТИВИРОВАН!' : '';
    }
    setupListeners() {
        this.socket.on('phase3:start', () => { document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ!'; });
        this.socket.on('phase3:result', (data) => {
            if (data.team === this.team) {
                const s = document.getElementById('status');
                s.textContent = data.result === 'landed' ? '✅ УСПЕШНО!' : '❌ АВАРИЯ!';
                s.style.color = data.result === 'landed' ? '#44ff44' : '#ff4444';
            }
        });
    }
    sendInput() { this.socket.emit('phase3:input', { role: 'engineer', data: { buttons: {...this.buttons} } }); }
}
if (window.socket && window.team) { window.phase3Engineer = new EngineerPhase3(window.socket, window.team); }
