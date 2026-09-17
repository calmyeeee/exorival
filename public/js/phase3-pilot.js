/**
 * Клиентская часть Фазы 3 для ПИЛОТА
 * Управление: Рычаг (слайдер) для горизонтального перемещения
 */

class PilotPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.leverValue = 0;
        this.initUI();
        this.setupListeners();
    }

    initUI() {
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;">
                <h1 style="color:#fff;">🎮 ПИЛОТ - Фаза 3</h1>
                <p style="color:#aaa;">Управляйте рычагом для перемещения влево/вправо</p>
                <input type="range" id="lever" min="-100" max="100" value="0" 
                    style="width:400px;height:50px;margin:40px;" />
                <div id="leverValue" style="color:#fff;font-size:24px;">0%</div>
                <div id="status" style="color:#fff;margin-top:20px;">Ожидание...</div>
            </div>`;
        
        const lever = document.getElementById('lever');
        const leverValue = document.getElementById('leverValue');
        
        lever.addEventListener('input', (e) => {
            this.leverValue = parseInt(e.target.value);
            leverValue.textContent = this.leverValue + '%';
            this.sendInput();
        });
    }

    setupListeners() {
        this.socket.on('phase3:start', () => {
            document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ!';
            document.getElementById('status').style.color = '#44ff44';
        });
        this.socket.on('phase3:result', (data) => {
            if (data.team === this.team) {
                const status = document.getElementById('status');
                status.textContent = data.result === 'landed' ? '✅ УСПЕШНО!' : '❌ АВАРИЯ!';
                status.style.color = data.result === 'landed' ? '#44ff44' : '#ff4444';
            }
        });
    }

    sendInput() {
        this.socket.emit('phase3:input', { role: 'pilot', data: { value: this.leverValue } });
    }
}

if (window.socket && window.team) {
    window.phase3Pilot = new PilotPhase3(window.socket, window.team);
}
