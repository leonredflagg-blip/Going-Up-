/**
 * Going Up: Web Audio API Sound Synthesizer
 * Справжні звукові ефекти, оптимізовані для ПК, планшетів та смартфонів (iOS/Android)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.unlocked = false;
        this.bindMobileUnlock();
    }

    // Мобільне розблокування аудіо при першому дотику (touch/pointer)
    bindMobileUnlock() {
        const unlock = () => {
            if (!this.unlocked) {
                this.init();
                if (this.ctx) {
                    if (this.ctx.state === 'suspended') {
                        this.ctx.resume();
                    }
                    // Граємо тихий буфер для повного зняття блокування на iOS Safari
                    try {
                        const buffer = this.ctx.createBuffer(1, 1, 22050);
                        const source = this.ctx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(this.ctx.destination);
                        source.start(0);
                    } catch (e) {}
                    this.unlocked = true;
                }
            }
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('click', unlock);
        };

        window.addEventListener('touchstart', unlock, { passive: true });
        window.addEventListener('pointerdown', unlock, { passive: true });
        window.addEventListener('click', unlock, { passive: true });
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Клацання по кнопці
    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {}
    }

    // Звук ліфта "Дінь-Дон" (прибуття на поверх)
    playElevatorChime() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.8);

            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(523.25, now + 0.35);
            gain2.gain.setValueAtTime(0.3, now + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(now + 0.35);
            osc2.stop(now + 1.2);
        } catch (e) {}
    }

    // Правильна відповідь
    playCorrect() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const now = this.ctx.currentTime + idx * 0.08;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.4);
            });
        } catch (e) {}
    }

    // Неправильна відповідь
    playWrong() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.4);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        } catch (e) {}
    }

    // Сирена для Червоної Кнопки
    playSiren() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.15);
            osc.frequency.linearRampToValueAtTime(450, now + 0.3);
            osc.frequency.linearRampToValueAtTime(900, now + 0.45);
            osc.frequency.linearRampToValueAtTime(450, now + 0.6);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.65);
        } catch (e) {}
    }

    // Дзвінок диспетчеру
    playPhoneRing() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            for (let i = 0; i < 2; i++) {
                const start = now + i * 0.25;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(425, start);
                gain.gain.setValueAtTime(0.2, start);
                gain.gain.setValueAtTime(0.001, start + 0.15);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(start);
                osc.stop(start + 0.15);
            }
        } catch (e) {}
    }

    // Звук пиття кави
    playSlurp() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.2);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    // Перемога
    playVictory() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const melody = [
                { f: 523.25, d: 0.15 },
                { f: 523.25, d: 0.15 },
                { f: 523.25, d: 0.15 },
                { f: 659.25, d: 0.4 },
                { f: 783.99, d: 0.4 },
                { f: 1046.50, d: 0.8 }
            ];

            let cursor = this.ctx.currentTime;
            melody.forEach(item => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(item.f, cursor);
                gain.gain.setValueAtTime(0.3, cursor);
                gain.gain.exponentialRampToValueAtTime(0.01, cursor + item.d);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(cursor);
                osc.stop(cursor + item.d);
                cursor += item.d + 0.05;
            });
        } catch (e) {}
    }

    // Рух ліфта
    playElevatorMotor() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, now);
            osc.frequency.linearRampToValueAtTime(140, now + 0.5);
            osc.frequency.linearRampToValueAtTime(60, now + 1.0);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 1.0);
        } catch (e) {}
    }
}

const sounds = new SoundEngine();
