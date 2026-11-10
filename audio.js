/* My Goals — Web Audio ile kodla üretilen sesler */
const Snd = (function () {
  'use strict';
  let ctx = null, mus, sfx, noiseBuf, waveG, fireG, delay;
  let musicOn = true, sfxOn = true, night = false, island = true;
  let nextNote = 0, noteI = 0, idx = 4, timers = [];
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
  const PAD = [110, 87.31, 130.81, 98];

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    mus = ctx.createGain(); mus.gain.value = musicOn ? 1 : 0; mus.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = sfxOn ? 1 : 0; sfx.connect(ctx.destination);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.32; delay.connect(fb); fb.connect(delay); delay.connect(mus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // dalga
    const ws = noise(true), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
    waveG = ctx.createGain(); waveG.gain.value = 0.1;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.07;
    lfo.connect(lg); lg.connect(waveG.gain); lfo.start();
    ws.connect(lp); lp.connect(waveG); waveG.connect(sfx);
    // ateş
    const fs = noise(true), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    fireG = ctx.createGain(); fireG.gain.value = 0.018; fs.connect(hp); hp.connect(fireG); fireG.connect(sfx);
    nextNote = ctx.currentTime + 0.5;
    timers.push(setInterval(schedule, 250));
    timers.push(setInterval(crackle, 170));
    timers.push(setInterval(cricket, 900));
  }
  function noise(loop) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = !!loop; s.start(0, Math.random()); return s; }
  function tone(freq, t, dur, vol, type, dest, glide) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.05);
    return g;
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running' || !musicOn) { if (ctx) nextNote = Math.max(nextNote, ctx.currentTime + 0.3); return; }
    while (nextNote < ctx.currentTime + 0.6) {
      if (noteI % 8 === 0) {
        const f = PAD[(noteI / 8) % 4 | 0];
        [f, f * 1.5].forEach(x => {
          const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = x;
          g.gain.setValueAtTime(0.0001, nextNote); g.gain.linearRampToValueAtTime(0.035, nextNote + 1.5); g.gain.linearRampToValueAtTime(0.0001, nextNote + 6.2);
          o.connect(g); g.connect(mus); o.start(nextNote); o.stop(nextNote + 6.3);
        });
      }
      if (Math.random() > 0.28) {
        idx = Math.max(0, Math.min(SCALE.length - 1, idx + [-2, -1, -1, 1, 1, 2][Math.random() * 6 | 0]));
        const g = tone(SCALE[idx], nextNote, 1.5, 0.06, 'triangle', mus); g.connect(delay);
      }
      nextNote += 0.78; noteI++;
    }
  }
  function crackle() {
    if (!ctx || ctx.state !== 'running' || !sfxOn || !island || Math.random() > 0.4) return;
    const t = ctx.currentTime, s = noise(false), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 2000 + Math.random() * 3000; bp.Q.value = 2;
    g.gain.setValueAtTime(0.05 + Math.random() * 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(bp); bp.connect(g); g.connect(sfx); s.stop(t + 0.06);
  }
  function cricket() {
    if (!ctx || ctx.state !== 'running' || !sfxOn || !night || !island || Math.random() > 0.7) return;
    const t = ctx.currentTime, f = 4000 + Math.random() * 500;
    for (let i = 0; i < 3; i++) tone(f, t + i * 0.07, 0.045, 0.012, 'sine');
  }
  const ok = () => ctx && ctx.state === 'running' && sfxOn;
  return {
    unlock() { init(); if (ctx && ctx.state !== 'running') ctx.resume(); },
    pause() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMusic(v) { musicOn = v; if (mus) mus.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, 0.1); },
    setSfx(v) { sfxOn = v; if (sfx) sfx.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, 0.1); },
    setScene(isIsland, isNight) {
      island = isIsland; night = isNight;
      if (fireG) fireG.gain.setTargetAtTime(isIsland ? 0.018 : 0, ctx.currentTime, 0.4);
    },
    tap() { if (ok()) tone(520, ctx.currentTime, 0.07, 0.05, 'triangle'); },
    coin() { if (!ok()) return; const t = ctx.currentTime; tone(880, t, 0.12, 0.08, 'triangle'); tone(1318.5, t + 0.07, 0.2, 0.08, 'triangle'); },
    reward() { if (!ok()) return; const t = ctx.currentTime;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.45, 0.09, 'triangle')); tone(1318.5, t + 0.4, 0.8, 0.07, 'sine'); },
    build() { if (!ok()) return; const t = ctx.currentTime;[130, 110].forEach((f, i) => tone(f, t + i * 0.16, 0.14, 0.2, 'square', null, 60));[392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + 0.36 + i * 0.1, 0.6, 0.09, 'triangle')); },
    bad() { if (!ok()) return; const t = ctx.currentTime; tone(220, t, 0.25, 0.1, 'sawtooth', null, 110); tone(160, t + 0.18, 0.35, 0.1, 'sawtooth', null, 80); },
    thunder() {
      if (!ok()) return;
      const t = ctx.currentTime, s = noise(false), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(70, t + 2.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.05); g.gain.exponentialRampToValueAtTime(0.25, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      s.connect(lp); lp.connect(g); g.connect(sfx); s.stop(t + 1.95);
    },
    howl(vol) {
      if (!ok()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 900;
      o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.7); o.frequency.setValueAtTime(560, t + 1.5); o.frequency.exponentialRampToValueAtTime(380, t + 2.4);
      v.frequency.value = 5.5; vg.gain.value = 7; v.connect(vg); vg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.5); g.gain.setValueAtTime(vol || 0.12, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      o.connect(lp); lp.connect(g); g.connect(sfx); o.start(t); v.start(t); o.stop(t + 2.6); v.stop(t + 2.6);
    }
  };
})();
