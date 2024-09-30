# Email-Sandbox-Scanner-Extension
## **Project Overview**

The **Email Link Scanner** is a Chrome extension designed to improve email security by identifying and highlighting potentially malicious links within email content. This tool serves as a practical resource for users who regularly interact with emails. As someone frequently involved in sending phishing simulations, the motivation behind this project comes from a desire to help users avoid falling prey to malicious links by providing clear and actionable insights directly within their emails. 

---

## **Core Features**

1. **URL Extraction and Visibility**:
    - The extension extracts all URLs from an email, ensuring that users can see the full URL rather than a masked hyperlink. This is crucial as phishing attacks often involve disguising malicious URLs within innocent-looking links.
2. **Risk Score Calculation**:
    - Each extracted link is scanned using VirusTotal, a trusted online service that aggregates results from various antivirus vendors. The risk score is calculated based on the percentage of vendors that have flagged the link as malicious, providing a clear and easy-to-understand metric for the user.
3. **AI-Powered Email Analysis**:
    - The extension leverages GPT (Generative Pre-trained Transformer) to analyze the email content and generate recommendations. This analysis helps to provide users with context about potentially suspicious behavior within the email, including patterns that might indicate a security threat.
4. **Highlighting Suspicious Links**:
    - Links deemed suspicious based on their risk score are highlighted directly within the email content. This visual cue makes it harder for users to accidentally interact with dangerous links, as they are marked in yellow/red depending on the level of risk.
5. **Contextual Recommendations**:
    - The extension also offers specific recommendations based on the content of the email and the identified links. For instance, if an email mentions common brands like PayPal or Amazon, the extension advises the user to visit these sites directly instead of clicking on links within the email.
6. **Local Storage and Conversation History**:
    - The extension stores email conversations locally to detect patterns across multiple emails. This feature aims to identify tactics commonly employed by threat actors over a series of emails, enhancing the extension's ability to spot evolving threats.

---

## **Development Challenges and Future Work**

- **AI Accuracy**: While the GPT analysis provides valuable insights, its accuracy and relevance can vary. There is ongoing work to refine the prompts and improve the contextual understanding of email content.
- **User Interface Enhancements**: Further work is needed to improve the interface, particularly in presenting the recommendations in a concise and user-friendly manner.
- **Caching and Memory Optimization**: Future versions will include enhanced caching mechanisms and local email memory, allowing the extension to recognize and respond to recurring threats more effectively.
- **Debugging and Error Handling**: Improvements are planned for better debugging tools and error handling, ensuring that users have a seamless experience even in the face of unexpected issues.
