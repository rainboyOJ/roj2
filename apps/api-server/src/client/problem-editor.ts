import { basicSetup, EditorView } from 'codemirror';
import { Compartment } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';

const languageFactories = {
  cpp,
  python,
} as const;

function getLanguageExtension(language: string) {
  const factory = languageFactories[language as keyof typeof languageFactories];
  return factory ? factory() : [];
}

function initProblemEditor() {
  const container = document.querySelector<HTMLElement>('#sourceCodeEditor');
  const hiddenInput = document.querySelector<HTMLInputElement>('#sourceCode');
  if (!container || !hiddenInput) {
    return;
  }

  const languageSelect = document.querySelector<HTMLSelectElement>('#language');
  const languageCompartment = new Compartment();
  const initialLanguage = languageSelect?.value || container.dataset.initialLanguage || 'cpp';

  const editor = new EditorView({
    doc: hiddenInput.value,
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          minHeight: '24rem',
          backgroundColor: '#fbfdff',
        },
        '.cm-scroller': {
          fontFamily: '"JetBrains Mono", "SFMono-Regular", "Consolas", monospace',
          lineHeight: '1.65',
        },
        '.cm-content, .cm-gutter': {
          minHeight: '24rem',
        },
        '.cm-gutters': {
          borderRight: '1px solid rgba(217, 225, 234, 0.95)',
          backgroundColor: '#f3f6fa',
          color: '#607086',
        },
        '&.cm-focused': {
          outline: 'none',
        },
      }),
      languageCompartment.of(getLanguageExtension(initialLanguage)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          hiddenInput.value = update.state.doc.toString();
        }
      }),
    ],
    parent: container,
  });

  hiddenInput.value = editor.state.doc.toString();

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      editor.dispatch({
        effects: languageCompartment.reconfigure(getLanguageExtension(languageSelect.value)),
      });
    });
  }

  container.closest('form')?.addEventListener('submit', () => {
    hiddenInput.value = editor.state.doc.toString();
  });
}

window.addEventListener('DOMContentLoaded', initProblemEditor);
