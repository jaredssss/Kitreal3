const statusNode = document.getElementById('status');

bindAction('capture-visible', 'CAPTURE_VISIBLE');
bindAction('capture-full', 'CAPTURE_FULL');
bindAction('capture-full-pdf', 'CAPTURE_FULL_PDF');
bindAction('open-premium', 'OPEN_PREMIUM_PAGE');

function bindAction(buttonId, action) {
  const button = document.getElementById(buttonId);
  button.addEventListener('click', async () => {
    await runAction(action);
  });
}

async function runAction(type) {
  setStatus('Working...');

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    setStatus('No active tab available.');
    return;
  }

  const response = await chrome.runtime.sendMessage({ type, tabId: activeTab.id });
  if (!response?.ok) {
    setStatus(response?.error ?? 'Capture failed.');
    return;
  }

  setStatus(response.message || 'Done.');
}

function setStatus(message) {
  statusNode.textContent = message;
}
