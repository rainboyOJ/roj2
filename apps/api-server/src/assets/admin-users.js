(function () {
  if (!window.axios || !window.RojFormUtils) {
    return;
  }
  const formUtils = window.RojFormUtils;
  const notify = window.RojNotify || {
    success(message) {
      window.console.log(message);
    },
    error(message) {
      window.console.error(message);
    },
  };

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

  const currentPageUserCheckboxes = () => Array.from(
    document.querySelectorAll(
      'input[type="checkbox"][name="userIds"][form="bulk-user-review-form"]',
    ),
  ).filter((input) => input instanceof HTMLInputElement && !input.disabled);

  const updateCurrentPageSelector = () => {
    const selector = document.querySelector('#select-current-page-users');
    if (!(selector instanceof HTMLInputElement)) {
      return;
    }

    const checkboxes = currentPageUserCheckboxes();
    const checkedCount = checkboxes.filter((input) => input.checked).length;
    selector.disabled = checkboxes.length === 0;
    selector.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
    selector.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  };

  const initCurrentPageSelector = () => {
    const selector = document.querySelector('#select-current-page-users');
    if (!(selector instanceof HTMLInputElement)) {
      return;
    }

    selector.addEventListener('change', () => {
      currentPageUserCheckboxes().forEach((input) => {
        input.checked = selector.checked;
      });
      updateCurrentPageSelector();
    });

    currentPageUserCheckboxes().forEach((input) => {
      input.addEventListener('change', updateCurrentPageSelector);
    });
    updateCurrentPageSelector();
  };

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

    if (action.method === 'delete') {
      return {
        deleteSubmissions: form.dataset.deleteSubmissions === 'true',
      };
    }

    return undefined;
  };

  const submitApiAction = async (action, payload) => {
    if (action.method === 'delete') {
      const response = await window.axios.delete(action.url, {
        data: payload,
      });
      return response.data;
    }
    const response = await window.axios.post(action.url, payload);
    return response.data;
  };

  const notifyDeleteResult = (result) => {
    if (!result || typeof result.submissionCount !== 'number' || typeof result.progressCount !== 'number') {
      return false;
    }
    if (result.submissionCount === 0 && result.progressCount === 0) {
      return false;
    }
    notify.success(`已删除用户，并清理 ${result.submissionCount} 条提交记录，${result.progressCount} 条做题进度。`);
    return true;
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
      notify.error(form.dataset.emptyMessage || '请先选择需要处理的用户');
      return;
    }

    const requiredPasswordName = form.dataset.requirePassword;
    if (requiredPasswordName) {
      const input = getPasswordInput(form, requiredPasswordName);
      if (!input || input.value.trim() === '') {
        notify.error(form.dataset.passwordEmptyMessage || '请先输入新密码');
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
    if (action.method === 'delete' && form.dataset.deleteSubmissionsMessage) {
      form.dataset.deleteSubmissions = window.confirm(form.dataset.deleteSubmissionsMessage)
        ? 'true'
        : 'false';
    }

    try {
      formUtils.setSubmitting(form, true);
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        submitter.disabled = true;
      }
      const result = await submitApiAction(action, payloadForForm(form, action));
      if (action.method === 'delete' && notifyDeleteResult(result)) {
        window.setTimeout(() => {
          window.location.reload();
        }, 700);
        return;
      }
      window.location.reload();
    } catch (error) {
      notify.error(formUtils.serverMessage(
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

  initCurrentPageSelector();
})();
