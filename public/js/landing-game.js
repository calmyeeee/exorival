/**
 * LandingGame - Базовый класс игры "Спуск аппарата"
 * Отвечает за отрисовку поля, препятствий, мишени и аппарата.
 * Специфическое управление реализуется в наследниках.
 */
class LandingGame {
    constructor(canvasId, role, socket) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.socket = socket;
        this.role = role;
        
        // Параметры поля
        this.rows = 30;
        this.cols = 20; // Ширина поля в ячейках
        this.cellSize = 0; // Вычисляется при ресайзе
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Состояние игры
        this.currentRow = 0; // 0 - верх, 29 - низ
        this.apparatusX = 10; // Позиция по горизонтали (0..cols-1)
        this.targetX = 10; // Позиция мишени
        this.targetDirection = 1; // 1 - вправо, -1 - влево
        this.obstacles = []; // Массив препятствий {row, col}
        this.isGameActive = false;
        this.timeLeft = 20; // Секунд на линию
        this.score = 0;
        
        // Ввод пользователя (абстрактный)
        this.inputState = {}; 
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Запуск цикла отрисовки
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    resize() {
        // Адаптивный размер
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight || 400;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.cellSize = Math.min(this.width / this.cols, this.height / this.rows);
    }

    // Инициализация новой линии (вызывается сервером или локально)
    startLevel(row, obstacles, targetStartX) {
        this.currentRow = row;
        this.obstacles = obstacles;
        this.targetX = targetStartX || Math.floor(this.cols / 2);
        this.timeLeft = 20;
        this.isGameActive = true;
        
        // Сброс позиции аппарата на середину сверху
        if (row === 0) {
            this.apparatusX = Math.floor(this.cols / 2);
        }
    }

    stopLevel(success) {
        this.isGameActive = false;
        if (success) {
            this.score++;
            // Визуальный эффект успеха
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            // Визуальный эффект провала
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    // Абстрактный метод обработки ввода (переопределяется в ролях)
    handleInput(dt) {
        // По умолчанию ничего не делает
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

        // Движение мишени
        const targetSpeed = 2 + (this.currentRow * 0.2); // Ускоряется с глубиной
        this.targetX += this.targetDirection * targetSpeed * dt;
        if (this.targetX <= 0 || this.targetX >= this.cols - 3) {
            this.targetDirection *= -1;
        }

        // Обработка ввода игрока
        this.handleInput(dt);

        // Проверка столкновений
        this.checkCollisions();
    }

    checkCollisions() {
        // Проверка препятствий
        const hitObstacle = this.obstacles.some(obs => 
            obs.row === this.currentRow && 
            Math.abs(obs.col - this.apparatusX) < 1.5 // Простая хитбокс проверка
        );

        if (hitObstacle) {
            this.sendResult(false, "Столкновение с препятствием");
            this.stopLevel(false);
        }

        // Проверка достижения низа (мишени)
        const distToTarget = Math.abs(this.apparatusX - this.targetX);
        if (distToTarget < 1.5) {
             this.sendResult(true, "Успешная посадка");
             this.stopLevel(true);
        }
    }

    sendResult(success, reason) {
        if (this.socket) {
            this.socket.emit('landing:action', {
                success: success,
                reason: reason,
                row: this.currentRow
            });
        }
    }

    draw() {
        // Очистка
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (!this.isGameActive && this.score === 0 && this.currentRow === 0) {
            // Экран ожидания
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Ожидание начала спуска...', this.width/2, this.height/2);
            return;
        }

        const offsetY = (this.height - this.rows * this.cellSize) / 2;
        const offsetX = (this.width - this.cols * this.cellSize) / 2;

        // Рисуем сетку (опционально, для атмосферы)
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let r = 0; r <= this.rows; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX, offsetY + r * this.cellSize);
            this.ctx.lineTo(offsetX + this.cols * this.cellSize, offsetY + r * this.cellSize);
            this.ctx.stroke();
        }

        // Рисуем препятствия на текущей строке и ниже (для видимости пути)
        this.ctx.fillStyle = '#e94560';
        this.obstacles.forEach(obs => {
            if (obs.row >= this.currentRow) {
                const x = offsetX + obs.col * this.cellSize;
                const y = offsetY + obs.row * this.cellSize;
                // Рисуем только если в поле зрения (например, текущая + 5 вниз)
                if (obs.row <= this.currentRow + 8) {
                    this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
                }
            }
        });

        // Рисуем мишень
        const targetY = offsetY + (this.currentRow + 1) * this.cellSize; 
        const drawTargetY = Math.min(targetY, this.height - this.cellSize);
        
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(
            offsetX + this.targetX * this.cellSize, 
            drawTargetY, 
            this.cellSize * 3, 
            this.cellSize
        );
        // Подпись мишени
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText("ЦЕЛЬ", offsetX + this.targetX * this.cellSize + 1.5 * this.cellSize, drawTargetY + this.cellSize/2 + 4);

        // Рисуем аппарат
        const appX = offsetX + this.apparatusX * this.cellSize;
        const appY = offsetY + this.currentRow * this.cellSize;
        
        this.ctx.fillStyle = '#4db8ff';
        this.ctx.beginPath();
        this.ctx.arc(appX + this.cellSize/2, appY + this.cellSize/2, this.cellSize/3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Интерфейс
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Уровень: ${this.currentRow + 1}/${this.rows}`, 10, 20);
        this.ctx.fillText(`Время: ${Math.ceil(this.timeLeft)}c`, 10, 40);
        
        // Отрисовка специфичных элементов роли (переопределяется)
        this.drawRoleUI();
    }

    drawRoleUI() {
        // Пусто для базового класса
    }

    animate(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (dt < 0.1) { // Защита от скачков времени
            this.update(dt);
            this.draw();
        }
        
        requestAnimationFrame(this.animate);
    }
}
