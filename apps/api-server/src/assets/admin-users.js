(function () {
  if (!window.axios || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;

  const findSubmitter = (event) => {
    if (event.submitter instanceof HTMLElement) {
      return event.submitter;
    }
    return null;
  };

  const hasCheckedInput = (form, name) => {
    return Boolean(form.querySelector(`input[name="${name}"]:checked`));
  };

  const getPasswordInput = (form, name) => {
    const input = form.querySelector(`input[name="${name}"]`);
    return input instanceof HTMLInputElement ? input : null;
  };

  const checkedValues = (form, name) => Array.from(
    form.querySelectorAll(`input[name="${name}"]:checked`),
    (input) => input.value,
  );

  const hiddenValues = (form, name) => Array.from(
    form.querySelectorAll(`input[name="${name}"][type="hidden"]`),
    (input) => input.value,
  );

  const actionForForm = (form, submitter) => {
    const action = submitter?.getAttribute('formaction') || form.getAttribute('action') || '';
    const url = new URL(action, window.location.origin);
    const pathname = url.pathname;
    if (pathname.endsWith('/bulk-approve')) {
      return { method: 'post', url: '/api/admin/users/bulk-approve' };
    }
    if (pathname.endsWith('/bulk-reject')) {
      return { method: 'post', url: '/api/admin/users/bulk-reject' };
    }

    const resetMatch = pathname.match(/^\/admin\/users\/([^/]+)\/reset-password$/);
    if (resetMatch) {
      return {
        method: 'post',
        url: `/api/admin/users/${encodeURIComponent(resetMatch[1])}/reset-password`,
      };
    }

    const deleteMatch = pathname.match(/^\/admin\/users\/([^/]+)\/delete$/);
    if (deleteMatch) {
      return {
        method: 'delete',
        url: `/api/admin/users/${encodeURIComponent(deleteMatch[1])}`,
      };
    }

    return null;
  };

  const payloadForForm = (form, action) => {
    if (action.url.endsWith('/bulk-approve') || action.url.endsWith('/bulk-reject')) {
      const userIds = checkedValues(form, 'userIds').concat(hiddenValues(form, 'userIds'));
      return { userIds };
    }

    if (action.url.endsWith('/reset-password')) {
      const input = getPasswordInput(form, 'password');
      return { password: input ? input.value : '' };
    }

    return undefined;
  };

  const submitApiAction = async (action, payload) => {
    if (action.method === 'delete') {
      await window.axios.delete(action.url);
      return;
    }
    await window.axios.post(action.url, payload);
  };

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const submitter = findSubmitter(event);
    const action = actionForForm(form, submitter);
    if (!action) {
      return;
    }
    event.preventDefault();

    const requiredCheckedName = form.dataset.requireChecked;
    if (requiredCheckedName && !hasCheckedInput(form, requiredCheckedName)) {
      window.alert(form.dataset.emptyMessage || '请先选择需要处理的用户');
      return;
    }

    const requiredPasswordName = form.dataset.requirePassword;
    if (requiredPasswordName) {
      const input = getPasswordInput(form, requiredPasswordName);
      if (!input || input.value.trim() === '') {
        window.alert(form.dataset.passwordEmptyMessage || '请先输入新密码');
        if (input) {
          input.focus();
        }
        return;
      }
    }

    const message = submitter?.dataset.confirmMessage || form.dataset.confirmMessage;
    if (message && !window.confirm(message)) {
      return;
    }

    try {
      formUtils.setSubmitting(form, true);
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        submitter.disabled = true;
      }
      await submitApiAction(action, payloadForForm(form, action));
      window.location.reload();
    } catch (error) {
      window.alert(formUtils.serverMessage(
        error,
        {
          'No users selected': '请先选择需要处理的用户。',
          'Invalid password payload': '新密码至少需要 8 个字符。',
        },
        '操作失败，请检查后重试。',
      ));
    } finally {
      formUtils.setSubmitting(form, false);
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        submitter.disabled = false;
      }
    }
  });
})();
