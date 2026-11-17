// Sound, synthesized live with WebAudio — no audio files. A tiny synth voice plays
// short blips for pickups, shots, crashes and sirens, plus a soft bass line that
// follows the day. Everything is guarded so a browser without audio still plays.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  const BASS = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    try {
      if (context.state === 'suspended') void context.resume();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, context.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), context.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(context.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  function noise(dur, vol, low) {
    if (muted || !ensure()) return;
    try {
      const len = Math.floor(context.sampleRate * dur);
      const buffer = context.createBuffer(1, len, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low || 1200;
      const gain = context.createGain();
      gain.gain.value = vol || 0.25;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Ignore audio failures.
    }
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    isMuted() { return muted; },
    click() { tone(660, 0.07, 'square', 0.12); },
    coin() { tone(880, 0.09, 'sine', 0.2); tone(1320, 0.14, 'sine', 0.16); },
    punch() { noise(0.12, 0.3, 700); },
    shoot() { noise(0.09, 0.35, 2600); tone(180, 0.08, 'square', 0.14, 60); },
    crash() { noise(0.25, 0.4, 500); tone(90, 0.2, 'sawtooth', 0.2, 40); },
    siren() { tone(740, 0.32, 'sine', 0.1, 980); },
    engine() { tone(70, 0.12, 'sawtooth', 0.05, 110); },
    mission() { tone(523, 0.12, 'triangle', 0.2); tone(784, 0.2, 'triangle', 0.2); },
    busted() { tone(392, 0.3, 'sawtooth', 0.2, 196); tone(196, 0.5, 'sawtooth', 0.2, 98); },
    /** A slow bass line, called every frame; notes land on its own timer. */
    music(dt, wanted) {
      if (muted || !ensure()) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      musicTimer = wanted > 0 ? 0.32 : 0.5;
      const note = BASS[musicStep % BASS.length];
      musicStep += 1;
      tone(note, 0.42, 'triangle', wanted > 0 ? 0.16 : 0.09);
    },
  };
}
