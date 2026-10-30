/* PuMA — lógica de la página: idioma, tema, filtros, listas generadas desde data.js */
(function () {
  'use strict';
  var D = window.PUMA_DATA, I = window.PUMA_I18N;
  if (!D || !I) return;

  var state = { lang: 'en', topic: 'all', type: 'all' };
  var TOPIC_IDS = I.topics.map(function (t) { return t.id; });

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function tt(obj) { return obj[state.lang] || obj.en; }
  function ui() { return I.ui[state.lang]; }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin storage: no pasa nada */ } }
  function topicTitle(id) {
    if (id === 'instrument') return I.instrument[state.lang];
    var t = I.topics.filter(function (x) { return x.id === id; })[0];
    return t ? tt(t.title) : id;
  }
  function topicVar(id) { return 'var(--c-' + id + ')'; }
  function plural(n, pair) { return n === 1 ? pair[0] : pair[1]; }
  function matches(item) { return state.topic === 'all' || item.topics.indexOf(state.topic) !== -1; }
  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return new Intl.DateTimeFormat(state.lang === 'es' ? 'es-AR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  }

  /* ---------- idioma ---------- */
  var staticNodes = $$('[data-i18n]');
  staticNodes.forEach(function (n) { n.setAttribute('data-en', n.innerHTML); });
  var altNodes = $$('[data-i18n-alt]');
  altNodes.forEach(function (n) { n.setAttribute('data-en', n.getAttribute('alt')); });
  var ariaNodes = $$('[data-i18n-aria]');
  ariaNodes.forEach(function (n) { n.setAttribute('data-en', n.getAttribute('aria-label')); });
  var metaDesc = $('meta[name="description"]');
  var EN_TITLE = document.title, EN_DESC = metaDesc ? metaDesc.getAttribute('content') : '';

  function applyStatic() {
    var es = state.lang === 'es';
    staticNodes.forEach(function (n) {
      var k = n.getAttribute('data-i18n');
      n.innerHTML = es && I.es[k] ? I.es[k] : n.getAttribute('data-en');
    });
    altNodes.forEach(function (n) {
      var k = n.getAttribute('data-i18n-alt');
      n.setAttribute('alt', es && I.es[k] ? I.es[k] : n.getAttribute('data-en'));
    });
    ariaNodes.forEach(function (n) {
      var k = n.getAttribute('data-i18n-aria');
      n.setAttribute('aria-label', es && I.es[k] ? I.es[k] : n.getAttribute('data-en'));
    });
    document.documentElement.lang = state.lang;
    document.title = es ? I.es['meta.title'] : EN_TITLE;
    if (metaDesc) metaDesc.setAttribute('content', es ? I.es['meta.desc'] : EN_DESC);
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang)); });
  }

  /* ---------- render ---------- */
  function counts(id) {
    return {
      atels: D.atels.filter(function (a) { return a.topics.indexOf(id) !== -1; }).length,
      pubs: D.pubs.filter(function (p) { return p.topics.indexOf(id) !== -1; }).length
    };
  }

  function renderStats() {
    var papers = D.pubs.filter(function (p) { return p.type === 'journal' || p.type === 'preprint' || p.type === 'proceedings'; }).length;
    var lvk = D.pubs.filter(function (p) { return p.type === 'lvk'; }).length;
    var first = Math.min.apply(null, D.atels.map(function (a) { return +a.date.slice(0, 4); }));
    var items = [
      [D.atels.length, ui().statAtels],
      [papers, ui().statPapers],
      [lvk, ui().statLvk],
      [first, ui().statSince]
    ];
    var ul = $('#stats'); ul.textContent = '';
    items.forEach(function (it) { ul.appendChild(el('li', {}, [el('strong', { text: String(it[0]) }), el('span', { text: it[1] })])); });
  }

  function renderTopics() {
    var box = $('#topics'); box.textContent = '';
    I.topics.forEach(function (t) {
      var c = counts(t.id);
      var on = state.topic === t.id;
      var btn = el('button', { type: 'button', class: 'go', 'aria-pressed': String(on), text: ui().seeOutputs + ' →' });
      var card = el('article', { class: 'topic reveal' + (on ? ' on' : ''), style: '--c:' + topicVar(t.id) }, [
        el('h3', {}, [el('span', { class: 'dot' }), tt(t.title)]),
        el('p', { text: tt(t.desc) }),
        el('span', { class: 'count', text: c.atels + ' ' + plural(c.atels, ui().nTelegrams) + ' · ' + c.pubs + ' ' + plural(c.pubs, ui().nPapers) }),
        btn
      ]);
      btn.addEventListener('click', function () {
        setTopic(state.topic === t.id ? 'all' : t.id);
        if (state.topic !== 'all') document.getElementById('atels').scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' });
      });
      box.appendChild(card);
    });
    observeReveals();
  }

  function chip(label, pressed, color, onClick) {
    var b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(pressed), style: color ? '--c:' + color : '' , text: label });
    b.addEventListener('click', onClick);
    return b;
  }

  function renderTopicChips(boxId) {
    var box = $('#' + boxId); box.textContent = '';
    box.appendChild(chip(ui().all, state.topic === 'all', '', function () { setTopic('all'); }));
    TOPIC_IDS.forEach(function (id) {
      box.appendChild(chip(topicTitle(id), state.topic === id, topicVar(id), function () { setTopic(id); }));
    });
  }

  function renderAtels() {
    renderTopicChips('atel-filters');
    var list = $('#atel-list'); list.textContent = '';
    var shown = D.atels.filter(matches), year = null;
    shown.forEach(function (a) {
      var y = a.date.slice(0, 4);
      if (y !== year) { year = y; list.appendChild(el('li', { class: 'tl-year', text: y })); }
      var main = a.topics[0];
      var url = 'https://www.astronomerstelegram.org/?read=' + a.num;
      var tags = a.topics.map(function (id) { return el('span', { class: 'tag', style: '--c:' + topicVar(id), text: topicTitle(id) }); });
      list.appendChild(el('li', { class: 'tl-item reveal', style: '--c:' + topicVar(main) }, [
        el('div', { class: 'tl-meta' }, [
          el('a', { href: url, rel: 'noopener', text: 'ATel #' + a.num }),
          el('time', { datetime: a.date, text: fmtDate(a.date) })
        ]),
        el('div', { class: 'tl-obj', text: a.object }),
        el('p', { class: 'tl-title', text: tt(a.summary) }),
        el('div', { class: 'tl-foot' }, tags.concat([el('a', { class: 'tl-read', href: url, rel: 'noopener', style: 'font-size:.88rem;font-weight:600;margin-left:auto', text: ui().readAtel + ' ↗' })]))
      ]));
    });
    $('#atel-empty').hidden = shown.length > 0;
    observeReveals();
  }

  function renderPubs() {
    renderTopicChips('pub-topic-filters');
    var tbox = $('#pub-type-filters'); tbox.textContent = '';
    tbox.appendChild(chip(ui().all, state.type === 'all', '', function () { state.type = 'all'; renderPubs(); }));
    ['journal', 'preprint', 'proceedings', 'lvk'].forEach(function (k) {
      tbox.appendChild(chip(ui().types[k], state.type === k, '', function () { state.type = k; renderPubs(); }));
    });
    var list = $('#pub-list'); list.textContent = '';
    var shown = D.pubs.filter(function (p) { return matches(p) && (state.type === 'all' || p.type === state.type); });
    shown.forEach(function (p) {
      var href = p.doi ? 'https://doi.org/' + p.doi : 'https://arxiv.org/abs/' + p.arxiv;
      var authors = el('p', { class: 'pub-authors' });
      var LIM = 6;
      if (p.authors.length > LIM + 2) {
        var short = p.authors.slice(0, LIM).join(', ') + ' … +' + (p.authors.length - LIM) + ' ' + ui().etAl;
        var full = p.authors.join(', ');
        var open = false;
        var span = el('span', { text: short });
        var tog = el('button', { type: 'button', text: ui().moreAuthors });
        tog.addEventListener('click', function () {
          open = !open;
          span.textContent = open ? full : short;
          tog.textContent = open ? ui().lessAuthors : ui().moreAuthors;
        });
        authors.appendChild(span); authors.appendChild(tog);
      } else {
        authors.textContent = p.authors.join(', ');
      }
      var links = [el('a', { href: href, rel: 'noopener', text: ui().paper + ' ↗' })];
      if (p.doi) links.push(el('a', { href: 'https://arxiv.org/abs/' + p.arxiv, rel: 'noopener', text: 'arXiv ↗' }));
      var body = [
        el('h3', {}, [el('a', { href: href, rel: 'noopener', text: p.title })]),
        authors,
        el('p', { class: 'pub-venue' }, [el('span', { class: 'vn', text: p.venue }), el('span', { class: 'badge', text: ui().badges[p.type] })])
      ];
      if (p.note) body.push(el('p', { class: 'pub-note', text: tt(p.note) }));
      body.push(el('div', { class: 'pub-links' }, links));
      list.appendChild(el('li', { class: 'pub reveal' }, [el('div', { class: 'pub-year', text: String(p.year) }), el('div', {}, body)]));
    });
    $('#pub-empty').hidden = shown.length > 0;
    observeReveals();
  }

  function renderLvk() {
    var ul = $('#lvk-list'); ul.textContent = '';
    D.pubs.filter(function (p) { return p.type === 'lvk'; }).forEach(function (p) {
      var href = p.doi ? 'https://doi.org/' + p.doi : 'https://arxiv.org/abs/' + p.arxiv;
      ul.appendChild(el('li', {}, [
        el('a', { href: href, rel: 'noopener', text: p.title }),
        el('small', { text: p.venue + ' (' + p.year + ') · ' + tt(p.note) })
      ]));
    });
  }

  function initials(name) {
    var w = name.split(/\s+/).filter(function (x) { return /^[A-ZÁÉÍÓÚÑ]/.test(x); });
    return (w[0] ? w[0][0] : '') + (w.length > 1 ? w[w.length - 1][0] : '');
  }

  function renderPeople() {
    var ul = $('#team'); ul.textContent = '';
    D.people.forEach(function (p) {
      ul.appendChild(el('li', { class: 'person reveal' }, [
        p.photo ? el('img', { src: p.photo, alt: p.name, width: '480', height: '480', loading: 'lazy', decoding: 'async' })
                : el('div', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }),
        el('h3', { text: p.name }),
        el('p', { class: 'role', text: tt(p.role) }),
        el('p', { class: 'affil', text: p.affil })
      ]));
    });
    var cl = $('#collab'); cl.textContent = '';
    D.collaborators.forEach(function (n) { cl.appendChild(el('li', { text: n })); });
    observeReveals();
  }

  function renderContact() {
    var ul = $('#contacts'); ul.textContent = '';
    (D.contacts || []).forEach(function (c) {
      var addr = c.user + '@' + c.domain;      /* se arma acá para no dejar el mail suelto en el HTML */
      ul.appendChild(el('li', {}, [
        el('strong', { text: c.name }),
        el('span', { text: tt(c.org) }),
        el('a', { href: 'mailto:' + addr, text: addr })
      ]));
    });
  }

  function renderAll() { renderStats(); renderTopics(); renderAtels(); renderPubs(); renderLvk(); renderPeople(); renderContact(); }

  /* ---------- estado ---------- */
  function setTopic(id) { state.topic = id; renderTopics(); renderAtels(); renderPubs(); }
  function setLang(l) { state.lang = l; safeSet('puma-lang', l); applyStatic(); renderAll(); }

  /* ---------- tema ---------- */
  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    safeSet('puma-theme', t);
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'light' ? '#f7f6f2' : '#070a14');
    document.dispatchEvent(new Event('puma:themechange'));
  }

  /* ---------- reveal ---------- */
  function prefersReduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  }
  function observeReveals() {
    $$('.reveal:not(.in)').forEach(function (n) { if (io) io.observe(n); else n.classList.add('in'); });
  }

  /* ---------- navegación ---------- */
  var toggle = $('.nav-toggle'), nav = $('#nav');
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });

  /* link activo según la sección visible */
  var links = $$('#nav a');
  if ('IntersectionObserver' in window) {
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { spy.observe(s); });
  }

  $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
  $('.theme-toggle').addEventListener('click', function () { setTheme(currentTheme() === 'light' ? 'dark' : 'light'); });
  $('#year').textContent = String(new Date().getFullYear());

  /* ---------- arranque ---------- */
  var saved = safeGet('puma-lang');
  state.lang = saved === 'es' || saved === 'en' ? saved : ((navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en');
  applyStatic();
  renderAll();
})();
