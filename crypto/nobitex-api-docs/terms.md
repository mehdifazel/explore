# Nobitex API Terms and Conditions of Use

**Source:** https://apidocs.nobitex.ir/terms/

## General Usage Considerations

- Using the Nobitex API for intrusion, DDoS attacks, or other malicious activities violates the terms of use. Accounts involved in such activities may be suspended.
- If you receive a response indicating improper API usage (e.g., 429 errors or other errors due to high request rates or invalid input), you must respond appropriately to the error and avoid repeating the mistake. If improper usage is detected and no appropriate response is made to error messages, the requester's IP may be temporarily or permanently blocked from Nobitex services.
- Nobitex does not guarantee an SLA for its API to the general public. API users must take the necessary measures to detect and respond to potential service disruptions. Nobitex shall not be liable for any conditions or changes to the API that may cause issues with code written by users.
- Changes to the public Nobitex API may occur over time. These changes will be announced on the "Nobitex API Changelog" page. Users must regularly monitor this page weekly and apply the necessary changes to their applications.
- Only the parts of the Nobitex API mentioned in the documentation are considered public and usable. If an endpoint or field is not mentioned in the documentation, it may change without prior notice.

## Programming Considerations

- Nobitex API output is typically provided in JSON format. Note that in addition to the fields mentioned in the documentation for the output, other fields may exist in the response. It is recommended to develop your application so that it does not fail when additional unexpected fields are present.

## Cloudflare-Related Considerations

- All connections from regular users (website, app, and API) to Nobitex servers located in Iran are established through Cloudflare, and a more direct communication channel is not available. Users can minimize their latency to Cloudflare edge servers if they need to reduce communication delay.
- The Nobitex API can be used from both domestic and international IP addresses. There are no restrictions on using Iranian IPs for requests.
- Nobitex uses Cloudflare as a CDN and API intermediary. If Cloudflare detects your traffic as suspicious or malicious for any reason, it may reject some or all of your requests. Managing these conditions is necessary due to Cloudflare's importance in preventing DDoS attacks and is outside Nobitex's control. API users must comply with general Fair Use principles.
