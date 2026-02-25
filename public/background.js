chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCookies") {
    chrome.cookies.getAll({ domain: "newtonschool.co" }, (cookies) => {
      sendResponse({ cookies });
    });
    return true; // Required for async sendResponse
  }
});
