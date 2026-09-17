// room.js
const Phase1 = require('./handlers/phase1_roles');
const Phase2 = require('./handlers/phase2_scan');
<<<<<<< HEAD
const Phase3Descent = require('./handlers/phase3_descent');
=======
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6

class GameRoom {
    constructor() {
        this.state = {
            phase: 'WAITING',
            requiredPlayers: 10,
            requiredTeams: 2,
            planetCount: 6,
            players: {},
            masters: {},
            teams: {},
            turnQueue: [],
            currentTurnIndex: 0,
            planets: [],
            teamRevealed: {},
            votes: {},
            votingStarted: false,
            votingFinished: false,
            voteResults: []
        };
        this.sockets = new Map();
        this.initTeams();
<<<<<<< HEAD

        // Передаем broadcast в Phase3 для авто-рассылки
        const self = this;
        this.state._broadcastFn = function() { self.broadcast(); };
=======
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
    }

    initTeams() {
        this.state.teams = {};
        const names = ['Lab Alpha', 'Lab Beta', 'Lab Gamma'];
        for (let i = 0; i < this.state.requiredTeams; i++) {
            this.state.teams[i] = { name: names[i], members: [], targetPlanet: null };
        }
    }

    getMaxTeamSize() {
        return Math.ceil(this.state.requiredPlayers / this.state.requiredTeams);
    }

<<<<<<< HEAD
    addSocket(socket) { this.sockets.set(socket.id, socket); }
=======
    addSocket(socket) {
        this.sockets.set(socket.id, socket);
    }
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6

    removeSocket(socketId) {
        this.sockets.delete(socketId);
        if (this.state.masters[socketId]) delete this.state.masters[socketId];
        if (this.state.players[socketId]) delete this.state.players[socketId];
<<<<<<< HEAD
        const total = Object.keys(this.state.players).length + Object.keys(this.state.masters).length;
        if (total === 0) this.reset();
    }

    reset() {
        Phase3Descent.cleanup();
=======

        const totalConnections = Object.keys(this.state.players).length + Object.keys(this.state.masters).length;
        if (totalConnections === 0) this.reset();
    }

    reset() {
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
        this.state.phase = 'WAITING';
        this.state.players = {};
        this.state.masters = {};
        this.state.turnQueue = [];
        this.state.currentTurnIndex = 0;
        this.state.requiredTeams = 2;
        this.state.requiredPlayers = 10;
        this.state.planetCount = 6;
        this.state.planets = [];
        this.state.teamRevealed = {};
        this.state.votes = {};
        this.state.votingStarted = false;
        this.state.votingFinished = false;
        this.state.voteResults = [];
        this.initTeams();
    }

<<<<<<< HEAD
    registerMaster(socketId) { this.state.masters[socketId] = { id: socketId }; }
=======
    registerMaster(socketId) {
        this.state.masters[socketId] = { id: socketId };
    }
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6

    setRequiredTeams(socketId, count) {
        if (!this.state.masters[socketId] || this.state.phase !== 'WAITING') return false;
        if (count !== 2 && count !== 3) return false;
        this.state.requiredTeams = count;
        this.initTeams();
        this.adjustPlayerLimit();
        return true;
    }

    setRequiredPlayers(socketId, count) {
        if (!this.state.masters[socketId] || this.state.phase !== 'WAITING') return false;
        if (count < 6 || count > 10) return false;
        this.state.requiredPlayers = count;
        return true;
    }

    setPlanetCount(socketId, count) {
        if (!this.state.masters[socketId] || this.state.phase !== 'WAITING') return false;
        if (count < 5 || count > 10) return false;
        this.state.planetCount = count;
        return true;
    }

    adjustPlayerLimit() {
<<<<<<< HEAD
        const min = this.state.requiredTeams * 3;
        const max = this.state.requiredTeams * 5;
        if (this.state.requiredPlayers < min) this.state.requiredPlayers = min;
        if (this.state.requiredPlayers > max) this.state.requiredPlayers = max;
    }

    restartPhase3(socketId) {
        if (!this.state.masters[socketId]) return false;
        if (this.state.phase === 'PHASE_3_DESCENT') {
            Phase3Descent.restart(this.state);
            return true;
        }
        return false;
=======
        const minPlayers = this.state.requiredTeams * 3;
        const maxPlayers = this.state.requiredTeams * 5;
        if (this.state.requiredPlayers < minPlayers) this.state.requiredPlayers = minPlayers;
        if (this.state.requiredPlayers > maxPlayers) this.state.requiredPlayers = maxPlayers;
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
    }

    advancePhase(socketId) {
        if (!this.state.masters[socketId]) return false;
<<<<<<< HEAD
        switch (this.state.phase) {
            case 'WAITING':
                const pc = Object.keys(this.state.players).length;
                const mr = this.state.requiredTeams * 3;
                if (pc < this.state.requiredPlayers || pc < mr) return false;
=======

        switch (this.state.phase) {
            case 'WAITING':
                const playerCount = Object.keys(this.state.players).length;
                const minReq = this.state.requiredTeams * 3;
                if (playerCount < this.state.requiredPlayers || playerCount < minReq) return false;
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
                Phase1.initPhase1(this.state);
                break;
            case 'PHASE_1_ROLES':
                Phase2.initPhase2(this.state);
                break;
            case 'PHASE_2_SCAN':
<<<<<<< HEAD
                Phase3Descent.initPhase3(this.state);
                break;
            case 'PHASE_3_DESCENT':
                Phase3Descent.cleanup();
                this.state.phase = 'PHASE_4_RECON';
                break;
            case 'PHASE_4_RECON':
=======
                this.state.phase = 'PHASE_3_PREP';
                break;
            case 'PHASE_3_PREP':
                this.state.phase = 'PHASE_4_LANDING';
                break;
            case 'PHASE_4_LANDING':
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
                this.state.phase = 'PHASE_5_END';
                break;
            default: return false;
        }
        return true;
    }

    registerPlayer(socketId) {
        if (Object.keys(this.state.players).length >= 10) return false;
        if (this.state.phase !== 'WAITING' && this.state.phase !== 'PHASE_1_ROLES') return false;
<<<<<<< HEAD
=======

>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
        this.state.players[socketId] = {
            name: null, team: null, role: null,
            energy: 100, science: 0, status: 'Подключен'
        };
        return true;
    }

<<<<<<< HEAD
    validatePlayerName(name) {
        if (!name || typeof name !== 'string') return false;
        const t = name.trim();
        return t.length >= 2 && t.length <= 20 && /^[a-zA-Zа-яА-ЯЁё0-9\s_-]+$/.test(t);
    }

=======
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
    handlePlayerAction(socketId, msg) {
        if (this.state.phase === 'PHASE_1_ROLES') {
            if (msg.type === 'SET_NAME') {
                if (this.state.players[socketId]) {
<<<<<<< HEAD
                    if (!this.validatePlayerName(msg.name)) {
                        const s = this.sockets.get(socketId);
                        if (s) s.emit('error_msg', 'Некорректное имя (2-20 символов)');
                        return;
                    }
                    this.state.players[socketId].name = msg.name.trim().substring(0, 20);
                    this.state.players[socketId].status = 'Готов';
                    const pl = Object.values(this.state.players);
                    if (pl.length >= this.state.requiredPlayers && pl.every(function(p) { return p.name !== null; })) {
=======
                    this.state.players[socketId].name = msg.name.substring(0, 20);
                    this.state.players[socketId].status = 'Готов';
                    const players = Object.values(this.state.players);
                    if (players.length >= this.state.requiredPlayers && players.every(function(p) { return p.name !== null; })) {
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
                        Phase1.startDraft(this.state);
                    }
                }
            }
            if (msg.type === 'SELECT_ROLE') Phase1.selectRole(this.state, socketId, msg.teamId, msg.role);
            if (msg.type === 'RENAME_TEAM') Phase1.renameTeam(this.state, msg.teamId, msg.newName);
        }

        if (this.state.phase === 'PHASE_2_SCAN') {
            if (msg.type === 'SCAN_PARAM') {
                Phase2.scanParameter(this.state, socketId, msg.planetId, msg.paramKey);
                Phase2.checkEnergyForVoting(this.state);
            }
<<<<<<< HEAD
            if (msg.type === 'VOTE_PLANET') Phase2.voteForPlanet(this.state, socketId, msg.planetId);
        }

        if (this.state.phase === 'PHASE_3_DESCENT') {
            if (msg.type === 'DESCENT_ACTION') {
                Phase3Descent.handleDescentAction(this.state, socketId, msg);
=======
            if (msg.type === 'VOTE_PLANET') {
                Phase2.voteForPlanet(this.state, socketId, msg.planetId);
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
            }
        }
    }

    broadcast() {
<<<<<<< HEAD
        const tc = {};
        for (let i = 0; i < this.state.requiredTeams; i++) tc[i] = 0;
        Object.values(this.state.players).forEach(function(p) {
            if (p.team !== null && p.team !== undefined) tc[p.team]++;
        });
        const mts = this.getMaxTeamSize();

        this.sockets.forEach((socket, socketId) => {
            const isMaster = !!this.state.masters[socketId];
            const pd = this.state.players[socketId];
            const myTeam = pd ? pd.team : null;

            let mp = [];
            if (['PHASE_2_SCAN','PHASE_3_DESCENT','PHASE_4_RECON','PHASE_5_END'].indexOf(this.state.phase) !== -1) {
                mp = this.getMaskedPlanets(myTeam);
=======
        const teamCounts = {};
        for (let i = 0; i < this.state.requiredTeams; i++) teamCounts[i] = 0;
        Object.values(this.state.players).forEach(function(p) {
            if (p.team !== null && p.team !== undefined) teamCounts[p.team]++;
        });
        const maxTeamSize = this.getMaxTeamSize();

        this.sockets.forEach((socket, socketId) => {
            const isMaster = !!this.state.masters[socketId];
            const playerData = this.state.players[socketId];
            const myTeam = playerData ? playerData.team : null;

            let maskedPlanets = [];
            if (this.state.phase === 'PHASE_2_SCAN' || this.state.phase === 'PHASE_3_PREP' || this.state.phase === 'PHASE_4_LANDING' || this.state.phase === 'PHASE_5_END') {
                maskedPlanets = this.getMaskedPlanets(myTeam);
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
            }

            const payload = {
                ...this.state,
<<<<<<< HEAD
                planets: mp,
                mySocketId: socketId,
                isMaster: isMaster,
                playersCount: Object.keys(this.state.players).length,
                teamCounts: tc,
                maxTeamSize: mts,
                scanCosts: Phase2.SCAN_COSTS,
                paramNames: Phase2.PARAM_NAMES,
                descentState: this.state.phase === 'PHASE_3_DESCENT' ? Phase3Descent.getTeamDescentState(myTeam) : null
=======
                planets: maskedPlanets,
                mySocketId: socketId,
                isMaster: isMaster,
                playersCount: Object.keys(this.state.players).length,
                teamCounts: teamCounts,
                maxTeamSize: maxTeamSize,
                scanCosts: Phase2.SCAN_COSTS,
                paramNames: Phase2.PARAM_NAMES
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
            };

            if (isMaster) {
                payload.planets = this.state.planets;
                payload.fullRevealed = this.state.teamRevealed;
<<<<<<< HEAD
                payload.allDescentStates = {};
                for (let i = 0; i < this.state.requiredTeams; i++) {
                    payload.allDescentStates[i] = Phase3Descent.getTeamDescentState(i);
                }
=======
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
            } else {
                delete payload.masters;
                delete payload.teamRevealed;
            }

            socket.emit('state_update', payload);
        });
    }

    getMaskedPlanets(teamId) {
        if (teamId === null || teamId === undefined) {
            return this.state.planets.map(function(p) { return { id: p.id, name: p.name }; });
        }
<<<<<<< HEAD
        const rev = this.state.teamRevealed[teamId] || {};
        return this.state.planets.map(function(p) {
            const m = { id: p.id, name: p.name };
            if (rev[p.id + '_diameter']) m.diameter = p.diameter;
            if (rev[p.id + '_mass']) m.mass = p.mass;
            if (rev[p.id + '_atmosphere']) m.atmosphere = p.atmosphere;
            if (rev[p.id + '_magneticField']) m.magneticField = p.magneticField;
            if (rev[p.id + '_water']) m.water = p.water;
            if (rev[p.id + '_biomarkers']) m.biomarkers = p.biomarkers;
            return m;
=======
        const revealed = this.state.teamRevealed[teamId] || {};
        return this.state.planets.map(function(p) {
            const masked = { id: p.id, name: p.name };
            if (revealed[p.id + '_diameter']) masked.diameter = p.diameter;
            if (revealed[p.id + '_mass']) masked.mass = p.mass;
            if (revealed[p.id + '_atmosphere']) masked.atmosphere = p.atmosphere;
            if (revealed[p.id + '_magneticField']) masked.magneticField = p.magneticField;
            if (revealed[p.id + '_water']) masked.water = p.water;
            if (revealed[p.id + '_biomarkers']) masked.biomarkers = p.biomarkers;
            return masked;
>>>>>>> b4437aeeb3cfd6269ddaa6797b9f6ca04061d3d6
        });
    }
}

module.exports = GameRoom;