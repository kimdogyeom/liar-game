// server.js (수정된 코드)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const gameController = require('./controllers/gameController');

const app = express();

// 미들웨어 설정을 Socket.IO 설정 이전으로 이동
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://192.168.1.107:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.on('connection', (socket) => {
    console.log('새로운 유저 연결:', socket.id);

    try {
        gameController(io, socket);
    } catch (err) {
        console.error('gameController 실행 중 에러 발생:', err);
    }

    socket.on('error', (err) => {
        console.error('소켓 에러:', err);
    });
});

// 서버 실행
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});
