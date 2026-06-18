/* Hero motif — a DNA double-helix paired with an RNA strand, echoing the Gemini
   mark (the "twins": expression DNA + RNA). Canvas 2D, gentle continuous twist. */
(function () {
  var c = document.getElementById('heroCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W, H, DPR;
  var INK = '14,27,42', TEAL = '45,138,138', TEALL = '63,176,176';
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = c.clientWidth; H = c.clientHeight;
    c.width = W * DPR; c.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  var t = 0, STEPS = 130;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    t += 0.011;
    var topY = H * 0.13, botY = H * 0.87, span = botY - topY;
    var helixX = W * 0.46, rnaX = W * 0.665;
    var amp = Math.min(W * 0.9, H) * 0.085;
    var turns = 2.5;

    // ---- DNA double helix ----
    var s1 = [], s2 = [];
    for (var i = 0; i <= STEPS; i++) {
      var f = i / STEPS, y = topY + f * span;
      var ph = f * turns * 6.2832 + t;
      s1.push({ x: helixX + Math.sin(ph) * amp, y: y, z: Math.cos(ph) });
      s2.push({ x: helixX + Math.sin(ph + Math.PI) * amp, y: y, z: -Math.cos(ph) });
    }
    // base-pair rungs
    for (var i = 0; i <= STEPS; i += 5) {
      var depth = (s1[i].z + 1) / 2;
      ctx.strokeStyle = 'rgba(' + TEAL + ',' + (0.14 + depth * 0.42).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s1[i].x, s1[i].y); ctx.lineTo(s2[i].x, s2[i].y); ctx.stroke();
    }
    // strands — back (ink, faint) then front (teal)
    function strand(s, rgb, a, w) {
      ctx.strokeStyle = 'rgba(' + rgb + ',' + a + ')'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i <= STEPS; i++) { i === 0 ? ctx.moveTo(s[i].x, s[i].y) : ctx.lineTo(s[i].x, s[i].y); }
      ctx.stroke();
    }
    strand(s2, INK, 0.38, 2.4);
    strand(s1, TEAL, 0.92, 3);
    // nucleotide nodes
    for (var i = 0; i <= STEPS; i += 5) {
      [s1[i], s2[i]].forEach(function (p) {
        var d = (p.z + 1) / 2;
        ctx.fillStyle = 'rgba(' + INK + ',' + (0.22 + d * 0.5).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2 + d * 1.7, 0, 6.2832); ctx.fill();
      });
    }

    // ---- RNA single strand ----
    var rAmp = amp * 0.5, rpts = [];
    ctx.strokeStyle = 'rgba(' + TEAL + ',0.8)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i <= STEPS; i++) {
      var f = i / STEPS, y = topY + f * span;
      var x = rnaX + Math.sin(f * turns * 6.2832 - t * 0.85) * rAmp;
      rpts.push({ x: x, y: y });
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // RNA bases (comb ticks)
    for (var i = 2; i < STEPS; i += 4) {
      var p = rpts[i], pn = rpts[i + 1] || p, pp = rpts[i - 1] || p;
      var dx = pn.x - pp.x, dy = pn.y - pp.y, m = Math.sqrt(dx * dx + dy * dy) || 1;
      ctx.strokeStyle = 'rgba(' + TEALL + ',0.62)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (-dy / m) * 7, p.y + (dx / m) * 7); ctx.stroke();
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
