// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "triggerMCPButton",
        title: "Add MCP Button",
        contexts: ["all"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "triggerMCPButton") {
        // Execute the initialization function in the active tab
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window.MCP && window.MCP.initialize) {
                    window.MCP.initialize();
                    window.MCP.setupObserver();
                }
            }
        });
    }
});

function triggerMCPButton() {
    if (window.triggerMCPButton) {
        window.triggerMCPButton();
    }
}