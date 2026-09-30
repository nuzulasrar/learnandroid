/* Lesson markdown renderer.

   Supports the usual Markdown subset plus a few course-specific blocks:
     ```kotlin title="MainActivity.kt"     code block with a file title
     ```kotlin runnable                    code block that can be opened in the Kotlin Playground
     ```quiz                               multiple-choice quiz (see lessons/README in the project)
     :::tip Optional title  ...  :::       callouts: goals, tip, note, warning, danger, analogy, exercise, recap
     :::solution Show solution ... :::     collapsible solution
     [[Ctrl]]                              keyboard key
   Lines starting with an HTML tag are passed through untouched (used for diagrams). */
window.Markdown = (function () {
  'use strict';

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const ICONS = {
    tip: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2l.1.7h4.8l.1-.7c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    danger: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    analogy: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    exercise: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    recap: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    goals: ''
  };
  const DEFAULT_TITLES = {
    tip: 'Tip', note: 'Note', warning: 'Watch out', danger: 'Common mistake', analogy: 'Think of it like this',
    exercise: 'Practice', recap: 'Recap', goals: 'In this lesson you will learn'
  };
  const LANG_LABELS = {
    kotlin: 'Kotlin', kt: 'Kotlin', kts: 'build.gradle.kts', xml: 'XML', toml: 'libs.versions.toml',
    bash: 'Terminal', shell: 'Terminal', sh: 'Terminal', json: 'JSON', properties: 'Properties',
    pro: 'proguard-rules.pro', text: 'Text', java: 'Java', '': 'Code'
  };

  function slug(s) {
    return s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function inline(text) {
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    text = esc(text);
    text = text.replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^\w*])\*([^*\s](?:[^*]*[^*\s])?)\*(?![\w*])/g, '$1<em>$2</em>');
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
      const ext = /^https?:/.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
    });
    text = text.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + esc(codes[+i]) + '</code>');
    return text;
  }

  function parseAttrs(s) {
    const attrs = {};
    (s || '').replace(/([\w-]+)(?:="([^"]*)")?/g, (m, k, v) => { attrs[k] = v === undefined ? true : v; return m; });
    return attrs;
  }

  function codeBlock(code, lang, attrs) {
    const title = typeof attrs.title === 'string' ? attrs.title : (LANG_LABELS[lang] !== undefined ? LANG_LABELS[lang] : lang);
    const runnable = !!attrs.runnable;
    return '<figure class="code" data-lang="' + esc(lang) + '">' +
      '<figcaption><span class="code-title">' + esc(title) + '</span><span class="code-actions">' +
      (runnable ? '<button type="button" class="code-btn run" data-action="run" title="Edit and run this code in the Kotlin Playground">▶ Try it</button>' : '') +
      '<button type="button" class="code-btn" data-action="copy">Copy</button></span></figcaption>' +
      '<pre><code>' + window.Highlight.highlight(code, lang) + '</code></pre></figure>';
  }

  function renderQuiz(src) {
    const questions = [];
    let q = null;
    src.split('\n').forEach(line => {
      let m;
      if ((m = line.match(/^\s*Q:\s*(.*)$/))) {
        q = { text: m[1], options: [], explain: [] };
        questions.push(q);
      } else if (q && (m = line.match(/^\s*-\s*\[( |x|X)\]\s*(.*)$/))) {
        q.options.push({ text: m[2], correct: m[1] !== ' ' });
      } else if (q && (m = line.match(/^\s*>\s?(.*)$/))) {
        q.explain.push(m[1]);
      } else if (q && line.trim() && !q.options.length) {
        q.text += ' ' + line.trim();
      }
    });
    const letters = 'ABCDEFGH';
    return '<div class="quiz">' + questions.map((qq, qi) =>
      '<div class="quiz-q" data-explain="' + esc(inline(qq.explain.join(' '))) + '">' +
      '<p class="quiz-question"><span class="qnum">Q' + (qi + 1) + '</span><span>' + inline(qq.text) + '</span></p>' +
      '<div class="quiz-options">' + qq.options.map((o, oi) =>
        '<button type="button" class="quiz-opt" data-correct="' + (o.correct ? 1 : 0) + '"><span class="letter">' + letters[oi] + '</span><span>' + inline(o.text) + '</span></button>'
      ).join('') + '</div></div>'
    ).join('') + '</div>';
  }

  function container(type, title, inner) {
    if (type === 'solution') {
      return '<details class="solution"><summary>' + inline(title || 'Show solution') + '</summary><div>' + inner + '</div></details>';
    }
    const t = title ? inline(title) : (DEFAULT_TITLES[type] || type);
    return '<div class="callout callout-' + esc(type) + '"><div class="callout-title">' + (ICONS[type] || '') + '<span>' + t + '</span></div>' + inner + '</div>';
  }

  const BLOCK_START = /^(\s*```|:::|#{1,4}\s|---+\s*$|\||>|[-*]\s+|\d+\.\s+|<[a-zA-Z!\/])/;

  function render(md, ctx) {
    ctx = ctx || { toc: [], ids: {} };
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    const blank = l => /^\s*$/.test(l);
    let i = 0;
    let m;

    while (i < lines.length) {
      const line = lines[i];
      if (blank(line)) { i++; continue; }

      // Fenced code / quiz
      if ((m = line.match(/^(\s*)```\s*([\w+-]*)\s*(.*)$/))) {
        const indent = m[1].length;
        const lang = m[2].toLowerCase();
        const attrs = parseAttrs(m[3]);
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
          const l = lines[i];
          const lead = l.match(/^ */)[0].length;
          buf.push(l.slice(Math.min(indent, lead)));
          i++;
        }
        i++;
        const code = buf.join('\n');
        out.push(lang === 'quiz' ? renderQuiz(code) : codeBlock(code, lang, attrs));
        continue;
      }

      // ::: containers
      if ((m = line.match(/^:::\s*(\w+)\s*(.*)$/))) {
        const type = m[1].toLowerCase();
        const title = m[2].trim();
        const buf = [];
        let inFence = false;
        let depth = 0;
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (/^\s*```/.test(l)) inFence = !inFence;
          if (!inFence) {
            if (/^:::\s*\w+/.test(l)) depth++;
            else if (/^:::\s*$/.test(l)) { if (depth === 0) break; depth--; }
          }
          buf.push(l);
          i++;
        }
        i++;
        out.push(container(type, title, render(buf.join('\n'), ctx)));
        continue;
      }

      // Headings
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        const level = m[1].length;
        const html = inline(m[2].trim());
        let id = slug(m[2]) || 'section';
        while (ctx.ids[id]) id += '-x';
        ctx.ids[id] = true;
        if (level === 2) ctx.toc.push({ id: id, text: html.replace(/<[^>]+>/g, '') });
        out.push('<h' + level + ' id="' + id + '">' + html + '</h' + level + '>');
        i++;
        continue;
      }

      // Horizontal rule
      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      // Tables
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const row = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        const head = row(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(row(lines[i++]));
        out.push('<div class="table-wrap"><table><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') +
          '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
          '</tbody></table></div>');
        continue;
      }

      // Raw HTML block
      if (/^<[a-zA-Z!\/]/.test(line)) {
        const buf = [];
        while (i < lines.length && !blank(lines[i])) buf.push(lines[i++]);
        out.push(buf.join('\n'));
        continue;
      }

      // Blockquote
      if (/^>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push('<blockquote>' + render(buf.join('\n'), ctx) + '</blockquote>');
        continue;
      }

      // Lists
      if ((m = line.match(/^([-*]|\d+\.)\s+(.*)$/))) {
        const ordered = /\d/.test(m[1]);
        const start = ordered ? parseInt(m[1], 10) : 1;
        const items = [];
        let width = 0;
        while (i < lines.length) {
          const l = lines[i];
          const mm = l.match(/^([-*]|\d+\.)(\s+)(.*)$/);
          if (mm && /\d/.test(mm[1]) === ordered) {
            width = mm[1].length + mm[2].length;
            items.push([mm[3]]);
            i++;
            continue;
          }
          if (blank(l)) {
            let j = i + 1;
            while (j < lines.length && blank(lines[j])) j++;
            if (j < lines.length) {
              const nx = lines[j];
              const nm = nx.match(/^([-*]|\d+\.)\s+/);
              if (/^\s{2,}\S/.test(nx) || (nm && /\d/.test(nm[1]) === ordered)) {
                for (let k = i; k < j; k++) items[items.length - 1].push('');
                i = j;
                continue;
              }
            }
            break;
          }
          if (/^\s+\S/.test(l)) {
            const lead = l.match(/^ */)[0].length;
            items[items.length - 1].push(l.slice(Math.min(lead, width)));
            i++;
            continue;
          }
          break;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push('<' + tag + (ordered && start !== 1 ? ' start="' + start + '"' : '') + '>' +
          items.map(it => {
            const task = it[0].match(/^\[( |x|X)\]\s+(.*)$/);
            if (task) it[0] = task[2];
            let html = render(it.join('\n'), ctx);
            const single = html.match(/^<p>([\s\S]*)<\/p>$/);
            if (single && single[1].indexOf('<p>') === -1) html = single[1];
            else html = html.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
            if (task) return '<li class="task"><label><input type="checkbox"' + (task[1] !== ' ' ? ' checked' : '') + '> <span>' + html + '</span></label></li>';
            return '<li>' + html + '</li>';
          }).join('') + '</' + tag + '>');
        continue;
      }

      // Paragraph
      const buf = [line.trim()];
      i++;
      while (i < lines.length && !blank(lines[i]) && !BLOCK_START.test(lines[i])) buf.push(lines[i++].trim());
      out.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  return {
    render: function (md) {
      const ctx = { toc: [], ids: {} };
      const html = render(md, ctx);
      return { html: html, toc: ctx.toc };
    },
    inline: inline
  };
})();
