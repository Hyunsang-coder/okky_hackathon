import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const content = `## 필요 기술 스택
- **OpenAI GPT-4o Vision** — 사진 분석 AI
- **React Native** — 모바일 앱 도구`;

// Test without custom components
const el1 = React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkGfm],
  children: content,
});
console.log('=== WITHOUT CUSTOM COMPONENTS ===');
console.log(renderToStaticMarkup(el1));

// Test WITH custom components (same as MarkdownRenderer)
const components = {
  h2: ({ children }) => React.createElement('h2', { className: 'test-h2' }, children),
  p: ({ children }) => React.createElement('p', { className: 'test-p' }, children),
  strong: ({ children }) => React.createElement('strong', { className: 'test-strong' }, children),
  ul: ({ children }) => React.createElement('ul', { className: 'test-ul' }, children),
  li: ({ children }) => React.createElement('li', { className: 'test-li' }, children),
};

const el2 = React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkGfm],
  components,
  children: content,
});
console.log('\n=== WITH CUSTOM COMPONENTS ===');
console.log(renderToStaticMarkup(el2));

// Test with "---" separator
const contentWithHr = `## 판정: 조건부 가능
**확신도:** 0.72

설명 텍스트

---

## 필요 기술 스택
- 항목1`;

const el3 = React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkGfm],
  components,
  children: contentWithHr,
});
console.log('\n=== WITH HR SEPARATOR ===');
console.log(renderToStaticMarkup(el3));
