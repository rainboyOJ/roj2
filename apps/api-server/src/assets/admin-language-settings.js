(function () {
  const form = document.querySelector('#adminLanguageForm');
  const alertBox = document.querySelector('#adminLanguageAlert');

  if (!form || !alertBox || !window.RojFormUtils || !window.axios) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const selectedLanguages = () => Array.from(
    form.querySelectorAll('input[name="enabledLanguages"]:checked'),
    (input) => input.value,
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    formUtils.handleSubmit(form, alertBox, {
      beforeSubmit: () => formUtils.requireChecked(
        form,
        'input[name="enabledLanguages"]:checked',
        alertBox,
        '至少选择一种可用语言。',
      ),
      submit: async () => {
        await window.axios.post('/api/admin/settings/languages', {
          enabledLanguages: selectedLanguages(),
        });
      },
      onSuccess: () => {
        window.location.reload();
      },
      errorMessage: '保存语言设置失败，请检查后重试。',
    });
  });
})();
