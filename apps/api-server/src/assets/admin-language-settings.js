(function () {
  const form = document.querySelector('#adminLanguageForm');
  const alertBox = document.querySelector('#adminLanguageAlert');

  if (!form || !alertBox || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;

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
        HTMLFormElement.prototype.submit.call(form);
      },
    });
  });
})();
