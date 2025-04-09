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
        // Execute the triggerMCPButton function in the active tab
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                if (window.triggerMCPButton) {
                    window.triggerMCPButton();
                }
            }
        });
    }
}); 