importScripts('./ExtPay.js');

const EXTENSIONPAY_ID = 'kit';
const SCROLL_SETTLE_DELAY_MS = 180;
const extpay = ExtPay(EXTENSIONPAY_ID);
extpay.startBackground();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function handleMessage(request, sender) {
  const tabId = request.tabId ?? sender.tab?.id;
  if (!tabId) {
    throw new Error('No active tab found.');
  }

  switch (request.type) {
    case 'CAPTURE_VISIBLE':
      return captureVisible(tabId);
    case 'CAPTURE_FULL':
      return captureFullPage(tabId, { asPdf: false });
    case 'CAPTURE_FULL_PDF':
      await assertPremiumUser();
      return captureFullPage(tabId, { asPdf: true });
    case 'OPEN_PREMIUM_PAGE':
      extpay.openPaymentPage();
      return { message: 'Opened premium checkout page.' };
    default:
      throw new Error('Unsupported action.');
  }
}

async function captureVisible(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const image = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const filename = buildFilename('visible');
  await chrome.downloads.download({ url: image, filename, saveAs: true });
  return { message: 'Visible area captured.', filename };
}

async function captureFullPage(tabId, { asPdf }) {
  const tab = await chrome.tabs.get(tabId);
  const pageMetrics = await getPageMetrics(tabId);
  const captures = [];

  try {
    for (const y of pageMetrics.scrollSteps) {
      await scrollTo(tabId, y);
      await sleep(SCROLL_SETTLE_DELAY_MS);
      const image = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      captures.push({ image, y });
    }
  } finally {
    await restoreScroll(tabId, pageMetrics.originalScrollY);
  }

  const stitched = await stitchImages(captures, pageMetrics);
  const baseName = asPdf ? 'full-page-premium' : 'full-page';
  const filename = buildFilename(baseName, 'png');
  await chrome.downloads.download({ url: stitched, filename, saveAs: true });

  if (asPdf) {
    await chrome.tabs.create({ url: stitched });
    return {
      message: 'Premium capture saved as PNG and opened in a tab for Save-to-PDF via print dialog.',
      filename
    };
  }

  return { message: 'Full page captured.', filename };
}

async function getPageMetrics(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const doc = document.documentElement;
      const body = document.body;
      const fullHeight = Math.max(
        doc.scrollHeight,
        body ? body.scrollHeight : 0,
        doc.offsetHeight,
        body ? body.offsetHeight : 0,
        doc.clientHeight
      );
      const viewportHeight = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const originalScrollY = window.scrollY;
      const steps = [];
      for (let y = 0; y < fullHeight; y += viewportHeight) {
        steps.push(y);
      }
      if (steps.length === 0) {
        steps.push(0);
      }
      return {
        fullHeight,
        viewportHeight,
        dpr,
        scrollSteps: steps,
        originalScrollY
      };
    }
  });

  return result;
}

async function scrollTo(tabId, y) {
  await chrome.scripting.executeScript({
    target: { tabId },
    args: [y],
    func: (nextY) => {
      window.scrollTo(0, nextY);
    }
  });
}

async function restoreScroll(tabId, y) {
  await chrome.scripting.executeScript({
    target: { tabId },
    args: [y],
    func: (nextY) => {
      window.scrollTo(0, nextY);
    }
  });
}

async function stitchImages(captures, pageMetrics) {
  if (captures.length === 0) {
    throw new Error('Nothing captured.');
  }

  const images = await Promise.all(captures.map((capture) => imageFromDataUrl(capture.image)));
  const width = images[0].width;
  const height = Math.ceil(pageMetrics.fullHeight * pageMetrics.dpr);
  const canvas = new OffscreenCanvas(width, Math.max(height, images[0].height));
  const context = canvas.getContext('2d');

  captures.forEach((capture, index) => {
    const image = images[index];
    const destY = Math.floor(capture.y * pageMetrics.dpr);
    const remaining = canvas.height - destY;
    const drawHeight = Math.min(image.height, Math.max(remaining, 0));
    if (drawHeight > 0) {
      context.drawImage(image, 0, 0, image.width, drawHeight, 0, destY, image.width, drawHeight);
    }
  });

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(blob);
}

async function imageFromDataUrl(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not encode image data.'));
    reader.readAsDataURL(blob);
  });
}

function buildFilename(prefix, extension = 'png') {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  return `kitreal/${prefix}-${now}.${extension}`;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function assertPremiumUser() {
  const user = await extpay.getUser();
  if (!user.paid) {
    throw new Error('Premium subscription required. Click "Unlock Premium" to subscribe for $5/month.');
  }
}
