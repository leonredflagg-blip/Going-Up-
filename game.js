/**
 * Going Up: Головний ігровий рушій
 * Повністю адаптований для сенсорних екранів (Touch/Pointer) смартфонів, планшетів та ПК
 */

class GoingUpGame {
    constructor() {
        this.playerName = localStorage.getItem('going_up_name') || "Пілот Ліфта";
        this.playerAvatar = localStorage.getItem('going_up_avatar') || "🚀";
        this.gameMode = 'solo'; // 'solo' або 'multiplayer'
        
        this.score = 0;
        this.floor = 1;
        this.maxFloor = 10;
        
        this.streak = 0;
        this.multiplier = 1.0;
        
        this.dispatcherCalls = 1;
        this.coffeeBoosts = 1;
        this.sabotageCount = 1;
        this.redButtonClicks = 0;
        
        this.currentTask = null;
        this.timerSeconds = 15;
        this.currentTimer = 15;
        this.timerInterval = null;
        this.isProcessingAnswer = false;

        this.usedQuestions = {
            blitz: [],
            logic: [],
            memes: [],
            minigames: [],
            boss: []
        };

        // Мережевий модуль (без ботів)
        this.network = new OnlineNetwork(this);

        this.initDOM();
        this.initShaftBg();
        this.bindEvents();
        this.bindMultiplayerEvents();
        this.loadRecords();
        this.updateProfileUI();
    }

    initDOM() {
        // Екрани
        this.mainMenuScreen = document.getElementById('mainMenuScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.cabin = document.getElementById('elevatorCabin');
        
        // HUD
        this.floorDisplay = document.getElementById('floorDisplay');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.comboBadge = document.getElementById('comboBadge');
        this.comboMultiplier = document.getElementById('comboMultiplier');
        this.timerBar = document.getElementById('timerBar');
        
        // Табло перегонів мультиплеєру
        this.multiRaceBoard = document.getElementById('multiRaceBoard');
        this.racePlayersRow = document.getElementById('racePlayersRow');
        
        // Завдання
        this.categoryBadge = document.getElementById('categoryBadge');
        this.pointsPill = document.getElementById('pointsPill');
        this.questionText = document.getElementById('questionText');
        this.optionsGrid = document.getElementById('optionsGrid');
        this.minigameContainer = document.getElementById('minigameContainer');
        this.conciergeText = document.getElementById('conciergeText');
        
        // Гаджети
        this.btnDispatcher = document.getElementById('btnDispatcher');
        this.btnCoffee = document.getElementById('btnCoffee');
        this.btnRedButton = document.getElementById('btnRedButton');
        this.btnSabotage = document.getElementById('btnSabotage');
        this.dispatcherBadge = document.getElementById('dispatcherBadge');
        this.coffeeBadge = document.getElementById('coffeeBadge');
        this.sabotageBadge = document.getElementById('sabotageBadge');
        
        // Модальні вікна
        this.modalOnline = document.getElementById('modalOnline');
        this.modalFinish = document.getElementById('modalFinish');
        this.modalRecords = document.getElementById('modalRecords');
        this.modalHelp = document.getElementById('modalHelp');
        this.sabotageOverlay = document.getElementById('sabotageOverlay');
    }

    initShaftBg() {
        const bg = document.getElementById('shaftBg');
        if (!bg) return;
        bg.innerHTML = '';
        const count = window.innerWidth < 600 ? 14 : 24; // Менше частинок для слабких мобільних процесорів
        for (let i = 0; i < count; i++) {
            const line = document.createElement('div');
            line.className = 'shaft-line';
            line.style.left = `${Math.random() * 100}%`;
            line.style.animationDuration = `${0.9 + Math.random() * 1.4}s`;
            line.style.animationDelay = `${Math.random() * 1.5}s`;
            bg.appendChild(line);
        }
    }

    updateProfileUI() {
        const nameInput = document.getElementById('menuPlayerName');
        const avatarDisplay = document.getElementById('currentAvatarDisplay');
        if (nameInput) nameInput.value = this.playerName;
        if (avatarDisplay) avatarDisplay.textContent = this.playerAvatar;
    }

    getPlayerProfile() {
        return {
            name: this.playerName,
            avatar: this.playerAvatar,
            score: this.score,
            floor: this.floor
        };
    }

    bindEvents() {
        // Зміна імені
        const nameInput = document.getElementById('menuPlayerName');
        nameInput.addEventListener('input', (e) => {
            this.playerName = e.target.value.trim() || "Пілот Ліфта";
            localStorage.setItem('going_up_name', this.playerName);
        });

        // Вибір аватара
        const avatarDisplay = document.getElementById('currentAvatarDisplay');
        const btnChangeAvatar = document.getElementById('btnChangeAvatar');
        const avatarPicker = document.getElementById('avatarPicker');

        const togglePicker = () => avatarPicker.classList.toggle('active');
        avatarDisplay.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            togglePicker();
        });
        btnChangeAvatar.addEventListener('click', togglePicker);

        avatarPicker.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.playerAvatar = opt.dataset.avatar;
                avatarDisplay.textContent = this.playerAvatar;
                localStorage.setItem('going_up_avatar', this.playerAvatar);
                avatarPicker.classList.remove('active');
                sounds.playClick();
            });
        });

        // Запуск Одиночного режиму
        document.getElementById('btnStartSolo').addEventListener('click', () => {
            sounds.playClick();
            sounds.init();
            this.gameMode = 'solo';
            this.network.mode = 'solo';
            this.startSoloMatch();
        });

        // Відкрити онлайн лобі
        document.getElementById('btnOpenOnlineModal').addEventListener('click', () => {
            sounds.playClick();
            sounds.init();
            this.resetOnlineLobbyScreens();
            this.modalOnline.classList.add('active');
        });

        document.getElementById('btnCloseOnlineModal').addEventListener('click', () => {
            sounds.playClick();
            this.network.disconnect();
            this.modalOnline.classList.remove('active');
        });

        // Повернутися в меню
        document.getElementById('btnBackToMenu').addEventListener('click', () => {
            sounds.playClick();
            this.returnToMenu();
        });

        document.getElementById('btnFinishToMenu').addEventListener('click', () => {
            sounds.playClick();
            this.modalFinish.classList.remove('active');
            this.returnToMenu();
        });

        document.getElementById('btnRestartGame').addEventListener('click', () => {
            sounds.playClick();
            this.modalFinish.classList.remove('active');
            if (this.gameMode === 'multiplayer') {
                this.returnToMenu();
            } else {
                this.startSoloMatch();
            }
        });

        // Гаджети
        this.btnDispatcher.addEventListener('click', () => this.useDispatcher());
        this.btnCoffee.addEventListener('click', () => this.useCoffee());
        this.btnRedButton.addEventListener('click', () => this.pressRedButton());
        this.btnSabotage.addEventListener('click', () => this.useSabotage());

        this.sabotageOverlay.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            sounds.playClick();
            this.sabotageOverlay.classList.remove('active');
        });

        // Звук та модалки
        const soundBtn = document.getElementById('btnToggleSound');
        const menuSoundBtn = document.getElementById('btnMenuSound');
        const toggleSoundAction = () => {
            const muted = sounds.toggleMute();
            soundBtn.textContent = muted ? '🔇' : '🔊';
            menuSoundBtn.textContent = muted ? '🔇 Звук: ВИМК' : '🔊 Звук: УВІМК';
        };

        soundBtn.addEventListener('click', toggleSoundAction);
        menuSoundBtn.addEventListener('click', toggleSoundAction);

        document.getElementById('btnMenuRecords').addEventListener('click', () => {
            sounds.playClick();
            this.renderRecordsTable();
            this.modalRecords.classList.add('active');
        });
        document.getElementById('btnShowRecords').addEventListener('click', () => {
            sounds.playClick();
            this.renderRecordsTable();
            this.modalRecords.classList.add('active');
        });

        document.getElementById('btnMenuHelp').addEventListener('click', () => {
            sounds.playClick();
            this.modalHelp.classList.add('active');
        });
        document.getElementById('btnShowHelp').addEventListener('click', () => {
            sounds.playClick();
            this.modalHelp.classList.add('active');
        });

        // Гарячі клавіші для 1, 2, 3, 4 (на ПК)
        window.addEventListener('keydown', (e) => {
            if (['1', '2', '3', '4'].includes(e.key)) {
                const idx = parseInt(e.key) - 1;
                const buttons = this.optionsGrid.querySelectorAll('.btn-option');
                if (buttons[idx] && !buttons[idx].disabled && this.optionsGrid.style.display !== 'none') {
                    buttons[idx].click();
                }
            }
        });
    }

    // ==========================================
    // МУЛЬТИПЛЕЄР ЛОБІ (2-8 ГРАВЦІВ, БЕЗ БОТІВ)
    // ==========================================

    resetOnlineLobbyScreens() {
        document.getElementById('roomSelectScreen').style.display = 'block';
        document.getElementById('roomJoinInputScreen').style.display = 'none';
        document.getElementById('roomWaitingLobbyScreen').style.display = 'none';
        document.getElementById('inputRoomCode').value = '';
    }

    bindMultiplayerEvents() {
        document.getElementById('btnCreateNewRoomAction').addEventListener('click', () => {
            sounds.playClick();
            const pin = this.network.createRoom();
            document.getElementById('currentRoomCodeDisplay').textContent = pin;

            document.getElementById('roomSelectScreen').style.display = 'none';
            document.getElementById('roomWaitingLobbyScreen').style.display = 'block';
        });

        document.getElementById('btnOpenJoinCodeAction').addEventListener('click', () => {
            sounds.playClick();
            document.getElementById('roomSelectScreen').style.display = 'none';
            document.getElementById('roomJoinInputScreen').style.display = 'block';
        });

        document.getElementById('btnBackToRoomSelect').addEventListener('click', () => {
            sounds.playClick();
            this.resetOnlineLobbyScreens();
        });

        document.getElementById('btnConfirmJoinRoom').addEventListener('click', () => {
            const code = document.getElementById('inputRoomCode').value.trim();
            if (!code) {
                alert("Будь ласка, введіть 4-значний PIN-код кімнати!");
                return;
            }
            sounds.playClick();
            this.network.joinRoom(code);
            document.getElementById('currentRoomCodeDisplay').textContent = code;

            document.getElementById('roomJoinInputScreen').style.display = 'none';
            document.getElementById('roomWaitingLobbyScreen').style.display = 'block';
        });

        document.getElementById('btnHostStartGame').addEventListener('click', () => {
            sounds.playClick();
            this.network.hostStartGame();
        });
    }

    startMultiplayerMatch(players) {
        this.gameMode = 'multiplayer';
        this.modalOnline.classList.remove('active');
        this.mainMenuScreen.style.display = 'none';
        this.gameScreen.style.display = 'flex';

        this.multiRaceBoard.style.display = 'flex';
        this.btnSabotage.style.display = 'inline-flex';

        this.initGameVariables();
        this.updateRaceLeaderboard(players);

        sounds.playElevatorChime();
        this.loadFloor(this.floor);
    }

    updateRaceLeaderboard(players) {
        if (!this.racePlayersRow || !players) return;
        this.racePlayersRow.innerHTML = '';

        const sorted = [...players].sort((a, b) => {
            if (b.floor !== a.floor) return b.floor - a.floor;
            return b.score - a.score;
        });

        sorted.forEach((p, index) => {
            const pill = document.createElement('div');
            pill.className = 'race-player-pill';
            if (p.id === this.network.myId) pill.classList.add('is-me');
            if (index === 0) pill.classList.add('leader');

            pill.innerHTML = `
                <span class="r-rank">#${index + 1}</span>
                <span>${p.avatar}</span>
                <span class="r-name">${p.name}</span>
                <span>FL ${p.floor < 10 ? '0' + p.floor : p.floor}</span>
                <span class="r-pts">${p.score}Б</span>
            `;
            this.racePlayersRow.appendChild(pill);
        });
    }

    useSabotage() {
        if (this.sabotageCount <= 0 || this.isProcessingAnswer) return;
        sounds.playClick();
        this.sabotageCount--;
        this.sabotageBadge.textContent = this.sabotageCount;
        this.btnSabotage.disabled = true;

        this.network.sendSabotage();
        this.sayConcierge("🪲 Саботаж запущено у ліфти всіх суперників у кімнаті!");
    }

    onReceiveSabotage(senderName) {
        sounds.playSiren();
        this.cabin.classList.add('shake');
        
        const label = document.getElementById('sabotageSenderName');
        if (label) {
            label.textContent = `${senderName || 'Суперник'} запустив жука у ваш ліфт! Клікніть, щоб струсити його!`;
        }
        
        this.sabotageOverlay.classList.add('active');
        setTimeout(() => this.cabin.classList.remove('shake'), 600);
        setTimeout(() => this.sabotageOverlay.classList.remove('active'), 2500);
    }

    // ==========================================
    // ОДИНОЧНИЙ РЕЖИМ
    // ==========================================

    startSoloMatch() {
        this.gameMode = 'solo';
        this.mainMenuScreen.style.display = 'none';
        this.gameScreen.style.display = 'flex';

        this.multiRaceBoard.style.display = 'none';
        this.btnSabotage.style.display = 'none';

        this.initGameVariables();
        sounds.playElevatorChime();
        this.loadFloor(this.floor);
    }

    initGameVariables() {
        this.score = 0;
        this.floor = 1;
        this.streak = 0;
        this.multiplier = 1.0;
        this.dispatcherCalls = 1;
        this.coffeeBoosts = 1;
        this.sabotageCount = 1;
        this.redButtonClicks = 0;

        this.dispatcherBadge.textContent = '1';
        this.coffeeBadge.textContent = '1';
        this.sabotageBadge.textContent = '1';
        this.btnDispatcher.disabled = false;
        this.btnCoffee.disabled = false;
        this.btnSabotage.disabled = false;

        this.usedQuestions = {
            blitz: [],
            logic: [],
            memes: [],
            minigames: [],
            boss: []
        };

        this.updateHUD();
    }

    returnToMenu() {
        clearInterval(this.timerInterval);
        this.network.disconnect();
        this.gameScreen.style.display = 'none';
        this.mainMenuScreen.style.display = 'block';
        this.updateProfileUI();
    }

    updateHUD() {
        this.floorDisplay.textContent = `FL ${this.floor < 10 ? '0' + this.floor : this.floor}`;
        this.scoreDisplay.textContent = this.score.toLocaleString();
        
        if (this.streak >= 2) {
            this.comboBadge.style.display = 'flex';
            this.comboMultiplier.textContent = `x${this.multiplier.toFixed(1)}`;
        } else {
            this.comboBadge.style.display = 'none';
        }
    }

    loadFloor(floorNumber) {
        clearInterval(this.timerInterval);
        this.isProcessingAnswer = false;
        this.optionsGrid.style.display = 'grid';
        this.minigameContainer.style.display = 'none';
        this.minigameContainer.innerHTML = '';

        let categoryKey = 'blitz';
        if (floorNumber <= 3) {
            categoryKey = 'blitz';
        } else if (floorNumber <= 5) {
            categoryKey = 'logic';
        } else if (floorNumber <= 7) {
            categoryKey = 'memes';
        } else if (floorNumber <= 9) {
            categoryKey = 'minigames';
        } else {
            categoryKey = 'boss';
        }

        if (categoryKey === 'minigames') {
            this.setupMinigame();
        } else {
            this.setupQuestion(categoryKey);
        }
    }

    setupQuestion(categoryKey) {
        const pool = QUESTION_BANK[categoryKey];
        let available = pool.filter((_, idx) => !this.usedQuestions[categoryKey].includes(idx));
        
        let task;
        if (available.length === 0 || (Math.random() < 0.25 && categoryKey !== 'boss')) {
            task = aiGenerator.generate(categoryKey);
        } else {
            const randomIdx = Math.floor(Math.random() * available.length);
            task = available[randomIdx];
            this.usedQuestions[categoryKey].push(pool.indexOf(task));
        }

        this.currentTask = task;

        this.categoryBadge.textContent = task.category;
        this.categoryBadge.className = `category-tag ${task.categoryClass}`;
        this.pointsPill.textContent = `+${task.points} БАЛІВ`;
        this.questionText.textContent = task.question;

        this.optionsGrid.innerHTML = '';
        task.options.forEach((optText, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            btn.innerHTML = `
                <span class="opt-key">${i + 1}</span>
                <span>${optText}</span>
            `;
            // Оптимізація тапу для сенсорних екранів
            btn.addEventListener('pointerdown', () => this.handleAnswer(i, btn));
            this.optionsGrid.appendChild(btn);
        });

        this.startTimer(14);
    }

    startTimer(seconds) {
        clearInterval(this.timerInterval);
        this.timerSeconds = seconds;
        this.currentTimer = seconds;
        this.timerBar.style.width = '100%';
        this.timerBar.classList.remove('warning');

        const stepMs = 100;
        const totalSteps = (seconds * 1000) / stepMs;
        let step = totalSteps;

        this.timerInterval = setInterval(() => {
            step--;
            const pct = (step / totalSteps) * 100;
            this.timerBar.style.width = `${Math.max(0, pct)}%`;

            if (pct <= 30) {
                this.timerBar.classList.add('warning');
            }

            if (step <= 0) {
                clearInterval(this.timerInterval);
                this.handleTimeout();
            }
        }, stepMs);
    }

    handleAnswer(selectedIndex, buttonElement) {
        if (this.isProcessingAnswer) return;
        this.isProcessingAnswer = true;
        clearInterval(this.timerInterval);

        const isCorrect = selectedIndex === this.currentTask.correct;
        const allButtons = this.optionsGrid.querySelectorAll('.btn-option');

        if (isCorrect) {
            buttonElement.classList.add('correct');
            sounds.playCorrect();
            this.streak++;
            this.multiplier = 1.0 + Math.min(this.streak * 0.2, 1.5);
            
            const earnedPoints = Math.round(this.currentTask.points * this.multiplier);
            this.score += earnedPoints;

            if (this.currentTask.joke) {
                this.sayConcierge(this.currentTask.joke);
            } else if (this.streak >= 3) {
                const quote = ELEVATOR_QUOTES.streak[Math.floor(Math.random() * ELEVATOR_QUOTES.streak.length)];
                this.sayConcierge(quote);
            } else {
                this.sayConcierge("В яблучко! Ліфт набирає висоту!");
            }

            this.updateHUD();
            this.network.broadcastProgress(this.floor, this.score, "✅ Вірно!");

            setTimeout(() => {
                this.advanceFloor();
            }, 1400);

        } else {
            buttonElement.classList.add('wrong');
            if (allButtons[this.currentTask.correct]) {
                allButtons[this.currentTask.correct].classList.add('correct');
            }
            sounds.playWrong();
            this.streak = 0;
            this.multiplier = 1.0;
            this.updateHUD();

            this.network.broadcastProgress(this.floor, this.score, "❌ Помилка!");

            this.cabin.classList.add('shake');
            setTimeout(() => this.cabin.classList.remove('shake'), 500);

            const wrongQuote = ELEVATOR_QUOTES.wrong[Math.floor(Math.random() * ELEVATOR_QUOTES.wrong.length)];
            this.sayConcierge(wrongQuote);

            setTimeout(() => {
                this.advanceFloor();
            }, 1800);
        }
    }

    handleTimeout() {
        if (this.isProcessingAnswer) return;
        this.isProcessingAnswer = true;
        sounds.playWrong();
        this.streak = 0;
        this.multiplier = 1.0;
        this.updateHUD();

        const allButtons = this.optionsGrid.querySelectorAll('.btn-option');
        if (this.currentTask && allButtons[this.currentTask.correct]) {
            allButtons[this.currentTask.correct].classList.add('correct');
        }

        this.sayConcierge("⏰ Час вийшов! Диспетчер ледь не заснув!");
        this.network.broadcastProgress(this.floor, this.score, "⏰ Час!");

        setTimeout(() => {
            this.advanceFloor();
        }, 1500);
    }

    advanceFloor() {
        if (this.floor >= this.maxFloor) {
            this.finishGame(true);
            return;
        }

        sounds.playElevatorMotor();
        this.cabin.classList.add('doors-closed');

        setTimeout(() => {
            this.floor++;
            this.updateHUD();
            this.network.broadcastProgress(this.floor, this.score, `🚀 FL ${this.floor}`);
            sounds.playElevatorChime();
            this.loadFloor(this.floor);
            this.cabin.classList.remove('doors-closed');
        }, 750);
    }

    // ==========================================
    // ІНТЕРАКТИВНІ МІНІ-ІГРИ (TOUCH / POINTER)
    // ==========================================
    setupMinigame() {
        const pool = QUESTION_BANK.minigames;
        const task = pool[Math.floor(Math.random() * pool.length)];
        this.currentTask = task;

        this.categoryBadge.textContent = task.category;
        this.categoryBadge.className = `category-tag ${task.categoryClass}`;
        this.pointsPill.textContent = `+${task.points} БАЛІВ`;
        this.questionText.textContent = task.title;

        this.optionsGrid.style.display = 'none';
        this.minigameContainer.style.display = 'flex';
        this.minigameContainer.innerHTML = '';

        const desc = document.createElement('p');
        desc.style.color = '#cbd5e1';
        desc.style.fontSize = '13.5px';
        desc.style.marginBottom = '10px';
        desc.style.textAlign = 'center';
        desc.textContent = task.description;
        this.minigameContainer.appendChild(desc);

        if (task.type === 'bugs') {
            this.runBugsMinigame(task);
        } else if (task.type === 'speed') {
            this.runTurboMinigame(task);
        } else if (task.type === 'timing') {
            this.runTimingMinigame(task);
        } else if (task.type === 'simon') {
            this.runSimonMinigame(task);
        }
    }

    runBugsMinigame(task) {
        let caught = 0;
        const field = document.createElement('div');
        field.className = 'bug-hunting-field';
        this.minigameContainer.appendChild(field);

        const counter = document.createElement('div');
        counter.style.fontSize = '16px';
        counter.style.fontWeight = 'bold';
        counter.style.color = 'var(--blue-cyan)';
        counter.textContent = `Зловлено: 0 / ${task.target}`;
        this.minigameContainer.appendChild(counter);

        const spawnBug = () => {
            if (this.isProcessingAnswer || caught >= task.target) return;
            const bug = document.createElement('div');
            bug.className = 'bug-target';
            bug.textContent = '🪲';
            bug.style.left = `${Math.random() * 80}%`;
            bug.style.top = `${Math.random() * 70}%`;

            // Швидкий сенсорний відгук через pointerdown
            bug.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                sounds.playClick();
                caught++;
                counter.textContent = `Зловлено: ${caught} / ${task.target}`;
                bug.remove();

                if (caught >= task.target) {
                    this.resolveMinigameSuccess(task.points, "Всі баги виловлені! Кабелі ліфта чисті!");
                }
            });

            field.appendChild(bug);
            setTimeout(() => {
                if (bug.parentNode) bug.remove();
            }, 1200);
        };

        const bugInterval = setInterval(spawnBug, 500);
        this.startTimer(task.duration);

        const checkEnd = setInterval(() => {
            if (this.isProcessingAnswer) {
                clearInterval(bugInterval);
                clearInterval(checkEnd);
            }
        }, 100);
    }

    runTurboMinigame(task) {
        let clicks = 0;
        const wrap = document.createElement('div');
        wrap.className = 'turbo-progress-wrap';
        const fill = document.createElement('div');
        fill.className = 'turbo-progress-fill';
        wrap.appendChild(fill);
        this.minigameContainer.appendChild(wrap);

        const btn = document.createElement('button');
        btn.className = 'turbo-click-btn';
        btn.textContent = '🚀 ТУРБО-ПІДЙОМ!';
        this.minigameContainer.appendChild(btn);

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.isProcessingAnswer) return;
            sounds.playClick();
            clicks++;
            const pct = Math.min(100, (clicks / task.target) * 100);
            fill.style.width = `${pct}%`;

            if (clicks >= task.target) {
                this.resolveMinigameSuccess(task.points, "ТУРБОРЕЖИМ СПРАЦЮВАВ! Пробили затор!");
            }
        });

        this.startTimer(task.duration);
    }

    runTimingMinigame(task) {
        const track = document.createElement('div');
        track.className = 'timing-track';

        const safeZone = document.createElement('div');
        safeZone.className = 'timing-safe-zone';
        track.appendChild(safeZone);

        const cursor = document.createElement('div');
        cursor.className = 'timing-cursor';
        track.appendChild(cursor);

        this.minigameContainer.appendChild(track);

        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.style.maxWidth = '280px';
        btn.textContent = '🎯 ЗАФІКСУВАТИ!';
        this.minigameContainer.appendChild(btn);

        let pos = 0;
        let dir = 1.6;
        let animId;

        const loop = () => {
            pos += dir;
            if (pos >= 98 || pos <= 0) dir = -dir;
            cursor.style.left = `${pos}%`;
            animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            cancelAnimationFrame(animId);
            if (pos >= task.targetZone.min && pos <= task.targetZone.max) {
                this.resolveMinigameSuccess(task.points, "ІДЕАЛЬНА ТОЧНІСТЬ! Трос стабілізовано!");
            } else {
                this.handleMinigameFail("Трохи не влучили в синю зону... Трос втримався!");
            }
        });

        this.startTimer(8);
    }

    runSimonMinigame(task) {
        const simonWrap = document.createElement('div');
        simonWrap.className = 'simon-panel';

        const buttons = [];
        for (let i = 1; i <= 4; i++) {
            const b = document.createElement('button');
            b.className = 'simon-btn';
            b.textContent = i;
            b.dataset.id = i;
            simonWrap.appendChild(b);
            buttons.push(b);
        }
        this.minigameContainer.appendChild(simonWrap);

        const sequence = [];
        for (let i = 0; i < task.sequenceLength; i++) {
            sequence.push(Math.floor(Math.random() * 4) + 1);
        }

        let playerIdx = 0;
        let canInput = false;

        this.sayConcierge("Запам'ятовуйте послідовність кнопок ліфта...");

        let seqStep = 0;
        const interval = setInterval(() => {
            if (seqStep >= sequence.length) {
                clearInterval(interval);
                canInput = true;
                this.sayConcierge("Тепер повторіть код доступу!");
                this.startTimer(10);
                return;
            }
            const btnId = sequence[seqStep];
            const targetBtn = buttons[btnId - 1];
            targetBtn.classList.add('lit');
            sounds.playClick();
            setTimeout(() => targetBtn.classList.remove('lit'), 350);
            seqStep++;
        }, 650);

        buttons.forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (!canInput || this.isProcessingAnswer) return;
                const chosen = parseInt(btn.dataset.id);
                btn.classList.add('lit');
                sounds.playClick();
                setTimeout(() => btn.classList.remove('lit'), 200);

                if (chosen === sequence[playerIdx]) {
                    playerIdx++;
                    if (playerIdx === sequence.length) {
                        this.resolveMinigameSuccess(task.points, "Код прийнято! Двері відчинені!");
                    }
                } else {
                    this.handleMinigameFail("Помилка в коді доступу! Сигналізація пищить!");
                }
            });
        });
    }

    resolveMinigameSuccess(points, msg) {
        if (this.isProcessingAnswer) return;
        this.isProcessingAnswer = true;
        clearInterval(this.timerInterval);
        sounds.playCorrect();

        this.streak++;
        this.multiplier = 1.0 + Math.min(this.streak * 0.2, 1.5);
        const earned = Math.round(points * this.multiplier);
        this.score += earned;
        this.updateHUD();

        this.network.broadcastProgress(this.floor, this.score, "⭐ Міні-гра пройшла!");
        this.sayConcierge(msg);

        setTimeout(() => {
            this.advanceFloor();
        }, 1500);
    }

    handleMinigameFail(msg) {
        if (this.isProcessingAnswer) return;
        this.isProcessingAnswer = true;
        clearInterval(this.timerInterval);
        sounds.playWrong();

        this.streak = 0;
        this.multiplier = 1.0;
        this.updateHUD();

        this.network.broadcastProgress(this.floor, this.score, "⚠️ Збій у міні-грі!");

        this.cabin.classList.add('shake');
        setTimeout(() => this.cabin.classList.remove('shake'), 500);
        this.sayConcierge(msg);

        setTimeout(() => {
            this.advanceFloor();
        }, 1800);
    }

    // ==========================================
    // ПРИКОЛЬЧИКИ ТА БОНУСИ
    // ==========================================

    useDispatcher() {
        if (this.dispatcherCalls <= 0 || this.isProcessingAnswer) return;
        if (!this.currentTask || !this.currentTask.options) {
            this.sayConcierge("Диспетчер Василь каже: 'Тут треба діяти власноруч, підказки немає!'");
            return;
        }

        sounds.playPhoneRing();
        this.dispatcherCalls--;
        this.dispatcherBadge.textContent = this.dispatcherCalls;
        if (this.dispatcherCalls === 0) this.btnDispatcher.disabled = true;

        const hintQuote = DISPATCHER_HINTS[Math.floor(Math.random() * DISPATCHER_HINTS.length)];
        this.sayConcierge(hintQuote);

        const buttons = Array.from(this.optionsGrid.querySelectorAll('.btn-option'));
        const wrongButtons = buttons.filter((_, idx) => idx !== this.currentTask.correct);
        
        wrongButtons.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(2, wrongButtons.length); i++) {
            wrongButtons[i].classList.add('disabled-hint');
            wrongButtons[i].disabled = true;
        }
    }

    useCoffee() {
        if (this.coffeeBoosts <= 0 || this.isProcessingAnswer) return;
        sounds.playSlurp();
        this.coffeeBoosts--;
        this.coffeeBadge.textContent = this.coffeeBoosts;
        if (this.coffeeBoosts === 0) this.btnCoffee.disabled = true;

        this.timerSeconds += 7;
        this.sayConcierge("☕ Еспресо випито! Додано +7 секунд! Очі горять, ліфт летить!");
        this.network.broadcastProgress(this.floor, this.score, "☕ Еспресо!");
        this.startTimer(this.timerSeconds);
    }

    pressRedButton() {
        sounds.playSiren();
        this.redButtonClicks++;

        this.cabin.classList.add('shake');
        this.cabin.classList.add('disco-mode');

        const quotes = ELEVATOR_QUOTES.redButton;
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        this.sayConcierge(q);

        const bonus = 150;
        this.score += bonus;
        this.updateHUD();

        this.network.broadcastProgress(this.floor, this.score, "🚨 ДИСКОТЕКА!");

        setTimeout(() => {
            this.cabin.classList.remove('shake');
            this.cabin.classList.remove('disco-mode');
        }, 2500);
    }

    sayConcierge(text) {
        this.conciergeText.textContent = `"${text}"`;
        const box = document.getElementById('conciergeBox');
        box.style.transform = 'scale(1.02)';
        setTimeout(() => box.style.transform = 'scale(1)', 200);
    }

    // ==========================================
    // ФІНІШ ТА РЕКОРДИ
    // ==========================================

    finishGame(isVictory) {
        clearInterval(this.timerInterval);
        sounds.playVictory();
        this.launchConfetti();

        const finishTitle = document.getElementById('finishTitle');
        const finishSub = document.getElementById('finishSub');
        const finishScore = document.getElementById('finishScore');
        const finishRank = document.getElementById('finishRank');
        const finishComment = document.getElementById('finishComment');
        
        const podiumBox = document.getElementById('multiplayerPodiumBox');
        const podiumList = document.getElementById('podiumList');
        const soloBox = document.getElementById('soloScoreBox');

        finishScore.textContent = this.score.toLocaleString();

        let rank = "Пасажир Економ-класу 🥉";
        if (this.score >= 5000) {
            rank = "Володар Хмарочоса & Король Ліфтів 👑";
        } else if (this.score >= 3500) {
            rank = "Головний Сисадмін Ліфтової Шахти ⚡";
        } else if (this.score >= 2000) {
            rank = "Досвідчений Ліфтер-Експерт 🚀";
        }
        finishRank.textContent = `Звання: ${rank}`;

        if (this.gameMode === 'multiplayer' && this.network.players.length > 0) {
            podiumBox.style.display = 'block';
            soloBox.style.display = 'none';
            podiumList.innerHTML = '';

            const finalSorted = [...this.network.players].sort((a, b) => b.score - a.score);
            const medals = ['🥇', '🥈', '🥉'];
            const classes = ['gold', 'silver', 'bronze'];

            finalSorted.forEach((p, idx) => {
                const row = document.createElement('div');
                row.className = `podium-row ${classes[idx] || ''}`;
                const medal = medals[idx] || `#${idx + 1}`;
                row.innerHTML = `
                    <div>
                        <span style="font-size: 16px; margin-right: 4px;">${medal}</span>
                        <span>${p.avatar}</span>
                        <strong>${p.name} ${p.id === this.network.myId ? '(Ви)' : ''}</strong>
                    </div>
                    <div>
                        <span style="margin-right: 8px; font-size: 11px; color: var(--blue-neon);">FL ${p.floor}</span>
                        <span style="font-size: 16px; font-weight: 900; font-family: monospace; color: var(--accent-gold);">${p.score} Б</span>
                    </div>
                `;
                podiumList.appendChild(row);
            });

            const isWinner = finalSorted[0] && finalSorted[0].id === this.network.myId;
            if (isWinner) {
                finishTitle.innerHTML = "🏆 <span>ВИ ПЕРЕМОЖЕЦЬ БИТВИ!</span>";
                finishSub.textContent = "Ваш ліфт першим підкорив вершину серед усіх гравців!";
            } else {
                finishTitle.innerHTML = "🏁 <span>БИТВУ ЗАВЕРШЕНО!</span>";
                finishSub.textContent = "Чудова гра! Перевірте своє місце на подіумі перегонів!";
            }

        } else {
            podiumBox.style.display = 'none';
            soloBox.style.display = 'block';

            if (isVictory) {
                finishTitle.innerHTML = "🎉 <span>ДАХ ПІДКОРЕНО!</span>";
                finishSub.textContent = "Ви дісталися 10-го поверху і встановили грандіозний результат!";
                finishComment.textContent = `"Диспетчер Василь особисто тисне вам руку і пригощає круасаном!"`;
            }
        }

        this.saveRecord(this.playerName, this.score, this.floor);
        this.modalFinish.classList.add('active');
    }

    saveRecord(name, score, floor) {
        let records = [];
        try {
            records = JSON.parse(localStorage.getItem('going_up_records') || '[]');
        } catch (e) {
            records = [];
        }

        records.push({
            name: `${this.playerAvatar} ${name || 'Невідомий'}`,
            score: score,
            floor: floor,
            date: new Date().toLocaleDateString('uk-UA')
        });

        records.sort((a, b) => b.score - a.score);
        records = records.slice(0, 10);

        try {
            localStorage.setItem('going_up_records', JSON.stringify(records));
        } catch (e) {}
    }

    loadRecords() {
        let records = [];
        try {
            records = JSON.parse(localStorage.getItem('going_up_records') || '[]');
        } catch (e) {
            records = [];
        }

        if (records.length === 0) {
            records = [
                { name: "🛗 Диспетчер Василь", score: 4800, floor: 10, date: "12.11.2026" },
                { name: "🐱 Кіт-Ліфтер", score: 3200, floor: 8, date: "11.11.2026" },
                { name: "👨‍💻 Senior DevOps", score: 2500, floor: 6, date: "10.11.2026" }
            ];
            try {
                localStorage.setItem('going_up_records', JSON.stringify(records));
            } catch (e) {}
        }
    }

    renderRecordsTable() {
        const tbody = document.getElementById('recordsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let records = [];
        try {
            records = JSON.parse(localStorage.getItem('going_up_records') || '[]');
        } catch (e) {
            records = [];
        }

        records.forEach((rec, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${idx + 1}</td>
                <td><strong>${rec.name}</strong></td>
                <td>ПОВЕРХ ${rec.floor}</td>
                <td style="text-align: right; font-weight: bold; color: var(--accent-gold);">${rec.score.toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    launchConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const count = window.innerWidth < 600 ? 70 : 120; // Оптимізована кількість для мобільних
        const particles = [];
        const colors = ['#00f0ff', '#2563eb', '#38bdf8', '#fbbf24', '#ffffff', '#93c5fd'];

        for (let i = 0; i < count; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.7) * 18,
                size: Math.random() * 7 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rSpeed: (Math.random() - 0.5) * 10
            });
        }

        let frames = 0;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35;
                p.rotation += p.rSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            frames++;
            if (frames < 180) {
                requestAnimationFrame(render);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        requestAnimationFrame(render);
    }
}

// Запуск гри при завантаженні сторінки
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GoingUpGame();
});
