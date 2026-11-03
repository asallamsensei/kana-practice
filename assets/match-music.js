/* Shared, optional musical feedback for answers and matching boards. No learning data is stored here. */
(function (root) {
  'use strict';
  if (root.MatchMusic) return;
  // Music has its own preference: unrelated legacy quiz effects must not mute it.
  // Only an explicit music-button choice of 'off' disables music across pages.
  const KEY = 'sensei_matching_music_v1';
  const NOTES = [261.6256,293.6648,329.6276,349.2282,391.9954,440,493.8833];
  let enabled = true, context = null, queue = [], timer = null, busyUntil = 0, button = null;
  try { enabled = root.localStorage.getItem(KEY) !== 'off'; } catch (_) {}
  function contextForGesture() {
    try {
      const Constructor = root.AudioContext || root.webkitAudioContext;
      if (!Constructor || !enabled) return null;
      if (!context) context = new Constructor();
      if (context.state === 'suspended') {
        const resumed = context.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
      }
      return context;
    } catch (_) { return null; }
  }
  function speaking() {
    try {
      if (root.speechSynthesis && (root.speechSynthesis.speaking || root.speechSynthesis.pending)) return true;
      return !!(root.document && Array.from(root.document.querySelectorAll('audio:not([data-match-music-background]),video:not([data-match-music-background])')).some(function (media) {
        return !media.paused && !media.ended;
      }));
    } catch (_) { return false; }
  }
  function allowed(job) {
    try { return enabled && (job.board.generation === job.generation || job.keepCompletion); }
    catch (_) { return false; }
  }
  function schedulePump(delay) {
    if (timer !== null) return;
    timer = root.setTimeout(function () { timer = null; pump(); }, delay);
  }
  function tone(frequency, when, duration, gain) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, when);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(gain, when + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope); envelope.connect(context.destination);
    oscillator.onended = function () { try { oscillator.disconnect(); envelope.disconnect(); } catch (_) {} };
    oscillator.start(when); oscillator.stop(when + duration + 0.025);
  }
  function play(job) {
    const now = context.currentTime + 0.015;
    if (!job.answer) tone(NOTES[job.index % NOTES.length] * Math.pow(2, Math.floor(job.index / NOTES.length)), now, 0.23, 0.23);
    let duration = 0.29;
    if (job.complete || job.answer) {
      const offset = job.answer ? -0.30 : 0;
      // A separate rising flourish followed by a major chord. Chord gain: .33; the brief preceding tail keeps the total below .4.
      [523.2511,659.2551,783.9909].forEach(function (frequency, index) {
        tone(frequency, now + offset + 0.30 + index * 0.11, 0.18, 0.18);
      });
      [523.2511,659.2551,783.9909].forEach(function (frequency) {
        tone(frequency, now + offset + 0.67, 0.55, 0.11);
      });
      duration = 1.27 + offset;
    }
    busyUntil = context.currentTime + duration;
    schedulePump(duration * 1000 + 30);
  }
  function pump() {
    // Sentence audio can be long; keep earned answer feedback through it, with a bounded expiry.
    queue = queue.filter(function (job) { return allowed(job) && Date.now() - job.created < (job.answer ? 120000 : 15000); });
    if (!queue.length) return;
    if (!context || context.state === 'closed') { queue = []; return; }
    if (context.state !== 'running') { schedulePump(120); return; }
    let engineBusy = false;
    try { engineBusy = queue[0].board.isBusy(); } catch (_) {}
    if (speaking() || engineBusy || context.currentTime < busyUntil) { schedulePump(80); return; }
    const job = queue.shift();
    try { play(job); } catch (_) { schedulePump(80); }
  }
  function updateButton() {
    if (!button) return;
    const effective = enabled;
    button.textContent = effective ? '♫ Música: activada' : '♫ Música: silenciada';
    button.setAttribute('aria-pressed', String(effective));
  }
  function setEnabled(value) {
    enabled = !!value;
    if (!enabled) queue = []; // Never cut off a note that has already started.
    try { root.localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (_) {}
    updateButton();
    if (enabled) contextForGesture();
  }
  function installControl() {
    if (!root.document || !root.document.body || root.document.getElementById('matchingMusicToggle')) return;
    const holder = root.document.createElement('div');
    holder.style.cssText = 'display:flex;justify-content:center;flex-wrap:wrap;margin:12px auto;max-width:100%;padding:0 12px;box-sizing:border-box';
    button = root.document.createElement('button');
    button.type = 'button'; button.id = 'matchingMusicToggle';
    button.style.cssText = 'font:inherit;font-size:13px;color:inherit;background:transparent;border:1px solid currentColor;border-radius:10px;padding:9px 13px;min-height:40px;cursor:pointer';
    button.setAttribute('aria-label', 'Activar o silenciar la música de aciertos y parejas');
    button.addEventListener('click', function () { const effective = enabled; setEnabled(!effective); });
    holder.appendChild(button);
    const footer = root.document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(holder, footer); else root.document.body.appendChild(holder);
    updateButton();
  }
  function create(options) {
    options = options || {};
    const board = {isBusy:typeof options.isBusy === 'function' ? options.isBusy : function () { return false; },generation:0, index:0, finished:false, answered:new Set()};
    updateButton();
    return {
      cancel: function () { queue = queue.filter(function (job) { return job.board !== board; }); },
      reset: function (settings) { queue.forEach(function (job) { if (job.board === board) job.keepCompletion = !!(settings && settings.keepCompletion); }); board.generation++; board.index = 0; board.finished = false; board.answered.clear(); queue = queue.filter(function (job) { return job.board !== board || job.keepCompletion; }); },
      correct: function (token) {
        // Callers guard answered questions; optional stable tokens also reject duplicate events.
        if (token !== undefined && token !== null) {
          if (board.answered.has(token)) return;
          board.answered.add(token);
          if (board.answered.size > 512) board.answered.delete(board.answered.values().next().value);
        }
        const job = {board:board,generation:board.generation,answer:true,created:Date.now()};
        if (!allowed(job)) return;
        contextForGesture();
        queue.push(job);
        schedulePump(35);
      },
      match: function (result) {
        if (board.finished) return;
        const index = board.index++;
        const complete = !!(result && result.complete);
        if (complete) board.finished = true;
        const job = {board:board,generation:board.generation,index:index,complete:complete,created:Date.now()};
        if (!allowed(job)) return;
        contextForGesture();
        queue.push(job);
        // Let the same click handler start its spoken feedback before deciding whether to play.
        schedulePump(35);
      }
    };
  }
  root.MatchMusic = {create:create,setEnabled:setEnabled,isEnabled:function () { return enabled; },unlock:contextForGesture};
  if (root.document) {
    root.document.addEventListener('change', function () { root.setTimeout(updateButton, 0); }, true);
    root.document.addEventListener('pointerdown', contextForGesture, true);
    root.document.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') contextForGesture(); }, true);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', installControl); else installControl();
  }
  root.addEventListener && root.addEventListener('pagehide', function () { queue = []; });
  root.addEventListener && root.addEventListener('storage', function (event) { if (event.key === KEY) { enabled = event.newValue !== 'off'; if (!enabled) queue = []; updateButton(); } });
})(window);
