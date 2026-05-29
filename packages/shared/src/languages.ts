export const LanguageLabels = {
  cpp: 'cpp',
  python: 'python',
} as const;

// OJ 允许的编程语言。
export type AppLanguage = keyof typeof LanguageLabels;
