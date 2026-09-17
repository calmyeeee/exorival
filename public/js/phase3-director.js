/**
 * Клиентская часть Фазы 3 для ДИРЕКТОРА
 * Управление: Кнопка печати
 */
class DirectorPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.stamped = false;
        this.initUI();
        this.setupListeners();
    }
    initUI() {
        document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;">
            <h1 style="color:#fff;">📋 ДИРЕКТОР - Фаза 3</h1>
            <p style="color:#aaa;">Удерживайте кнопку для активации печати</p>
            <button id="stampBtn" style="width:200px;height:200px;border-radius:50%;border:none;font-size:24px;font-weight:bold;cursor:pointer;background:#ff4444;color:white;margin:40px;">🖊️<br/>ПЕЧАТЬ</button>
            <div id="status" style="color:#fff;">Статус: Не активно</div>
        </div>`;
        const btn = document.getElementById('stampBtn');
        const status = document.getElementById('status');
        const press = () => { this.stamped = true; btn.style.background = '#44ff44'; status.textContent = '✅ Печать активна'; status.style.color = '#44ff44'; this.sendInput(); };
        const release = () => { this.stamped = false; btn.style.background = '#ff4444'; status.textContent = 'Печать не активна'; status.style.color = '#fff'; this.sendInput(); };
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); release(); });
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
    sendInput() { this.socket.emit('phase3:input', { role: 'director', data: { stamped: this.stamped } }); }
}
if (window.socket && window.team) { window.phase3Director = new DirectorPhase3(window.socket, window.team); }
