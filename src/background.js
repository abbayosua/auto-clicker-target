chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'elementSelected' || request.action === 'autoclickStopped') {
    // Forward the message to all active tabs, including the popup if it's open.
    // This handles the case where the popup might not be open when the message is sent.
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        // This error occurs if no receiving end exists (e.g., popup is closed).
        // It's expected behavior if the popup isn't open, so we can ignore it.
        console.log("Could not send message to popup (it might be closed):", chrome.runtime.lastError.message);
      }
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    chrome.storage.sync.get(['selector', 'intervalSeconds', 'isRunning'], (data) => {
      if (data.isRunning && data.selector && data.intervalSeconds !== undefined) {
        const totalIntervalMs = data.intervalSeconds * 1000;
        if (totalIntervalMs > 0) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/content/autoclick.js']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error injecting autoclick.js on tab update:', chrome.runtime.lastError.message);
            } else {
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: (s, i) => {
                  if (typeof startAutoclick === 'function') {
                    startAutoclick(s, i);
                  } else {
                    console.error('startAutoclick function not found after injection on tab update.');
                  }
                },
                args: [data.selector, totalIntervalMs]
              });
            }
          });
        }
      }
    });
  }
});