/**
 * XenobiologistGame - Управление ксенобиолога: Сборка ДНК паззл
 * Механика: Нужно собирать фрагменты ДНК (паззлы) в правильном порядке
 * Фрагменты появляются случайно, нужно перетаскивать их на свои места
 * Сложная координация: быстро и точно сопоставлять формы
 */
class XenobiologistGame extends LandingGame {
    constructor(canvasId, socket) {
        super(canvasId, 'xenobiologist', socket);
        
        this.dnaPieces = []; // Available pieces to match
        this.slots = []; // Target slots
        this.draggedPiece = null;
        this.matches = 0;
        this.requiredMatches = 3; // Сколько нужно собрать за уровень
        
        this.generateLevel();
        
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
    }

    generateLevel() {
        this.dnaPieces = [];
        this.slots = [];
        this.matches = 0;
        
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
        const shapes = ['circle', 'square', 'triangle'];
        
        // Генерируем слоты внизу экрана
        for (let i = 0; i < this.requiredMatches; i++) {
            this.slots.push({
                x: 2 + i * 5,
                y: this.rows - 3,
                color: colors[i % colors.length],
                shape: shapes[i % shapes.length],
                matched: false
            });
            
            // Соответствующий кусок ДНК где-то сверху
            this.dnaPieces.push({
                x: Math.random() * (this.cols - 4) + 2,
                y: Math.random() * (this.rows / 2) + 2,
                color: colors[i % colors.length],
                shape: shapes[i % shapes.length],
                originalX: null,
                originalY: null,
                isDragging: false
            });
        }
    }

    handleMouseDown(e) {
        const pos = this.getGridPos(e.clientX, e.clientY);
        this.checkPieceClick(pos.x, pos.y);
    }

    handleTouchStart(e) {
        e.preventDefault();
        const pos = this.getGridPos(e.touches[0].clientX, e.touches[0].clientY);
        this.checkPieceClick(pos.x, pos.y);
    }

    getGridPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const offsetX = (this.width - this.cols * this.cellSize) / 2;
        const offsetY = (this.height - this.rows * this.cellSize) / 2;
        
        return {
            x: (x - offsetX) / this.cellSize,
            y: (y - offsetY) / this.cellSize
        };
    }

    checkPieceClick(x, y) {
        for (const piece of this.dnaPieces) {
            if (!piece.matched && 
                Math.abs(piece.x - x) < 1.5 && 
                Math.abs(piece.y - y) < 1.5) {
                this.draggedPiece = piece;
                piece.isDragging = true;
                piece.originalX = piece.x;
                piece.originalY = piece.y;
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.draggedPiece) return;
        const pos = this.getGridPos(e.clientX, e.clientY);
        this.draggedPiece.x = pos.x;
        this.draggedPiece.y = pos.y;
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.draggedPiece) return;
        const pos = this.getGridPos(e.touches[0].clientX, e.touches[0].clientY);
        this.draggedPiece.x = pos.x;
        this.draggedPiece.y = pos.y;
    }

    handleMouseUp(e) {
        this.checkDrop();
    }

    handleTouchEnd(e) {
        this.checkDrop();
    }

    checkDrop() {
        if (!this.draggedPiece) return;
        
        // Проверяем совпадение со слотом
        for (const slot of this.slots) {
            if (!slot.matched &&
                slot.color === this.draggedPiece.color &&
                slot.shape === this.draggedPiece.shape &&
                Math.abs(this.draggedPiece.x - slot.x) < 1.5 &&
                Math.abs(this.draggedPiece.y - slot.y) < 1.5) {
                
                // Совпадение!
                slot.matched = true;
                this.draggedPiece.matched = true;
                this.draggedPiece.x = slot.x;
                this.draggedPiece.y = slot.y;
                this.matches++;
                
                if (this.matches >= this.requiredMatches) {
                    setTimeout(() => {
                        this.sendResult(true, "ДНК собрана");
                        this.stopLevel(true);
                    }, 500);
                }
                break;
            }
        }
        
        if (!this.draggedPiece.matched) {
            // Возврат на исходную позицию если не совпало
            this.draggedPiece.x = this.draggedPiece.originalX;
            this.draggedPiece.y = this.draggedPiece.originalY;
        }
        
        this.draggedPiece.isDragging = false;
        this.draggedPiece = null;
    }

    handleInput(dt) {
        // Аппарат движется автоматически, игрок занят ДНК
        const speed = 1.5;
        this.apparatusX += speed * dt;
        
        if (this.apparatusX >= this.cols - 1) {
            this.apparatusX = this.cols - 1;
        }
    }

    drawRoleUI() {
        // Рисуем слоты
        for (const slot of this.slots) {
            const screenX = this.getCellScreenX(slot.x);
            const screenY = this.getCellScreenY(slot.y);
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(screenX, screenY, this.cellSize, this.cellSize);
            
            if (slot.matched) {
                this.drawShape(slot.x, slot.y, slot.color, slot.shape, true);
            }
        }
        
        // Рисуем кусочки ДНК
        for (const piece of this.dnaPieces) {
            if (!piece.matched) {
                this.drawShape(piece.x, piece.y, piece.color, piece.shape, piece.isDragging);
            }
        }
        
        // Прогресс
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`ДНК: ${this.matches}/${this.requiredMatches}`, this.width / 2, 30);
        this.ctx.fillText('КСЕНОБИОЛОГ - ДНК ПАЗЗЛ', this.width / 2, this.height - 20);
    }

    drawShape(gridX, gridY, color, shape, isHighlighted) {
        const x = this.getCellScreenX(gridX) + this.cellSize / 2;
        const y = this.getCellScreenY(gridY) + this.cellSize / 2;
        const size = this.cellSize / 2 - 2;
        
        this.ctx.fillStyle = color;
        if (isHighlighted) {
            this.ctx.shadowColor = '#fff';
            this.ctx.shadowBlur = 10;
        }
        
        this.ctx.beginPath();
        if (shape === 'circle') {
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
        } else if (shape === 'square') {
            this.ctx.rect(x - size, y - size, size * 2, size * 2);
        } else if (shape === 'triangle') {
            this.ctx.moveTo(x, y - size);
            this.ctx.lineTo(x + size, y + size);
            this.ctx.lineTo(x - size, y + size);
            this.ctx.closePath();
        }
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    getCellScreenX(gridX) {
        const offsetX = (this.width - this.cols * this.cellSize) / 2;
        return offsetX + gridX * this.cellSize;
    }

    getCellScreenY(gridY) {
        const offsetY = (this.height - this.rows * this.cellSize) / 2;
        return offsetY + gridY * this.cellSize;
    }

    destroy() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
}
