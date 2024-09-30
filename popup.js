let loadingIndicator;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    
    const scanButton = document.getElementById('scanButton');
    console.log("Scan button:", scanButton);
    loadingIndicator = document.getElementById('loadingIndicator');

    if (!scanButton) {
        console.error("Scan button not found in the DOM");
        return;
    }

    scanButton.addEventListener('click', () => {
        console.log("Scan button clicked");
        startAnalysis();
    });

 function startAnalysis() {
    console.log("Starting analysis...", new Date().toISOString());
    showLoadingIndicator();
    document.getElementById('resultContainer').innerHTML = '';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            console.error("No active tab found", new Date().toISOString());
            handleError("No active tab found. Please try again.");
            hideLoadingIndicator();
            return;
        }
        
        console.log("Active tab found. Tab ID:", tabs[0].id, new Date().toISOString());
        chrome.tabs.sendMessage(tabs[0].id, { action: "extractContent" }, (response) => {
            console.log("Response from content script:", response, new Date().toISOString());
            if (chrome.runtime.lastError) {
                console.error("Chrome runtime error:", chrome.runtime.lastError, new Date().toISOString());
                handleChromeError(chrome.runtime.lastError, tabs[0].id);
                hideLoadingIndicator();
                return;
            }
            if (!response) {
                console.error("No response from content script", new Date().toISOString());
                handleError("No response from content script. Please refresh the page and try again.");
                hideLoadingIndicator();
                return;
            }
            sendToBackgroundForAnalysis(response.content, response.links);
        });
    });
}

    function injectContentScriptAndRetry(tabId) {
        console.log("Attempting to inject content script...", new Date().toISOString());
        chrome.scripting.executeScript(
            {
                target: { tabId: tabId },
                files: ['content.js']
            },
            (injectionResults) => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to inject content script:", chrome.runtime.lastError, new Date().toISOString());
                    handleError("Failed to analyze email. Please refresh the page and try again.");
                } else {
                    console.log("Content script injected successfully. Retrying analysis...", new Date().toISOString());
                    setTimeout(startAnalysis, 100);
                }
            }
        );
    }

    function handleResponse(response) {
        if (response && response.content) {
            console.log("Content extracted:", response.content);
            sendToBackgroundForAnalysis(response.content, response.links);
        } else {
            handleError("Unable to extract email content. Please try again.");
        }
    }

    function sendToBackgroundForAnalysis(content, linkData) {
        console.log("Sending to background for analysis...", linkData);
        chrome.runtime.sendMessage({ action: "analyzeEmail", content, linkData }, (result) => {
            if (chrome.runtime.lastError) {
                console.error("Error during analysis:", chrome.runtime.lastError);
                handleError("Error during analysis: " + chrome.runtime.lastError.message);
                return;
            }
            console.log("Analysis result received:", result);
            displayResults(result);
            highlightSuspiciousLinks(result.suspiciousLinks);
        });

        // Start highlighting suspicious links as they are detected
        if (linkData && linkData.links) {
            linkData.links.forEach(link => {
                chrome.runtime.sendMessage({ action: "scanLink", link: link.url }, (riskScore) => {
                    if (riskScore !== 'Error' && parseFloat(riskScore) > 0) {
                        highlightSuspiciousLinks([{ ...link, riskScore }]);
                    }
                });
            });
        }
    }

    function handleChromeError(error, tabId) {
        console.error("Chrome runtime error:", error);
        if (error.message.includes("Receiving end does not exist")) {
            console.log("Content script may not be injected. Attempting to inject...");
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    handleError("Failed to inject content script. Please refresh the page and try again.");
                } else {
                    console.log("Content script injected. Retrying...");
                    setTimeout(startAnalysis, 100);
                }
            });
        } else {
            handleError("Unable to access email content. Make sure you're viewing an email in Gmail.");
        }
    }

    function handleError(message) {
        console.error(message);
        hideLoadingIndicator();
        displayError(message);
    }

    function displayError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function displayResults(results) {
        hideLoadingIndicator();
        const resultContainer = document.getElementById('resultContainer');
        resultContainer.innerHTML = '<div class="scan-complete">Scan Complete</div>';

        if (results.gptAnalysis) {
            const gptAnalysisSection = document.createElement('div');
            gptAnalysisSection.className = 'result-section ai-analysis';
            gptAnalysisSection.innerHTML = `
                <h2>AI Analysis</h2>
                <p>${results.gptAnalysis}</p>
            `;
            resultContainer.appendChild(gptAnalysisSection);
        }

        if (results.recommendations && results.recommendations.length > 0) {
            const recommendationsSection = document.createElement('div');
            recommendationsSection.className = 'result-section recommendations';
            recommendationsSection.innerHTML = `
                <h2>Recommendations</h2>
                <ul>${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
            `;
            resultContainer.appendChild(recommendationsSection);
        }

        if (results.suspiciousLinks && results.suspiciousLinks.length > 0) {
            const suspiciousLinksSection = document.createElement('div');
            suspiciousLinksSection.className = 'result-section suspicious-links';
            suspiciousLinksSection.innerHTML = `
                <h2>Suspicious Links</h2>
                <ul>${results.suspiciousLinks.map(link => `
                    <li>
                        <div class="link-context">Context: "${link.context}"</div>
                        <div class="link-url">URL: ${truncateUrl(link.url, 30)}</div>
                        <div class="risk-score">Risk Score: ${link.riskScore}%</div>
                    </li>
                `).join('')}</ul>
            `;
            resultContainer.appendChild(suspiciousLinksSection);
        }

        if (results.links && results.links.length > 0) {
            const linksSection = document.createElement('div');
            linksSection.className = 'result-section detected-links';
            linksSection.innerHTML = `
                <h2>Detected Links</h2>
                <ul>${results.links.map(link => `
                    <li>
                        <div class="link-context">Context: "${link.context}"</div>
                        <div class="link-url">URL: ${truncateUrl(link.url, 30)}</div>
                    </li>
                `).join('')}</ul>
            `;
            resultContainer.appendChild(linksSection);
        }

        if (results.qrCodes && results.qrCodes.length > 0) {
            const qrCodesSection = document.createElement('div');
            qrCodesSection.className = 'result-section qr-codes';
            qrCodesSection.innerHTML = `
                <h2>Detected QR Codes</h2>
                <ul>${results.qrCodes.map((qr, index) => `
                    <li>
                        <div>QR Code ${index + 1}</div>
                        <img src="${qr.src}" alt="QR Code ${index + 1}" style="max-width: 100px; max-height: 100px;">
                    </li>
                `).join('')}</ul>
            `;
            resultContainer.appendChild(qrCodesSection);
        }

        console.log("Analysis results:", results);
    }

    function truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substr(0, maxLength - 3) + '...';
    }

    function showLoadingIndicator() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <div class="progress-bar">
                    <div class="progress"></div>
                </div>
                <div class="loading-text">Analyzing email...</div>
            `;
            loadingIndicator.classList.remove('hidden');
            startProgressBar();
        }
    }

    function hideLoadingIndicator() {
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
            stopProgressBar();
        }
    }

    let progressInterval;
    function startProgressBar() {
        const progressBar = loadingIndicator.querySelector('.progress');
        let width = 0;
        progressInterval = setInterval(() => {
            if (width >= 100) {
                clearInterval(progressInterval);
            } else {
                width++;
                progressBar.style.width = width + '%';
            }
        }, 50);
    }

    function stopProgressBar() {
        clearInterval(progressInterval);
        const progressBar = loadingIndicator.querySelector('.progress');
        progressBar.style.width = '0%';
    }

    function highlightSuspiciousLinks(suspiciousLinks) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "highlightSuspiciousLinks",
                suspiciousLinks: suspiciousLinks
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error highlighting links:", chrome.runtime.lastError);
                } else if (response && response.success) {
                    console.log("Links highlighted successfully");
                }
            });
        });
    }
});
