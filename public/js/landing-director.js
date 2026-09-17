/**
 * DirectorGame - Управление директора: Печать на бумагах
 * Механика: Нужно вовремя ставить печать (клик/тап), чтобы подтвердить курс
 * Печать дает временный буст к точности или стабилизацию
 */
class DirectorGame extends LandingGame {
    constructor(canvasId, socket) {
        super(canvasId, 'director', socket);
        
        this.hasStamp = true; // Есть ли печать в руке
        this.isStamping = false; // Процесс постановки печати
        this.stampCooldown = 0; // Перезарядка печати
        this.stabilityBonus = 0; // Бонус к стабильности от печати
        
        // Автоматическое движение аппарата (директор только корректирует печатью)
        this.autoSpeed = 2; 
        this.autoDirection = 1;
        
        this.handleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('touchstart', this.handleClick);
    }

    handleClick(e) {
        e.preventDefault();
        if (this.hasStamp && this.stampCooldown <= 0 && this.isGameActive) {
            this.stamp();
        }
    }

    stamp() {
        this.isStamping = true;
        this.hasStamp = false;
        this.stabilityBonus = 1.0; // Полная стабилизация
        
        // Анимация печати
        setTimeout(() => {
            this.isStamping = false;
            this.stampCooldown = 2; // 2 секунды перезарядки
            this.stabilityBonus = 0;
        }, 300);
        
        // Возврат печати после кулдауна
        setTimeout(() => {
            this.hasStamp = true;
        }, this.stampCooldown * 1000 + 500);
    }

    handleInput(dt) {
        // Автоматическое патрулирование аппарата
        this.apparatusX += this.autoSpeed * this.autoDirection * dt;
        
        // Если есть бонус от печати - аппарат движется плавнее (меньше дрожания)
        // В базовой версии просто замедляем движение при печати для точности
        if (this.stabilityBonus > 0) {
            this.autoSpeed = 1.5; // Замедление для точной подгонки
        } else {
            this.autoSpeed = 3; // Обычная скорость
        }
        
        // Отскок от краев
        if (this.apparatusX <= 0 || this.apparatusX >= this.cols - 1) {
            this.autoDirection *= -1;
        }
    }

    drawRoleUI() {
        const centerX = this.width / 2;
        const bottomY = this.height - 80;
        
        // Рисуем стол с бумагами
        this.ctx.fillStyle = '#d4a76a';
        this.ctx.fillRect(centerX - 100, bottomY, 200, 60);
        
        // Бумаги
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(centerX - 80, bottomY + 10, 160, 40);
        
        // Печать в руке или на столе
        if (this.hasStamp) {
            this.ctx.fillStyle = '#c00';
            this.ctx.beginPath();
            this.ctx.arc(centerX + 60, bottomY - 20, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ПЕЧАТЬ', centerX + 60, bottomY - 15);
        } else if (this.stampCooldown > 0) {
            this.ctx.fillStyle = '#666';
            this.ctx.beginPath();
            this.ctx.arc(centerX + 60, bottomY - 20, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`${this.stampCooldown.toFixed(1)}c`, centerX + 60, bottomY - 15);
        }
        
        // Индикатор стабильности
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        const statusText = this.stabilityBonus > 0 ? 'СТАБИЛИЗАЦИЯ!' : 'Нажми для печати';
        this.ctx.fillText(statusText, centerX, bottomY - 50);
        
        // Подпись
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ДИРЕКТОР - ПЕЧАТЬ', centerX, bottomY + 80);
    }

    destroy() {
        this.canvas.removeEventListener('click', this.handleClick);
        this.canvas.removeEventListener('touchstart', this.handleClick);
    }
}
