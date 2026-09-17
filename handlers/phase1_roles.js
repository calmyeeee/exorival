// handlers/phase1_roles.js

const ROLES = ['PILOT', 'ENGINEER', 'ASTRO', 'XENO', 'DIRECTOR'];

function initPhase1(state) {
    state.phase = 'PHASE_1_ROLES';
    state.players = state.players || {};

    state.teams = {};
    const names = ['Lab Alpha', 'Lab Beta', 'Lab Gamma'];
    for (let i = 0; i < state.requiredTeams; i++) {
        state.teams[i] = { name: names[i], members: [], targetPlanet: null };
    }

    state.turnQueue = [];
    state.currentTurnIndex = 0;
}

function addPlayerToPhase1(state, socketId) {
    if (!state.players[socketId]) {
        state.players[socketId] = { name: null, team: null, role: null };
    }
}

function removePlayerFromPhase1(state, socketId) {
    delete state.players[socketId];
    state.turnQueue = state.turnQueue.filter(function(id) { return id !== socketId; });
    if (state.currentTurnIndex >= state.turnQueue.length) {
        state.currentTurnIndex = 0;
    }
}

function setPlayerName(state, socketId, name) {
    if (state.players[socketId]) {
        state.players[socketId].name = name.substring(0, 20);
    }
}

function startDraft(state) {
    const ids = Object.keys(state.players);
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = ids[i];
        ids[i] = ids[j];
        ids[j] = temp;
    }
    state.turnQueue = ids;
    state.currentTurnIndex = 0;
}

function selectRole(state, socketId, teamId, role) {
    const currentTurnSocket = state.turnQueue[state.currentTurnIndex];
    if (currentTurnSocket !== socketId) return false;
    if (teamId < 0 || teamId >= state.requiredTeams) return false;
    if (ROLES.indexOf(role) === -1) return false;

    const isTaken = Object.values(state.players).some(function(p) {
        return p.team === teamId && p.role === role;
    });
    if (isTaken) return false;

    const maxTeamSize = Math.ceil(state.requiredPlayers / state.requiredTeams);
    let currentTeamCount = 0;
    Object.values(state.players).forEach(function(p) {
        if (p.team === teamId) currentTeamCount++;
    });
    if (currentTeamCount >= maxTeamSize) return false;

    state.players[socketId].team = teamId;
    state.players[socketId].role = role;
    if (state.teams[teamId]) state.teams[teamId].members.push(socketId);

    state.currentTurnIndex++;
    return true;
}

function renameTeam(state, teamId, newName) {
    if (state.teams[teamId] && newName) {
        state.teams[teamId].name = newName.substring(0, 25);
        return true;
    }
    return false;
}

module.exports = {
    initPhase1: initPhase1,
    addPlayerToPhase1: addPlayerToPhase1,
    removePlayerFromPhase1: removePlayerFromPhase1,
    setPlayerName: setPlayerName,
    startDraft: startDraft,
    selectRole: selectRole,
    renameTeam: renameTeam,
    ROLES: ROLES
};