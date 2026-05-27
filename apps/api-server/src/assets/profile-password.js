(function () {
  const form = document.querySelector('#profilePasswordForm');
  const alertBox = document.querySelector('#profilePasswordAlert');

  if (!form || !alertBox || !window.axios || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const fieldMessages = {
    currentPassword: '请填写当前密码。',
    newPassword: '新密码至少 8 个字符。',
  };

  function validateForm() {
    return formUtils.validateForm(form, alertBox, fieldMessages, '请检查密码填写内容。');
  }

  function errorToMessage(error) {
    const issueMessage = formUtils.issueMessage(error, fieldMessages, '请检查密码填写内容。');
    if (issueMessage) {
      return issueMessage;
    }
    const data = formUtils.responseData(error);
    if (data && typeof data.message === 'string') {
      if (data.message.includes('current password')) {
        return '当前密码错误。';
      }
    }
    return '修改密码失败，请检查后重试。';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formUtils.hideAlert(alertBox);
    if (!validateForm()) {
      return;
    }

    const formData = new FormData(form);
    try {
      await window.axios.post('/api/me/password', {
        currentPassword: String(formData.get('currentPassword') || ''),
        newPassword: String(formData.get('newPassword') || ''),
      });
      form.reset();
      formUtils.showAlert(alertBox, '密码已更新。');
    } catch (error) {
      formUtils.showAlert(alertBox, errorToMessage(error));
    }
  });
})();
