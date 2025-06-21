// This script runs at document_start
// It contains the enableElementSelection function

let selectedElement = null;

function enableElementSelection() {
  console.log('[Content Script - before.js] enableElementSelection function started.');

  function highlightElement(e) {
    if (selectedElement) {
      selectedElement.style.outline = '';
    }
    selectedElement = e.target;
    selectedElement.style.outline = '2px solid red';
  }

  function selectElement(e) {
    e.preventDefault();
    e.stopPropagation();
    if (selectedElement) {
      selectedElement.style.outline = '';
    }
    const selector = getCssSelector(e.target);
    console.log('[Content Script - before.js] Element selected, sending message:', selector);
    chrome.runtime.sendMessage({ action: 'elementSelected', selector: selector });
    removeListeners();
  }

  function removeListeners() {
    document.removeEventListener('mouseover', highlightElement);
    document.removeEventListener('click', selectElement, true);
    document.removeEventListener('mouseout', removeHighlight);
    console.log('[Content Script - before.js] Element selection listeners removed.');
  }

  function removeHighlight() {
    if (selectedElement) {
      selectedElement.style.outline = '';
    }
  }

  document.addEventListener('mouseover', highlightElement);
  document.addEventListener('mouseout', removeHighlight);
  document.addEventListener('click', selectElement, true); // Use capture phase
  console.log('[Content Script - before.js] Element selection listeners added.');

  function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while (sib.previousElementSibling) {
          sib = sib.previousElementSibling;
          if (sib.nodeName.toLowerCase() === selector)
            nth++;
        }
        if (nth !== 1)
          selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }
}

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enableElementSelection') {
    enableElementSelection();
  }
});
