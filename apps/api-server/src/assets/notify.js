(function () {
  const fallback = {
    success(message) {
      window.console.info(message);
    },
    error(message) {
      window.console.error(message);
    },
    info(message) {
      window.console.info(message);
    },
  };

  if (!window.Notyf) {
    window.RojNotify = fallback;
    return;
  }

  const notyf = new window.Notyf({
    duration: 2600,
    position: { x: 'center', y: 'top' },
    dismissible: true,
    ripple: false,
    types: [
      {
        type: 'info',
        background: '#2563eb',
        icon: false,
      },
    ],
  });

  const escapeHtml = (message) => String(message || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  window.RojNotify = {
    success(message) {
      notyf.success(escapeHtml(message));
    },
    error(message) {
      notyf.error(escapeHtml(message));
    },
    info(message) {
      notyf.open({
        type: 'info',
        message: escapeHtml(message),
      });
    },
  };
})();
