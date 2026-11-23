// Speaks Phrases with the browser's built-in speech synthesis (es-ES voice).
(function (root) {
  'use strict';

  const synth = root.speechSynthesis;
  const supported = !!synth && typeof root.SpeechSynthesisUtterance === 'function';
  let voice = null;
  const listeners = new Set();

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

  // Returns a Promise that resolves when the utterance ends (or fails).
  function speak(text, { rate = 0.9 } = {}) {
    return new Promise(resolve => {
      if (!supported) return resolve();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      if (voice) u.voice = voice;
      u.rate = rate;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });
  }

  function stop() {
    if (supported) synth.cancel();
  }

  root.Speech = {
    supported,
    speak,
    stop,
    voice: () => voice,
    isSpanishSpain: () => !!voice && voice.lang.replace('_', '-').toLowerCase() === 'es-es',
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})(window);
