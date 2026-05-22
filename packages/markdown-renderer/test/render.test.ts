import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../src/index.ts';

describe('renderMarkdown', () => {
  it('renders markdown headings and code blocks', () => {
    const html = renderMarkdown('## Title\n\n```cpp\nint main() {}\n```');

    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<code');
    expect(html).toContain('int main()');
  });

  it('renders inline katex math', () => {
    const html = renderMarkdown('Compute $a+b$.');

    expect(html).toContain('katex');
    expect(html).toContain('a');
    expect(html).toContain('b');
  });

  it('renders block katex math', () => {
    const html = renderMarkdown('$$\n\\frac{1}{2} + \\sum_{i=1}^n i\n$$');

    expect(html).toContain('katex-display');
    expect(html).toContain('annotation encoding="application/x-tex"');
    expect(html).toContain('\\frac{1}{2}');
  });

  it('removes unsafe html attributes and protocols', () => {
    const html = renderMarkdown('[bad](javascript:alert(1))\n\n<span onclick="alert(1)">ok</span>');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<span onclick=');
  });
});
