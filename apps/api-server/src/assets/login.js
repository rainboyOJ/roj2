(function () {
  const form = document.querySelector('#loginForm');
  const alertBox = document.querySelector('#loginAlert');

  if (!form || !alertBox || !window.axios || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const fieldMessages = {
    username: '用户名只能使用小写字母、数字、下划线，长度 3-24。',
    password: '请填写密码。',
  };

  function validateForm() {
    return formUtils.validateForm(form, alertBox, fieldMessages, '请检查登录信息。');
  }

  function errorToMessage(error) {
    const issueMessage = formUtils.issueMessage(error, fieldMessages, '请检查登录信息。');
    if (issueMessage) {
      return issueMessage;
    }
    const data = formUtils.responseData(error);
    if (data && typeof data.message === 'string') {
      if (data.message.includes('invalid username or password')) {
        return '用户名或密码错误。';
      }
    }
    return '登录失败，请检查用户名和密码后重试。';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formUtils.hideAlert(alertBox);
    if (!validateForm()) {
      return;
    }

    const formData = new FormData(form);
    const payload = {
      username: String(formData.get('username') || ''),
      password: String(formData.get('password') || ''),
    };

    try {
      await window.axios.post('/api/login', payload);
      window.location.href = '/';
    } catch (error) {
      formUtils.showAlert(alertBox, errorToMessage(error));
    }
  });
})();
