// models/room.js

class Room {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = []; // { id, name, keyword, isLiar, hasGeneratedImage }
        this.liarId = null;
        this.keywords = [];
        this.votes = {}; // { voterId: suspectId }
        this.currentTurnIndex = 0;
        this.images = []; // { playerId, imageUrl, userName }
        this.discussionTimer = null;
    }

    addPlayer(player) {
        this.players.push(player);
    }

    removePlayer(playerId) {
        this.players = this.players.filter((player) => player.id !== playerId);
    }

    assignLiarAndKeywords() {
        // 라이어 선정
        const liarIndex = Math.floor(Math.random() * this.players.length);
        this.liarId = this.players[liarIndex].id;

        // 키워드 리스트 (예시)
        this.keywords = [
            // 과일
            '사과', '바나나', '포도', '딸기', '오렌지',
            // 야채
            '당근', '감자', '고구마', '양배추', '브로콜리',
            // 음식
            '피자', '햄버거', '스파게티', '떡볶이', '김밥',
            // 음료
            '콜라', '커피', '우유', '녹차', '주스',
            // 동물
            '고양이', '개', '토끼', '코끼리', '펭귄',
            // 가전
            '냉장고', '세탁기', '전자레인지', '드라이기', '청소기',
            // 자연
            '산', '강', '바다', '사막', '숲',
            // 장소
            '학교', '공원', '병원', '도서관', '백화점',
            // 직업
            '의사', '선생님', '경찰관', '요리사', '엔지니어'
        ];

        // 랜덤 키워드 선택
        const keyword =
            this.keywords[Math.floor(Math.random() * this.keywords.length)];

        // 각 플레이어에게 키워드 할당
        this.players.forEach((player) => {
            player.hasGeneratedImage = false; // 이미지 생성 여부 초기화
            if (player.id !== this.liarId) {
                player.keyword = keyword;
                player.isLiar = false;
            } else {
                player.keyword = null;
                player.isLiar = true;
            }
        });
    }

    getCurrentPlayer() {
        return this.players[this.currentTurnIndex];
    }

    advanceTurn() {
        this.currentTurnIndex += 1;
    }

    allImagesGenerated() {
        return this.players.every((player) => player.hasGeneratedImage);
    }
}

module.exports = Room;
