/* Learn Android — single-page app: routing, navigation, progress, quizzes. */
(function () {
  'use strict';

  const COURSE = window.COURSE;
  const main = document.getElementById('main');
  const nav = document.getElementById('nav');
  const searchInput = document.getElementById('search');

  if (!COURSE || !COURSE.lessons || !COURSE.lessons.length) {
    main.innerHTML = '<div class="page"><h1>No lessons found</h1><p>Run <code>node build.js</code> inside the <code>learnandroid</code> folder to generate <code>js/course-data.js</code>.</p></div>';
    return;
  }

  const lessons = COURSE.lessons;
  const parts = COURSE.parts;
  const byId = {};
  lessons.forEach((l, i) => { l.index = i; l.searchText = (l.title + ' ' + l.summary + ' ' + l.body).toLowerCase(); byId[l.id] = l; });
  const partById = {};
  parts.forEach(p => { partById[p.id] = p; p.lessons = lessons.filter(l => l.part === p.id); });

  /* ---------- Storage (per-viewer convenience only) ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('la:' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('la:' + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }
  };
  let done = new Set(store.get('done', []).filter(id => byId[id]));
  let collapsed = new Set(store.get('collapsed', []));
  const saveDone = () => store.set('done', Array.from(done));

  /* ---------- Helpers ---------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lessonUrl = l => '#/lesson/' + l.id;
  const pct = () => Math.round(done.size / lessons.length * 100);
  const nextUnfinished = () => lessons.find(l => !done.has(l.id));
  const totalMinutes = lessons.reduce((s, l) => s + (l.minutes || 0), 0);

  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function updateProgress() {
    document.getElementById('topProgressFill').style.width = pct() + '%';
    document.getElementById('topProgressText').textContent = pct() + '%';
  }

  /* ---------- Sidebar ---------- */
  const CHEVRON = '<svg class="nav-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function renderNav() {
    const q = searchInput.value.trim().toLowerCase();
    const current = currentLessonId();
    let html = '<a href="#/" class="nav-home' + (current ? '' : ' active') + '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>Course overview</a>';
    let shown = 0;
    parts.forEach(p => {
      const items = p.lessons.filter(l => !q || l.searchText.includes(q));
      if (!items.length) return;
      shown += items.length;
      const doneCount = p.lessons.filter(l => done.has(l.id)).length;
      const isCollapsed = !q && collapsed.has(p.id) && !p.lessons.some(l => l.id === current);
      const complete = doneCount === p.lessons.length;
      html += '<div class="nav-part' + (isCollapsed ? ' collapsed' : '') + (complete ? ' complete' : '') + '" data-part="' + p.id + '">' +
        '<button type="button" class="nav-part-head" aria-expanded="' + !isCollapsed + '">' +
        '<span class="nav-part-num">' + p.id + '</span><span class="nav-part-title">' + esc(p.title) + '</span>' +
        '<span class="nav-part-count">' + doneCount + '/' + p.lessons.length + '</span>' + CHEVRON + '</button>' +
        '<ul class="nav-lessons">' + items.map(l =>
          '<li><a href="' + lessonUrl(l) + '" class="' + (l.id === current ? 'active' : '') + '"' + (l.id === current ? ' aria-current="page"' : '') + '>' +
          '<span class="nav-check' + (done.has(l.id) ? ' done' : '') + '" aria-label="' + (done.has(l.id) ? 'Completed' : 'Not completed') + '"></span>' +
          '<span>' + esc(l.title) + '</span></a></li>'
        ).join('') + '</ul></div>';
    });
    if (!shown) html += '<p class="nav-empty">No lessons match “' + esc(q) + '”.</p>';
    html += '<div class="nav-footer">' + done.size + ' of ' + lessons.length + ' lessons complete</div>';
    nav.innerHTML = html;
    const active = nav.querySelector('a.active');
    if (active && !q) {
      const r = active.getBoundingClientRect();
      const sr = nav.parentElement.getBoundingClientRect();
      if (r.top < sr.top || r.bottom > sr.bottom) active.scrollIntoView({ block: 'center' });
    }
  }

  nav.addEventListener('click', e => {
    const head = e.target.closest('.nav-part-head');
    if (head) {
      const part = head.parentElement;
      const id = +part.dataset.part;
      part.classList.toggle('collapsed');
      head.setAttribute('aria-expanded', !part.classList.contains('collapsed'));
      if (part.classList.contains('collapsed')) collapsed.add(id); else collapsed.delete(id);
      store.set('collapsed', Array.from(collapsed));
      return;
    }
    if (e.target.closest('a')) closeMenu();
  });
  searchInput.addEventListener('input', renderNav);

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.getElementById('menuBtn');
  function closeMenu() { document.body.classList.remove('nav-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  document.getElementById('scrim').addEventListener('click', closeMenu);

  /* ---------- Theme ---------- */
  document.getElementById('themeToggle').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
  });

  /* ---------- Routing ---------- */
  function currentLessonId() {
    const m = location.hash.match(/^#\/lesson\/([\w-]+)/);
    return m && byId[m[1]] ? m[1] : null;
  }

  function route() {
    const id = currentLessonId();
    if (id) renderLesson(byId[id]); else renderHome();
    renderNav();
    updateProgress();
  }

  /* ---------- Home ---------- */
  function renderHome() {
    document.title = 'Learn Android';
    const next = nextUnfinished();
    const last = store.get('last', null);
    const started = done.size > 0 || !!last;
    const target = started ? (next || lessons[lessons.length - 1]) : lessons[0];
    const cta = !started ? 'Start lesson 1' : (next ? 'Continue: ' + next.title : 'Review the course');
    const icon = p => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' + p + '</svg>';

    main.innerHTML =
      '<div class="page">' +
      '<section class="hero">' +
      '<span class="hero-eyebrow">Kotlin · Jetpack Compose · Material 3</span>' +
      '<h1>Learn native Android development, <em>from zero to a published app.</em></h1>' +
      '<p>A hands-on course that starts with the very basics and walks you, step by step, through Kotlin, Compose UI, app architecture, data, and shipping to Google Play, then has you build a complete app yourself.</p>' +
      '<div class="hero-actions"><a class="btn btn-primary" href="' + lessonUrl(target) + '">' + esc(cta) + ' →</a>' +
      (started ? '<span class="quiz-score">' + done.size + ' of ' + lessons.length + ' lessons complete</span>' : '') + '</div>' +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><strong>' + lessons.length + '</strong><span>lessons</span></div>' +
      '<div class="hero-stat"><strong>' + parts.length + '</strong><span>parts</span></div>' +
      '<div class="hero-stat"><strong>~' + Math.round(totalMinutes / 60) + ' h</strong><span>of reading &amp; coding</span></div>' +
      '<div class="hero-stat"><strong>1</strong><span>complete capstone app</span></div>' +
      '</div></section>' +

      '<h2 class="section-title">How this course works</h2>' +
      '<p class="section-sub">Reading alone won’t make you an Android developer. Every lesson is built around doing.</p>' +
      '<div class="how-grid">' +
      '<div class="how-card"><div class="how-icon">' + icon('<path d="M8 6l-6 6 6 6M16 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>') + '</div><h3>Code along</h3><p>Type every example into Android Studio yourself. Kotlin-only snippets have a <strong>Try it</strong> button so you can run them right in the browser.</p></div>' +
      '<div class="how-card"><div class="how-icon">' + icon('<path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>') + '</div><h3>Check yourself</h3><p>Each lesson ends with practice tasks (with hidden solutions) and a quick quiz so you know you really understood it.</p></div>' +
      '<div class="how-card"><div class="how-icon">' + icon('<rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 18.5h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>') + '</div><h3>Build a real app</h3><p>The course finishes with <strong>RecipeBox</strong>, a full app with networking, a local database, navigation, DI, tests and a release build.</p></div>' +
      '</div>' +

      '<h2 class="section-title">What you’ll use</h2>' +
      '<p class="section-sub">The same modern toolkit Google recommends and professional Android teams use today.</p>' +
      '<div class="chips">' + ['Kotlin', 'Coroutines & Flow', 'Jetpack Compose', 'Material 3', 'Android Studio', 'Gradle', 'ViewModel', 'Navigation Compose', 'Hilt', 'Retrofit', 'kotlinx.serialization', 'Room', 'DataStore', 'WorkManager', 'Coil', 'JUnit & Compose testing', 'Google Play Console']
        .map(c => '<span class="chip">' + esc(c) + '</span>').join('') + '</div>' +

      '<h2 class="section-title">The roadmap</h2>' +
      '<p class="section-sub">Follow the parts in order. Each one builds on the last.</p>' +
      '<div class="roadmap">' + parts.map(p => {
        const d = p.lessons.filter(l => done.has(l.id)).length;
        const mins = p.lessons.reduce((s, l) => s + (l.minutes || 0), 0);
        const state = d === p.lessons.length ? ' complete' : (d > 0 ? ' started' : '');
        return '<article class="part-card' + state + '">' +
          '<div class="part-badge">' + (d === p.lessons.length ? '✓' : p.id) + '</div><div>' +
          '<h3>Part ' + p.id + ' · ' + esc(p.title) + '</h3>' +
          '<div class="part-meta"><span>' + p.lessons.length + ' lessons</span><span>~' + mins + ' min</span><span>' + d + ' done</span></div>' +
          '<p class="part-desc">' + esc(p.description) + '</p>' +
          '<div class="part-progress"><span style="width:' + (d / p.lessons.length * 100) + '%"></span></div>' +
          '<ol class="part-lessons">' + p.lessons.map(l =>
            '<li><a href="' + lessonUrl(l) + '"><span class="nav-check' + (done.has(l.id) ? ' done' : '') + '"></span>' +
            '<span class="num">' + (l.index + 1) + '.</span><span>' + esc(l.title) + '</span><span class="mins">' + l.minutes + ' min</span></a></li>'
          ).join('') + '</ol></div></article>';
      }).join('') + '</div>' +

      '<footer class="home-footer"><span>Progress is saved in this browser only.</span>' +
      '<button type="button" class="link-btn" id="resetProgress">Reset my progress</button></footer>' +
      '</div>';

    const resetBtn = document.getElementById('resetProgress');
    resetBtn.addEventListener('click', () => {
      if (!resetBtn.classList.contains('armed')) {
        resetBtn.classList.add('armed');
        resetBtn.textContent = 'Click again to erase all progress';
        setTimeout(() => {
          resetBtn.classList.remove('armed');
          resetBtn.textContent = 'Reset my progress';
        }, 4000);
        return;
      }
      done = new Set();
      saveDone();
      store.set('last', null);
      route();
      toast('Progress reset');
    });
    window.scrollTo(0, 0);
  }

  /* ---------- Lesson ---------- */
  let tocScrollHandler = null;

  function renderLesson(lesson) {
    store.set('last', lesson.id);
    document.title = lesson.title + ' · Learn Android';
    const part = partById[lesson.part];
    const posInPart = part.lessons.indexOf(lesson) + 1;
    const prev = lessons[lesson.index - 1];
    const next = lessons[lesson.index + 1];
    const rendered = window.Markdown.render(lesson.body);
    const isDone = done.has(lesson.id);

    main.innerHTML =
      '<div class="lesson-wrap"><article class="lesson">' +
      '<div class="crumbs"><a href="#/">Course</a><span>/</span><span>Part ' + part.id + ' · ' + esc(part.title) + '</span></div>' +
      '<h1 class="lesson-title">' + esc(lesson.title) + '</h1>' +
      '<div class="lesson-meta">' +
      '<span class="pill">Lesson ' + (lesson.index + 1) + ' of ' + lessons.length + '</span>' +
      '<span class="pill">' + posInPart + ' / ' + part.lessons.length + ' in this part</span>' +
      '<span class="pill">⏱ ' + lesson.minutes + ' min</span>' +
      (isDone ? '<span class="pill done">✓ Completed</span>' : '') + '</div>' +
      (lesson.summary ? '<p class="lesson-summary">' + window.Markdown.inline(lesson.summary) + '</p>' : '') +
      '<div class="prose">' + rendered.html + '</div>' +
      '<div class="complete-box"><p><strong>' + (isDone ? 'Nice work, this lesson is complete.' : 'Finished the lesson?') + '</strong>' +
      (isDone ? 'You can revisit it any time.' : 'Mark it complete to track your progress.') + '</p>' +
      '<button type="button" class="btn ' + (isDone ? 'btn-done' : 'btn-primary') + '" id="completeBtn">' + (isDone ? '✓ Completed' : 'Mark as complete') + '</button></div>' +
      '<nav class="pager" aria-label="Lesson navigation">' +
      (prev ? '<a class="prev" href="' + lessonUrl(prev) + '"><small>← Previous</small><span>' + esc(prev.title) + '</span></a>' : '') +
      (next ? '<a class="next" href="' + lessonUrl(next) + '"><small>Next →</small><span>' + esc(next.title) + '</span></a>' : '') +
      '</nav><p class="kbd-hint">Tip: use <kbd>←</kbd> and <kbd>→</kbd> to move between lessons.</p>' +
      '</article>' +
      (rendered.toc.length > 1 ? '<aside class="toc" aria-label="On this page"><div class="toc-title">On this page</div>' +
        rendered.toc.map(t => '<a href="#/lesson/' + lesson.id + '" data-target="' + t.id + '">' + esc(t.text) + '</a>').join('') + '</aside>' : '') +
      '</div>';

    document.getElementById('completeBtn').addEventListener('click', () => {
      if (done.has(lesson.id)) {
        done.delete(lesson.id);
        saveDone();
        renderLesson(lesson);
      } else {
        done.add(lesson.id);
        saveDone();
        if (next) {
          toast('Lesson complete! On to the next one.');
          location.hash = lessonUrl(next);
          return;
        }
        toast('🎉 You finished the whole course!');
        renderLesson(lesson);
      }
      renderNav();
      updateProgress();
    });

    setupToc();
    window.scrollTo(0, 0);
  }

  function setupToc() {
    if (tocScrollHandler) { window.removeEventListener('scroll', tocScrollHandler); tocScrollHandler = null; }
    const toc = main.querySelector('.toc');
    if (!toc) return;
    toc.addEventListener('click', e => {
      const a = e.target.closest('a[data-target]');
      if (!a) return;
      e.preventDefault();
      const el = document.getElementById(a.dataset.target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const links = Array.from(toc.querySelectorAll('a'));
    const heads = links.map(a => document.getElementById(a.dataset.target)).filter(Boolean);
    const sync = () => {
      let current = heads[0];
      heads.forEach(h => { if (h.getBoundingClientRect().top < 140) current = h; });
      links.forEach(a => a.classList.toggle('active', !!current && a.dataset.target === current.id));
    };
    tocScrollHandler = sync;
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  /* ---------- Content interactions (code, quiz) ---------- */
  main.addEventListener('click', e => {
    const btn = e.target.closest('.code-btn');
    if (btn) {
      const fig = btn.closest('.code');
      const code = fig.querySelector('pre').textContent;
      if (btn.dataset.action === 'copy') copyText(code, btn);
      if (btn.dataset.action === 'run') openPlayground(fig, code, btn);
      return;
    }
    const opt = e.target.closest('.quiz-opt');
    if (opt && !opt.disabled) answerQuiz(opt);
  });

  function copyText(text, btn) {
    const ok = () => { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 1400); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(text) && ok());
    } else if (fallbackCopy(text)) ok();
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  let playgroundPromise = null;
  function loadPlayground() {
    if (window.KotlinPlayground) return Promise.resolve();
    if (!playgroundPromise) {
      playgroundPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/kotlin-playground@1';
        s.onload = () => (window.KotlinPlayground ? resolve() : reject(new Error('missing')));
        s.onerror = () => { playgroundPromise = null; reject(new Error('load failed')); };
        document.head.appendChild(s);
      });
    }
    return playgroundPromise;
  }

  function openPlayground(fig, code, btn) {
    btn.disabled = true;
    btn.textContent = 'Loading…';
    loadPlayground().then(() => {
      const host = document.createElement('div');
      host.className = 'playground-host';
      const el = document.createElement('div');
      const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      el.setAttribute('theme', dark ? 'darcula' : 'idea');
      el.setAttribute('data-highlight-only', 'false');
      el.textContent = code;
      host.appendChild(el);
      const note = document.createElement('p');
      note.className = 'playground-note';
      note.textContent = 'Edit the code, then press the ▶ button to run it. It runs on JetBrains’ Kotlin Playground servers. If running is blocked here, paste the code into play.kotlinlang.org.';
      fig.replaceWith(host);
      host.after(note);
      window.KotlinPlayground(el);
    }).catch(() => {
      btn.disabled = false;
      btn.textContent = '▶ Try it';
      toast('Couldn’t load the Kotlin Playground. Are you online?');
    });
  }

  function answerQuiz(opt) {
    const q = opt.closest('.quiz-q');
    const correct = opt.dataset.correct === '1';
    opt.classList.add(correct ? 'right' : 'wrong');
    let fb = q.querySelector('.quiz-feedback');
    if (!fb) { fb = document.createElement('div'); fb.setAttribute('role', 'status'); q.appendChild(fb); }
    if (correct) {
      q.classList.add('correct');
      q.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = true; });
      fb.className = 'quiz-feedback ok';
      fb.innerHTML = '<strong>Correct!</strong>' + (q.dataset.explain || '');
    } else {
      opt.disabled = true;
      fb.className = 'quiz-feedback no';
      fb.innerHTML = '<strong>Not quite, try again.</strong>';
    }
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable], .CodeMirror')) return;
    const id = currentLessonId();
    if (e.key === 'Escape') closeMenu();
    if (e.key === '/') { e.preventDefault(); if (window.innerWidth <= 960) document.body.classList.add('nav-open'); searchInput.focus(); }
    if (!id) return;
    const l = byId[id];
    if (e.key === 'ArrowRight' && lessons[l.index + 1]) location.hash = lessonUrl(lessons[l.index + 1]);
    if (e.key === 'ArrowLeft' && lessons[l.index - 1]) location.hash = lessonUrl(lessons[l.index - 1]);
  });

  window.addEventListener('hashchange', route);
  route();
})();
