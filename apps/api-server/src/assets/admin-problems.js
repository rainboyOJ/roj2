(function () {
  if (!window.RojFormUtils || !window.axios) {
    return;
  }
  const formUtils = window.RojFormUtils;
  const notify = window.RojNotify || {
    error(message) {
      window.console.error(message);
    },
  };

  document.querySelectorAll('.admin-publish-problem-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const problemId = form.dataset.problemId || '';
      try {
        formUtils.setSubmitting(form, true);
        await window.axios.post(`/api/admin/problems/${encodeURIComponent(problemId)}/publish`);
        window.location.reload();
      } catch (error) {
        notify.error(formUtils.serverMessage(
          error,
          {},
          '发布题目失败，请检查后重试。',
        ));
      } finally {
        formUtils.setSubmitting(form, false);
      }
    });
  });
})();
