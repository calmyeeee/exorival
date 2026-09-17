/**
 * Клиентская часть Фазы 3 для КСЕНОБИОЛОГА
 * Управление: Сборка ДНК-пазла (перетаскивание фрагментов)
 */

class XenobiologistPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.assembled = 0; // 0-100%
        this.pieces = [];
        this.currentPiece = null;
        this.initialized = false;
        
        this.initUI();
        this.setupListeners();
    }

    initUI() {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e;">
                <h1 style="color: #fff;">🧬 КСЕНОБИОЛОГ - Фаза 3</h1>
                <p style="color: #aaa;">Соберите ДНК-последовательность из фрагментов</p>
                
                <div style="display: flex; gap: 40px; margin: 20px;">
                    <!-- Зона сборки -->
                    <div id="assemblyZone" 
                         style="width: 300px; height: 400px; border: 3px dashed #44ff44; border-radius: 10px; position: relative; background: rgba(0, 50, 0, 0.3);">
                        <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); color: #44ff44; font-weight: bold;">
                            🧩 ЗОНА СБОРКИ
                        </div>
                        <div id="assembledPieces" style="position: absolute; top: 10px; left: 10px; right: 10px;"></div>
                    </div>
                    
                    <!-- Зона фрагментов -->
                    <div id="piecesZone" 
                         style="width: 200px; height: 400px; border: 2px solid #666; border-radius: 10px; position: relative; background: rgba(50, 50, 50, 0.3); overflow-y: auto;">
                        <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); color: #aaa; font-weight: bold;">
                            🔬 ФРАГМЕНТЫ
                        </div>
                        <div id="availablePieces" style="padding: 10px; display: flex; flex-direction: column; gap: 10px;"></div>
                    </div>
                </div>
                
                <div id="progressBar" style="width: 400px; height: 30px; background: #333; border-radius: 15px; overflow: hidden; margin: 20px;">
                    <div id="progressFill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #44ff44, #00cc00); transition: width 0.3s;"></div>
                </div>
                
                <div id="status" style="color: #fff; margin-top: 10px;">Собрано: <span id="assemblePercent">0</span>%</div>
            </div>
        `;

        // Генерация фрагментов ДНК
        this.generatePieces();
    }

    generatePieces() {
        const piecesContainer = document.getElementById('availablePieces');
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
        const shapes = ['A', 'T', 'G', 'C', '◐', '◑'];
        
        // Создаем 10 фрагментов
        for (let i = 0; i < 10; i++) {
            const piece = {
                id: i,
                color: colors[i % colors.length],
                shape: shapes[i % shapes.length],
                assembled: false
            };
            
            const pieceEl = document.createElement('div');
            pieceEl.id = `piece-${i}`;
            pieceEl.style.cssText = `
                width: 60px; height: 60px; 
                background: ${piece.color}; 
                border-radius: 8px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                color: #000;
                cursor: grab;
                user-select: none;
                box-shadow: 0 4px 0 rgba(0,0,0,0.3);
                transition: transform 0.1s;
            `;
            pieceEl.textContent = piece.shape;
            pieceEl.draggable = true;
            
            // Drag events
            pieceEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify(piece));
                pieceEl.style.opacity = '0.5';
            });
            
            pieceEl.addEventListener('dragend', () => {
                pieceEl.style.opacity = '1';
            });

            // Touch events для мобильных
            pieceEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.currentPiece = piece;
                pieceEl.style.transform = 'scale(1.1)';
                pieceEl.style.zIndex = '1000';
            });

            pieceEl.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                pieceEl.style.position = 'fixed';
                pieceEl.style.left = (touch.clientX - 30) + 'px';
                pieceEl.style.top = (touch.clientY - 30) + 'px';
            });

            pieceEl.addEventListener('touchend', (e) => {
                e.preventDefault();
                pieceEl.style.transform = 'scale(1)';
                pieceEl.style.zIndex = '';
                
                // Проверка попадания в зону сборки
                const assemblyZone = document.getElementById('assemblyZone');
                const rect = assemblyZone.getBoundingClientRect();
                const touch = e.changedTouches[0];
                
                if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                    touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                    this.assemblePiece(piece);
                } else {
                    pieceEl.style.position = '';
                    pieceEl.style.left = '';
                    pieceEl.style.top = '';
                }
            });

            piecesContainer.appendChild(pieceEl);
            this.pieces.push(piece);
        }

        // Drop zone для assembly
        const assemblyZone = document.getElementById('assemblyZone');
        assemblyZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            assemblyZone.style.background = 'rgba(0, 100, 0, 0.5)';
        });

        assemblyZone.addEventListener('dragleave', () => {
            assemblyZone.style.background = 'rgba(0, 50, 0, 0.3)';
        });

        assemblyZone.addEventListener('drop', (e) => {
            e.preventDefault();
            assemblyZone.style.background = 'rgba(0, 50, 0, 0.3)';
            
            try {
                const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
                this.assemblePiece(pieceData);
            } catch (err) {
                console.error('Invalid piece data');
            }
        });
    }

    assemblePiece(piece) {
        const pieceEl = document.getElementById(`piece-${piece.id}`);
        if (!pieceEl || piece.assembled) return;

        piece.assembled = true;
        this.assembled += 10; // Каждый фрагмент = 10%
        
        // Перемещение в зону сборки
        const assembledContainer = document.getElementById('assembledPieces');
        pieceEl.style.position = 'relative';
        pieceEl.style.left = '';
        pieceEl.style.top = '';
        pieceEl.style.cursor = 'default';
        pieceEl.draggable = false;
        
        // Добавление в собранную цепочку
        assembledContainer.appendChild(pieceEl);
        
        // Обновление прогресса
        this.updateProgress();
        this.sendInput();
    }

    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const assemblePercent = document.getElementById('assemblePercent');
        const status = document.getElementById('status');
        
        progressFill.style.width = this.assembled + '%';
        assemblePercent.textContent = this.assembled;
        
        if (this.assembled >= 100) {
            status.textContent = '✅ ДНК ПОЛНОСТЬЮ СОБРАНА!';
            status.style.color = '#44ff44';
        } else if (this.assembled >= 50) {
            status.textContent = '⚠️ Продолжайте сборку...';
            status.style.color = '#ffff00';
        }
    }

    setupListeners() {
        this.socket.on('phase3:start', (data) => {
            document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ! Соберите ДНК!';
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
            role: 'xenobiologist',
            data: { 
                assembled: this.assembled,
                currentPiece: this.currentPiece
            }
        });
    }
}

// Инициализация при загрузке
if (window.socket && window.team) {
    window.phase3Xenobiologist = new XenobiologistPhase3(window.socket, window.team);
}
