(function () {
  const form = document.querySelector('#adminProblemForm');
  const alertBox = document.querySelector('#adminProblemAlert');

  if (!form || !alertBox || !window.RojFormUtils || !window.axios) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const fieldMessages = {
    pid: '请填写题目编号。',
    title: '请填写题目标题。',
    statementMarkdown: '请填写题面内容。',
  };

  const checkedValues = (name) => Array.from(
    form.querySelectorAll(`input[name="${name}"]:checked`),
    (input) => input.value,
  );

  const problemPayload = () => {
    const formData = new FormData(form);
    return {
      pid: String(formData.get('pid') || ''),
      title: String(formData.get('title') || ''),
      statementMarkdown: String(formData.get('statementMarkdown') || ''),
      allowLanguages: checkedValues('allowLanguages'),
      isVisible: String(formData.get('isVisible') || '') === 'true',
    };
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    formUtils.handleSubmit(form, alertBox, {
      fieldMessages,
      validationMessage: '请检查题目信息。',
      beforeSubmit: () => formUtils.requireChecked(
        form,
        'input[name="allowLanguages"]:checked',
        alertBox,
        '至少选择一种允许提交的语言。',
      ),
      submit: async () => {
        const formData = new FormData(form);
        const problemId = String(formData.get('id') || '');
        if (problemId) {
          await window.axios.put(`/api/admin/problems/${encodeURIComponent(problemId)}`, problemPayload());
        } else {
          await window.axios.post('/api/admin/problems', problemPayload());
        }
      },
      onSuccess: () => {
        window.location.href = '/admin/problems';
      },
      errorMessage: '保存题目失败，请检查后重试。',
    });
  });

  document.querySelectorAll('.admin-publish-problem-form').forEach((publishForm) => {
    publishForm.addEventListener('submit', (event) => {
      event.preventDefault();
      formUtils.handleSubmit(publishForm, alertBox, {
        submit: async () => {
          const problemId = publishForm.dataset.problemId || '';
          await window.axios.post(`/api/admin/problems/${encodeURIComponent(problemId)}/publish`);
        },
        onSuccess: () => {
          window.location.href = '/admin/problems';
        },
        errorMessage: '发布题目失败，请检查后重试。',
      });
    });
  });
})();
