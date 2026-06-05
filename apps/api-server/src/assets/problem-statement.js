(function () {
  const copyButton = document.querySelector('#copyStatementButton');
  const markdownNode = document.querySelector('#problemStatementMarkdown');

  if (!copyButton || !markdownNode) {
    return;
  }

  const notify = window.RojNotify || {
    success(message) {
      window.console.info(message);
    },
    error(message) {
      window.console.error(message);
    },
  };

  const readMarkdown = () => {
    try {
      return JSON.parse(markdownNode.textContent || '""');
    } catch {
      return '';
    }
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return fallbackCopy(text);
  };

  copyButton.addEventListener('click', async () => {
    const markdown = readMarkdown();
    if (!markdown) {
      notify.error('题面内容为空，无法复制');
      return;
    }

    copyButton.disabled = true;
    try {
      const copied = await copyText(markdown);
      if (copied) {
        notify.success('题面已复制');
      } else {
        notify.error('复制失败，请手动选择题面内容');
      }
    } catch {
      notify.error('复制失败，请检查浏览器剪贴板权限');
    } finally {
      copyButton.disabled = false;
    }
  });
})();
