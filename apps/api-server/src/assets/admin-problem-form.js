(function () {
  const form = document.querySelector('#adminProblemForm');
  const alertBox = document.querySelector('#adminProblemAlert');

  if (!form || !alertBox || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const fieldMessages = {
    pid: '请填写题目编号。',
    title: '请填写题目标题。',
    statementMarkdown: '请填写题面内容。',
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
        HTMLFormElement.prototype.submit.call(form);
      },
    });
  });
})();
