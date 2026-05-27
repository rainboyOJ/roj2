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
  const form = document.querySelector<HTMLFormElement>('#submissionForm');
  const alertBox = document.querySelector<HTMLElement>('#submissionAlert');
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

  form?.addEventListener('submit', (event) => {
    hiddenInput.value = editor.state.doc.toString();
    if (alertBox) {
      alertBox.hidden = true;
    }

    if (!languageSelect || languageSelect.disabled || !languageSelect.value) {
      event.preventDefault();
      if (alertBox) {
        alertBox.textContent = '当前题目没有可用的提交语言。';
        alertBox.hidden = false;
      }
      return;
    }

    if (!hiddenInput.value.trim()) {
      event.preventDefault();
      if (alertBox) {
        alertBox.textContent = '请填写代码。';
        alertBox.hidden = false;
      }
      editor.focus();
    }
  });
}

window.addEventListener('DOMContentLoaded', initProblemEditor);
