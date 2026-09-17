/**
 * Фаза 3: Спуск аппарата на планету (серверная логика)
 * Мини-игра для каждой команды с уникальным управлением для каждой роли.
 * 30 горизонталей, спуск на каждую следующую раз в 20 секунд.
 * 
 * Роли и управление:
 * - Пилот: Рычаг управления (X/Y смещение)
 * - Директор: Печать документов (разрешение маневра)
 * - Инженер: Кнопки (ускорение/стабилизация)
 * - Астрофизик: Телескоп (удержание объекта в фокусе)
 * - Ксенобиолог: Сборка ДНК-пазла
 */

const Phase3Descent = {
    gameState: null,
    teamStates: {},
    obstacles: [],
    tickInterval: null,
    startTime: 0,
    
    LINES_TOTAL: 30,
    LINE_DURATION: 20000, // 20 секунд на линию
    
    /**
     * Инициализация фазы спуска
     */
    initPhase3(gameState) {
        gameState.phase = 'PHASE_3_DESCENT';
        this.gameState = gameState;
        this.obstacles = [];
        this.teamStates = {};
        
        // Определяем сложность на основе параметров планеты
        const planetDifficulty = this.getPlanetDifficulty(gameState);
        
        // Генерируем препятствия для всех 30 уровней
        this.obstacles = this.generateObstacles(this.LINES_TOTAL, planetDifficulty);
        
        // Инициализируем состояние для каждой команды
        for (let teamId = 0; teamId < gameState.requiredTeams; teamId++) {
            this.teamStates[teamId] = {
                currentLine: 0,
                lineStartTime: Date.now(),
                shipPosition: { x: 50, y: 0 }, // Проценты 0-100
                targetPosition: { x: 50, speed: 0.5 },
                status: 'playing', // playing, success, fail
                reason: '',
                inputs: {} // Ввод от каждого игрока
            };
        }
        
        // Запускаем игровой цикл (10 раз в секунду)
        this.startTime = Date.now();
        this.tickInterval = setInterval(() => this.tick(), 100);
        
        console.log(`Фаза 3: Спуск аппарата начался. Уровней: ${this.LINES_TOTAL}, Время на уровень: ${this.LINE_DURATION/1000}с`);
        return true;
    },
    
    /**
     * Получение сложности планеты
     */
    getPlanetDifficulty(gameState) {
        let avgDifficulty = 1;
        let count = 0;
        
        for (let teamId = 0; teamId < gameState.requiredTeams; teamId++) {
            const targetPlanetId = gameState.teams[teamId]?.targetPlanet;
            if (targetPlanetId !== null && targetPlanetId !== undefined) {
                const planet = gameState.planets[targetPlanetId];
                if (planet) {
                    let difficulty = 1;
                    if (!planet.atmosphere) difficulty += 0.3;
                    if (!planet.magneticField) difficulty += 0.2;
                    if (!planet.water) difficulty += 0.1;
                    avgDifficulty += difficulty;
                    count++;
                }
            }
        }
        
        return count > 0 ? avgDifficulty / count : 1;
    },
    
    /**
     * Генерация препятствий для каждой линии
     */
    generateObstacles(totalLines, difficulty = 1) {
        const allObstacles = [];
        
        for (let line = 0; line < totalLines; line++) {
            const lineObstacles = [];
            const lineDifficulty = Math.min(5, 1 + Math.floor(line / 5)); // Усложнение каждые 5 линий
            
            // Статические препятствия
            const staticCount = Math.floor(Math.random() * lineDifficulty) + 1;
            for (let i = 0; i < staticCount; i++) {
                lineObstacles.push({
                    type: 'static',
                    x: Math.random() * 80 + 10, // 10-90%
                    width: Math.random() * 10 + 5,
                    yStart: 10,
                    yEnd: 90
                });
            }
            
            // Движущиеся препятствия (на сложных уровнях)
            if (lineDifficulty >= 3) {
                lineObstacles.push({
                    type: 'moving',
                    x: 0,
                    y: 50,
                    width: 15,
                    speed: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.3),
                    direction: 'horizontal'
                });
            }
            
            allObstacles.push(lineObstacles);
        }
        
        return allObstacles;
    },
    
    /**
     * Игровой цикл
     */
    tick() {
        if (!this.gameState || this.gameState.phase !== 'PHASE_3_DESCENT') return;
        
        for (let teamId = 0; teamId < this.gameState.requiredTeams; teamId++) {
            const teamState = this.teamStates[teamId];
            if (!teamState || teamState.status !== 'playing') continue;
            
            const now = Date.now();
            const timeInLine = now - teamState.lineStartTime;
            
            // Проверка времени линии
            if (timeInLine > this.LINE_DURATION) {
                this.advanceLine(teamId);
                continue;
            }
            
            // Обновление физики корабля
            this.updateShipPhysics(teamState);
            
            // Обновление препятствий
            this.updateObstacles(teamState);
            
            // Проверка столкновений
            if (this.checkCollision(teamState)) {
                this.failPhase(teamId, 'Аппарат разбит о препятствие!');
                continue;
            }
            
            // Обновление мишени
            this.updateTarget(teamState);
            
            // Проверка достижения мишени
            if (this.checkTargetReach(teamState)) {
                this.successLine(teamId);
            }
        }
    },
    
    /**
     * Расчет движения корабля на основе ввода всех ролей
     */
    updateShipPhysics(teamState) {
        let dx = 0;
        let dy = 0;
        let stability = 1.0;
        
        const inputs = teamState.inputs;
        
        // ПИЛОТ: Рычаг (прямое управление X/Y)
        if (inputs.pilot) {
            dx += (inputs.pilot.x || 0) * 0.8;
            dy += (inputs.pilot.y || 0) * 0.8;
        }
        
        // ИНЖЕНЕР: Кнопки (ускорение/стабилизация)
        if (inputs.engineer) {
            if (inputs.engineer.boost) dx *= 1.5;
            if (inputs.engineer.stabilize) stability *= 1.2;
        }
        
        // ДИРЕКТОР: Печать (разрешение маневра)
        if (inputs.director) {
            if (!inputs.director.stampActive) {
                stability *= 0.5; // Штраф за отсутствие печати
            }
        }
        
        // АСТРОФИЗИК: Телескоп (фокусировка уменьшает дрейф)
        if (inputs.astrophysicist) {
            if (inputs.astrophysicist.focused) {
                stability *= 1.1;
            }
        }
        
        // КСЕНОБИОЛОГ: ДНК (синхронизация восстанавливает стабильность)
        if (inputs.xenobiologist) {
            if (inputs.xenobiologist.synced) {
                stability += 0.2;
            }
        }
        
        // Ограничиваем движение
        const maxSpeed = 1.5 * stability;
        dx = Math.max(-maxSpeed, Math.min(maxSpeed, dx));
        
        // Гравитация (автоматический спуск вниз)
        const gravity = 0.1;
        teamState.shipPosition.y += gravity + (dy * 0.05);
        teamState.shipPosition.x += dx * 0.05;
        
        // Границы поля
        teamState.shipPosition.x = Math.max(0, Math.min(100, teamState.shipPosition.x));
        teamState.shipPosition.y = Math.max(0, Math.min(100, teamState.shipPosition.y));
    },
    
    /**
     * Обновление позиций препятствий
     */
    updateObstacles(teamState) {
        const currentObstacles = this.obstacles[teamState.currentLine] || [];
        currentObstacles.forEach(obs => {
            if (obs.type === 'moving') {
                obs.x += obs.speed;
                if (obs.x <= 0 || obs.x + obs.width >= 100) obs.speed *= -1;
            }
        });
    },
    
    /**
     * Проверка столкновений
     */
    checkCollision(teamState) {
        const ship = teamState.shipPosition;
        const hitBox = 3; // Размер корабля в %
        
        const currentObstacles = this.obstacles[teamState.currentLine] || [];
        
        for (let obs of currentObstacles) {
            if (obs.type === 'static') {
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
    },
    
    /**
     * Обновление позиции мишени
     */
    updateTarget(teamState) {
        const timeFactor = Date.now() / 1000;
        const speedMult = 1 + (teamState.currentLine / this.LINES_TOTAL);
        teamState.targetPosition.x = 50 + Math.sin(timeFactor) * 40;
        teamState.targetPosition.speed = 0.5 * speedMult;
    },
    
    /**
     * Проверка достижения мишени
     */
    checkTargetReach(teamState) {
        const targetY = 90;
        const reachDist = 5;
        const ship = teamState.shipPosition;
        const target = teamState.targetPosition;
        
        if (ship.y >= targetY - reachDist) {
            if (Math.abs(ship.x - target.x) < 8) {
                return true;
            }
        }
        return false;
    },
    
    /**
     * Переход к следующей линии
     */
    advanceLine(teamState) {
        teamState.currentLine++;
        if (teamState.currentLine >= this.LINES_TOTAL) {
            this.completePhase(teamState);
        } else {
            teamState.lineStartTime = Date.now();
            teamState.inputs = {}; // Сброс ввода для новой линии
            console.log(`Линия ${teamState.currentLine + 1}/${this.LINES_TOTAL} началась`);
        }
    },
    
    /**
     * Успешное завершение линии
     */
    successLine(teamId) {
        console.log(`Команда ${teamId} успешно прошла линию ${this.teamStates[teamId].currentLine + 1}`);
        this.advanceLine(this.teamStates[teamId]);
    },
    
    /**
     * Провал фазы
     */
    failPhase(teamId, reason) {
        const teamState = this.teamStates[teamId];
        teamState.status = 'fail';
        teamState.reason = reason;
        
        console.log(`Команда ${teamId} провалила фазу: ${reason}`);
        
        // Штраф энергии всей команде
        Object.values(this.gameState.players).forEach(p => {
            if (p.team === teamId) p.energy = Math.max(0, p.energy - 15);
        });
        
        // Завершение игры для команды через 2 секунды
        setTimeout(() => {
            if (this.gameState) {
                // Логика проигрыша команды
                console.log(`Команда ${teamId} выбывает из игры`);
            }
        }, 2000);
    },
    
    /**
     * Завершение фазы успешно
     */
    completePhase(teamState) {
        teamState.status = 'success';
        console.log('Фаза 3 завершена успешно');
        
        // Бонус науки всей команде
        Object.values(this.gameState.players).forEach(p => {
            if (p.team !== null && p.team !== undefined) {
                p.science += 50;
            }
        });
        
        // Переход к следующей фазе
        setTimeout(() => {
            if (this.gameState) {
                this.gameState.phase = 'PHASE_4_RECON';
            }
        }, 3000);
    },
    
    /**
     * Обработка ввода от игроков
     */
    handleDescentAction(gameState, socketId, action) {
        const player = gameState.players[socketId];
        if (!player || player.team === null || player.team === undefined) return;
        
        const teamId = player.team;
        const teamState = this.teamStates[teamId];
        if (!teamState || teamState.status !== 'playing') return;
        
        // Сохраняем ввод в зависимости от роли
        switch (player.role) {
            case 'pilot':
                teamState.inputs.pilot = {
                    x: action.x || 0,
                    y: action.y || 0
                };
                break;
            case 'director':
                teamState.inputs.director = {
                    stampActive: action.stampActive || false
                };
                break;
            case 'engineer':
                teamState.inputs.engineer = {
                    boost: action.boost || false,
                    stabilize: action.stabilize || false
                };
                break;
            case 'astrophysicist':
                teamState.inputs.astrophysicist = {
                    focused: action.focused || false,
                    x: action.x || 50,
                    y: action.y || 50
                };
                break;
            case 'xenobiologist':
                teamState.inputs.xenobiologist = {
                    synced: action.synced || false,
                    assembled: action.assembled || 0
                };
                break;
        }
    },
    
    /**
     * Получение состояния для клиента
     */
    getTeamDescentState(teamId) {
        const teamState = this.teamStates[teamId];
        if (!teamState) return { currentLine: 0, totalLines: this.LINES_TOTAL };
        
        const currentObstacles = this.obstacles[teamState.currentLine] || [];
        const timeLeft = Math.max(0, this.LINE_DURATION - (Date.now() - teamState.lineStartTime));
        
        return {
            currentLine: teamState.currentLine,
            totalLines: this.LINES_TOTAL,
            shipPosition: teamState.shipPosition,
            targetPosition: teamState.targetPosition,
            obstacles: currentObstacles,
            status: teamState.status,
            reason: teamState.reason,
            timeLeft: timeLeft,
            inputs: teamState.inputs
        };
    },
    
    /**
     * Очистка ресурсов
     */
    cleanup() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
};

module.exports = Phase3Descent;
