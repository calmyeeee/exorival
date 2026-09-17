/**
 * Клиентская часть Фазы 3 для ПИЛОТА
 * Управление: Рычаг (слайдер) для горизонтального перемещения
 */

class PilotPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.leverValue = 0; // -100 to 100
        this.initialized = false;
        
        this.initUI();
        this.setupListeners();
    }

    initUI() {
        // Создаем интерфейс пилота
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e;">
                <h1 style="color: #fff;">🎮 ПИЛОТ - Фаза 3</h1>
                <p style="color: #aaa;">Управляйте рычагом для перемещения аппарата влево/вправо</p>
                
                <div style="margin: 40px; position: relative;">
                    <!-- Рычаг -->
                    <input type="range" id="lever" min="-100" max="100" value="0" 
                           style="width: 400px; height: 50px; -webkit-appearance: none; background: #333; border-radius: 25px; outline: none;" />
                    <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 24px;">
                        <span id="leverValue">0</span>%
                    </div>
                    <div style="position: absolute; top: 60px; left: 0; color: #ff4444;">← ВЛЕВО</div>
                    <div style="position: absolute; top: 60px; right: 0; color: #44ff44;">ВПРАВО →</div>
                </div>
                
                <div id="status" style="color: #fff; margin-top: 20px;">Ожидание начала...</div>
            </div>
        `;

        const lever = document.getElementById('lever');
        const leverValue = document.getElementById('leverValue');
        
        // Стилизация рычага
        lever.style.background = 'linear-gradient(to right, #ff4444 0%, #666 50%, #44ff44 100%)';
        
        lever.addEventListener('input', (e) => {
            this.leverValue = parseInt(e.target.value);
            leverValue.textContent = this.leverValue;
            this.sendInput();
        });
        
        // Поддержка тач-устройств
        lever.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = lever.getBoundingClientRect();
            const percent = ((touch.clientX - rect.left) / rect.width) * 200 - 100;
            this.leverValue = Math.max(-100, Math.min(100, Math.round(percent)));
            lever.value = this.leverValue;
            leverValue.textContent = this.leverValue;
            this.sendInput();
        });
    }

    setupListeners() {
        this.socket.on('phase3:start', (data) => {
            document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ!';
            document.getElementById('status').style.color = '#44ff44';
        });

        this.socket.on('phase3:update', (data) => {
            // Обновление состояния от сервера (можно отображать текущую высоту)
            if (data.teams && data.teams[this.team]) {
                const pos = data.teams[this.team].position;
                // Можно добавить индикатор прогресса
            }
        });

        this.socket.on('phase3:result', (data) => {
            if (data.team === this.team) {
                const status = document.getElementById('status');
                if (data.result === 'landed') {
                    status.textContent = '✅ УСПЕШНАЯ ПОСАДКА!';
                    status.style.color = '#44ff44';
                } else {
                    status.textContent = '❌ АВАРИЯ: ' + (data.reason || 'Промах');
                    status.style.color = '#ff4444';
                }
            }
        });
    }

    sendInput() {
        if (!this.initialized) {
            this.initialized = true;
        }
        
        this.socket.emit('phase3:input', {
            role: 'pilot',
            data: { value: this.leverValue }
        });
    }
}

// Инициализация при загрузке
if (window.socket && window.team) {
    window.phase3Pilot = new PilotPhase3(window.socket, window.team);
}
