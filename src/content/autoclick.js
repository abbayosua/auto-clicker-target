let autoclickIntervalId = null;
let countdownIntervalId = null;
let currentSelector = null;

function startAutoclick(selector, intervalMs) {
  stopAutoclick(); // Ensure any existing interval is cleared
  currentSelector = selector;
  console.log(`[Autoclicker Content Script] Attempting to start autoclick for selector: "${selector}" with interval: ${intervalMs}ms`);

  let timeLeft = intervalMs / 1000; // Initialize countdown in seconds

  function updateCountdown() {
    chrome.runtime.sendMessage({ action: 'updateCountdown', timeLeft: timeLeft });
    timeLeft--;
    if (timeLeft < 0) {
      timeLeft = intervalMs / 1000 - 1; // Reset for next interval, subtract 1 because click happens immediately
    }
  }

  function clickButton() {
    console.log(`[Autoclicker Content Script] Attempting to click element with selector: "${currentSelector}"`);
    const element = document.querySelector(currentSelector);
    if (element) {
      console.log(`[Autoclicker Content Script] Element found:`, element);
      // For links, simulate a click that triggers navigation
      if (element.tagName === 'A' && element.href) {
        window.location.href = element.href;
        console.log(`[Autoclicker Content Script] Navigated to link: ${element.href} at ${new Date().toLocaleTimeString()}`);
      } else {
        element.click();
        console.log(`[Autoclicker Content Script] Autoclicked element: ${currentSelector} at ${new Date().toLocaleTimeString()}`);
      }
      timeLeft = intervalMs / 1000; // Reset countdown after a click
    } else {
      console.warn(`[Autoclicker Content Script] Element with selector "${currentSelector}" not found. Stopping autoclick.`);
      stopAutoclick(); // Stop if element is not found
      // Send a message back to popup to update status
      chrome.runtime.sendMessage({ action: 'autoclickStopped', reason: 'elementNotFound' });
    }
  }

  updateCountdown(); // Initial countdown display
  autoclickIntervalId = setInterval(clickButton, intervalMs);
  countdownIntervalId = setInterval(updateCountdown, 1000); // Update countdown every second
  console.log(`[Autoclicker Content Script] Autoclicker started for selector "${currentSelector}" every ${intervalMs / 1000} seconds.`);
}

function stopAutoclick() {
  if (autoclickIntervalId) {
    clearInterval(autoclickIntervalId);
    autoclickIntervalId = null;
  }
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  currentSelector = null;
  console.log('[Autoclicker Content Script] Autoclicker stopped.');
  chrome.runtime.sendMessage({ action: 'updateCountdown', timeLeft: 'N/A' }); // Reset countdown in popup
}

// Listen for messages from the background script (forwarded from popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoclick') {
    startAutoclick(request.selector, request.intervalMs);
  } else if (request.action === 'stopAutoclick') {
    stopAutoclick();
  }
});
