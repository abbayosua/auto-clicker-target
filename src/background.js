chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'elementSelected') {
    // Store the selected selector in storage
    chrome.storage.sync.set({ selector: request.selector }, () => {
      console.log('Selector saved to storage:', request.selector);
    });
    // Forward the message to the popup if it's open
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Could not send elementSelected message to popup (it might be closed):", chrome.runtime.lastError.message);
      }
    });
  } else if (request.action === 'autoclickStopped') {
    // Update isRunning status in storage
    chrome.storage.sync.set({ isRunning: false }, () => {
      console.log('Autoclick status set to stopped in storage.');
    });
    // Forward the message to the popup if it's open
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Could not send autoclickStopped message to popup (it might be closed):", chrome.runtime.lastError.message);
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