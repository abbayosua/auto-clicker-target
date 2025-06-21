document.addEventListener('DOMContentLoaded', () => {
  const selectButton = document.getElementById('selectButton');
  const resetButton = document.getElementById('resetSelection');
  const secondsInput = document.getElementById('secondsInput');
  const runAutoclick = document.getElementById('runAutoclick');
  const stopAutoclick = document.getElementById('stopAutoclick');
  const selectionStatus = document.getElementById('selectionStatus');
  const currentSelector = document.getElementById('currentSelector');
  const currentInterval = document.getElementById('currentInterval');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const autoclickStatus = document.getElementById('autoclickStatus');

  let currentTabId = null;

  // Load saved settings
chrome.storage.sync.get(['selector', 'intervalSeconds', 'isRunning'], (data) => {
    if (data.selector) {
      currentSelector.textContent = data.selector;
      selectionStatus.textContent = `Selected: ${data.selector}`; // Update status on load
    } else {
      currentSelector.textContent = 'None';
      selectionStatus.textContent = 'No element selected.';
    }
    secondsInput.value = data.intervalSeconds !== undefined ? data.intervalSeconds : 0;
    updateCurrentIntervalDisplay(data.intervalSeconds);

    if (data.isRunning) {
      autoclickStatus.textContent = 'Running';
      runAutoclick.disabled = true;
      stopAutoclick.disabled = false;
      selectButton.disabled = true;
      resetButton.disabled = true;
      secondsInput.disabled = true;
    } else {
      autoclickStatus.textContent = 'Stopped';
      runAutoclick.disabled = false;
      stopAutoclick.disabled = true;
      selectButton.disabled = false;
      resetButton.disabled = false;
      secondsInput.disabled = false;
    }
    countdownDisplay.textContent = 'N/A'; // Initialize countdown display
  });

  function updateCurrentIntervalDisplay(seconds) {
    if (seconds !== undefined) {
      currentInterval.textContent = `${seconds} seconds`;
    } else {
      currentInterval.textContent = 'None';
    }
  }

  // Get current tab ID
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTabId = tabs[0].id;
  });

  selectButton.addEventListener('click', () => {
    selectionStatus.textContent = 'Click on an element on the page...';
    chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ['src/content/before.js'] // Inject the script containing enableElementSelection
    }, () => {
      if (chrome.runtime.lastError) {
        selectionStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
        console.error('Error injecting script for element selection:', chrome.runtime.lastError.message);
      } else {
        // After injection, execute the function
        chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          function: () => {
            if (typeof enableElementSelection === 'function') {
              enableElementSelection();
            } else {
              console.error('enableElementSelection function not found after injection.');
            }
          }
        });
        console.log('Element selection script injected and function called successfully.');
      }
    });
  });

  resetButton.addEventListener('click', () => {
    chrome.storage.sync.remove('selector', () => {
      currentSelector.textContent = 'None';
      selectionStatus.textContent = 'Selected element reset.';
      chrome.storage.sync.set({ isRunning: false }, () => {
        autoclickStatus.textContent = 'Stopped';
        runAutoclick.disabled = false;
        stopAutoclick.disabled = true;
        selectButton.disabled = false;
        resetButton.disabled = false;
        secondsInput.disabled = false;
        chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          files: ['src/content/autoclick.js'] // Inject the script containing stopAutoclick
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error injecting script for stopping autoclick:', chrome.runtime.lastError.message);
          } else {
            chrome.scripting.executeScript({
              target: { tabId: currentTabId },
              function: () => {
                if (typeof stopAutoclick === 'function') {
                  stopAutoclick();
                } else {
                  console.error('stopAutoclick function not found after injection.');
                }
              }
            });
          }
        });
      });
    });
  });

  runAutoclick.addEventListener('click', () => {
    const seconds = parseInt(secondsInput.value);
    const selector = currentSelector.textContent;

    if (!selector || selector === 'None') {
      selectionStatus.textContent = 'Please select a button first!';
      return;
    }
    if (isNaN(seconds) || seconds <= 0) {
      selectionStatus.textContent = 'Please enter a valid interval (seconds)!';
      return;
    }

    const totalIntervalMs = seconds * 1000;

    chrome.storage.sync.set({ selector: selector, intervalSeconds: seconds, isRunning: true }, () => {
      updateCurrentIntervalDisplay(seconds);
      autoclickStatus.textContent = 'Running';
      runAutoclick.disabled = true;
      stopAutoclick.disabled = false;
      selectButton.disabled = true;
      resetButton.disabled = true;
      secondsInput.disabled = true;
      selectionStatus.textContent = '';

      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['src/content/autoclick.js'] // Inject the script containing startAutoclick
      }, () => {
        if (chrome.runtime.lastError) {
          autoclickStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
          chrome.storage.sync.set({ isRunning: false });
          runAutoclick.disabled = false;
          stopAutoclick.disabled = true;
          console.error('Error injecting script for starting autoclick:', chrome.runtime.lastError.message);
        } else {
          chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            function: (s, i) => {
              if (typeof startAutoclick === 'function') {
                startAutoclick(s, i);
              } else {
                console.error('startAutoclick function not found after injection.');
              }
            },
            args: [selector, totalIntervalMs]
          });
          console.log('Autoclick script injected and function called successfully.');
        }
      });
    });
  });

  stopAutoclick.addEventListener('click', () => {
    chrome.storage.sync.set({ isRunning: false }, () => {
      autoclickStatus.textContent = 'Stopped';
      runAutoclick.disabled = false;
      stopAutoclick.disabled = true;
      selectButton.disabled = false;
      resetButton.disabled = false;
      secondsInput.disabled = false;
      selectionStatus.textContent = '';
      countdownDisplay.textContent = 'N/A'; // Reset countdown display

      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['src/content/autoclick.js'] // Inject the script containing stopAutoclick
      }, () => {
        if (chrome.runtime.lastError) {
          autoclickStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
          console.error('Error injecting script for stopping autoclick:', chrome.runtime.lastError.message);
        } else {
          chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            function: () => {
              if (typeof stopAutoclick === 'function') {
                stopAutoclick();
              } else {
                console.error('stopAutoclick function not found after injection.');
              }
            }
          });
          console.log('Stop autoclick script injected and function called successfully.');
        }
      });
    });
  });

  // Listener for messages from background script (forwarded from content script)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'elementSelected') {
      console.log('Message received in popup.js from background:', request);
      const selector = request.selector;
      currentSelector.textContent = selector;
      selectionStatus.textContent = `Selected: ${selector}`;
      // No need to set selector in storage here, as background.js already handles it
      alert(`Element selected: ${selector}`);
    } else if (request.action === 'autoclickStopped') {
      autoclickStatus.textContent = 'Stopped';
      runAutoclick.disabled = false;
      stopAutoclick.disabled = true;
      selectButton.disabled = false;
      resetButton.disabled = false;
      secondsInput.disabled = false;
      selectionStatus.textContent = request.reason ? `Autoclick stopped: ${request.reason}` : 'Autoclick stopped.';
      countdownDisplay.textContent = 'N/A';
    } else if (request.action === 'updateCountdown') {
      countdownDisplay.textContent = `${request.timeLeft} seconds`;
    }
  });
});
