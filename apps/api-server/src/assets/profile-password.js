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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await formUtils.handleSubmit(form, alertBox, {
      fieldMessages,
      validationMessage: '请检查密码填写内容。',
      serverMessageMap: {
        'current password': '当前密码错误。',
      },
      errorMessage: '修改密码失败，请检查后重试。',
      successMessage: '密码已更新。',
      submit: async () => {
        const formData = new FormData(form);
        await window.axios.post('/api/me/password', {
          currentPassword: String(formData.get('currentPassword') || ''),
          newPassword: String(formData.get('newPassword') || ''),
        });
      },
      onSuccess: () => {
        form.reset();
      },
    });
  });
})();
