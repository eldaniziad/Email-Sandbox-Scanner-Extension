function debugStorage() {
    console.log('Attempting to debug storage...');
    chrome.storage.local.get(null, function(items) {
        if (chrome.runtime.lastError) {
            console.error('Error accessing storage:', chrome.runtime.lastError);
        } else {
            console.log('All stored data:', items);
        }
    });
}

function clearStorage() {
    console.log('Attempting to clear storage...');
    chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
            console.error('Error clearing storage:', chrome.runtime.lastError);
        } else {
            console.log('All data cleared');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Debug script loaded');
    const debugButton = document.getElementById('debugButton');
    const clearStorageButton = document.getElementById('clearStorageButton');
    
    if (debugButton) {
        debugButton.addEventListener('click', debugStorage);
        console.log('Debug button listener added');
    } else {
        console.error('Debug button not found');
    }
    
    if (clearStorageButton) {
        clearStorageButton.addEventListener('click', clearStorage);
        console.log('Clear storage button listener added');
    } else {
        console.error('Clear storage button not found');
    }
});
