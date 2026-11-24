// Speaks Phrases. A Phrase's Recording (an mp3 made with Piper, listed in data/audio.js) is
// preferred; the browser's built-in speech synthesis (es-ES voice) is the fallback when a
// Phrase has no Recording, its Recording is stale, or the audio fails to play.
(function (root) {
  'use strict';

  const synth = root.speechSynthesis;
  const supported = !!synth && typeof root.SpeechSynthesisUtterance === 'function';
  let voice = null;
  const listeners = new Set();

  // One shared element: once a mobile browser has allowed it to play after a tap,
  // later Phrases (e.g. "listen and repeat") can play on it too.
  const audio = typeof root.Audio === 'function' ? new root.Audio() : null;
  let finishCurrent = null; // resolves the Promise of whatever is playing now

  const SLOW_RATE = { synth: 0.6, recording: 0.7 };
  const NORMAL_RATE = { synth: 0.9, recording: 1 };

  function pickVoice() {
    if (!supported) return;
    const voices = synth.getVoices();
    const es = voices.filter(v => v.lang.replace('_', '-').toLowerCase() === 'es-es');
    voice =
      es.find(v => /natural|online|neural/i.test(v.name)) ||
      es[0] ||
      voices.find(v => v.lang.toLowerCase().startsWith('es')) ||
      null;
    listeners.forEach(fn => fn());
  }

  if (supported) {
    pickVoice();
    synth.addEventListener
      ? synth.addEventListener('voiceschanged', pickVoice)
      : (synth.onvoiceschanged = pickVoice);
  }

  function recordings() {
    return root.AUDIO && typeof root.AUDIO === 'object' ? root.AUDIO : {};
  }

  // A Recording is used only if it was made from the Phrase's current text.
  function recordingFor(phrase) {
    const rec = recordings()[phrase.id];
    return rec && rec.text === phrase.es ? rec : null;
  }

  function speakText(text, slow) {
    return new Promise(resolve => {
      if (!supported) return resolve();
      finishCurrent = resolve;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      if (voice) u.voice = voice;
      u.rate = slow ? SLOW_RATE.synth : NORMAL_RATE.synth;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });
  }

  function playRecording(rec, slow) {
    return new Promise((resolve, reject) => {
      finishCurrent = resolve;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Recording failed to load: ' + rec.file));
      audio.src = rec.file;
      audio.defaultPlaybackRate = audio.playbackRate = slow ? SLOW_RATE.recording : NORMAL_RATE.recording;
      const started = audio.play();
      if (started && typeof started.catch === 'function') started.catch(reject);
    });
  }

  // Speaks a Phrase ({ id, es }). Returns a Promise that resolves when it has finished,
  // failed, or been stopped.
  function say(phrase, { slow = false } = {}) {
    stop();
    const rec = audio ? recordingFor(phrase) : null;
    if (!rec) return speakText(phrase.es, slow);
    return playRecording(rec, slow).catch(() => speakText(phrase.es, slow));
  }

  function stop() {
    if (supported) synth.cancel();
    if (audio) {
      audio.onended = audio.onerror = null;
      audio.pause();
    }
    if (finishCurrent) {
      const done = finishCurrent;
      finishCurrent = null;
      done();
    }
  }

  root.Speech = {
    supported,
    say,
    stop,
    hasRecordings: () => Object.keys(recordings()).length > 0,
    voice: () => voice,
    isSpanishSpain: () => !!voice && voice.lang.replace('_', '-').toLowerCase() === 'es-es',
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})(window);
