(function () {
    // Configuration
    const serverUrl = "https://44a10e2fb1957e52bdfcaa5cf749f87c.serveo.net/";
    const buttonText = "MCP +";

    // Don't run multiple times
    if (window._timestampButtonAdded) return;
    window._timestampButtonAdded = true;

    // Clean up any existing buttons first
    const existingButtons = document.querySelectorAll('.timestamp-url-button');
    existingButtons.forEach(button => button.remove());

    // Create and add styles
    const style = document.createElement('style');
    style.textContent = `
        .timestamp-url-button {
            background-color: #444654;
            color: #fff;
            border: none;
            border-radius: 18px;
            height: 36px;
            padding: 0 16px;
            margin-right: 14px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
            position: absolute;
            left: 8px;
        }
        
        .timestamp-url-button:hover {
            background-color: #555;
        }
        
        .timestamp-url-button svg {
            margin-right: 6px;
        }
        
        /* Add padding to the button container to make room for our button */
        .button-container-modified {
            position: relative;
            padding-left: 110px !important;
        }
    `;
    document.head.appendChild(style);

    // Helper functions
    function encodeInputText(text) {
        return encodeURIComponent(text.trim());
    }

    function getUnixTimestamp() {
        return Math.floor(Date.now() / 1000);
    }

    function getPromptTextareaElement() {
        const byId = document.querySelector('#prompt-textarea');
        if (byId) return byId;
        return document.querySelector('div[contenteditable="true"][data-virtualkeyboard="true"].ProseMirror');
    }

    function setPromptText(newText) {
        const textarea = getPromptTextareaElement();
        if (!textarea) return;

        const paragraph = textarea.querySelector("p");
        if (paragraph) {
            paragraph.innerHTML = newText.replace(/\n/g, "<br>");
        } else {
            textarea.innerHTML = `<p>${newText}</p>`;
        }

        textarea.focus();
    }

    // Find the send button and its parent container
    function findTargetElements() {
        // Look for the submit button at the bottom right
        const submitButton = document.querySelector('button[data-testid="send-button"]');

        if (!submitButton) {
            console.warn("Submit button not found");
            return null;
        }

        // Find the parent container that holds the buttons
        const buttonContainer = submitButton.closest('div.flex.items-center');

        if (!buttonContainer) {
            console.warn("Button container not found");
            return null;
        }

        return { submitButton, buttonContainer };
    }

    // Create our custom button
    function createCustomButton() {
        const button = document.createElement('button');
        button.className = 'timestamp-url-button';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V8.5M13.5 3L19 8.5M13.5 3V7.5C13.5 8.05228 13.9477 8.5 14.5 8.5H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${buttonText}
        `;

        let alreadyClicked = false;

        button.onclick = function (event) {
            event.preventDefault();

            if (alreadyClicked) return;
            alreadyClicked = true;

            const textarea = getPromptTextareaElement();
            if (!textarea) {
                alreadyClicked = false;
                return alert("Textarea not found!");
            }

            const text = textarea.innerText.trim();
            const url = `${serverUrl}?q=${encodeInputText(text)}&ts=${getUnixTimestamp()}&follow=3&timeout=3`;

            const message = `according to this page: ${url}\n\n${text}`;
            setPromptText(message);

            // Reset after a delay to allow for multiple uses if needed
            setTimeout(() => {
                alreadyClicked = false;
            }, 2000);
        };

        return button;
    }

    // Main function to add the button
    function addTimestampButton() {
        const elements = findTargetElements();
        if (!elements) {
            // Retry later if elements not found
            setTimeout(addTimestampButton, 1000);
            return;
        }

        const { buttonContainer } = elements;

        // Remove any existing buttons
        const existingButtons = document.querySelectorAll('.timestamp-url-button');
        existingButtons.forEach(button => button.remove());

        // Add our class to the container for styling
        buttonContainer.classList.add('button-container-modified');

        const customButton = createCustomButton();

        // Add button to the container
        buttonContainer.appendChild(customButton);
    }

    // Initial call with retry logic
    function initialize() {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            addTimestampButton();
        } else {
            document.addEventListener('DOMContentLoaded', addTimestampButton);
        }
    }

    // Watch for DOM changes to handle dynamic loading
    function setupObserver() {
        const observer = new MutationObserver(function (mutations) {
            // Check if our button exists, if not add it
            if (!document.querySelector('.timestamp-url-button')) {
                addTimestampButton();
            }

            // Check if container lost our class, if so re-add it
            const elements = findTargetElements();
            if (elements && !elements.buttonContainer.classList.contains('button-container-modified')) {
                elements.buttonContainer.classList.add('button-container-modified');
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    initialize();
    setupObserver();
})();