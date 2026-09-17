/**
 * PilotGame - Управление пилота: Рычаг
 * Механика: Наклон устройства (гироскоп) или движение мышью/тачем влево-вправо
 * чем сильнее наклон, тем быстрее движение аппарата
 */
class PilotGame extends LandingGame {
    constructor(canvasId, socket) {
        super(canvasId, 'pilot', socket);
        
        this.leverPosition = 0; // -1 (влево) до 1 (вправо)
        this.targetLeverPosition = 0;
        
        // Обработчики событий
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        // Попытка использовать гироскоп (для мобильных)
        this.setupGyroscope();
    }

    setupGyroscope() {
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (event) => {
                if (event.gamma) { // Наклон влево-вправо (-90 до 90)
                    this.targetLeverPosition = Math.max(-1, Math.min(1, event.gamma / 45));
                }
            });
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const centerX = rect.width / 2;
        this.targetLeverPosition = (x - centerX) / (rect.width / 2);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const centerX = rect.width / 2;
        this.targetLeverPosition = (x - centerX) / (rect.width / 2);
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.targetLeverPosition = -1;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.targetLeverPosition = 1;
        }
    }

    handleKeyUp(e) {
        if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
            this.targetLeverPosition = 0;
        }
    }

    handleInput(dt) {
        // Плавное движение рычага к целевой позиции
        this.leverPosition += (this.targetLeverPosition - this.leverPosition) * 5 * dt;
        
        // Движение аппарата пропорционально положению рычага
        const speed = 8 * this.leverPosition; // Макс скорость 8 клеток в секунду
        this.apparatusX += speed * dt;
        
        // Ограничение по краям поля
        this.apparatusX = Math.max(0, Math.min(this.cols - 1, this.apparatusX));
    }

    drawRoleUI() {
        const centerX = this.width / 2;
        const bottomY = this.height - 60;
        
        // Рисуем рычаг
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, bottomY);
        this.ctx.lineTo(centerX + this.leverPosition * 50, bottomY - 80);
        this.ctx.stroke();
        
        // Основание рычага
        this.ctx.fillStyle = '#888';
        this.ctx.beginPath();
        this.ctx.arc(centerX, bottomY, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Рукоятка
        this.ctx.fillStyle = '#f00';
        this.ctx.beginPath();
        this.ctx.arc(centerX + this.leverPosition * 50, bottomY - 80, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Подпись
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('РЫЧАГ ПИЛОТА', centerX, bottomY + 30);
    }

    destroy() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}
