(function () {
  const form = document.querySelector('#registerForm');
  const alertBox = document.querySelector('#registerAlert');

  if (!form || !alertBox || !window.axios || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;
  const usernameInput = form.querySelector('#username');

  const fieldMessages = {
    username: '用户名只能使用小写字母、数字、下划线，长度 3-24。',
    name: '请填写姓名。',
    gender: '请选择男或女。',
    grade: '请选择年级。',
    className: '请填写班级。',
    password: '密码至少 8 个字符。',
  };

  if (usernameInput) {
    const setUsernameValidityMessage = () => {
      usernameInput.setCustomValidity('');
      if (usernameInput.validity.valueMissing) {
        usernameInput.setCustomValidity('请填写用户名。');
      } else if (
        usernameInput.validity.tooShort
        || usernameInput.validity.tooLong
        || usernameInput.validity.patternMismatch
      ) {
        usernameInput.setCustomValidity(fieldMessages.username);
      }
    };

    usernameInput.addEventListener('invalid', setUsernameValidityMessage);
    usernameInput.addEventListener('input', () => {
      usernameInput.setCustomValidity('');
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await formUtils.handleSubmit(form, alertBox, {
      fieldMessages,
      validationMessage: '表单填写不正确。',
      serverMessageMap: {
        'username already exists': '用户名已存在。',
        'grade not available': '请选择可用的年级。',
      },
      errorMessage: '注册失败，请检查填写内容后重试。',
      submit: async () => {
        const formData = new FormData(form);
        await window.axios.post('/api/register', {
          username: String(formData.get('username') || ''),
          name: String(formData.get('name') || ''),
          gender: String(formData.get('gender') || ''),
          className: String(formData.get('className') || ''),
          grade: String(formData.get('grade') || ''),
          password: String(formData.get('password') || ''),
        });
      },
      onSuccess: () => {
        window.location.href = '/login';
      },
    });
  });
})();
