// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameRoom = require('./room');
const Phase4Landing = require('./handlers/phase4_landing');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const room = new GameRoom();

io.on('connection', function(socket) {
    room.addSocket(socket);
    console.log('Новое соединение: ' + socket.id);

    socket.on('register', function(data) {
        if (data.type === 'MASTER') {
            room.registerMaster(socket.id);
            console.log('Зарегистрирован ВЕДУЩИЙ: ' + socket.id);
        } else if (data.type === 'PLAYER') {
            const success = room.registerPlayer(socket.id);
            if (!success) {
                socket.emit('error_msg', 'Лобби заполнено (10/10) или игра уже идет.');
                socket.disconnect();
                return;
            }
            console.log('Зарегистрирован ИГРОК: ' + socket.id + '. Всего: ' + Object.keys(room.state.players).length);
        }
        room.broadcast();
    });

    socket.on('action', function(msg) {
        if (room.state.masters[socket.id]) {
            if (msg.type === 'SET_REQUIRED_TEAMS') room.setRequiredTeams(socket.id, msg.count);
            if (msg.type === 'SET_REQUIRED_PLAYERS') room.setRequiredPlayers(socket.id, msg.count);
            if (msg.type === 'SET_PLANET_COUNT') room.setPlanetCount(socket.id, msg.count);
            if (msg.type === 'ADVANCE_PHASE') {
                room.advancePhase(socket.id);
            }
        } else if (room.state.players[socket.id]) {
            room.handlePlayerAction(socket.id, msg);
        }
        room.broadcast();
    });

    // Обработка действий мини-игры спуска (Фаза 3)
    socket.on('descent:action', function(action) {
        if (room.state.phase === 'PHASE_3_DESCENT' && room.state.players[socket.id]) {
            Phase4Landing.handleDescentAction(room.state, socket.id, action);
            room.broadcast();
        }
    });

    socket.on('disconnect', function() {
        console.log('Отключился: ' + socket.id);
        room.removeSocket(socket.id);
        room.broadcast();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log('Сервер запущен: http://localhost:' + PORT);
});