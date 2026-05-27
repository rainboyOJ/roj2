(function () {
  const form = document.querySelector('#loginForm');
  const alertBox = document.querySelector('#loginAlert');

  if (!form || !alertBox || !window.axios) {
    return;
  }

  const fieldMessages = {
    username: '用户名只能使用小写字母、数字、下划线，长度 3-24。',
    password: '请填写密码。',
  };

  function showError(message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
  }

  function validateForm() {
    if (form.checkValidity()) {
      return true;
    }

    const invalidField = form.querySelector(':invalid');
    if (invalidField) {
      showError(fieldMessages[invalidField.name] || '请检查登录信息。');
      invalidField.focus();
    }
    return false;
  }

  function errorToMessage(error) {
    const data = error.response && error.response.data;
    if (data && Array.isArray(data.issues) && data.issues.length > 0) {
      const field = Array.isArray(data.issues[0].path) ? data.issues[0].path[0] : '';
      return fieldMessages[field] || '请检查登录信息。';
    }
    if (data && typeof data.message === 'string') {
      if (data.message.includes('invalid username or password')) {
        return '用户名或密码错误。';
      }
    }
    return '登录失败，请检查用户名和密码后重试。';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.hidden = true;
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
      showError(errorToMessage(error));
    }
  });
})();
