import { basicSetup, EditorView } from 'codemirror';
import { Compartment } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';

declare global {
  interface Window {
    axios?: {
      post: <T = unknown>(url: string, payload?: unknown) => Promise<{ data: T }>;
    };
    RojFormUtils?: {
      showAlert: (alertBox: HTMLElement, message: string) => void;
      hideAlert: (alertBox: HTMLElement) => void;
      setSubmitting: (form: HTMLFormElement, isSubmitting: boolean) => void;
      serverMessage: (
        error: unknown,
        serverMessageMap: Record<string, string>,
        fallbackMessage: string,
      ) => string;
    };
  }
}

const languageFactories = {
  cpp,
  python,
} as const;

type CreateSubmissionResponse = {
  submissionId?: string;
  submissionNo?: number;
  status?: string;
  verdict?: string;
};

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

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hiddenInput.value = editor.state.doc.toString();
    if (alertBox && window.RojFormUtils) {
      window.RojFormUtils.hideAlert(alertBox);
    }

    if (!languageSelect || languageSelect.disabled || !languageSelect.value) {
      if (alertBox) {
        window.RojFormUtils?.showAlert(alertBox, '当前题目没有可用的提交语言。');
      }
      return;
    }

    if (!hiddenInput.value.trim()) {
      if (alertBox) {
        window.RojFormUtils?.showAlert(alertBox, '请填写代码。');
      }
      editor.focus();
      return;
    }

    const formData = new FormData(form);
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    try {
      window.RojFormUtils?.setSubmitting(form, true);
      const response = await window.axios?.post<CreateSubmissionResponse>('/api/submissions', {
        pid: String(formData.get('pid') || ''),
        language: languageSelect.value,
        sourceCode: hiddenInput.value,
      });
      const submissionId = response?.data.submissionId;
      if (submissionId) {
        window.location.href = `/submissions/${encodeURIComponent(submissionId)}`;
        return;
      }
      window.location.href = '/submissions';
    } catch (error) {
      if (alertBox) {
        window.RojFormUtils?.showAlert(
          alertBox,
          window.RojFormUtils.serverMessage(
            error,
            {
              'Approval required': '账号审核通过后才能提交代码。',
              'Invalid submission payload': '提交信息不完整，请检查语言和代码。',
            },
            '提交失败，请检查后重试。',
          ),
        );
      }
      editor.focus();
    } finally {
      window.RojFormUtils?.setSubmitting(form, false);
      if (submitButton) {
        submitButton.disabled = languageSelect.disabled;
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', initProblemEditor);
