/* Hero: pulsos apilados (al estilo de la famosa gráfica de CP 1919). Cada línea es un
   perfil de pulso; las líneas suben lentamente y entran nuevas por abajo. */
(function () {
  'use strict';
  var canvas = document.getElementById('pulses');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ROWS = 36, PTS = 170, STEP_MS = 1700;
  var W = 0, H = 0, rows = [], shape = new Float32Array(PTS), env = new Float32Array(PTS);
  var colors = { bg: [7, 10, 20], line: [255, 180, 84] };
  var raf = 0, visible = true, last = 0, acc = 0;

  function hex(v, fallback) {
    v = (v || '').trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) return fallback;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors.bg = hex(s.getPropertyValue('--bg'), colors.bg);
    colors.line = hex(s.getPropertyValue('--accent'), colors.line);
  }
  function makeRow() {
    var n = new Float32Array(PTS), i;
    for (i = 0; i < PTS; i++) n[i] = Math.random() * 2 - 1;
    return { n: n, amp: 0.55 + Math.random() * 0.75, off: (Math.random() - 0.5) * 0.022 };
  }
  function g(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }

  (function init() {
    for (var i = 0; i < PTS; i++) {
      var u = i / (PTS - 1);
      shape[i] = g(u, 0.76, 0.026) + 0.42 * g(u, 0.68, 0.036) + 0.12 * g(u, 0.85, 0.045);
      env[i] = 0.25 + 0.75 * g(u, 0.76, 0.26);
    }
    for (var r = 0; r < ROWS + 1; r++) rows.push(makeRow());
  })();

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(acc / STEP_MS);
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

  function draw(f) {
    ctx.clearRect(0, 0, W, H);
    var top = H * 0.14, bottom = H * 0.9, spacing = (bottom - top) / ROWS;
    var x0 = W * 0.04, x1 = W * 1.0, span = x1 - x0;
    var peak = Math.min(H * 0.17, 150), noise = Math.min(H * 0.012, 9);
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    for (var r = 0; r <= ROWS; r++) {
      var row = rows[r];
      var y = top + (r - f) * spacing;
      var depth = r / ROWS;
      var alpha = 0.18 + 0.82 * depth;
      if (r === 0) alpha *= (1 - f);
      if (r === ROWS) alpha *= f;
      if (alpha <= 0.01) continue;
      ctx.beginPath();
      for (var i = 0; i < PTS; i++) {
        var x = x0 + (i / (PTS - 1)) * span;
        var shift = Math.round(row.off * PTS);
        var s = shape[Math.min(PTS - 1, Math.max(0, i - shift))];
        var yy = y - s * row.amp * peak - row.n[i] * env[i] * noise;
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      /* Relleno con el color de fondo: oculta las líneas de atrás. */
      ctx.save();
      ctx.lineTo(x1, y + spacing * 3);
      ctx.lineTo(x0, y + spacing * 3);
      ctx.closePath();
      ctx.fillStyle = rgba(colors.bg, Math.min(1, alpha + 0.2));
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      for (i = 0; i < PTS; i++) {
        x = x0 + (i / (PTS - 1)) * span;
        s = shape[Math.min(PTS - 1, Math.max(0, i - Math.round(row.off * PTS)))];
        yy = y - s * row.amp * peak - row.n[i] * env[i] * noise;
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = rgba(colors.line, alpha);
      ctx.stroke();
    }
  }

  function frame(t) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (!last) last = t;
    acc += t - last; last = t;
    while (acc >= STEP_MS) { acc -= STEP_MS; rows.shift(); rows.push(makeRow()); }
    draw(acc / STEP_MS);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!reduce && !raf && visible) raf = requestAnimationFrame(frame); }

  readColors();
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { last = 0; start(); });
  document.addEventListener('puma:themechange', function () { readColors(); draw(acc / STEP_MS); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; last = 0; start(); }).observe(canvas);
  }
  start();
})();
