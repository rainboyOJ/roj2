(function () {
  const form = document.querySelector('#registerForm');
  const alertBox = document.querySelector('#registerAlert');

  if (!form || !alertBox || !window.axios) {
    return;
  }

  const fieldLabels = {
    username: '用户名',
    name: '姓名',
    gender: '性别',
    grade: '年级',
    className: '班级',
    password: '密码',
  };

  const fieldMessages = {
    username: '用户名只能使用小写字母、数字、下划线，长度 3-24。',
    name: '请填写姓名。',
    gender: '请选择男或女。',
    grade: '请选择年级。',
    className: '请填写班级。',
    password: '密码至少 8 个字符。',
  };

  function showError(message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
  }

  function showFieldError(field) {
    if (!field) {
      return false;
    }

    const message = fieldMessages[field.name] || `${fieldLabels[field.name] || '表单'}填写不正确。`;
    showError(message);
    field.focus();
    return true;
  }

  function validateForm() {
    if (form.checkValidity()) {
      return true;
    }

    const invalidField = form.querySelector(':invalid');
    showFieldError(invalidField);
    return false;
  }

  function issueToMessage(issue) {
    const field = Array.isArray(issue.path) ? issue.path[0] : '';
    if (field === 'username') {
      return '用户名只能使用小写字母、数字、下划线，长度 3-24。';
    }
    if (field === 'password') {
      return '密码至少 8 个字符。';
    }
    if (field === 'gender') {
      return '请选择男或女。';
    }
    const label = fieldLabels[field] || '表单';
    return `${label}填写不正确。`;
  }

  function errorToMessage(error) {
    const data = error.response && error.response.data;
    if (data && Array.isArray(data.issues) && data.issues.length > 0) {
      return issueToMessage(data.issues[0]);
    }
    if (data && typeof data.message === 'string') {
      if (data.message.includes('username already exists')) {
        return '用户名已存在。';
      }
      if (data.message.includes('grade') && data.message.includes('not available')) {
        return '请选择可用的年级。';
      }
    }
    return '注册失败，请检查填写内容后重试。';
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
      name: String(formData.get('name') || ''),
      gender: String(formData.get('gender') || ''),
      className: String(formData.get('className') || ''),
      grade: String(formData.get('grade') || ''),
      password: String(formData.get('password') || ''),
    };

    try {
      await window.axios.post('/api/register', payload);
      window.location.href = '/login';
    } catch (error) {
      showError(errorToMessage(error));
    }
  });
})();
