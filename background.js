console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background script:", message);
    if (message.action === "scanLink") {
        scanLink(message.link).then(sendResponse);
        return true; // Will respond asynchronously
    } else if (message.action === "analyzeEmail") {
        analyzeEmail(message.content, message.linkData).then(sendResponse);
        return true; // Will respond asynchronously
    }
});

async function storeConversation(sender, content) {
    console.log('Storing conversation for:', sender);
    return new Promise((resolve) => {
        chrome.storage.local.get([sender], (result) => {
            let conversations = result[sender] || [];
            conversations.push({ timestamp: Date.now(), content });
            chrome.storage.local.set({ [sender]: conversations }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error storing conversation:', chrome.runtime.lastError);
                } else {
                    console.log('Conversation stored successfully');
                }
                resolve();
            });
        });
    });
}

async function getConversationHistory(sender) {
    console.log('Getting conversation history for:', sender);
    return new Promise((resolve) => {
        chrome.storage.local.get([sender], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting conversation history:', chrome.runtime.lastError);
                resolve([]);
            } else {
                console.log('Conversation history retrieved:', result[sender]);
                resolve(result[sender] || []);
            }
        });
    });
}

async function scanLink(link) {
    console.log("Scanning link:", link);
    try {
        const proxyUrl = '<proxy url>';
        const response = await fetch(`${proxyUrl}?url=${encodeURIComponent(link)}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const analysisData = await response.json();
        console.log("Analysis data received:", analysisData);
        const malicious = analysisData.data.attributes.stats.malicious;
        const total = analysisData.data.attributes.stats.harmless +
                      analysisData.data.attributes.stats.malicious +
                      analysisData.data.attributes.stats.suspicious +
                      analysisData.data.attributes.stats.timeout +
                      analysisData.data.attributes.stats.undetected;

        let riskPercentage = 0;
        if (total > 0) {
            riskPercentage = ((malicious / total) * 100).toFixed(2);
        }

        console.log("Risk percentage calculated:", riskPercentage);
        return riskPercentage;

    } catch (error) {
        console.error('Error fetching from proxy server:', error);
        return 'Error';
    }
}

async function analyzeEmail(content, linkData = {}) {
    console.log("Analyzing email content and links:", content, linkData);
    let sender;
    try {
        sender = extractSender(content);
    } catch (error) {
        console.error("Error extracting sender:", error);
        sender = 'unknown';
    }
    await storeConversation(sender, content);
    const history = await getConversationHistory(sender);
    
    const suspiciousLinks = [];
    if (linkData.links && Array.isArray(linkData.links)) {
        const scanPromises = linkData.links.map(async (link) => {
            const cachedScore = await getCachedLinkScore(link.url);
            if (cachedScore !== null) {
                return { ...link, riskScore: cachedScore };
            }
            const riskScore = await scanLink(link.url);
            if (riskScore !== 'Error' && parseFloat(riskScore) > 0) {
                await cacheLinkScore(link.url, riskScore);
                return { ...link, riskScore };
            }
            return null;
        });

        const scannedLinks = await Promise.all(scanPromises);
        suspiciousLinks.push(...scannedLinks.filter(link => link !== null));
    } else {
        console.warn("No valid links data provided:", linkData);
    }
    
    const qrCodeAnalysis = await analyzeQRCodes(linkData.qrCodes || []);
    const recommendations = generateRecommendations(content, suspiciousLinks, qrCodeAnalysis);
    const gptAnalysis = await analyzeLLM(content, history, qrCodeAnalysis);

    return {
        links: linkData.links || [],
        suspiciousLinks,
        recommendations,
        gptAnalysis,
        qrCodes: qrCodeAnalysis
    };
}

async function analyzeQRCodes(qrCodes) {
    // Implement QR code analysis here
    // For now, we'll just return the QR codes as-is
    return qrCodes;
}

async function analyzeLLM(content, history, qrCodeAnalysis) {
    const conversationContext = history.map(h => `${new Date(h.timestamp).toLocaleString()}: ${h.content}`).join('\n\n');
    
    try {
        const response = await fetch('', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                content,
                conversationContext,
                prompt: `Analyze this email conversation history and the current email. Identify any patterns of building familiarity or other suspicious behaviors that might indicate a potential security threat. Current email:\n\n${content}\n\nConversation history:\n\n${conversationContext}`
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.analysis;
    } catch (error) {
        console.error('Error in LLM analysis:', error);
        return 'Error in AI analysis';
    }
}

async function scanQRCode(imageUrl) {
    console.log("Scanning QR code:", imageUrl);
    try {
        const proxyUrl = '<insert proxyurl';
        const response = await fetch(`${proxyUrl}?url=${encodeURIComponent(imageUrl)}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const scanData = await response.json();
        console.log("QR code scan data received:", scanData);
        return scanData;
    } catch (error) {
        console.error('Error scanning QR code:', error);
        return { error: 'Error scanning QR code' };
    }
}

function extractSender(content) {
    const senderMatch = content.match(/From:\s*([^\n]+)/);
    return senderMatch ? senderMatch[1].trim() : 'unknown';
}

function generateRecommendations(content, suspiciousLinks, qrCodeAnalysis) {
    const recommendations = [];
    if (suspiciousLinks.length > 0) {
        recommendations.push("Be cautious of clicking on links in this email, as some have been flagged as potentially suspicious.");
    }
    if (qrCodeAnalysis.length > 0) {
        recommendations.push("Be cautious of scanning QR codes in this email, as some have been detected.");
    }
    // Add more recommendation logic here if needed
    return recommendations;
}

async function getCachedLinkScore(url) {
    return new Promise((resolve) => {
        chrome.storage.local.get([url], (result) => {
            resolve(result[url] || null);
        });
    });
}

async function cacheLinkScore(url, score) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [url]: score }, resolve);
    });
}
