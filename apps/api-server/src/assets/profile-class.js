(function () {
  const form = document.querySelector('#profileClassForm');
  const alertBox = document.querySelector('#profileClassAlert');

  if (!form || !alertBox || !window.axios || !window.RojFormUtils) {
    return;
  }

  const fieldMessages = {
    className: '请选择班级。',
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await window.RojFormUtils.handleSubmit(form, alertBox, {
      fieldMessages,
      validationMessage: '请选择班级。',
      serverMessageMap: {
        'class ': '请选择可用的班级。',
      },
      errorMessage: '更新班级失败，请检查后重试。',
      submit: async () => {
        const formData = new FormData(form);
        await window.axios.post('/api/me/class-name', {
          className: String(formData.get('className') || ''),
        });
      },
      onSuccess: () => {
        window.location.reload();
      },
    });
  });
})();
