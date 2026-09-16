// room.js
const Phase1 = require('./handlers/phase1_roles');
const Phase2 = require('./handlers/phase2_scan');

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

    addSocket(socket) {
        this.sockets.set(socket.id, socket);
    }

    removeSocket(socketId) {
        this.sockets.delete(socketId);
        if (this.state.masters[socketId]) delete this.state.masters[socketId];
        if (this.state.players[socketId]) delete this.state.players[socketId];

        const totalConnections = Object.keys(this.state.players).length + Object.keys(this.state.masters).length;
        if (totalConnections === 0) this.reset();
    }

    reset() {
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

    registerMaster(socketId) {
        this.state.masters[socketId] = { id: socketId };
    }

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
        const minPlayers = this.state.requiredTeams * 3;
        const maxPlayers = this.state.requiredTeams * 5;
        if (this.state.requiredPlayers < minPlayers) this.state.requiredPlayers = minPlayers;
        if (this.state.requiredPlayers > maxPlayers) this.state.requiredPlayers = maxPlayers;
    }

    advancePhase(socketId) {
        if (!this.state.masters[socketId]) return false;

        switch (this.state.phase) {
            case 'WAITING':
                const playerCount = Object.keys(this.state.players).length;
                const minReq = this.state.requiredTeams * 3;
                if (playerCount < this.state.requiredPlayers || playerCount < minReq) return false;
                Phase1.initPhase1(this.state);
                break;
            case 'PHASE_1_ROLES':
                Phase2.initPhase2(this.state);
                break;
            case 'PHASE_2_SCAN':
                this.state.phase = 'PHASE_3_PREP';
                break;
            case 'PHASE_3_PREP':
                this.state.phase = 'PHASE_4_LANDING';
                break;
            case 'PHASE_4_LANDING':
                this.state.phase = 'PHASE_5_END';
                break;
            default: return false;
        }
        return true;
    }

    registerPlayer(socketId) {
        if (Object.keys(this.state.players).length >= 10) return false;
        if (this.state.phase !== 'WAITING' && this.state.phase !== 'PHASE_1_ROLES') return false;

        this.state.players[socketId] = {
            name: null, team: null, role: null,
            energy: 100, science: 0, status: 'Подключен'
        };
        return true;
    }

    handlePlayerAction(socketId, msg) {
        if (this.state.phase === 'PHASE_1_ROLES') {
            if (msg.type === 'SET_NAME') {
                if (this.state.players[socketId]) {
                    this.state.players[socketId].name = msg.name.substring(0, 20);
                    this.state.players[socketId].status = 'Готов';
                    const players = Object.values(this.state.players);
                    if (players.length >= this.state.requiredPlayers && players.every(function(p) { return p.name !== null; })) {
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
            if (msg.type === 'VOTE_PLANET') {
                Phase2.voteForPlanet(this.state, socketId, msg.planetId);
            }
        }
    }

    broadcast() {
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
            }

            const payload = {
                ...this.state,
                planets: maskedPlanets,
                mySocketId: socketId,
                isMaster: isMaster,
                playersCount: Object.keys(this.state.players).length,
                teamCounts: teamCounts,
                maxTeamSize: maxTeamSize,
                scanCosts: Phase2.SCAN_COSTS,
                paramNames: Phase2.PARAM_NAMES
            };

            if (isMaster) {
                payload.planets = this.state.planets;
                payload.fullRevealed = this.state.teamRevealed;
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
        });
    }
}

module.exports = GameRoom;