import MarkdownIt from 'markdown-it';
import type { PluginSimple } from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import katex from 'katex';
import sanitizeHtml from 'sanitize-html';

function canOpenInlineMath(source: string, pos: number): boolean {
  return source.charCodeAt(pos + 1) !== 0x20 && source.charCodeAt(pos + 1) !== 0x09;
}

function canCloseInlineMath(source: string, pos: number): boolean {
  const prevChar = pos > 0 ? source.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 < source.length ? source.charCodeAt(pos + 1) : -1;

  if (prevChar === 0x20 || prevChar === 0x09) {
    return false;
  }
  return nextChar < 0x30 || nextChar > 0x39;
}

function findClosingInlineMath(source: string, start: number): number {
  let pos = start;
  while ((pos = source.indexOf('$', pos)) !== -1) {
    let backslashCount = 0;
    for (let index = pos - 1; index >= 0 && source[index] === '\\'; index -= 1) {
      backslashCount += 1;
    }

    if (backslashCount % 2 === 0 && canCloseInlineMath(source, pos)) {
      return pos;
    }
    pos += 1;
  }

  return -1;
}

const mathPlugin: PluginSimple = (md) => {
  md.inline.ruler.after('escape', 'math_inline', (state: StateInline, silent: boolean) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') {
      return false;
    }
    if (!canOpenInlineMath(state.src, state.pos)) {
      return false;
    }

    const start = state.pos + 1;
    const end = findClosingInlineMath(state.src, start);
    if (end === -1 || end === start) {
      return false;
    }

    if (!silent) {
      const token = state.push('math_inline', 'math', 0);
      token.markup = '$';
      token.content = state.src.slice(start, end);
    }
    state.pos = end + 1;
    return true;
  });

  md.block.ruler.after('blockquote', 'math_block', (
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean,
  ) => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (startPos + 2 > max || state.src.slice(startPos, startPos + 2) !== '$$') {
      return false;
    }

    if (silent) {
      return true;
    }

    let firstLine = state.src.slice(startPos + 2, max);
    const lines: string[] = [];
    let nextLine = startLine;
    let found = false;

    if (firstLine.trimEnd().endsWith('$$')) {
      firstLine = firstLine.trimEnd().slice(0, -2);
      found = true;
    }
    if (firstLine.trim()) {
      lines.push(firstLine);
    }

    while (!found) {
      nextLine += 1;
      if (nextLine >= endLine) {
        break;
      }

      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd);
      const closingIndex = line.lastIndexOf('$$');
      if (closingIndex !== -1) {
        const beforeClosing = line.slice(0, closingIndex);
        if (beforeClosing.trim()) {
          lines.push(beforeClosing);
        }
        found = true;
        break;
      }
      lines.push(line);
    }

    if (!found) {
      return false;
    }

    state.line = nextLine + 1;
    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.markup = '$$';
    token.content = lines.join('\n').trim();
    token.map = [startLine, state.line];
    return true;
  }, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  md.renderer.rules.math_inline = (tokens, idx) => katex.renderToString(tokens[idx].content, {
    displayMode: false,
    throwOnError: false,
  });

  md.renderer.rules.math_block = (tokens, idx) => `${katex.renderToString(tokens[idx].content, {
    displayMode: true,
    throwOnError: false,
  })}\n`;
};

const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
}).use(mathPlugin);

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  'annotation',
  'math',
  'mspace',
  'mfrac',
  'mi',
  'mn',
  'mo',
  'mrow',
  'msub',
  'msubsup',
  'msqrt',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'semantics',
  'span',
]);

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target', 'rel'],
  annotation: ['encoding'],
  math: ['xmlns'],
  span: ['class', 'style'],
};

export function renderMarkdown(markdown: string): string {
  const rendered = renderer.render(markdown);
  return sanitizeHtml(rendered, {
    allowedTags,
    allowedAttributes,
    allowedClasses: {
      span: [
        /^katex/,
        /^m/,
        /^pstrut$/,
        /^strut$/,
        /^sizing$/,
        /^reset-size/,
        /^size/,
        /^style-wrap$/,
        /^vlist/,
      ],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
    },
  });
}
