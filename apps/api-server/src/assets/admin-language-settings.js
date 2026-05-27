(function () {
  const form = document.querySelector('#adminLanguageForm');
  const alertBox = document.querySelector('#adminLanguageAlert');

  if (!form || !alertBox || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;

  form.addEventListener('submit', (event) => {
    formUtils.hideAlert(alertBox);
    const checked = form.querySelectorAll('input[name="enabledLanguages"]:checked');
    if (checked.length === 0) {
      event.preventDefault();
      formUtils.showAlert(alertBox, '至少选择一种可用语言。');
    }
  });
})();
