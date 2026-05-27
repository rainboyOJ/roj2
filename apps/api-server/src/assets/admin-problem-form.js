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
    formUtils.hideAlert(alertBox);
    if (!formUtils.validateForm(form, alertBox, fieldMessages, '请检查题目信息。')) {
      event.preventDefault();
      return;
    }

    const selectedLanguages = form.querySelectorAll('input[name="allowLanguages"]:checked');
    if (selectedLanguages.length === 0) {
      event.preventDefault();
      formUtils.showAlert(alertBox, '至少选择一种允许提交的语言。');
    }
  });
})();
