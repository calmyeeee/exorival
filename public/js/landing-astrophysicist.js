/**
 * AstrophysicistGame - Управление астрофизика: Телескоп
 * Механика: Нужно удерживать движущийся объект в объективе телескопа
 * Движение мыши/тача управляет положением объектива
 * Сложность: объект движется по сложной траектории, нужно предугадывать
 */
class AstrophysicistGame extends LandingGame {
    constructor(canvasId, socket) {
        super(canvasId, 'astrophysicist', socket);
        
        this.telescopeX = this.cols / 2;
        this.telescopeY = this.rows / 2;
        this.targetObject = { x: 10, y: 15, vx: 2, vy: 1 };
        this.isHolding = false; // Удерживается ли объект
        
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Преобразуем координаты экрана в координаты сетки
        const offsetX = (this.width - this.cols * this.cellSize) / 2;
        const offsetY = (this.height - this.rows * this.cellSize) / 2;
        
        this.telescopeX = (x - offsetX) / this.cellSize;
        this.telescopeY = (y - offsetY) / this.cellSize;
        
        // Ограничение по полю
        this.telescopeX = Math.max(0, Math.min(this.cols, this.telescopeX));
        this.telescopeY = Math.max(0, Math.min(this.rows, this.telescopeY));
    }

    handleTouchMove(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        
        const offsetX = (this.width - this.cols * this.cellSize) / 2;
        const offsetY = (this.height - this.rows * this.cellSize) / 2;
        
        this.telescopeX = (x - offsetX) / this.cellSize;
        this.telescopeY = (y - offsetY) / this.cellSize;
        
        this.telescopeX = Math.max(0, Math.min(this.cols, this.telescopeX));
        this.telescopeY = Math.max(0, Math.min(this.rows, this.telescopeY));
    }

    update(dt) {
        if (!this.isGameActive) return;

        // Таймер
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.sendResult(false, "Время вышло");
            this.stopLevel(false);
            return;
        }

        // Движение целевого объекта (сложная траектория)
        const complexity = 1 + (this.currentRow * 0.1);
        targetObject.x += targetObject.vx * dt * complexity;
        targetObject.y += targetObject.vy * dt * complexity;
        
        // Отскок от краев
        if (targetObject.x <= 0 || targetObject.x >= this.cols) {
            targetObject.vx *= -1;
        }
        if (targetObject.y <= 0 || targetObject.y >= this.rows) {
            targetObject.vy *= -1;
        }
        
        // Проверка: удерживается ли объект в телескопе
        const dist = Math.sqrt(
            Math.pow(this.telescopeX - targetObject.x, 2) + 
            Math.pow(this.telescopeY - targetObject.y, 2)
        );
        
        this.isHolding = dist < 2; // Радиус захвата
        
        // Если объект в телескопе - аппарат движется к мишени
        if (this.isHolding) {
            // Плавное движение аппарата к targetX
            const dx = this.targetX - this.apparatusX;
            this.apparatusX += dx * 2 * dt;
            
            // Движение мишени
            const targetSpeed = 2 + (this.currentRow * 0.2);
            this.targetX += this.targetDirection * targetSpeed * dt;
            if (this.targetX <= 0 || this.targetX >= this.cols - 3) {
                this.targetDirection *= -1;
            }
        }
        
        // Проверка столкновений
        this.checkCollisions();
    }

    checkCollisions() {
        const hitObstacle = this.obstacles.some(obs => 
            obs.row === this.currentRow && 
            Math.abs(obs.col - this.apparatusX) < 1.5
        );

        if (hitObstacle) {
            this.sendResult(false, "Столкновение с препятствием");
            this.stopLevel(false);
        }

        const distToTarget = Math.abs(this.apparatusX - this.targetX);
        if (distToTarget < 1.5 && this.isHolding) {
             this.sendResult(true, "Успешная посадка");
             this.stopLevel(true);
        }
    }

    drawRoleUI() {
        // Рисуем прицел телескопа
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 4;
        
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Перекрестие
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - radius, centerY);
        this.ctx.lineTo(centerX + radius, centerY);
        this.ctx.moveTo(centerX, centerY - radius);
        this.ctx.lineTo(centerX, centerY + radius);
        this.ctx.stroke();
        
        // Индикатор захвата
        this.ctx.fillStyle = this.isHolding ? '#0f0' : '#f00';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.isHolding ? 'ОБЪЕКТ В ПРИЦЕЛЕ' : 'УДЕРЖИВАЙ ОБЪЕКТ!',
            centerX,
            centerY + radius + 30
        );
        
        // Подпись
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('АСТРОФИЗИК - ТЕЛЕСКОП', centerX, this.height - 20);
    }

    destroy() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    }
}

// Переопределяем update для корректной работы
AstrophysicistGame.prototype.update = function(dt) {
    if (!this.isGameActive) return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.sendResult(false, "Время вышло");
        this.stopLevel(false);
        return;
    }

    // Движение целевого объекта
    const complexity = 1 + (this.currentRow * 0.1);
    this.targetObject.x += this.targetObject.vx * dt * complexity;
    this.targetObject.y += this.targetObject.vy * dt * complexity;
    
    if (this.targetObject.x <= 0 || this.targetObject.x >= this.cols) {
        this.targetObject.vx *= -1;
    }
    if (this.targetObject.y <= 0 || this.targetObject.y >= this.rows) {
        this.targetObject.vy *= -1;
    }
    
    // Проверка захвата
    const dist = Math.sqrt(
        Math.pow(this.telescopeX - this.targetObject.x, 2) + 
        Math.pow(this.telescopeY - this.targetObject.y, 2)
    );
    
    this.isHolding = dist < 2;
    
    if (this.isHolding) {
        const dx = this.targetX - this.apparatusX;
        this.apparatusX += dx * 2 * dt;
        
        const targetSpeed = 2 + (this.currentRow * 0.2);
        this.targetX += this.targetDirection * targetSpeed * dt;
        if (this.targetX <= 0 || this.targetX >= this.cols - 3) {
            this.targetDirection *= -1;
        }
    }
    
    this.checkCollisions();
};
