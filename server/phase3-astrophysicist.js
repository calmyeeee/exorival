/**
 * Клиентская часть Фазы 3 для АСТРОФИЗИКА
 * Управление: Удержание объекта в объективе телескопа (мышь/тач)
 */

class AstrophysicistPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.position = { x: 50, y: 50 }; // 0-100
        this.holding = false;
        this.initialized = false;
        
        this.initUI();
        this.setupListeners();
    }

    initUI() {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e;">
                <h1 style="color: #fff;">🔭 АСТРОФИЗИК - Фаза 3</h1>
                <p style="color: #aaa;">Удерживайте объект в центре прицела</p>
                
                <div style="position: relative; margin: 20px;">
                    <!-- Область телескопа -->
                    <div id="telescopeArea" 
                         style="width: 400px; height: 400px; border-radius: 50%; border: 4px solid #444; position: relative; overflow: hidden; background: radial-gradient(circle, #001133 0%, #000011 100%);">
                        
                        <!-- Прицел -->
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; border: 2px solid #ff4444; border-radius: 50%; pointer-events: none;">
                            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #ff4444;"></div>
                            <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #ff4444;"></div>
                        </div>
                        
                        <!-- Объект для удержания (курсор) -->
                        <div id="targetObject" 
                             style="position: absolute; width: 40px; height: 40px; background: radial-gradient(circle, #ffff00 0%, #ff8800 100%); border-radius: 50%; cursor: move; box-shadow: 0 0 20px #ffff00;"
                             draggable="false"></div>
                        
                        <!-- Индикатор точности -->
                        <div id="accuracyIndicator" 
                             style="position: absolute; top: 10px; right: 10px; color: #fff; font-size: 14px; background: rgba(0,0,0,0.7); padding: 5px 10px; border-radius: 5px;">
                            Точность: <span id="accuracyValue">100</span>%
                        </div>
                    </div>
                </div>
                
                <div id="status" style="color: #fff; margin-top: 20px;">Наведите на объект</div>
            </div>
        `;

        const area = document.getElementById('telescopeArea');
        const target = document.getElementById('targetObject');
        const accuracyValue = document.getElementById('accuracyValue');
        
        // Начальная позиция объекта в центре
        this.updateTargetPosition(50, 50);
        
        // Обработка движения мыши/тача по области
        const handleMove = (clientX, clientY) => {
            const rect = area.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * 100;
            const y = ((clientY - rect.top) / rect.height) * 100;
            
            // Ограничение пределами круга (примерно)
            const centerX = 50, centerY = 50;
            const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            
            if (distFromCenter > 45) {
                // За пределами круга - нормализуем к краю
                const angle = Math.atan2(y - centerY, x - centerX);
                this.position.x = 50 + Math.cos(angle) * 45;
                this.position.y = 50 + Math.sin(angle) * 45;
            } else {
                this.position.x = Math.max(0, Math.min(100, x));
                this.position.y = Math.max(0, Math.min(100, y));
            }
            
            this.updateTargetPosition(this.position.x, this.position.y);
            this.calculateAccuracy();
            this.sendInput();
        };

        area.addEventListener('mousemove', (e) => {
            if (this.holding) {
                handleMove(e.clientX, e.clientY);
            }
        });

        area.addEventListener('mousedown', () => {
            this.holding = true;
            document.getElementById('status').textContent = '🎯 Удержание объекта...';
        });

        area.addEventListener('mouseup', () => {
            this.holding = false;
            document.getElementById('status').textContent = 'Объект потерян';
        });

        area.addEventListener('mouseleave', () => {
            this.holding = false;
        });

        // Тач-события
        area.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.holding = true;
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
            document.getElementById('status').textContent = '🎯 Удержание объекта...';
        });

        area.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.holding) {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }
        });

        area.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.holding = false;
            document.getElementById('status').textContent = 'Объект потерян';
        });
    }

    updateTargetPosition(x, y) {
        const target = document.getElementById('targetObject');
        if (target) {
            // Конвертация из % в пиксели (400px область, объект 40px)
            const px = (x / 100) * 400 - 20;
            const py = (y / 100) * 400 - 20;
            target.style.left = px + 'px';
            target.style.top = py + 'px';
        }
    }

    calculateAccuracy() {
        const accuracyValue = document.getElementById('accuracyValue');
        const status = document.getElementById('status');
        
        // Расстояние от центра (50, 50)
        const dist = Math.sqrt(Math.pow(this.position.x - 50, 2) + Math.pow(this.position.y - 50, 2));
        
        // Точность: 100% в центре, 0% на расстоянии 20+ единиц
        let accuracy = Math.max(0, 100 - (dist * 5));
        accuracyValue.textContent = Math.round(accuracy);
        
        if (accuracy > 80) {
            accuracyValue.style.color = '#44ff44';
            status.textContent = '🎯 Отличная фокусировка!';
            status.style.color = '#44ff44';
        } else if (accuracy > 50) {
            accuracyValue.style.color = '#ffff00';
            status.textContent = '⚠️ Корректировка...';
            status.style.color = '#ffff00';
        } else {
            accuracyValue.style.color = '#ff4444';
            status.textContent = '❌ Потеря фокуса';
            status.style.color = '#ff4444';
        }
    }

    setupListeners() {
        this.socket.on('phase3:start', (data) => {
            document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ! Удерживайте объект!';
            document.getElementById('status').style.color = '#44ff44';
        });

        this.socket.on('phase3:update', (data) => {
            // Обновление состояния
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
            role: 'astrophysicist',
            data: { 
                x: this.position.x, 
                y: this.position.y, 
                holding: this.holding 
            }
        });
    }
}

// Инициализация при загрузке
if (window.socket && window.team) {
    window.phase3Astrophysicist = new AstrophysicistPhase3(window.socket, window.team);
}
