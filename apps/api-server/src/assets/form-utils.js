(function () {
  function showAlert(alertBox, message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
  }

  function hideAlert(alertBox) {
    alertBox.hidden = true;
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

  window.RojFormUtils = {
    showAlert,
    hideAlert,
    validateForm,
    issueMessage,
    responseData,
  };
})();
