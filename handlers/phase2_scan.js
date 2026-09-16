// handlers/phase2_scan.js

const SCAN_COSTS = {
    diameter: 25,
    mass: 20,
    atmosphere: 45,
    magneticField: 15,
    water: 40,
    biomarkers: 75
};

const PARAM_NAMES = {
    diameter: 'Диаметр (в земных)',
    mass: 'Масса (в земных)',
    atmosphere: 'Наличие атмосферы',
    magneticField: 'Магнитное поле',
    water: 'Наличие воды',
    biomarkers: 'Биомаркеры'
};

function initPhase2(state) {
    state.phase = 'PHASE_2_SCAN';
    state.planets = generatePlanets(state.planetCount || 6);

    state.teamRevealed = {};
    for (let i = 0; i < state.requiredTeams; i++) {
        state.teamRevealed[i] = {};
    }

    state.votes = {};
    state.votingStarted = false;
    state.votingFinished = false;
    state.voteResults = [];
}

function generatePlanets(count) {
    const planets = [];
    for (let i = 0; i < count; i++) {
        const hasAtmo = Math.random() > 0.4;
        const hasMag = Math.random() > 0.5;
        const hasWater = Math.random() > 0.5;
        const hasBio = hasAtmo && hasWater && Math.random() > 0.6;

        planets.push({
            id: i,
            name: 'Планета ' + (i + 1),
            diameter: +(Math.random() * 3 + 0.3).toFixed(2),
            mass: +(Math.random() * 10 + 0.1).toFixed(2),
            atmosphere: hasAtmo,
            magneticField: hasMag,
            water: hasWater,
            biomarkers: hasBio ? ['CH4+O2 дисбаланс'] : []
        });
    }
    return planets;
}

function scanParameter(state, socketId, planetId, paramKey) {
    if (state.votingStarted) return false;

    const player = state.players[socketId];
    if (!player) return false;
    if (!SCAN_COSTS[paramKey]) return false;

    const cost = SCAN_COSTS[paramKey];
    if (player.energy < cost) return false;

    const revealKey = planetId + '_' + paramKey;
    if (state.teamRevealed[player.team][revealKey]) return false;

    player.energy -= cost;
    state.teamRevealed[player.team][revealKey] = true;

    console.log('Игрок ' + player.name + ' открыл ' + paramKey + ' на Планете ' + planetId + ' (Энергия: ' + player.energy + ')');
    return true;
}

// 🆕 ИСПРАВЛЕНИЕ: Голосование начинается ТОЛЬКО когда у ВСЕХ игроков ВСЕХ команд < 15
function checkEnergyForVoting(state) {
    if (state.votingStarted) return;

    const allPlayers = Object.values(state.players);
    if (allPlayers.length === 0) return;

    const allLow = allPlayers.every(function(p) { return p.energy < 15; });

    if (allLow) {
        state.votingStarted = true;

        // Меняем статус всем
        allPlayers.forEach(function(p) {
            p.status = 'Голосует';
        });

        console.log('У всех игроков энергия < 15. Начинается голосование!');
    }
}

function voteForPlanet(state, socketId, planetId) {
    if (!state.votingStarted || state.votingFinished) return false;
    const player = state.players[socketId];
    if (!player) return false;

    const voteWeight = (player.role === 'DIRECTOR') ? 2 : 1;

    if (!state.votes[player.team]) state.votes[player.team] = {};
    state.votes[player.team][socketId] = { planetId: planetId, weight: voteWeight };

    // Меняем статус игрока
    player.status = 'Проголосовал';

    console.log('Игрок ' + player.name + ' проголосовал за Планету ' + planetId + ' (вес: ' + voteWeight + ')');

    // Проверяем, все ли в команде проголосовали
    checkTeamVotesComplete(state, player.team);
    return true;
}

function checkTeamVotesComplete(state, teamId) {
    const teamPlayers = Object.values(state.players).filter(function(p) { return p.team === teamId; });
    const teamVotes = state.votes[teamId] || {};
    const votersCount = Object.keys(teamVotes).length;

    if (votersCount >= teamPlayers.length) {
        resolveTeamVote(state, teamId);
    }
}

function resolveTeamVote(state, teamId) {
    const teamVotes = state.votes[teamId] || {};
    const counts = {};

    Object.keys(teamVotes).forEach(function(sId) {
        var v = teamVotes[sId];
        if (!counts[v.planetId]) counts[v.planetId] = 0;
        counts[v.planetId] += v.weight;
    });

    let maxVotes = 0;
    let winners = [];
    Object.keys(counts).forEach(function(pId) {
        const num = parseInt(pId);
        if (counts[pId] > maxVotes) {
            maxVotes = counts[pId];
            winners = [num];
        } else if (counts[pId] === maxVotes) {
            winners.push(num);
        }
    });

    let chosenPlanet = winners[0];

    // Ничья — решает Директор
    if (winners.length > 1) {
        let directorChoice = null;
        Object.keys(teamVotes).forEach(function(sId) {
            const p = state.players[sId];
            if (p && p.team === teamId && p.role === 'DIRECTOR') {
                directorChoice = teamVotes[sId].planetId;
            }
        });

        if (directorChoice !== null && winners.indexOf(directorChoice) !== -1) {
            chosenPlanet = directorChoice;
            console.log('Ничья! Директор команды ' + teamId + ' выбрал Планету ' + directorChoice);
        } else {
            console.log('Ничья! Директор не решил, выбран первый вариант.');
        }
    }

    state.teams[teamId].targetPlanet = chosenPlanet;
    awardSciencePoints(state, teamId, chosenPlanet);

    // Проверяем, все ли команды закончили
    checkAllTeamsVoted(state);
}

function awardSciencePoints(state, teamId, planetId) {
    const planet = state.planets[planetId];
    if (!planet) return;

    let points = 0;
    if (planet.biomarkers && planet.biomarkers.length > 0) points += 50;
    if (planet.water) points += 20;
    if (planet.atmosphere) points += 15;
    if (planet.magneticField) points += 10;

    Object.values(state.players).forEach(function(p) {
        if (p.team === teamId) {
            p.science = (p.science || 0) + points;
            p.status = 'Выбрали: ' + planet.name;
        }
    });

    console.log('Команда ' + teamId + ' получила ' + points + ' очков науки за ' + planet.name);
}

function checkAllTeamsVoted(state) {
    let allDone = true;
    for (let i = 0; i < state.requiredTeams; i++) {
        if (state.teams[i].targetPlanet === null || state.teams[i].targetPlanet === undefined) {
            allDone = false;
        }
    }

    if (allDone) {
        state.votingFinished = true;
        buildVoteResults(state);
        console.log('Все команды выбрали планеты. Фаза 2 завершена.');
    }
}

// 🆕 Формируем таблицу итогов для всех
function buildVoteResults(state) {
    state.voteResults = [];
    for (let i = 0; i < state.requiredTeams; i++) {
        const targetId = state.teams[i].targetPlanet;
        const planet = state.planets[targetId];

        // Считаем голоса
        const teamVotes = state.votes[i] || {};
        let totalWeight = 0;
        const voters = [];
        Object.keys(teamVotes).forEach(function(sId) {
            totalWeight += teamVotes[sId].weight;
            const p = state.players[sId];
            if (p) voters.push(p.name + ' (' + teamVotes[sId].weight + ')');
        });

        state.voteResults.push({
            teamName: state.teams[i].name,
            planetName: planet ? planet.name : '?',
            planetId: targetId,
            totalVotes: totalWeight,
            voters: voters.join(', ')
        });
    }
}

module.exports = {
    initPhase2: initPhase2,
    scanParameter: scanParameter,
    checkEnergyForVoting: checkEnergyForVoting,
    voteForPlanet: voteForPlanet,
    SCAN_COSTS: SCAN_COSTS,
    PARAM_NAMES: PARAM_NAMES
};