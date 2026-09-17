/**
 * Клиентская часть Фазы 3 для КСЕНОБИОЛОГА
 * Управление: Сборка ДНК-пазла (drag-n-drop фрагментов)
 */
class XenobiologistPhase3 {
    constructor(socket, team) {
        this.socket = socket;
        this.team = team;
        this.assembled = 0;
        this.pieces = [];
        this.initUI();
        this.setupListeners();
    }
    initUI() {
        document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;">
            <h1 style="color:#fff;">🧬 КСЕНОБИОЛОГ - Фаза 3</h1>
            <p style="color:#aaa;">Перетащите все фрагменты в зону сборки</p>
            <div style="display:flex;gap:30px;margin:20px;">
                <div id="assemblyZone" style="width:250px;height:350px;border:3px dashed #44ff44;border-radius:10px;position:relative;background:rgba(0,50,0,0.3);">
                    <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);color:#44ff44;font-weight:bold;">🧩 ЗОНА СБОРКИ</div>
                    <div id="assembledPieces" style="position:absolute;top:10px;left:10px;right:10px;display:flex;flex-wrap:wrap;gap:5px;"></div>
                </div>
                <div id="piecesZone" style="width:150px;height:350px;border:2px solid #666;border-radius:10px;position:relative;background:rgba(50,50,50,0.3);overflow-y:auto;">
                    <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);color:#aaa;font-weight:bold;">🔬 ФРАГМЕНТЫ</div>
                    <div id="availablePieces" style="padding:10px;display:flex;flex-direction:column;gap:8px;"></div>
                </div>
            </div>
            <div style="width:350px;height:25px;background:#333;border-radius:12px;overflow:hidden;margin:15px;">
                <div id="progressFill" style="width:0%;height:100%;background:linear-gradient(90deg,#44ff44,#00cc00);transition:width 0.3s;"></div>
            </div>
            <div id="status" style="color:#fff;">Собрано: <span id="assemblePercent">0</span>%</div>
        </div>`;
        const colors = ['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff','#44ffff'];
        const shapes = ['A','T','G','C','◐','◑'];
        for(let i=0;i<10;i++) {
            const piece = {id:i,color:colors[i%6],shape:shapes[i%6]};
            const el = document.createElement('div');
            el.id = `piece-${i}`;
            el.style.cssText = `width:50px;height:50px;background:${piece.color};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#000;cursor:grab;user-select:none;box-shadow:0 3px 0 rgba(0,0,0,0.3);`;
            el.textContent = piece.shape;
            el.draggable = true;
            el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify(piece)); el.style.opacity = '0.5'; });
            el.addEventListener('dragend', () => { el.style.opacity = '1'; });
            document.getElementById('availablePieces').appendChild(el);
            this.pieces.push(piece);
        }
        const zone = document.getElementById('assemblyZone');
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.background = 'rgba(0,100,0,0.5)'; });
        zone.addEventListener('dragleave', () => { zone.style.background = 'rgba(0,50,0,0.3)'; });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.background = 'rgba(0,50,0,0.3)';
            try { const p = JSON.parse(e.dataTransfer.getData('text/plain')); this.assemblePiece(p); } catch(err) {}
        });
    }
    assemblePiece(piece) {
        const el = document.getElementById(`piece-${piece.id}`);
        if(!el || piece.assembled) return;
        piece.assembled = true;
        this.assembled += 10;
        el.style.position = 'relative';
        el.style.cursor = 'default';
        el.draggable = false;
        document.getElementById('assembledPieces').appendChild(el);
        document.getElementById('progressFill').style.width = this.assembled + '%';
        document.getElementById('assemblePercent').textContent = this.assembled;
        const status = document.getElementById('status');
        if(this.assembled >= 100) { status.textContent = '✅ ДНК СОБРАНА!'; status.style.color = '#44ff44'; }
        this.sendInput();
    }
    setupListeners() {
        this.socket.on('phase3:start', () => { document.getElementById('status').textContent = '🚀 СПУСК НАЧАЛСЯ! Соберите ДНК!'; document.getElementById('status').style.color = '#44ff44'; });
        this.socket.on('phase3:result', (data) => {
            if (data.team === this.team) {
                const s = document.getElementById('status');
                s.textContent = data.result === 'landed' ? '✅ УСПЕШНО!' : '❌ АВАРИЯ!';
                s.style.color = data.result === 'landed' ? '#44ff44' : '#ff4444';
            }
        });
    }
    sendInput() { this.socket.emit('phase3:input', { role: 'xenobiologist', data: { assembled: this.assembled } }); }
}
if (window.socket && window.team) { window.phase3Xenobiologist = new XenobiologistPhase3(window.socket, window.team); }
