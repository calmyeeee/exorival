/**
 * Клиентская часть Фазы 3 для ДИРЕКТОРА
 * Управление: Кнопка печати (ставить/не ставить)
 */

class DirectorPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.stamped = false;
        this.initialized = false;
        
        this.initUI();
        this.setupListeners();
    }

    initUI() {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e;">
                <h1 style="color: #fff;">📋 ДИРЕКТОР - Фаза 3</h1>
                <p style="color: #aaa;">Ставьте печать для подтверждения операций</p>
                
                <div style="margin: 40px;">
                    <!-- Кнопка печати -->
                    <button id="stampBtn" 
                            style="width: 200px; height: 200px; border-radius: 50%; border: none; font-size: 24px; font-weight: bold; cursor: pointer; transition: all 0.1s; background: #ff4444; color: white; box-shadow: 0 8px 0 #990000;">
                        🖊️<br/>ПОСТАВИТЬ<br/>ПЕЧАТЬ
                    </button>
                </div>
                
                <div id="status" style="color: #fff; margin-top: 20px;">Статус: Печать не активна</div>
                
                <div id="timer" style="color: #aaa; margin-top: 10px; font-size: 18px;"></div>
            </div>
        `;

        const stampBtn = document.getElementById('stampBtn');
        const status = document.getElementById('status');
        
        // Обработка нажатия (мышь + тач)
        const pressStamp = () => {
            this.stamped = true;
            stampBtn.style.background = '#44ff44';
            stampBtn.style.boxShadow = '0 2px 0 #006600';
            stampBtn.style.transform = 'translateY(6px)';
            stampBtn.innerHTML = '✅<br/>ПЕЧАТЬ<br/>ПОСТАВЛЕНА';
            status.textContent = 'Статус: ✅ Печать активна';
            status.style.color = '#44ff44';
            this.sendInput();
        };
        
        const releaseStamp = () => {
            this.stamped = false;
            stampBtn.style.background = '#ff4444';
            stampBtn.style.boxShadow = '0 8px 0 #990000';
            stampBtn.style.transform = 'translateY(0)';
            stampBtn.innerHTML = '🖊️<br/>ПОСТАВИТЬ<br/>ПЕЧАТЬ';
            status.textContent = 'Статус: Печать не активна';
            status.style.color = '#fff';
            this.sendInput();
        };

        stampBtn.addEventListener('mousedown', pressStamp);
        stampBtn.addEventListener('mouseup', releaseStamp);
        stampBtn.addEventListener('mouseleave', releaseStamp);
        
        stampBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            pressStamp();
        });
        stampBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            releaseStamp();
        });
    }

    setupListeners() {
        this.socket.on('phase3:start', (data) => {
            document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ! Ставьте печать!';
        });

        this.socket.on('phase3:update', (data) => {
            // Можно отображать дополнительную информацию
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
            role: 'director',
            data: { stamped: this.stamped }
        });
    }
}

// Инициализация при загрузке
if (window.socket && window.team) {
    window.phase3Director = new DirectorPhase3(window.socket, window.team);
}
