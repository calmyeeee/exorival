/**
 * Клиентская часть Фазы 3 для АСТРОФИЗИКА
 * Управление: Удержание объекта в центре прицела
 */
class AstrophysicistPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.position = { x: 50, y: 50 };
        this.holding = false;
        this.initUI();
        this.setupListeners();
    }
    initUI() {
        document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;">
            <h1 style="color:#fff;">🔭 АСТРОФИЗИК - Фаза 3</h1>
            <p style="color:#aaa;">Удерживайте объект в центре прицела (нажмите и держите)</p>
            <div id="scopeArea" style="width:350px;height:350px;border-radius:50%;border:4px solid #444;position:relative;overflow:hidden;background:radial-gradient(circle,#001133 0%,#000011 100%);margin:20px;">
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;border:2px solid #ff4444;border-radius:50%;pointer-events:none;"></div>
                <div id="targetObj" style="position:absolute;width:30px;height:30px;background:radial-gradient(circle,#ffff00 0%,#ff8800 100%);border-radius:50%;cursor:pointer;left:160px;top:160px;"></div>
                <div id="accuracy" style="position:absolute;top:10px;right:10px;color:#fff;font-size:14px;background:rgba(0,0,0,0.7);padding:5px 10px;border-radius:5px;">Точность: <span id="accVal">100</span>%</div>
            </div>
            <div id="status" style="color:#fff;">Наведите на объект</div>
        </div>`;
        const area = document.getElementById('scopeArea');
        const target = document.getElementById('targetObj');
        const accVal = document.getElementById('accVal');
        const updatePos = (cx, cy) => {
            const rect = area.getBoundingClientRect();
            const x = ((cx - rect.left) / rect.width) * 100;
            const y = ((cy - rect.top) / rect.height) * 100;
            const dist = Math.sqrt(Math.pow(x-50,2) + Math.pow(y-50,2));
            const accuracy = Math.max(0, 100 - dist * 5);
            accVal.textContent = Math.round(accuracy);
            accVal.style.color = accuracy > 80 ? '#44ff44' : accuracy > 50 ? '#ffff00' : '#ff4444';
            this.position = { x, y };
            target.style.left = (x * 3.5 - 15) + 'px';
            target.style.top = (y * 3.5 - 15) + 'px';
            this.sendInput();
        };
        area.addEventListener('mousedown', () => { this.holding = true; document.getElementById('status').textContent = '🎯 Удержание...'; });
        area.addEventListener('mouseup', () => { this.holding = false; document.getElementById('status').textContent = 'Объект потерян'; });
        area.addEventListener('mousemove', (e) => { if(this.holding) updatePos(e.clientX, e.clientY); });
        area.addEventListener('touchstart', (e) => { e.preventDefault(); this.holding = true; const t = e.touches[0]; updatePos(t.clientX, t.clientY); });
        area.addEventListener('touchmove', (e) => { e.preventDefault(); if(this.holding) { const t = e.touches[0]; updatePos(t.clientX, t.clientY); } });
        area.addEventListener('touchend', (e) => { e.preventDefault(); this.holding = false; });
    }
    setupListeners() {
        this.socket.on('phase3:start', () => { document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ!'; document.getElementById('status').style.color = '#44ff44'; });
        this.socket.on('phase3:result', (data) => {
            if (data.team === this.team) {
                const s = document.getElementById('status');
                s.textContent = data.result === 'landed' ? '✅ УСПЕШНО!' : '❌ АВАРИЯ!';
                s.style.color = data.result === 'landed' ? '#44ff44' : '#ff4444';
            }
        });
    }
    sendInput() { this.socket.emit('phase3:input', { role: 'astrophysicist', data: { ...this.position, holding: this.holding } }); }
}
if (window.socket && window.team) { window.phase3Astrophysicist = new AstrophysicistPhase3(window.socket, window.team); }
