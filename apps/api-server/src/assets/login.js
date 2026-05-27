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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await formUtils.handleSubmit(form, alertBox, {
      fieldMessages,
      validationMessage: '请检查登录信息。',
      serverMessageMap: {
        'invalid username or password': '用户名或密码错误。',
      },
      errorMessage: '登录失败，请检查用户名和密码后重试。',
      submit: async () => {
        const formData = new FormData(form);
        await window.axios.post('/api/login', {
          username: String(formData.get('username') || ''),
          password: String(formData.get('password') || ''),
        });
      },
      onSuccess: () => {
        window.location.href = '/';
      },
    });
  });
})();
