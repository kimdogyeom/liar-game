// controllers/gameController.js

const Room = require('../models/room');
const generateImage = require('../utils/imageGenerator');

const rooms = {}; // 방 정보를 저장하는 객체

module.exports = (io, socket) => {
    function generateUniqueRoomId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // 방 생성
    socket.on('create-room', ({userName}, callback) => {
        const roomId = generateUniqueRoomId();
        const room = new Room(roomId);

        rooms[roomId] = room;

        // 방에 플레이어 추가 및 조인
        const player = {
            id: socket.id,
            name: userName,
            keyword: null,
            isLiar: false,
        };

        room.addPlayer(player);
        socket.join(roomId);

        callback({roomId});
    });

    // 방 참가
    socket.on('join-room', ({roomId, userName}, callback) => {
        const room = rooms[roomId];
        if (room) {
            const player = {
                id: socket.id,
                name: userName,
                keyword: null,
                isLiar: false,
            };

            room.addPlayer(player);
            socket.join(roomId);

            // 플레이어 목록 업데이트
            io.to(roomId).emit('update-players', room.players);

            callback({status: 'ok'});
        } else {
            callback({status: 'error', message: '방이 존재하지 않습니다.'});
        }
    });

    // 게임 시작
    socket.on('start-game', ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            room.assignLiarAndKeywords();

            // 각 플레이어에게 키워드 전송
            room.players.forEach((player) => {
                io.to(player.id).emit('assign-keyword', {
                    keyword: player.keyword,
                    isLiar: player.isLiar,
                });
            });

            // 게임 시작 알림 및 첫 번째 플레이어의 턴 시작
            io.to(roomId).emit('game-started', {
                currentPlayerId: room.getCurrentPlayer().id,
            });
        }
    });

    // 이미지 생성 요청
    socket.on('request-image', async ({ roomId, prompt }) => {
        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);

        if (room && player) {
            // 현재 플레이어인지 확인
            if (room.getCurrentPlayer().id !== socket.id) {
                io.to(socket.id).emit('error', { message: '당신의 차례가 아닙니다.' });
                return;
            }

            try {
                // 이미지 생성
                const imageUrl = await generateImage(prompt);

                // 플레이어의 이미지 생성 상태 업데이트
                player.hasGeneratedImage = true;

                // 이미지 저장
                room.images.push({
                    playerId: socket.id,
                    imageUrl,
                    userName: player.name,
                });

                // 다음 플레이어로 턴 이동
                if (room.currentTurnIndex < room.players.length - 1) {
                    room.advanceTurn();
                    // 다음 플레이어에게 턴 알림
                    io.to(room.roomId).emit('next-turn', {
                        currentPlayerId: room.getCurrentPlayer().id,
                    });
                } else {
                    // 모든 플레이어가 이미지를 생성한 경우
                    io.to(room.roomId).emit('all-images-generated', {
                        images: room.images,
                    });

                    // 토론 시간 시작
                    startDiscussionTimer(io, room);
                }
            } catch (error) {
                io.to(socket.id).emit('error', { message: '이미지 생성 실패' });
            }
        }
    });

    // 토론 시간 타이머 시작 함수
    function startDiscussionTimer(io, room) {
        let timeLeft = 120; // 2분 = 120초
        io.to(room.roomId).emit('discussion-started', { timeLeft });

        room.discussionTimer = setInterval(() => {
            timeLeft -= 1;
            io.to(room.roomId).emit('discussion-timer', { timeLeft });

            if (timeLeft <= 0) {
                clearInterval(room.discussionTimer);
                io.to(room.roomId).emit('discussion-ended');
                // 투표 단계로 이동
                io.to(room.roomId).emit('start-voting');
            }
        }, 1000);
    }

    // 투표 처리
    socket.on('vote', ({ roomId, suspectId }) => {
        const room = rooms[roomId];
        if (room) {
            room.votes[socket.id] = suspectId;

            // 모든 플레이어가 투표했는지 확인
            if (Object.keys(room.votes).length === room.players.length) {
                endVotingPhase(io, room);
            }
        }
    });


    // 채팅 메시지 처리
    socket.on('send-message', ({roomId, message}) => {
        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
            io.to(roomId).emit('receive-message', {
                userId: socket.id,
                userName: player.name,
                message,
            });
        }
    });

    // 투표 처리
    socket.on('vote', ({roomId, suspectId}) => {
        const room = rooms[roomId];
        if (room) {
            room.votes[socket.id] = suspectId;

            // 모든 플레이어가 투표했는지 확인
            if (Object.keys(room.votes).length === room.players.length) {
                endVotingPhase(io, room);
            }
        }
    });

    // 연결 해제 처리
    socket.on('disconnect', () => {
        console.log('유저 연결 해제:', socket.id);
        // 모든 방에서 플레이어 제거
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.removePlayer(socket.id);
            io.to(roomId).emit('update-players', room.players);

            // 방에 플레이어가 없으면 방 삭제
            if (room.players.length === 0) {
                delete rooms[roomId];
            }
        }
    });

    // 투표 종료 및 결과 처리
    function endVotingPhase(io, room) {
        const votes = room.votes;
        const voteCounts = {};

        // 투표 결과 집계
        Object.values(votes).forEach((suspectId) => {
            voteCounts[suspectId] = (voteCounts[suspectId] || 0) + 1;
        });

        // 최다 득표자 찾기
        const maxVotes = Math.max(...Object.values(voteCounts));
        const suspects = Object.keys(voteCounts).filter(
            (id) => voteCounts[id] === maxVotes
        );

        // 결과 발표
        io.to(room.roomId).emit('voting-result', {
            suspects,
            liarId: room.liarId,
            players: room.players,
        });

        // 게임 데이터 초기화 또는 삭제
        delete rooms[room.roomId];
    }
};

// TODO
// 라운드 기능도 추가하면 좋을듯
// 현재는 한 라운드만 진행함
