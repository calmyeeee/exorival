/**
 * Клиентская часть Фазы 3 для ИНЖЕНЕРА
 * Управление: Три кнопки для активации систем и щита
 */

class EngineerPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.buttons = { b1: false, b2: false, b3: false };
        this.initialized = false;
        
        this.initUI();
        this.setupListeners();
    }

    initUI() {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e;">
                <h1 style="color: #fff;">⚙️ ИНЖЕНЕР - Фаза 3</h1>
                <p style="color: #aaa;">Нажимайте кнопки для управления системами</p>
                <p style="color: #ffff00; font-size: 14px;">💡 Комбинация К1+К2 активирует щит!</p>
                
                <div style="display: flex; gap: 20px; margin: 40px;">
                    <!-- Кнопка 1 -->
                    <button id="btn1" data-btn="b1"
                            style="width: 120px; height: 120px; border-radius: 15px; border: none; font-size: 20px; font-weight: bold; cursor: pointer; transition: all 0.1s; background: #ff6600; color: white; box-shadow: 0 6px 0 #993300;">
                        К1<br/>🔥<br/>ТЯГА
                    </button>
                    
                    <!-- Кнопка 2 -->
                    <button id="btn2" data-btn="b2"
                            style="width: 120px; height: 120px; border-radius: 15px; border: none; font-size: 20px; font-weight: bold; cursor: pointer; transition: all 0.1s; background: #0066ff; color: white; box-shadow: 0 6px 0 #003399;">
                        К2<br/>🛡️<br/>ЩИТ
                    </button>
                    
                    <!-- Кнопка 3 -->
                    <button id="btn3" data-btn="b3"
                            style="width: 120px; height: 120px; border-radius: 15px; border: none; font-size: 20px; font-weight: bold; cursor: pointer; transition: all 0.1s; background: #00cc00; color: white; box-shadow: 0 6px 0 #006600;">
                        К3<br/>⚡<br/>ЭНЕРГИЯ
                    </button>
                </div>
                
                <div id="status" style="color: #fff; margin-top: 20px;">Системы в норме</div>
                
                <div id="shieldStatus" style="color: #ffff00; margin-top: 10px; font-size: 18px; min-height: 24px;"></div>
            </div>
        `;

        const setupButton = (btnId) => {
            const btn = document.getElementById(btnId);
            const btnKey = btn.dataset.btn;
            
            const press = () => {
                this.buttons[btnKey] = true;
                btn.style.background = '#ffffff';
                btn.style.boxShadow = '0 2px 0 #666666';
                btn.style.transform = 'translateY(4px)';
                this.checkShield();
                this.sendInput();
            };
            
            const release = () => {
                this.buttons[btnKey] = false;
                // Возврат к оригинальному цвету
                const colors = { b1: '#ff6600', b2: '#0066ff', b3: '#00cc00' };
                const shadows = { b1: '#993300', b2: '#003399', b3: '#006600' };
                btn.style.background = colors[btnKey];
                btn.style.boxShadow = `0 6px 0 ${shadows[btnKey]}`;
                btn.style.transform = 'translateY(0)';
                this.checkShield();
                this.sendInput();
            };

            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                press();
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                release();
            });
        };

        setupButton('btn1');
        setupButton('btn2');
        setupButton('btn3');
    }

    checkShield() {
        const shieldStatus = document.getElementById('shieldStatus');
        if (this.buttons.b1 && this.buttons.b2) {
            shieldStatus.textContent = '🛡️ ЩИТ АКТИВИРОВАН!';
            shieldStatus.style.color = '#44ff44';
        } else {
            shieldStatus.textContent = '';
        }
    }

    setupListeners() {
        this.socket.on('phase3:start', (data) => {
            document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ! Управляйте системами!';
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
            role: 'engineer',
            data: { buttons: { ...this.buttons } }
        });
    }
}

// Инициализация при загрузке
if (window.socket && window.team) {
    window.phase3Engineer = new EngineerPhase3(window.socket, window.team);
}
