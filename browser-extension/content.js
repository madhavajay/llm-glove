(function () {
    // Configuration
    const serverUrl = "https://4e6285374ca16ded4e346defba054447.serveo.net/";
    const buttonText = "MCP +";
    const autoRun = true; // Set to false to prevent automatic execution

    // Don't run multiple times
    if (window._mcpButtonAdded) return;
    window._mcpButtonAdded = true;

    // Clean up any existing buttons first
    const existingButtons = document.querySelectorAll('.mcp-button');
    existingButtons.forEach(button => button.remove());

    // Create and add styles
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    const hostname = window.location.hostname;
    let styleFile = 'styles-chatgpt.css';

    function isHostname(hostname, target) {
        return hostname === target || hostname.endsWith(target);
    }

    if (isHostname(hostname, 'claude.ai')) {
        styleFile = 'styles-claude.css';
    } else if (isHostname(hostname, 'grok.com')) {
        styleFile = 'styles-grok.css';
    } else if (isHostname(hostname, 'perplexity.ai')) {
        styleFile = 'styles-perplexity.css';
    } else if (isHostname(hostname, 'copilot.microsoft.com')) {
        styleFile = 'styles-copilot.css';
    } else if (isHostname(hostname, 'chat.deepseek.com')) {
        styleFile = 'styles-deepseek.css';
    } else if (isHostname(hostname, 'gemini.google.com')) {
        styleFile = 'styles-gemini.css';
    }

    style.href = chrome.runtime.getURL(styleFile);
    document.head.appendChild(style);

    // Helper functions
    function encodeInputText(text) {
        return encodeURIComponent(text.trim());
    }

    function getPromptTextareaElement() {
        const hostname = window.location.hostname;
        if (isHostname(hostname, 'claude.ai')) {
            return document.querySelector('div[contenteditable="true"].ProseMirror');
        } else if (isHostname(hostname, 'grok.com')) {
            return document.querySelector('textarea[aria-label="Ask Grok anything"]');
        } else if (isHostname(hostname, 'perplexity.ai')) {
            console.log('Looking for Perplexity textarea...');
            let textarea = document.querySelector('textarea[aria-label="Ask anything"]');
            if (!textarea) {
                console.log('Could not find textarea with aria-label="Ask anything"');
                textarea = document.querySelector('textarea[placeholder*="Ask anything"]');
                if (!textarea) {
                    console.log('Could not find textarea with placeholder containing "Ask anything"');
                    textarea = document.querySelector('textarea');
                    if (textarea) {
                        console.log('Found a textarea element:', textarea);
                    }
                }
            }
            return textarea;
        } else if (isHostname(hostname, 'chat.deepseek.com')) {
            return document.querySelector('textarea#chat-input');
        } else if (isHostname(hostname, 'gemini.google.com')) {
            return document.querySelector('div[contenteditable="true"].textarea.new-input-ui');
        } else if (isHostname(hostname, 'copilot.microsoft.com')) {
            return document.querySelector('textarea#userInput[placeholder="Message Copilot"]');
        } else if (isHostname(hostname, 'chatgpt.com')) {
            const byId = document.querySelector('#prompt-textarea');
            if (byId) return byId;
            return document.querySelector('div[contenteditable="true"][data-virtualkeyboard="true"].ProseMirror');
        } else {
            console.error(`No supported website detected: ${hostname}`);
            return null;
        }
    }

    function setPromptText(newText) {
        const textarea = getPromptTextareaElement();
        if (!textarea) return;

        const hostname = window.location.hostname;

        if (isHostname(hostname, 'claude.ai')) {
            textarea.innerHTML = `<p>${newText.replace(/\n/g, "</p><p>")}</p>`;
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            textarea.dispatchEvent(inputEvent);
        } else if (isHostname(hostname, 'grok.com')) {
            textarea.value = newText;
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            textarea.dispatchEvent(inputEvent);
        } else if (isHostname(hostname, 'perplexity.ai')) {
            textarea.value = newText;
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            textarea.dispatchEvent(inputEvent);
        } else if (isHostname(hostname, 'chat.deepseek.com')) {
            textarea.value = newText;
            // Trigger both input and change events for DeepSeek
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            const changeEvent = new Event('change', { bubbles: true, cancelable: true });
            textarea.dispatchEvent(inputEvent);
            textarea.dispatchEvent(changeEvent);
            // Focus the textarea
            textarea.focus();
        } else if (isHostname(hostname, 'gemini.google.com')) {
            textarea.textContent = newText;
        } else if (isHostname(hostname, 'copilot.microsoft.com')) {
            textarea.value = newText;
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            textarea.dispatchEvent(inputEvent);
        } else {
            textarea.value = newText;
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            textarea.dispatchEvent(inputEvent);
        }

        textarea.focus();
    }

    // Find the send button and its parent container
    function findTargetElements() {
        const hostname = window.location.hostname;
        let submitButton, buttonContainer;

        if (isHostname(hostname, 'chat.openai.com')) {
            // Find the button container - it's the div with flex items-center gap-2
            buttonContainer = document.querySelector('div.absolute.right-3.bottom-0.flex.items-center.gap-2');
            // Find the submit button - it's the button with data-testid="composer-submit-button"
            submitButton = document.querySelector('button[data-testid="composer-submit-button"]');
        } else if (isHostname(hostname, 'claude.ai')) {
            submitButton = document.querySelector('button[aria-label="Send message"]');
            buttonContainer = submitButton?.closest('div.flex.gap-2\\.5.w-full.items-center');
        } else if (isHostname(hostname, 'grok.com')) {
            submitButton = document.querySelector('button[type="submit"]');
            buttonContainer = submitButton?.closest('div.flex');
        } else if (isHostname(hostname, 'perplexity.ai')) {
            submitButton = document.querySelector('button[aria-label="Submit"]') || document.querySelector('button[aria-label="Dictation"]');
            buttonContainer = submitButton?.closest('div.flex');
        } else if (isHostname(hostname, 'chat.deepseek.com')) {
            submitButton = document.querySelector('div[role="button"]._7436101');
            buttonContainer = document.querySelector('div.ec4f5d61');
        } else if (isHostname(hostname, 'gemini.google.com')) {
            submitButton = document.querySelector('button[aria-label="Send message"]');
            buttonContainer = document.querySelector('div.input-buttons-wrapper-bottom');
        } else if (isHostname(hostname, 'copilot.microsoft.com')) {
            submitButton = document.querySelector('button[data-testid="submit-button"]') ||
                document.querySelector('button[aria-label="Talk to Copilot"]');
            buttonContainer = submitButton?.closest('div.flex');
        } else if (isHostname(hostname, 'chatgpt.com')) {
            submitButton = document.querySelector('#composer-submit-button') || document.querySelector('button[data-testid="composer-speech-button"]');
            buttonContainer = submitButton?.closest('div.flex.items-center');
        } else {
            console.error(`No supported website detected: ${hostname}`);
            return null;
        }

        if (!buttonContainer || !submitButton) {
            console.log('Button container or submit button not found');
            return null;
        }

        return { submitButton, buttonContainer };
    }

    // Create our custom button
    function createCustomButton() {
        const button = document.createElement('button');
        button.className = 'mcp-button animate-glow';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V8.5M13.5 3L19 8.5M13.5 3V7.5C13.5 8.05228 13.9477 8.5 14.5 8.5H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${buttonText}
        `;

        let alreadyClicked = false;

        button.onclick = handleButtonClick;

        function handleButtonClick(event) {
            event.preventDefault();

            if (alreadyClicked) return;
            alreadyClicked = true;

            const textarea = getPromptTextareaElement();
            if (!textarea) {
                alreadyClicked = false;
                return alert("Textarea not found!");
            }

            const hostname = window.location.hostname;
            const text = isHostname(hostname, 'claude.ai') || isHostname(hostname, 'copilot.microsoft.com') || isHostname(hostname, 'gemini.google.com')
                ? textarea.textContent.trim()
                : textarea.value?.trim() || textarea.innerText.trim();

            const url = `${serverUrl}?q=${encodeInputText(text)}`;
            console.log(`Fetching URL: ${url}`);
            let instruction = `Instruction: Here is some context I want to chat about in the next message, respond only with the words "OK".`;

            // Disable the form and show a spinner
            const form = isHostname(hostname, 'claude.ai')
                ? document.querySelector('div.flex.flex-col.bg-bg-000.border-0\\.5.border-border-300.mx-2.md\\:mx-0.items-stretch')
                : isHostname(hostname, 'copilot.microsoft.com')
                    ? document.querySelector('div.pointer-events-auto.relative.flex.flex-col.contrast-more\\:border-2[data-testid="composer-content"]')
                    : isHostname(hostname, 'gemini.google.com')
                        ? document.querySelector('form')
                        : isHostname(hostname, 'grok.com')
                            ? document.querySelector('form.bottom-0.w-full.text-base.flex.flex-col.gap-2.items-center.justify-center.relative.z-10')
                            : isHostname(hostname, 'perplexity.ai')
                                ? document.querySelector('div.rounded-3xl')
                                : isHostname(hostname, 'chat.deepseek.com')
                                    ? document.querySelector('div._77cefa5')
                                    : document.querySelector('form[data-type="unified-composer"]');

            if (form) {
                form.style.position = 'relative';
                const overlay = document.createElement('div');

                if (isHostname(hostname, 'claude.ai')) {
                    overlay.className = 'mcp-overlay mcp-overlay-claude';
                } else if (isHostname(hostname, 'grok.com')) {
                    overlay.className = 'mcp-overlay mcp-overlay-grok';
                } else if (isHostname(hostname, 'perplexity.ai')) {
                    overlay.className = 'mcp-overlay mcp-overlay-perplexity';
                } else if (isHostname(hostname, 'copilot.microsoft.com')) {
                    overlay.className = 'mcp-overlay mcp-overlay-copilot';
                } else if (isHostname(hostname, 'chat.deepseek.com')) {
                    overlay.className = 'mcp-overlay mcp-overlay-deepseek';
                } else {
                    overlay.className = 'mcp-overlay mcp-overlay-default';
                }

                const spinner = document.createElement('div');
                if (isHostname(hostname, 'claude.ai')) {
                    spinner.className = 'mcp-spinner mcp-spinner-claude';
                } else if (isHostname(hostname, 'grok.com')) {
                    spinner.className = 'mcp-spinner mcp-spinner-grok';
                } else if (isHostname(hostname, 'perplexity.ai')) {
                    spinner.className = 'mcp-spinner mcp-spinner-perplexity';
                } else if (isHostname(hostname, 'copilot.microsoft.com')) {
                    spinner.className = 'mcp-spinner mcp-spinner-copilot';
                } else if (isHostname(hostname, 'chat.deepseek.com')) {
                    spinner.className = 'mcp-spinner mcp-spinner-deepseek';
                } else {
                    spinner.className = 'mcp-spinner mcp-spinner-default';
                }

                overlay.appendChild(spinner);
                form.appendChild(overlay);
            }

            fetch(url)
                .then(response => response.text())
                .then(data => {
                    const message = `${instruction}\n\n${data}`;
                    setPromptText(message);

                    // Wait for the text to be correctly pasted
                    setTimeout(() => {
                        // Find and click the submit button
                        const submitButton = findTargetElements()?.submitButton;
                        if (submitButton) {
                            if (isHostname(hostname, 'chat.deepseek.com')) {
                                // For DeepSeek, we need to trigger a click event
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                submitButton.dispatchEvent(clickEvent);
                            } else {
                                submitButton.click();
                            }
                        } else {
                            console.warn("Submit button not found");
                        }
                    }, 100);
                })
                .catch(error => {
                    console.error('Error fetching the URL:', error);
                    alert('Failed to fetch the URL content.');
                })
                .finally(() => {
                    // Remove the overlay and spinner
                    if (form) {
                        const overlay = form.querySelector('.mcp-overlay');
                        if (overlay) {
                            overlay.remove();
                        }
                    }
                    // Reset after a delay to allow for multiple uses if needed
                    setTimeout(() => {
                        alreadyClicked = false;
                    }, 2000);
                });
        }

        // Ensure the animation only runs once by removing the class after animation completes
        button.addEventListener('animationend', function (e) {
            if (e.animationName === 'glow-pulse') {
                button.classList.remove('animate-glow');
            }
        });

        return button;
    }

    // Main function to add the button
    function addMCPButton() {
        const elements = findTargetElements();
        if (!elements) {
            console.log('Target elements not found, retrying...');
            setTimeout(addMCPButton, 1000);
            return;
        }

        const { buttonContainer } = elements;

        // Remove any existing MCP buttons
        const existingButtons = document.querySelectorAll('.mcp-button');
        existingButtons.forEach(button => button.remove());

        // Add our class to the container for styling
        if (!buttonContainer.classList.contains('button-container-modified')) {
            buttonContainer.classList.add('button-container-modified');
        }

        const customButton = createCustomButton();

        // For ChatGPT, insert the button before the submit button
        if (isHostname(window.location.hostname, 'chat.openai.com')) {
            const submitButton = elements.submitButton;
            if (submitButton) {
                buttonContainer.insertBefore(customButton, submitButton);
            } else {
                buttonContainer.appendChild(customButton);
            }
        } else {
            buttonContainer.appendChild(customButton);
        }
    }

    // Initial call with retry logic
    function initialize() {
        console.log("Initializing MCP button setup...");
        if (document.readyState === 'complete') {
            console.log("Document is complete, adding MCP button...");
            addMCPButton();
        } else {
            console.log("Document not complete, setting up DOMContentLoaded listener...");
            const readyHandler = () => {
                console.log("DOMContentLoaded event fired, adding MCP button...");
                addMCPButton();
                document.removeEventListener('DOMContentLoaded', readyHandler);
            };
            document.addEventListener('DOMContentLoaded', readyHandler);
        }
    }

    // Watch for DOM changes to handle dynamic loading
    function setupObserver() {
        console.log("Setting up MutationObserver for dynamic loading...");
        const observer = new MutationObserver(function (mutations) {
            // Check if our button exists, if not add it
            if (!document.querySelector('.mcp-button')) {
                console.log("MCP button not found, adding it...");
                addMCPButton();
            }
            // Check if container lost our class, if so re-add it
            const elements = findTargetElements();
            if (elements && !isHostname(window.location.hostname, 'chat.deepseek.com') && !elements.buttonContainer.classList.contains('button-container-modified')) {
                console.log("Button container lost class, re-adding it...");
                elements.buttonContainer.classList.add('button-container-modified');
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    // Add a style element for the spinner animation
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
    document.head.appendChild(spinnerStyle);

    // Add a function to manually trigger the button setup
    window.triggerMCPButton = function () {
        console.log("Manually triggering MCP button setup...");
        addMCPButton();
        setupObserver();
    };

    // Only auto-run if the flag is true
    if (autoRun) {
        initialize();
        setupObserver();
        console.log("MCP button setup complete.");
    } else {
        console.log("MCP button setup is disabled. Call window.triggerMCPButton() to manually trigger it.");
    }
})();
