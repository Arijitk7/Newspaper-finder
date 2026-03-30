const axios = require('axios');
const cheerio = require('cheerio');

async function searchAndFetch(query) {
    console.log(`Searching for: ${query}`);
    try {
        const searchUrl = `https://www.fresherwave.com/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        
        let targetUrl = null;
        $('h2.entry-title a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !targetUrl) targetUrl = href;
        });
        
        console.log(`Found post URL: ${targetUrl}`);
        if (!targetUrl) return;

        const { data: postData } = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $$ = cheerio.load(postData);
        let driveLink = null;
        
        $$('td').each((i, el) => {
            const text = $$(el).text();
            const match = text.match(/https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/(?:view|edit|preview)[a-zA-Z0-9_=?&-]*/i);
            if (match) driveLink = match[0];
        });
        
        if (!driveLink) {
             $$('a').each((i, el) => {
                const href = $$(el).attr('href');
                if (href && href.includes('drive.google.com')) driveLink = href;
            });
        }
        
        console.log(`Found Drive Link: ${driveLink}`);
        
    } catch(e) {
        console.error("Error:", e.message);
    }
}

searchAndFetch('the hindu epaper pdf');
searchAndFetch('economic times epaper pdf');
