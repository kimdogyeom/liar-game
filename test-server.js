// test-server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // 테스트를 위해 모든 도메인 허용
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.on('connection', (socket) => {
    console.log('새로운 유저 연결:', socket.id);

    socket.on('disconnect', () => {
        console.log('유저 연결 해제:', socket.id);
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`테스트 서버가 ${PORT} 포트에서 실행 중입니다.`);
});
