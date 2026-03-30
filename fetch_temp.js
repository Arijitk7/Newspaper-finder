const fetch = require('node-fetch');
const https = require('https');

(async () => {
    try {
        const agent = new https.Agent({ rejectUnauthorized: false });
        const { default: fetch } = await import('node-fetch');
        // Actually native fetch works in node 18+. Let's use native fetch directly.
    } catch(e) {}
})();
