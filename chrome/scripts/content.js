// Ankizin Content Copier Chrome Extension
// Adds Ankizin buttons to extract IDs from medical education websites

class AnkizinCopier {
  constructor() {
    this.siteConfig = this.getSiteConfig();
    this.init();
  }

  getSiteConfig() {
    const hostname = window.location.hostname;

    const configs = {
      'next.amboss.com': {
        extractId: (callback) => {
          // Extract article ID from current page URL (called only on click)
          const href = window.location.href;
          const match = href.match(/\/article\/([a-zA-Z0-9]+)/);
          const id = match ? match[1] : null;
          callback(id);
        },
        targetSelector: () => {
          // Find the container that holds the play-button and anki-button
          const playButton = document.querySelector('[data-e2e-test-id="play-button"]');
          const ankiButton = document.querySelector('[data-e2e-test-id="anki-button"]');

          if (playButton || ankiButton) {
            // Find the parent container that holds these buttons
            const button = playButton || ankiButton;
            let parent = button.parentElement;
            // Go up to find the container with the Inline class structure
            while (parent && !parent.className.match(/css-[a-zA-Z0-9]{6}-InlineContainer/)) {
              parent = parent.parentElement;
            }
            return parent;
          }
          return null;
        },
        insertStrategy: 'append_button',
        buttonText: 'ANKIZIN',
        idType: 'Artikel-ID'
      },
      'viamedici.thieme.de': {
        extractId: (callback) => {
          // Extract Lernmodul-ID from current page URL (called only on click)
          const href = window.location.href;
          const match = href.match(/\/lernmodul\/(\d+)/);
          const id = match ? match[1] : null;
          callback(id);
        },
        targetSelector: () => {
          // Find the "Fragen kreuzen" button by text content and get its parent li element
          const buttons = Array.from(document.querySelectorAll('button'));
          const fragenButton = buttons.find(btn =>
            btn.textContent && btn.textContent.trim().includes('Fragen kreuzen')
          );

          if (fragenButton) {
            // Go up to find the <li> element that contains this button
            let parent = fragenButton.parentElement;
            while (parent && parent.tagName !== 'LI') {
              parent = parent.parentElement;
            }
            return parent;
          }
          return null;
        },
        insertStrategy: 'insert_before_li',
        buttonText: 'Ankizin',
        idType: 'Lernmodul-ID'
      },
      'www.meditricks.de': {
        extractId: (callback) => {
          // Placeholder for Meditricks - extract from current page URL (called only on click)
          const pathname = window.location.pathname;
          callback(pathname);
        },
        targetSelector: () => {
          return document.querySelector('body');
        },
        insertStrategy: 'append',
        buttonText: 'Ankizin (Placeholder)',
        idType: 'URL Path'
      }
    };

    return configs[hostname] || null;
  }

  init() {
    if (!this.siteConfig) return;

    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.addAnkizinButton());
    } else {
      this.addAnkizinButton();
    }

    // Also handle dynamic content changes
    this.observeChanges();
  }

  addAnkizinButton() {
    // Skip if button already exists
    if (document.querySelector('.ankizin-button, .ankizin-copier-btn')) return;

    const targetElement = this.siteConfig.targetSelector();
    if (!targetElement) {
      console.log('Ankizin: Target element not found, will retry...');
      return;
    }

    console.log('Ankizin: Adding button to page');

    // Remove Anki button on AMBOSS before adding Ankizin button
    if (window.location.hostname === 'next.amboss.com') {
      this.removeAnkiButton();
    }

    const ankizinButton = this.createAnkizinButton();
    this.insertButton(targetElement, ankizinButton);
  }

  removeAnkiButton() {
    // Remove the existing Anki button in AMBOSS
    const ankiButton = document.querySelector('[data-e2e-test-id="anki-button"]');
    const ankiButtonParent = ankiButton?.parentElement;
    if (ankiButtonParent) {
      console.log('Ankizin: Removing existing Anki button');
      ankiButtonParent.remove();
    }
  }

  createAnkizinButton() {
    const hostname = window.location.hostname;
    const button = this.createButtonElement(hostname);

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleButtonClick(button);
    });

    return button;
  }

  createButtonElement(hostname) {
    if (hostname === 'next.amboss.com') {
      return this.createAmbossButton();
    } else if (hostname === 'viamedici.thieme.de') {
      return this.createViamediciButton();
    } else {
      return this.createFallbackButton(hostname);
    }
  }

  createAmbossButton() {
    // Create AMBOSS-style button using native classes
    const buttonContainer = document.createElement('div');
    buttonContainer.className = this.getAmbossContainerClass();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = this.getAmbossButtonClass();
    button.setAttribute('data-site', 'next.amboss.com');

    const innerDiv = document.createElement('div');
    innerDiv.setAttribute('data-ds-id', 'Inline');
    innerDiv.className = this.getAmbossInlineClass();

    const iconContainer = document.createElement('div');
    iconContainer.className = buttonContainer.className;
    iconContainer.appendChild(this.createIcon());

    const textContainer = document.createElement('p');
    textContainer.setAttribute('transform', 'uppercase');
    textContainer.setAttribute('color', 'tertiary');
    textContainer.setAttribute('data-ds-id', 'Text');
    textContainer.className = 'css-1a6rmib-StyledText esvupxe0';
    textContainer.textContent = this.siteConfig.buttonText;

    innerDiv.appendChild(iconContainer);
    innerDiv.appendChild(textContainer);
    button.appendChild(innerDiv);
    buttonContainer.appendChild(button);

    return buttonContainer;
  }

  createViamediciButton() {
    const button = document.createElement('button');
    button.className = 'btn btn-primary btn-block ankizin-button';
    button.setAttribute('data-site', 'viamedici.thieme.de');

    const icon = this.createIcon();
    icon.style.marginRight = '8px';

    const text = document.createElement('span');
    text.textContent = this.siteConfig.buttonText;

    button.appendChild(icon);
    button.appendChild(text);

    return button;
  }

  createFallbackButton(hostname) {
    const button = document.createElement('button');
    button.className = 'ankizin-copier-btn';
    button.setAttribute('data-site', hostname);

    button.innerHTML = `
      <img src="${chrome.runtime.getURL('images/ankizin.svg')}" alt="Ankizin" class="ankizin-icon">
      <span>${this.siteConfig.buttonText}</span>
    `;

    return button;
  }

  createIcon() {
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('images/ankizin.svg');
    icon.alt = 'Ankizin';
    icon.className = 'ankizin-icon';
    icon.style.width = '16px';
    icon.style.height = '16px';
    return icon;
  }

  getAmbossContainerClass() {
    const existingItem = document.querySelector('[class*="StyledInlineItem"]');
    if (existingItem) {
      const styleMatch = existingItem.className.match(/css-[a-zA-Z0-9]{6}-StyledInlineItem/);
      const baseMatch = existingItem.className.match(/e[a-zA-Z0-9]+/);
      if (styleMatch && baseMatch) {
        return `${styleMatch[0]} ${baseMatch[0]}`;
      }
    }
    return 'css-h0nko7-StyledInlineItem e6i75dx1';
  }

  getAmbossButtonClass() {
    const existingButton = document.querySelector('[class*="--container"]');
    if (existingButton) {
      const containerMatch = existingButton.className.match(/[a-zA-Z0-9]{16}--container/);
      if (containerMatch) {
        return `${containerMatch[0]} ankizin-button`;
      }
    }
    return '_2dfc3e09bcc2a51e--container ankizin-button';
  }

  getAmbossInlineClass() {
    const existingContainer = document.querySelector('[class*="InlineContainer"]');
    if (existingContainer) {
      const inlineMatch = existingContainer.className.match(/css-[a-zA-Z0-9]{6}-InlineContainer/);
      const baseMatch = existingContainer.className.match(/e[a-zA-Z0-9]+/);
      if (inlineMatch && baseMatch) {
        return `${inlineMatch[0]} ${baseMatch[0]}`;
      }
    }
    return 'css-mgid52-InlineContainer e6i75dx0';
  }

  handleButtonClick(button) {
    this.siteConfig.extractId((extractedId) => {
      if (extractedId) {
        this.copyId(extractedId, button);
      } else {
        console.error('Ankizin: Could not extract ID from current page URL on click');
        this.showErrorMessage(button);
      }
    });
  }

  insertButton(targetElement, button) {
    const strategy = this.siteConfig.insertStrategy;

    switch (strategy) {
      case 'append_button':
        // For AMBOSS: append to the container that holds other buttons
        targetElement.appendChild(button);
        break;

      case 'insert_before_li':
        // For Viamedici: insert a divider before the button
        const listItem = document.createElement('li');
        listItem.className = 'py-4 ng-star-inserted';
        listItem.appendChild(button);

        const dividerAfter = document.createElement('li');
        dividerAfter.className = 'divider ng-star-inserted';

        // Insert after the target element
        const parentList = targetElement.parentElement;
        parentList.insertBefore(listItem, targetElement);
        parentList.insertBefore(dividerAfter, targetElement);
        break;

      case 'after':
        targetElement.insertAdjacentElement('afterend', button);
        break;

      case 'append':
        targetElement.appendChild(button);
        break;

      default:
        targetElement.insertAdjacentElement('afterend', button);
    }
  }

  async copyId(id, button) {
    // Create formatted search string based on site
    const hostname = window.location.hostname;
    let searchString = 'note:ProjektAnki* ';
    
    if (hostname === 'next.amboss.com') {
      searchString += `AMBOSS*:*${id}*`;
    } else if (hostname === 'viamedici.thieme.de') {
      searchString += `*medici*:*${id}*`;
    } else {
      // For other sites, just append the ID
      searchString += id;
    }
    
    try {
      await navigator.clipboard.writeText(searchString);
      this.showSuccessMessage(button, id);
    } catch (err) {
      console.error('Failed to copy search string:', err);
      this.showErrorMessage(button);
    }
  }

  showSuccessMessage(button, copiedId) {
    // Create and show splash notification
    this.showSplash('success', `${this.siteConfig.idType} kopiert!`, copiedId);

    // Update button text temporarily
    this.updateButtonText(button, '✓ kopiert!', 2000);
  }

  showErrorMessage(button) {
    // Create and show splash notification
    this.showSplash('error', 'Copy Failed!', 'Please try again');
  }

  showSplash(type, message, details) {
    const splash = document.createElement('div');
    splash.className = `ankizin-splash ${type}`;
    splash.innerHTML = `
      <div class="splash-content">
        <div class="splash-icon">${type === 'success' ? '✓' : '×'}</div>
        <div class="splash-text">${message}</div>
        <div class="splash-id">${details}</div>
      </div>
    `;

    document.body.appendChild(splash);

    // Animate in
    requestAnimationFrame(() => splash.classList.add('show'));

    // Remove after 3 seconds
    setTimeout(() => {
      splash.classList.remove('show');
      setTimeout(() => splash.remove(), 300);
    }, 3000);
  }

  updateButtonText(button, newText, duration) {
    const textElement = this.findTextElement(button);
    if (!textElement) return;

    const originalText = textElement.textContent;
    textElement.textContent = newText;
    button.classList.add('copied');

    setTimeout(() => {
      textElement.textContent = originalText;
      button.classList.remove('copied');
    }, duration);
  }

  findTextElement(button) {
    const hostname = window.location.hostname;

    if (hostname === 'next.amboss.com') {
      return button.querySelector('[class*="StyledInlineItem"]:last-child') ||
        button.querySelector('.css-h0nko7-StyledInlineItem:last-child');
    } else {
      return button.querySelector('span');
    }
  }

  observeChanges() {
    // Use MutationObserver to handle dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      let shouldAddButton = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldAddButton = true;
        }
      });

      if (shouldAddButton) {
        // Debounce the button addition
        clearTimeout(this.addButtonTimeout);
        this.addButtonTimeout = setTimeout(() => {
          if (!document.querySelector('.ankizin-button, .ankizin-copier-btn')) {
            this.addAnkizinButton();
          }
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the extension
new AnkizinCopier();
