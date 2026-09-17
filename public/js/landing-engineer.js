/**
 * EngineerGame - Управление инженера: Кнопки
 * Механика: 4 кнопки (Вверх, Вниз, Влево, Вправо) для точного позиционирования
 * Сложная координация: нужно нажимать комбинации кнопок быстро и точно
 */
class EngineerGame extends LandingGame {
    constructor(canvasId, socket) {
        super(canvasId, 'engineer', socket);
        
        this.buttons = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        this.setupButtons();
    }

    setupButtons() {
        // Создаем UI кнопок
        const buttonStyle = `
            position: absolute;
            width: 60px;
            height: 60px;
            border: none;
            border-radius: 10px;
            background: #444;
            color: white;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
            transition: background 0.1s;
        `;
        
        const activeStyle = 'background: #0a0;';
        
        // Контейнер для кнопок
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 140px;
            height: 140px;
        `;
        container.id = 'engineer-controls';
        
        // Кнопки в крестовине
        const btnUp = this.createButton('▲', buttonStyle, activeStyle);
        btnUp.style.cssText += `${buttonStyle} top: 0; left: 40px;`;
        
        const btnDown = this.createButton('▼', buttonStyle, activeStyle);
        btnDown.style.cssText += `${buttonStyle} bottom: 0; left: 40px;`;
        
        const btnLeft = this.createButton('◀', buttonStyle, activeStyle);
        btnLeft.style.cssText += `${buttonStyle} top: 40px; left: 0;`;
        
        const btnRight = this.createButton('▶', buttonStyle, activeStyle);
        btnRight.style.cssText += `${buttonStyle} top: 40px; right: 0;`;
        
        container.appendChild(btnUp);
        container.appendChild(btnDown);
        container.appendChild(btnLeft);
        container.appendChild(btnRight);
        
        this.canvas.parentElement.style.position = 'relative';
        this.canvas.parentElement.appendChild(container);
        
        // Клавиатурное управление
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    createButton(text, baseStyle, activeStyle) {
        const btn = document.createElement('button');
        btn.textContent = text;
        
        const mousedown = (e) => {
            e.preventDefault();
            btn.style = baseStyle + activeStyle;
        };
        
        const mouseup = (e) => {
            e.preventDefault();
            btn.style = baseStyle;
        };
        
        btn.addEventListener('mousedown', mousedown);
        btn.addEventListener('mouseup', mouseup);
        btn.addEventListener('mouseleave', mouseup);
        btn.addEventListener('touchstart', mousedown);
        btn.addEventListener('touchend', mouseup);
        
        return btn;
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp' || e.key === 'w') {
            this.buttons.up = true;
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            this.buttons.down = true;
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.buttons.left = true;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.buttons.right = true;
        }
    }

    handleKeyUp(e) {
        if (['ArrowUp', 'w'].includes(e.key)) this.buttons.up = false;
        if (['ArrowDown', 's'].includes(e.key)) this.buttons.down = false;
        if (['ArrowLeft', 'a'].includes(e.key)) this.buttons.left = false;
        if (['ArrowRight', 'd'].includes(e.key)) this.buttons.right = false;
    }

    handleInput(dt) {
        const speed = 10; // Высокая скорость для сложной координации
        
        // Вертикальное влияние (ускоряет/замедляет спуск визуально, но здесь влияет на позицию X)
        // В данной реализации up/down добавляют "дрожание" или смещение
        if (this.buttons.up) {
            this.apparatusX -= speed * 0.5 * dt;
        }
        if (this.buttons.down) {
            this.apparatusX += speed * 0.5 * dt;
        }
        
        // Горизонтальное движение
        if (this.buttons.left) {
            this.apparatusX -= speed * dt;
        }
        if (this.buttons.right) {
            this.apparatusX += speed * dt;
        }
        
        // Ограничение по краям
        this.apparatusX = Math.max(0, Math.min(this.cols - 1, this.apparatusX));
    }

    drawRoleUI() {
        // UI рисуется HTML кнопками, здесь только подпись
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('ИНЖЕНЕР - КНОПКИ', this.width - 20, 30);
        this.ctx.font = '12px Arial';
        this.ctx.fillText('WASD или стрелки', this.width - 20, 50);
    }

    destroy() {
        const container = document.getElementById('engineer-controls');
        if (container) {
            container.remove();
        }
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}
