console.log("Content script loaded for Email Link Scanner", new Date().toISOString());

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in content script:", request, new Date().toISOString());
    if (request.action === "extractContent") {
        console.log("Attempting to extract email content");
        const emailBody = document.querySelector('.a3s');
        console.log("Email body element:", emailBody);
        if (emailBody) {
            console.log("Email body found:", emailBody.innerHTML.substring(0, 100) + "...");
            const content = emailBody.innerText;
            const links = extractLinksWithContext(emailBody);
            const qrCodes = detectQRCodes(emailBody);
            console.log("Extracted content, links, and QR codes:", { content: content.substring(0, 100) + "...", links, qrCodes });
            sendResponse({ content, links, qrCodes });
        } else {
            console.log("Email body not found. DOM structure:", document.body.innerHTML.substring(0, 500) + "...");
            sendResponse({ content: "", links: [], qrCodes: [] });
        }
    } else if (request.action === "highlightSuspiciousLinks") {
        console.log("Received request to highlight suspicious links");
        highlightLinks(request.suspiciousLinks);
        sendResponse({success: true});
    }
    return true; // Indicates that the response will be sent asynchronously
});

function extractLinksWithContext(emailBody) {
    const links = [];
    const anchorTags = emailBody.querySelectorAll('a');
    
    anchorTags.forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (href) {
            let context = anchor.textContent.trim();
            if (!context) {
                if (anchor.querySelector('img')) {
                    context = 'Image';
                } else if (anchor.querySelector('button')) {
                    context = 'Button';
                } else {
                    context = 'Element';
                }
            }
            links.push({ url: href, context: context });
        }
    });
    
    const qrCodes = detectQRCodes(emailBody);
    
    return { links, qrCodes };
}

function highlightLinks(suspiciousLinks) {
    console.log('Highlighting suspicious links:', suspiciousLinks);
    const emailBody = document.querySelector('.a3s');
    if (emailBody) {
        const links = emailBody.getElementsByTagName('a');
        console.log('Found links:', links.length);
        for (let link of links) {
            // Check if the link's href matches any suspicious link URL
            const suspiciousLink = suspiciousLinks.find(sl => link.href.includes(sl.url));
            if (suspiciousLink) {
                console.log('Suspicious link found:', link.href);
                link.classList.add('suspicious-link');
                link.setAttribute('data-full-url', link.href);
            }
        }
    } else {
        console.error('Email body not found');
    }
}

function detectQRCodes(emailBody) {
    const images = emailBody.querySelectorAll('img');
    const qrCodes = [];
    images.forEach((img, index) => {
        if (img.src.startsWith('data:image')) {
            qrCodes.push({
                index: index,
                src: img.src
            });
        }
    });
    return qrCodes;
}
