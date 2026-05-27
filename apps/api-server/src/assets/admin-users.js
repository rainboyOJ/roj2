(function () {
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

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const requiredCheckedName = form.dataset.requireChecked;
    if (requiredCheckedName && !hasCheckedInput(form, requiredCheckedName)) {
      event.preventDefault();
      window.alert(form.dataset.emptyMessage || '请先选择需要处理的用户');
      return;
    }

    const requiredPasswordName = form.dataset.requirePassword;
    if (requiredPasswordName) {
      const input = getPasswordInput(form, requiredPasswordName);
      if (!input || input.value.trim() === '') {
        event.preventDefault();
        window.alert(form.dataset.passwordEmptyMessage || '请先输入新密码');
        if (input) {
          input.focus();
        }
        return;
      }
    }

    const submitter = findSubmitter(event);
    const message = submitter?.dataset.confirmMessage || form.dataset.confirmMessage;
    if (message && !window.confirm(message)) {
      event.preventDefault();
    }
  });
})();
