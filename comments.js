/* Eyam mockup — SHARED Review Mode.
   Comments are stored in a Google Sheet via an Apps Script web app, so every
   reviewer sees every comment as a pin on the site (refreshes every ~15s).
   Falls back to this-browser-only storage if the endpoint is unreachable
   (e.g. opening the file locally). */
(function () {
  /* ↓↓↓ paste your Apps Script Web app URL (ends in /exec) between the quotes ↓↓↓ */
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbygIR1FyD9KC0Ijp61YRtwGgqB_FtY7io8OVANV5tKlkNiLSOxksMXgcr0676j8lMyc/exec';
  var LIVE = /script\.google(usercontent)?\.com/.test(ENDPOINT);

  var LS_NAME = 'eyam_reviewer_name';
  var LS_CACHE = 'eyam_review_cache';
  var comments = [];        // every comment, every page
  var active = false;

  function pageKey() {
    var seg = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
    return (!seg || seg === 'index') ? 'home' : seg;
  }
  var PAGE = pageKey();

  function reviewer() {
    var n = '';
    try { n = localStorage.getItem(LS_NAME) || ''; } catch (e) {}
    if (!n) {
      n = (window.prompt('Your name (so Ryan knows who left the note):', '') || '').trim();
      if (!n) n = 'Anonymous';
      try { localStorage.setItem(LS_NAME, n); } catch (e) {}
    }
    return n;
  }

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#rvBar{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:99999;background:#0E1B2A;color:#fff;border-radius:999px;display:flex;gap:6px;align-items:center;padding:8px 10px;box-shadow:0 10px 34px rgba(0,0,0,.28);font-family:Inter,Arial,sans-serif}' +
    '#rvBar button{border:none;cursor:pointer;border-radius:999px;padding:10px 17px;font-weight:600;font-size:13.5px;font-family:inherit}' +
    '#rvToggle{background:#2D8A8A;color:#fff}#rvToggle.on{background:#fff;color:#0E1B2A}' +
    '#rvSend{background:#fff;color:#0E1B2A}#rvBar .ct{color:#9fb3c6;padding:0 8px;font-size:13px;white-space:nowrap}' +
    '.rvPin{position:absolute;width:26px;height:26px;border-radius:50% 50% 50% 0;background:#2D8A8A;color:#fff;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;z-index:99998;box-shadow:0 2px 7px rgba(0,0,0,.32);cursor:pointer;font-family:Inter,Arial}' +
    '.rvPin b{transform:rotate(45deg);font-size:12px}' +
    'body.rvOn{cursor:crosshair}' +
    '#rvPop{position:absolute;z-index:100000;background:#fff;border:1px solid #d8e0e6;border-radius:12px;box-shadow:0 14px 44px rgba(0,0,0,.22);padding:13px;width:264px;font-family:Inter,Arial}' +
    '#rvPop textarea{width:100%;border:1px solid #d8e0e6;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;resize:vertical;min-height:64px;box-sizing:border-box}' +
    '#rvPop .row{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}' +
    '#rvPop button{border:none;border-radius:8px;padding:8px 14px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}' +
    '#rvPop .add{background:#2D8A8A;color:#fff}#rvPop .cancel{background:#eef2f5;color:#46535f}' +
    /* read popover */
    '#rvView{position:absolute;z-index:100000;background:#fff;border:1px solid #d8e0e6;border-radius:12px;box-shadow:0 14px 44px rgba(0,0,0,.22);padding:14px;width:280px;font-family:Inter,Arial}' +
    '#rvView .va{font-size:12px;color:#2D8A8A;font-weight:700;margin-bottom:3px}' +
    '#rvView .vs{font-size:11px;color:#8b97a1;margin-bottom:8px}' +
    '#rvView .vt{font-size:14px;color:#1c2733;line-height:1.45;white-space:pre-wrap}' +
    '#rvView .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px}' +
    '#rvView button{border:none;border-radius:8px;padding:7px 13px;font-weight:600;font-size:12.5px;cursor:pointer;font-family:inherit}' +
    '#rvView .del{background:#fdecec;color:#c0322b}#rvView .ok{background:#eef2f5;color:#46535f}' +
    '#rvHint{position:fixed;left:50%;transform:translateX(-50%);bottom:74px;z-index:99999;background:rgba(14,27,42,.92);color:#fff;font-family:Inter,Arial;font-size:12.5px;padding:7px 14px;border-radius:999px;display:none}' +
    '#rvDot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#3FB0B0;margin-right:6px;vertical-align:middle}' +
    /* export modal */
    '#rvOverlay{position:fixed;inset:0;z-index:100001;background:rgba(10,21,33,.55);display:flex;align-items:center;justify-content:center;font-family:Inter,Arial}' +
    '#rvModal{background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:22px;width:min(560px,92vw)}' +
    '#rvModal .h{font-size:18px;font-weight:700;color:#0E1B2A}' +
    '#rvModal .sub{font-size:13px;color:#5b6b78;margin:6px 0 12px}' +
    '#rvModal textarea{width:100%;height:230px;border:1px solid #d8e0e6;border-radius:10px;padding:12px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;box-sizing:border-box;resize:vertical;color:#1c2733}' +
    '#rvModal .row{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}' +
    '#rvModal button{border:none;border-radius:999px;padding:11px 20px;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit}' +
    '#rvModal .gmail{background:#2D8A8A;color:#fff}' +
    '#rvModal .copy{background:#eef2f5;color:#28333d}#rvModal .copy.done{background:#059669;color:#fff}' +
    '#rvModal .close{background:#eef2f5;color:#28333d}';
  document.head.appendChild(css);

  /* ---------- toolbar ---------- */
  var bar = document.createElement('div');
  bar.id = 'rvBar';
  bar.innerHTML = '<button id="rvToggle">💬 Comment</button><span class="ct" id="rvCount"></span><button id="rvSend">Email Ryan ✉</button>';
  document.body.appendChild(bar);
  var hint = document.createElement('div');
  hint.id = 'rvHint'; hint.textContent = 'Click anywhere on the page to leave a note';
  document.body.appendChild(hint);

  var toggle = bar.querySelector('#rvToggle'),
      sendBtn = bar.querySelector('#rvSend'),
      countEl = bar.querySelector('#rvCount');

  function section(el) {
    var s = el.closest && el.closest('section,header,footer,nav');
    var h = s && s.querySelector('h1,h2,h3,.kicker');
    return h ? h.textContent.trim().slice(0, 44) : document.title;
  }

  /* ---------- networking ---------- */
  function load(cb) {
    if (!LIVE) {
      try { comments = JSON.parse(localStorage.getItem(LS_CACHE) || '[]'); } catch (e) { comments = []; }
      cb && cb(); return;
    }
    fetch(ENDPOINT + '?t=' + Date.now(), { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) { comments = d.comments || []; } cb && cb(); })
      .catch(function () { cb && cb(); });
  }
  function cacheLocal() { try { localStorage.setItem(LS_CACHE, JSON.stringify(comments)); } catch (e) {} }
  function postAdd(c) {
    if (!LIVE) { cacheLocal(); return; }
    fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({
      action: 'add', id: c.id, page: c.page, section: c.section,
      text: c.text, x: c.x, y: c.y, name: c.name
    }) }).catch(function () {});
  }
  function postDelete(id) {
    if (!LIVE) { cacheLocal(); return; }
    fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: 'delete', id: id }) }).catch(function () {});
  }

  /* ---------- rendering ---------- */
  function thisPage() { return comments.filter(function (c) { return c.page === PAGE; }); }
  function count() {
    var tp = thisPage().length, tot = comments.length;
    countEl.innerHTML = tot ? ('<span id="rvDot"></span>' + tp + ' here · ' + tot + ' total') : (LIVE ? '<span id="rvDot"></span>shared' : '');
  }
  function pins() {
    var ex = document.querySelectorAll('.rvPin'); for (var k = 0; k < ex.length; k++) ex[k].remove();
    thisPage().forEach(function (n, i) {
      var p = document.createElement('div'); p.className = 'rvPin';
      p.style.left = n.x + 'px'; p.style.top = n.y + 'px';
      p.innerHTML = '<b>' + (i + 1) + '</b>'; p.title = (n.name ? n.name + ': ' : '') + n.text;
      p.onclick = function (e) { e.stopPropagation(); openView(n, i + 1, p); };
      document.body.appendChild(p);
    });
  }
  function closePops() {
    var v = document.getElementById('rvView'); if (v) v.remove();
    var o = document.getElementById('rvPop'); if (o) o.remove();
  }
  function openView(n, num, pinEl) {
    closePops();
    var v = document.createElement('div'); v.id = 'rvView';
    var left = Math.min(parseFloat(pinEl.style.left), window.scrollX + window.innerWidth - 296);
    v.style.left = left + 'px'; v.style.top = (parseFloat(pinEl.style.top) + 30) + 'px';
    v.innerHTML =
      '<div class="va">' + (n.name || 'Anonymous') + ' · note ' + num + '</div>' +
      '<div class="vs">' + (n.section || '') + '</div>' +
      '<div class="vt"></div>' +
      '<div class="row"><button class="del">Delete</button><button class="ok">Close</button></div>';
    v.querySelector('.vt').textContent = n.text;
    document.body.appendChild(v);
    v.querySelector('.ok').onclick = function () { v.remove(); };
    v.querySelector('.del').onclick = function () {
      comments = comments.filter(function (c) { return c.id !== n.id; });
      postDelete(n.id); v.remove(); pins(); count();
    };
  }
  toggle.onclick = function () {
    active = !active;
    toggle.classList.toggle('on', active);
    document.body.classList.toggle('rvOn', active);
    toggle.textContent = active ? '✓ Commenting' : '💬 Comment';
    hint.style.display = active ? 'block' : 'none';
    if (active) setTimeout(function () { hint.style.display = 'none'; }, 2600);
  };

  document.addEventListener('click', function (e) {
    if (!active) return;
    if (e.target.closest('#rvBar') || e.target.closest('#rvPop') || e.target.closest('#rvView') || e.target.closest('.rvPin') || e.target.closest('#rvOverlay')) return;
    e.preventDefault(); e.stopPropagation();
    closePops();
    var px = e.pageX, py = e.pageY, sec = section(e.target);
    var pop = document.createElement('div'); pop.id = 'rvPop';
    pop.style.left = Math.min(px, window.scrollX + window.innerWidth - 280) + 'px';
    pop.style.top = py + 'px';
    pop.innerHTML = '<div style="font-size:11px;color:#8b97a1;margin-bottom:6px">On: ' + sec + '</div><textarea placeholder="What should change here?"></textarea><div class="row"><button class="cancel">Cancel</button><button class="add">Add note</button></div>';
    document.body.appendChild(pop);
    var ta = pop.querySelector('textarea'); ta.focus();
    pop.querySelector('.cancel').onclick = function () { pop.remove(); };
    pop.querySelector('.add').onclick = function () {
      var t = ta.value.trim(); if (!t) { pop.remove(); return; }
      var c = { id: String(Date.now()) + Math.floor(Math.random() * 1e6),
                page: PAGE, section: sec, text: t, x: Math.round(px), y: Math.round(py), name: reviewer() };
      comments.push(c); postAdd(c); pop.remove(); pins(); count();
    };
  }, true);

  /* ---------- email summary (still handy) ---------- */
  var TO = 'rthomas@eyamhealth.com', SUBJ = 'Eyam website preview — feedback';
  function buildBody() {
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');
    var body = 'Eyam website preview — feedback\n' + base + '\n\n';
    comments.forEach(function (n, i) {
      body += (i + 1) + '. [' + n.page + (n.section ? ' · ' + n.section : '') + ']'
            + (n.name ? ' (' + n.name + ')' : '') + '  ' + n.text + '\n';
    });
    return { body: body, count: comments.length };
  }
  sendBtn.onclick = function () {
    var r = buildBody();
    if (!r.count) { alert('No notes yet — click “Comment”, then click anywhere on the page to leave feedback.'); return; }
    var ov = document.createElement('div'); ov.id = 'rvOverlay';
    ov.innerHTML =
      '<div id="rvModal">' +
      '<div class="h">' + r.count + ' comment' + (r.count > 1 ? 's' : '') + ' across the site</div>' +
      '<div class="sub">All notes are already saved and visible on the site. This just emails Ryan a copy.</div>' +
      '<textarea readonly></textarea>' +
      '<div class="row"><button class="gmail">📧 Open in Gmail</button><button class="copy">📋 Copy all</button><button class="close">Close</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    var ta = ov.querySelector('textarea'); ta.value = r.body; ta.focus(); ta.select();
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.querySelector('.close').onclick = function () { ov.remove(); };
    var copyBtn = ov.querySelector('.copy');
    copyBtn.onclick = function () {
      ta.select();
      var done = function () { copyBtn.classList.add('done'); copyBtn.textContent = '✓ Copied'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(r.body).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) {} });
      } else { try { document.execCommand('copy'); done(); } catch (e) {} }
    };
    ov.querySelector('.gmail').onclick = function () {
      var url = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=' + encodeURIComponent(TO) +
                '&su=' + encodeURIComponent(SUBJ) + '&body=' + encodeURIComponent(r.body);
      window.open(url, '_blank', 'noopener');
    };
  };

  /* ---------- boot + live refresh ---------- */
  load(function () { pins(); count(); });
  if (LIVE) setInterval(function () { if (!active && !document.getElementById('rvView')) load(function () { pins(); count(); }); }, 15000);
  window.addEventListener('resize', pins);
})();
