/* Tiny syntax highlighter for the languages used in the course.
   Scans the source with sticky regexes; the first rule that matches wins. */
window.Highlight = (function () {
  'use strict';

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const KOTLIN_KEYWORDS = [
    'package', 'import', 'class', 'interface', 'fun', 'val', 'var', 'if', 'else', 'when', 'for', 'while',
    'do', 'return', 'break', 'continue', 'object', 'companion', 'data', 'sealed', 'enum', 'open', 'abstract',
    'override', 'private', 'protected', 'internal', 'public', 'lateinit', 'by', 'in', 'is', 'as', 'try',
    'catch', 'finally', 'throw', 'null', 'true', 'false', 'this', 'super', 'typealias', 'constructor',
    'init', 'vararg', 'suspend', 'inline', 'reified', 'crossinline', 'noinline', 'const', 'operator',
    'infix', 'tailrec', 'annotation', 'inner', 'out', 'where', 'it'
  ];

  const kw = words => new RegExp('\\b(?:' + words.join('|') + ')\\b', 'y');

  const LANGS = {
    kotlin: [
      ['com', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
      ['str', /"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])+'/y],
      ['ann', /@[A-Za-z_][\w.]*(?::[A-Za-z_]\w*)?/y],
      ['num', /\b0[xX][\da-fA-F_]+[uUL]*\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[fFLuU]*\b/y],
      ['kw', kw(KOTLIN_KEYWORDS)],
      ['type', /\b[A-Z][A-Za-z0-9_]*\b/y],
      ['fn', /\b[a-z_][A-Za-z0-9_]*(?=\s*[({])/y],
      [null, /\b[A-Za-z_]\w*\b/y]
    ],
    xml: [
      ['com', /<!--[\s\S]*?-->/y],
      ['tag', /<\/?[A-Za-z_][\w:.-]*|\/?>/y],
      ['attr', /\b[A-Za-z_][\w:.-]*(?=\s*=)/y],
      ['str', /"[^"]*"|'[^']*'/y]
    ],
    toml: [
      ['com', /#[^\n]*/y],
      ['type', /^\s*\[[^\]\n]*\]/my],
      ['str', /"(?:\\.|[^"\\\n])*"/y],
      ['attr', /\b[\w.-]+(?=\s*=)/y],
      ['num', /\b\d[\d.]*\b/y],
      ['kw', /\b(?:true|false)\b/y]
    ],
    bash: [
      ['com', /(?:^|(?<=\s))#[^\n]*/my],
      ['str', /"(?:\\.|[^"\\])*"|'[^']*'/y],
      ['attr', /(?<=\s)--?[\w-]+/y],
      ['fn', /(?:^|(?<=\n))\s*(?:\.\/)?[\w.-]+/y]
    ],
    json: [
      ['attr', /"(?:\\.|[^"\\])*"(?=\s*:)/y],
      ['str', /"(?:\\.|[^"\\])*"/y],
      ['num', /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y],
      ['kw', /\b(?:true|false|null)\b/y]
    ],
    properties: [
      ['com', /(?:^|(?<=\n))\s*[#!][^\n]*/y],
      ['attr', /(?:^|(?<=\n))[\w.-]+(?=\s*[=:])/y]
    ]
  };
  LANGS.kts = LANGS.kotlin;
  LANGS.kt = LANGS.kotlin;
  LANGS.java = LANGS.kotlin;
  LANGS.groovy = LANGS.kotlin;
  LANGS.shell = LANGS.bash;
  LANGS.sh = LANGS.bash;
  LANGS.pro = LANGS.properties;

  function highlight(code, lang) {
    const rules = LANGS[(lang || '').toLowerCase()];
    if (!rules) return esc(code);
    let out = '';
    let plain = '';
    let pos = 0;
    const flush = () => { if (plain) { out += esc(plain); plain = ''; } };
    outer:
    while (pos < code.length) {
      for (let r = 0; r < rules.length; r++) {
        const re = rules[r][1];
        re.lastIndex = pos;
        const m = re.exec(code);
        if (m && m[0].length > 0) {
          const cls = rules[r][0];
          if (cls) {
            flush();
            out += '<span class="tok-' + cls + '">' + esc(m[0]) + '</span>';
          } else {
            plain += m[0];
          }
          pos += m[0].length;
          continue outer;
        }
      }
      plain += code[pos++];
    }
    flush();
    return out;
  }

  return { highlight: highlight, escape: esc };
})();
