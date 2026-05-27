(function () {
  const alertBox = document.querySelector('#adminGradesAlert');

  if (!alertBox || !window.RojFormUtils || !window.axios) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const gradePayload = (form) => {
    const formData = new FormData(form);
    return {
      name: String(formData.get('name') || ''),
      isActive: formData.get('isActive') === 'true',
      order: Number(formData.get('order') || '0'),
    };
  };

  const fieldMessages = {
    name: '请填写年级。',
    order: '请填写排序数字。',
  };

  document.querySelectorAll('.admin-grade-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      formUtils.handleSubmit(form, alertBox, {
        fieldMessages,
        validationMessage: '请检查年级信息。',
        submit: async () => {
          const gradeId = form.dataset.gradeId || '';
          if (gradeId) {
            await window.axios.put(`/api/admin/grades/${encodeURIComponent(gradeId)}`, gradePayload(form));
          } else {
            await window.axios.post('/api/admin/grades', gradePayload(form));
          }
        },
        onSuccess: () => {
          window.location.reload();
        },
        errorMessage: '保存年级失败，请检查后重试。',
      });
    });
  });
})();
