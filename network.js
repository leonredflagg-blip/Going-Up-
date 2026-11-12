/**
 * Going Up: Мережевий рушій для БАГАТОКОРИСТУВАЦЬКОГО ОНЛАЙНУ (2-8+ гравців)
 * ТІЛЬКИ СПРАВЖНІ ГРАВЦІ — БОТІВ ВИДАЛЕНО!
 * Працює через:
 * 1. BroadcastChannel (ідеально для гри між кількома вкладками/вікнами на ПК)
 * 2. WebRTC PeerJS (для гри між різними пристроями)
 */

class OnlineNetwork {
    constructor(game) {
        this.game = game;
        this.myId = 'pilot_' + Math.random().toString(36).substr(2, 9);
        this.mode = 'solo'; // 'solo' або 'multiplayer'
        
        this.roomCode = null;
        this.isHost = false;
        this.players = []; // Масив усіх живих гравців у кімнаті: [{ id, name, avatar, score, floor, status, isHost }]
        
        this.broadcast = null;
        this.peer = null;
        this.peerConns = [];

        this.initBroadcast();
        this.initPeer();
    }

    initBroadcast() {
        if ('BroadcastChannel' in window) {
            try {
                this.broadcast = new BroadcastChannel('going_up_multiplayer_channel');
                this.broadcast.onmessage = (event) => this.handleMessage(event.data);
            } catch (e) {
                console.warn('BroadcastChannel error:', e);
            }
        }
    }

    initPeer() {
        if (typeof Peer !== 'undefined') {
            try {
                this.peer = new Peer();
                this.peer.on('open', (id) => {
                    this.myPeerId = id;
                });
                this.peer.on('connection', (conn) => {
                    this.peerConns.push(conn);
                    conn.on('data', (data) => this.handleMessage(data));
                });
            } catch (e) {
                console.warn('PeerJS init failed:', e);
            }
        }
    }

    send(data) {
        data.senderId = this.myId;
        data.roomCode = this.roomCode;

        // Через BroadcastChannel
        if (this.broadcast) {
            try {
                this.broadcast.postMessage(data);
            } catch (e) {}
        }
        // Через PeerJS з'єднання
        this.peerConns.forEach(conn => {
            if (conn && conn.open) {
                try { conn.send(data); } catch (e) {}
            }
        });
    }

    // ==========================================
    // КЕРУВАННЯ КІМНАТОЮ
    // ==========================================

    createRoom() {
        this.mode = 'multiplayer';
        this.isHost = true;
        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        const myProfile = this.game.getPlayerProfile();
        this.players = [{
            id: this.myId,
            name: myProfile.name,
            avatar: myProfile.avatar,
            score: 0,
            floor: 1,
            status: "👑 Організатор",
            isHost: true
        }];

        this.updateLobbyUI();
        return this.roomCode;
    }

    joinRoom(code) {
        this.mode = 'multiplayer';
        this.isHost = false;
        this.roomCode = code.toString().trim();

        const myProfile = this.game.getPlayerProfile();
        const myPlayerData = {
            id: this.myId,
            name: myProfile.name,
            avatar: myProfile.avatar,
            score: 0,
            floor: 1,
            status: "✅ Готовий",
            isHost: false
        };

        // Відправляємо запит хосту кімнати
        this.send({
            type: 'request_join',
            player: myPlayerData
        });
    }

    // Оновлення списку гравців хостом
    hostBroadcastRoomState() {
        if (!this.isHost) return;
        this.send({
            type: 'room_state_sync',
            players: this.players
        });
        this.updateLobbyUI();
    }

    // Запуск гри хостом для всіх гравців
    hostStartGame() {
        if (!this.isHost || this.players.length < 2) return;
        this.send({
            type: 'start_multiplayer_game',
            players: this.players
        });
        this.game.startMultiplayerMatch(this.players);
    }

    // Оновлення прогресу гравця (поверх, бали, статус)
    broadcastProgress(floor, score, statusText) {
        if (this.mode !== 'multiplayer') return;

        // Оновлюємо локально
        const me = this.players.find(p => p.id === this.myId);
        if (me) {
            me.floor = floor;
            me.score = score;
            me.status = statusText;
        }

        this.send({
            type: 'player_progress',
            playerId: this.myId,
            floor: floor,
            score: score,
            statusText: statusText
        });

        this.game.updateRaceLeaderboard(this.players);
    }

    // Саботаж усім суперникам
    sendSabotage() {
        if (this.mode !== 'multiplayer') return;

        this.send({
            type: 'sabotage_all',
            senderName: this.game.playerName
        });
    }

    // ==========================================
    // ОБРОБКА ПОВІДОМЛЕНЬ
    // ==========================================

    handleMessage(data) {
        if (!data || data.roomCode !== this.roomCode) return;
        if (data.senderId === this.myId) return; // Ігноруємо власні повідомлення

        switch (data.type) {
            // Запит на приєднання від нового гравця
            case 'request_join':
                if (this.isHost) {
                    const exists = this.players.some(p => p.id === data.player.id);
                    if (!exists) {
                        this.players.push(data.player);
                        sounds.playElevatorChime();
                        this.hostBroadcastRoomState();
                    }
                }
                break;

            // Синхронізація списку гравців у кімнаті
            case 'room_state_sync':
                this.players = data.players;
                this.updateLobbyUI();
                break;

            // Хост дав команду на старт
            case 'start_multiplayer_game':
                this.players = data.players;
                this.game.startMultiplayerMatch(this.players);
                break;

            // Оновлення прогресу одного з гравців
            case 'player_progress':
                const target = this.players.find(p => p.id === data.playerId);
                if (target) {
                    target.floor = data.floor;
                    target.score = data.score;
                    target.status = data.statusText;
                    this.game.updateRaceLeaderboard(this.players);
                }
                break;

            // Саботаж від іншого гравця
            case 'sabotage_all':
                this.game.onReceiveSabotage(data.senderName);
                break;

            // Гравець покинув гру
            case 'player_leave':
                this.players = this.players.filter(p => p.id !== data.playerId);
                if (this.isHost) {
                    this.hostBroadcastRoomState();
                } else {
                    this.updateLobbyUI();
                }
                this.game.updateRaceLeaderboard(this.players);
                break;
        }
    }

    updateLobbyUI() {
        const listContainer = document.getElementById('lobbyPlayersList');
        const countBadge = document.getElementById('lobbyPlayerCount');
        const startBtn = document.getElementById('btnHostStartGame');
        const waitingNotice = document.getElementById('waitingForHostText');

        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (countBadge) {
            countBadge.textContent = `${this.players.length} / 8`;
        }

        this.players.forEach(p => {
            const card = document.createElement('div');
            card.className = 'lobby-player-chip';
            if (p.id === this.myId) card.classList.add('is-me');

            card.innerHTML = `
                <span class="l-avatar">${p.avatar}</span>
                <div class="l-info">
                    <span class="l-name">${p.name} ${p.id === this.myId ? '(Ви)' : ''}</span>
                    <span class="l-status">${p.isHost ? '👑 Хост кімнати' : '✅ Готовий до старту'}</span>
                </div>
            `;
            listContainer.appendChild(card);
        });

        if (this.isHost) {
            if (startBtn) {
                startBtn.style.display = 'flex';
                startBtn.disabled = this.players.length < 2;
                startBtn.innerHTML = this.players.length >= 2 
                    ? `<span>🚀</span><span>ПОЧАТИ БИТВУ (${this.players.length} ГРАВЦІВ)</span>`
                    : `<span>⏳</span><span>ОЧІКУВАННЯ ГРАВЦІВ (МІНІМУМ 2)</span>`;
            }
            if (waitingNotice) waitingNotice.style.display = 'none';
        } else {
            if (startBtn) startBtn.style.display = 'none';
            if (waitingNotice) waitingNotice.style.display = 'block';
        }
    }

    disconnect() {
        if (this.roomCode) {
            this.send({
                type: 'player_leave',
                playerId: this.myId
            });
        }
        this.mode = 'solo';
        this.roomCode = null;
        this.isHost = false;
        this.players = [];
    }
}
