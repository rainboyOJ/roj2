(function () {
  function showAlert(alertBox, message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
  }

  function hideAlert(alertBox) {
    alertBox.hidden = true;
  }

  function setSubmitting(form, isSubmitting) {
    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((button) => {
      button.disabled = isSubmitting;
    });
  }

  function issueField(issue) {
    return Array.isArray(issue.path) ? issue.path[0] : '';
  }

  function responseData(error) {
    return error.response && error.response.data;
  }

  function validateForm(form, alertBox, fieldMessages, fallbackMessage) {
    if (form.checkValidity()) {
      return true;
    }

    const invalidField = form.querySelector(':invalid');
    if (invalidField) {
      showAlert(alertBox, fieldMessages[invalidField.name] || fallbackMessage);
      invalidField.focus();
    }
    return false;
  }

  function issueMessage(error, fieldMessages, fallbackMessage) {
    const data = responseData(error);
    if (data && Array.isArray(data.issues) && data.issues.length > 0) {
      const field = issueField(data.issues[0]);
      return fieldMessages[field] || fallbackMessage;
    }
    return null;
  }

  function messageFromServerText(message, serverMessageMap) {
    if (typeof message !== 'string') {
      return null;
    }
    for (const key of Object.keys(serverMessageMap || {})) {
      if (message.includes(key)) {
        return serverMessageMap[key];
      }
    }
    return null;
  }

  function messageFromError(error, fieldMessages, serverMessageMap, fallbackMessage) {
    const message = issueMessage(error, fieldMessages, fallbackMessage);
    if (message) {
      return message;
    }

    const data = responseData(error);
    const serverMessage = messageFromServerText(data && data.message, serverMessageMap);
    return serverMessage || fallbackMessage;
  }

  function requireChecked(form, selector, alertBox, message) {
    if (form.querySelectorAll(selector).length > 0) {
      return true;
    }
    showAlert(alertBox, message);
    return false;
  }

  async function handleSubmit(form, alertBox, options) {
    hideAlert(alertBox);
    if (!validateForm(
      form,
      alertBox,
      options.fieldMessages || {},
      options.validationMessage || '请检查表单内容。',
    )) {
      return;
    }

    if (options.beforeSubmit && options.beforeSubmit() === false) {
      return;
    }

    try {
      setSubmitting(form, true);
      await options.submit();
      if (options.successMessage) {
        showAlert(alertBox, options.successMessage);
      }
      if (options.onSuccess) {
        options.onSuccess();
      }
    } catch (error) {
      const message = options.errorToMessage
        ? options.errorToMessage(error)
        : messageFromError(
          error,
          options.fieldMessages || {},
          options.serverMessageMap || {},
          options.errorMessage || '提交失败，请检查后重试。',
        );
      showAlert(alertBox, message);
    } finally {
      setSubmitting(form, false);
    }
  }

  window.RojFormUtils = {
    showAlert,
    hideAlert,
    setSubmitting,
    validateForm,
    issueMessage,
    messageFromError,
    requireChecked,
    handleSubmit,
    responseData,
  };
})();
