import { javascript } from '@codemirror/lang-javascript';

export type EditorLanguage = 'javascript' | 'typescript' | 'tsx' | 'sql';

/**
 * `sql` is handled by the editor itself, because `sql()` returns a different
 * extension type. This map covers the JavaScript family only.
 */
export const LANGUAGE_MODES: Record<EditorLanguage, () => ReturnType<typeof javascript>> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  tsx: () => javascript({ typescript: true, jsx: true }),
  sql: () => javascript(),
};

/** Pick a mode from a file path, for the multi-file workout editor. */
export function languageForPath(path: string): EditorLanguage {
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'tsx';
  if (path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.sql')) return 'sql';
  return 'javascript';
}
