// handlers/phase3_descent.js

const Phase3Descent = {
    gameState: null,
    teamStates: {},
    obstacles: [],
    tickInterval: null,
    broadcastInterval: null,
    startTime: 0,
    LINES_TOTAL: 30,
    LINE_DURATION: 20000,

    initPhase3(gameState) {
        this.cleanup();
        gameState.phase = 'PHASE_3_DESCENT';
        this.gameState = gameState;
        this.obstacles = [];
        this.teamStates = {};

        const planetDifficulty = this.getPlanetDifficulty(gameState);
        this.obstacles = this.generateObstacles(this.LINES_TOTAL, planetDifficulty);

        for (let teamId = 0; teamId < gameState.requiredTeams; teamId++) {
            this.teamStates[teamId] = {
                currentLine: 0,
                lineStartTime: Date.now(),
                shipPosition: { x: 50, y: 0 },
                targetPosition: { x: 50, speed: 0.5 },
                status: 'playing',
                reason: '',
                inputs: {}
            };
        }

        this.startTime = Date.now();

        // Игровой цикл физики (10 раз в секунду)
        this.tickInterval = setInterval(() => this.tick(), 100);

        // Цикл рассылки состояния клиентам (5 раз в секунду)
        this.broadcastInterval = setInterval(() => {
            if (this.gameState && this.gameState._broadcastFn) {
                this.gameState._broadcastFn();
            }
        }, 200);

        console.log('Фаза 3: Спуск начался. Уровней: ' + this.LINES_TOTAL);
        return true;
    },

    getPlanetDifficulty(gameState) {
        let avgDifficulty = 1;
        let count = 0;
        for (let teamId = 0; teamId < gameState.requiredTeams; teamId++) {
            const tp = gameState.teams[teamId] ? gameState.teams[teamId].targetPlanet : null;
            if (tp !== null && tp !== undefined && gameState.planets[tp]) {
                const planet = gameState.planets[tp];
                let d = 1;
                if (!planet.atmosphere) d += 0.3;
                if (!planet.magneticField) d += 0.2;
                if (!planet.water) d += 0.1;
                avgDifficulty += d;
                count++;
            }
        }
        return count > 0 ? avgDifficulty / count : 1;
    },

    generateObstacles(totalLines, difficulty) {
        const all = [];
        for (let line = 0; line < totalLines; line++) {
            const obs = [];
            const ld = Math.min(5, 1 + Math.floor(line / 5));
            const sc = Math.floor(Math.random() * ld) + 1;
            for (let i = 0; i < sc; i++) {
                obs.push({
                    type: 'static',
                    x: Math.random() * 80 + 10,
                    width: Math.random() * 10 + 5,
                    yStart: 10,
                    yEnd: 90
                });
            }
            if (ld >= 3) {
                obs.push({
                    type: 'moving',
                    x: Math.random() * 60 + 20,
                    y: 50,
                    width: 15,
                    speed: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.3)
                });
            }
            all.push(obs);
        }
        return all;
    },

    tick() {
        if (!this.gameState || this.gameState.phase !== 'PHASE_3_DESCENT') return;

        for (let teamId = 0; teamId < this.gameState.requiredTeams; teamId++) {
            const ts = this.teamStates[teamId];
            if (!ts || ts.status !== 'playing') continue;

            const now = Date.now();
            const timeInLine = now - ts.lineStartTime;

            if (timeInLine > this.LINE_DURATION) {
                this.advanceLine(teamId);
                continue;
            }

            this.updateShipPhysics(ts);
            this.updateObstacles(ts);

            if (this.checkCollision(ts)) {
                this.failPhase(teamId, 'Аппарат разбит о препятствие!');
                continue;
            }

            this.updateTarget(ts);

            if (this.checkTargetReach(ts)) {
                this.successLine(teamId);
            }
        }
    },

    updateShipPhysics(ts) {
        let dx = 0;
        let dy = 0;
        let stability = 1.0;
        const inp = ts.inputs;

        // ПИЛОТ
        if (inp.pilot) {
            dx += (inp.pilot.x || 0) * 0.8;
            dy += (inp.pilot.y || 0) * 0.8;
        }
        // ИНЖЕНЕР
        if (inp.engineer) {
            if (inp.engineer.boost) dx *= 1.5;
            if (inp.engineer.stabilize) stability *= 1.2;
        }
        // ДИРЕКТОР
        if (inp.director) {
            if (!inp.director.stampActive) stability *= 0.5;
        }
        // АСТРОФИЗИК
        if (inp.astrophysicist) {
            if (inp.astrophysicist.focused) stability *= 1.1;
        }
        // КСЕНОБИОЛОГ
        if (inp.xenobiologist) {
            if (inp.xenobiologist.synced) stability += 0.2;
        }

        const maxSpeed = 1.5 * stability;
        dx = Math.max(-maxSpeed, Math.min(maxSpeed, dx));

        ts.shipPosition.y += 0.1 + (dy * 0.05);
        ts.shipPosition.x += dx * 0.05;

        ts.shipPosition.x = Math.max(0, Math.min(100, ts.shipPosition.x));
        ts.shipPosition.y = Math.max(0, Math.min(100, ts.shipPosition.y));
    },

    updateObstacles(ts) {
        const obs = this.obstacles[ts.currentLine] || [];
        obs.forEach(function(o) {
            if (o.type === 'moving') {
                o.x += o.speed;
                if (o.x <= 0 || o.x + o.width >= 100) o.speed *= -1;
            }
        });
    },

    checkCollision(ts) {
        const s = ts.shipPosition;
        const h = 3;
        const obs = this.obstacles[ts.currentLine] || [];
        for (let i = 0; i < obs.length; i++) {
            const o = obs[i];
            if (o.type === 'static') {
                if (s.x + h > o.x && s.x - h < o.x + o.width && s.y > o.yStart && s.y < o.yEnd) return true;
            } else if (o.type === 'moving') {
                if (s.x + h > o.x && s.x - h < o.x + o.width && Math.abs(s.y - o.y) < h + (o.width / 2)) return true;
            }
        }
        return false;
    },

    updateTarget(ts) {
        const t = Date.now() / 1000;
        const sm = 1 + (ts.currentLine / this.LINES_TOTAL);
        ts.targetPosition.x = 50 + Math.sin(t) * 40;
        ts.targetPosition.speed = 0.5 * sm;
    },

    checkTargetReach(ts) {
        if (ts.shipPosition.y >= 85) {
            if (Math.abs(ts.shipPosition.x - ts.targetPosition.x) < 8) return true;
        }
        return false;
    },

    // ИСПРАВЛЕНО: принимает teamId, а не объект
    advanceLine(teamId) {
        const ts = this.teamStates[teamId];
        if (!ts) return;
        ts.currentLine++;
        if (ts.currentLine >= this.LINES_TOTAL) {
            this.completePhase(teamId);
        } else {
            ts.lineStartTime = Date.now();
            ts.inputs = {};
            ts.shipPosition = { x: 50, y: 0 };
            console.log('Команда ' + teamId + ': Линия ' + (ts.currentLine + 1) + '/' + this.LINES_TOTAL);
        }
    },

    successLine(teamId) {
        console.log('Команда ' + teamId + ' прошла линию ' + (this.teamStates[teamId].currentLine + 1));
        this.advanceLine(teamId);
    },

    failPhase(teamId, reason) {
        const ts = this.teamStates[teamId];
        if (!ts) return;
        ts.status = 'fail';
        ts.reason = reason;
        console.log('Команда ' + teamId + ' провалила: ' + reason);

        const gs = this.gameState;
        Object.values(gs.players).forEach(function(p) {
            if (p.team === teamId) p.energy = Math.max(0, p.energy - 15);
        });
    },

    completePhase(teamId) {
        const ts = this.teamStates[teamId];
        if (!ts) return;
        ts.status = 'success';
        console.log('Команда ' + teamId + ' завершила спуск!');

        const gs = this.gameState;
        Object.values(gs.players).forEach(function(p) {
            if (p.team === teamId) p.science = (p.science || 0) + 50;
        });

        let allDone = true;
        for (let i = 0; i < gs.requiredTeams; i++) {
            if (this.teamStates[i] && this.teamStates[i].status === 'playing') allDone = false;
        }
        if (allDone) {
            console.log('Все команды завершили спуск.');
            this.cleanup();
        }
    },

    // ИСПРАВЛЕНО: роли в верхнем регистре (как в phase1_roles.js)
    handleDescentAction(gameState, socketId, action) {
        const player = gameState.players[socketId];
        if (!player || player.team === null || player.team === undefined) return;
        const teamId = player.team;
        const ts = this.teamStates[teamId];
        if (!ts || ts.status !== 'playing') return;

        switch (player.role) {
            case 'PILOT':
                ts.inputs.pilot = { x: action.x || 0, y: action.y || 0 };
                break;
            case 'DIRECTOR':
                ts.inputs.director = { stampActive: action.stampActive || false };
                break;
            case 'ENGINEER':
                ts.inputs.engineer = { boost: action.boost || false, stabilize: action.stabilize || false };
                break;
            case 'ASTRO':
                ts.inputs.astrophysicist = { focused: action.focused || false };
                break;
            case 'XENO':
                ts.inputs.xenobiologist = { synced: action.synced || false };
                break;
        }
    },

    getTeamDescentState(teamId) {
        if (teamId === null || teamId === undefined) {
            return { currentLine: 0, totalLines: this.LINES_TOTAL, status: 'waiting', shipPosition: {x:50,y:0}, targetPosition: {x:50}, obstacles: [], timeLeft: this.LINE_DURATION, reason: '' };
        }
        const ts = this.teamStates[teamId];
        if (!ts) {
            return { currentLine: 0, totalLines: this.LINES_TOTAL, status: 'waiting', shipPosition: {x:50,y:0}, targetPosition: {x:50}, obstacles: [], timeLeft: this.LINE_DURATION, reason: '' };
        }
        return {
            currentLine: ts.currentLine,
            totalLines: this.LINES_TOTAL,
            shipPosition: ts.shipPosition,
            targetPosition: ts.targetPosition,
            obstacles: this.obstacles[ts.currentLine] || [],
            status: ts.status,
            reason: ts.reason,
            timeLeft: Math.max(0, this.LINE_DURATION - (Date.now() - ts.lineStartTime))
        };
    },

    restart(gameState) {
        this.cleanup();
        this.initPhase3(gameState);
    },

    cleanup() {
        if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
        if (this.broadcastInterval) { clearInterval(this.broadcastInterval); this.broadcastInterval = null; }
    }
};

module.exports = Phase3Descent;