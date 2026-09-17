/**
 * Phase 3: Descent Handler
 * Мини-игра: Спуск аппарата на планету.
 * Механика: 30 горизонталей, 20 секунд на спуск к следующей.
 * Цель: Достичь движущейся мишени внизу, избегая препятствий.
 */

class Phase3Handler {
    constructor(room) {
        this.room = room;
        this.state = {
            isActive: false,
            currentLine: 0, // Текущая горизонталь (0-29)
            lineStartTime: 0,
            lineDuration: 20000, // 20 секунд на линию
            shipPosition: { x: 50, y: 0 }, // Проценты 0-100
            targetPosition: { x: 50, speed: 0.5 }, // Мишень внизу
            obstacles: [], // Препятствия на текущей линии
            teamInputs: {}, // Последние ввод от каждого игрока
            status: 'waiting', // waiting, playing, success, fail
            reason: ''
        };
        
        this.tickInterval = null;
        this.LINES_TOTAL = 30;
    }

    start() {
        console.log(`[Room ${this.room.id}] Phase 3 Started: Descent`);
        this.state.isActive = true;
        this.state.currentLine = 0;
        this.state.shipPosition = { x: 50, y: 0 };
        this.state.teamInputs = {};
        this.state.status = 'playing';
        
        this.startLine();
        
        // Запускаем игровой цикл (проверка каждые 100мс)
        this.tickInterval = setInterval(() => this.tick(), 100);
        
        this.broadcastState();
    }

    startLine() {
        this.state.lineStartTime = Date.now();
        this.state.obstacles = this.generateObstacles(this.state.currentLine);
        // Сброс ввода игроков для новой линии
        this.state.teamInputs = {};
        
        console.log(`[Room ${this.room.id}] Line ${this.state.currentLine + 1}/${this.LINES_TOTAL} started`);
        this.broadcastState();
    }

    generateObstacles(lineIndex) {
        // Генерация препятствий в зависимости от сложности (номер линии)
        const obstacles = [];
        const difficulty = Math.min(1 + Math.floor(lineIndex / 5), 5); // Усложнение каждые 5 линий
        
        // Статические препятствия (астероиды/колонны)
        const count = Math.floor(Math.random() * difficulty) + 1;
        for (let i = 0; i < count; i++) {
            obstacles.push({
                type: 'static',
                x: Math.random() * 80 + 10, // 10-90%
                width: Math.random() * 10 + 5,
                yStart: 10, // Начало препятствия относительно линии
                yEnd: 90
            });
        }
        
        // Движущиеся препятствия (появляются на сложных уровнях)
        if (difficulty >= 3) {
            obstacles.push({
                type: 'moving',
                x: 0,
                y: 50,
                width: 15,
                speed: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.3),
                direction: 'horizontal'
            });
        }

        return obstacles;
    }

    handleInput(playerId, role, inputData) {
        if (!this.state.isActive || this.state.status !== 'playing') return;

        // Сохраняем ввод игрока. Логика объединения вводов будет в tick()
        this.state.teamInputs[role] = {
            timestamp: Date.now(),
            data: inputData
        };
    }

    calculateShipMovement() {
        // Объединение вкладов всех ролей
        let dx = 0;
        let dy = 0;
        let stability = 1.0; // Множитель скорости/точности

        const inputs = this.state.teamInputs;

        // ПИЛОТ: Рычаг (direct X/Y control)
        if (inputs.pilot) {
            dx += (inputs.pilot.data.x || 0) * 0.8;
            dy += (inputs.pilot.data.y || 0) * 0.8;
        }

        // ИНЖЕНЕР: Кнопки (Boost/Stabilize)
        if (inputs.engineer) {
            if (inputs.engineer.data.boost) dx *= 1.5; // Ускорение бокового движения
            if (inputs.engineer.data.stabilize) stability *= 1.2;
        }

        // ДИРЕКТОР: Печать (Authorization to move)
        // Если директор не ставит печать, корабль дрейфует или замедляется
        if (inputs.director) {
            if (!inputs.director.data.stampActive) {
                stability *= 0.5; // Штраф за отсутствие печати
            }
        }

        // АСТРОФИЗИК: Телескоп (Focus/Scan - уменьшает дрейф)
        if (inputs.astrophysicist) {
            if (inputs.astrophysicist.data.focused) {
                stability *= 1.1;
                // Может видеть скрытые препятствия (флаг для клиента, тут просто бонус)
            }
        }

        // КСЕНОБИОЛОГ: ДНК (Bio-rhythm sync - восстанавливает стабильность)
        if (inputs.xenobiologist) {
            if (inputs.xenobiologist.data.synced) {
                stability += 0.2;
            }
        }

        // Ограничиваем движение
        const maxSpeed = 1.5 * stability;
        dx = Math.max(-maxSpeed, Math.min(maxSpeed, dx));
        
        return { dx, dy, stability };
    }

    tick() {
        if (!this.state.isActive || this.state.status !== 'playing') return;

        const now = Date.now();
        const timeInLine = now - this.state.lineStartTime;

        // 1. Проверка времени линии
        if (timeInLine > this.state.lineDuration) {
            this.advanceLine();
            return;
        }

        // 2. Обновление физики корабля
        const movement = this.calculateShipMovement();
        
        // Естественный дрейф вниз (гравитация)
        const gravity = 0.1; 
        this.state.shipPosition.y += gravity + (movement.dy * 0.05);
        this.state.shipPosition.x += movement.dx * 0.05;

        // Границы поля
        if (this.state.shipPosition.x < 0) this.state.shipPosition.x = 0;
        if (this.state.shipPosition.x > 100) this.state.shipPosition.x = 100;

        // 3. Обновление препятствий
        this.state.obstacles.forEach(obs => {
            if (obs.type === 'moving') {
                obs.x += obs.speed;
                if (obs.x <= 0 || obs.x + obs.width >= 100) obs.speed *= -1;
            }
        });

        // 4. Проверка столкновений
        if (this.checkCollision()) {
            this.failPhase("Аппарат разбит о препятствие!");
            return;
        }

        // 5. Проверка достижения мишени (только если мы в нижней части линии)
        // Мишень движется внизу экрана (y > 85%)
        this.updateTarget();
        if (this.checkTargetReach()) {
            this.successLine();
            return;
        }

        // Отправка состояния клиентам (60 FPS эквивалент, но тут 10 раз в сек для экономии)
        this.broadcastState();
    }

    updateTarget() {
        // Мишень движется по синусоиде внизу
        const timeFactor = Date.now() / 1000;
        this.state.targetPosition.x = 50 + Math.sin(timeFactor) * 40;
        // Скорость увеличивается с линиями
        const speedMult = 1 + (this.state.currentLine / 30);
        this.state.targetPosition.speed = 0.5 * speedMult;
    }

    checkCollision() {
        const ship = this.state.shipPosition;
        const hitBox = 3; // Размер корабля в %

        for (let obs of this.state.obstacles) {
            if (obs.type === 'static') {
                // Простая AABB коллизия
                if (ship.x + hitBox > obs.x && 
                    ship.x - hitBox < obs.x + obs.width &&
                    ship.y > obs.yStart && ship.y < obs.yEnd) {
                    return true;
                }
            } else if (obs.type === 'moving') {
                if (ship.x + hitBox > obs.x && 
                    ship.x - hitBox < obs.x + obs.width &&
                    Math.abs(ship.y - obs.y) < hitBox + (obs.width/2)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkTargetReach() {
        // Мишень находится примерно на Y = 90%
        const targetY = 90;
        const reachDist = 5;
        const ship = this.state.shipPosition;
        const target = this.state.targetPosition;

        if (ship.y >= targetY - reachDist) {
            // Проверка по X
            if (Math.abs(ship.x - target.x) < 8) { // Допуск попадания
                return true;
            }
        }
        return false;
    }

    advanceLine() {
        this.state.currentLine++;
        if (this.state.currentLine >= this.LINES_TOTAL) {
            this.completePhase();
        } else {
            this.startLine();
        }
    }

    successLine() {
        // Бонусное время или очки можно начислить здесь
        console.log(`[Room ${this.room.id}] Line ${this.state.currentLine + 1} completed successfully`);
        this.advanceLine();
    }

    failPhase(reason) {
        this.state.status = 'fail';
        this.state.reason = reason;
        this.stop();
        this.broadcastState();
        
        // Переход к экрану проигрыша/рестарта фазы
        setTimeout(() => {
            this.room.endGame(false, reason); // Проигрыш команды
        }, 2000);
    }

    completePhase() {
        this.state.status = 'success';
        this.stop();
        this.broadcastState();
        
        console.log(`[Room ${this.room.id}] Phase 3 Completed Successfully`);
        setTimeout(() => {
            this.room.nextPhase();
        }, 2000);
    }

    stop() {
        this.state.isActive = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    broadcastState() {
        const safeState = {
            ...this.state,
            timeLeft: this.state.isActive ? Math.max(0, this.state.lineDuration - (Date.now() - this.state.lineStartTime)) : 0
        };
        this.room.io.to(this.room.id).emit('phase3:update', safeState);
    }
    
    getState() {
        return this.state;
    }
}

module.exports = Phase3Handler;
