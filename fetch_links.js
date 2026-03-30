const url = 'https://www.fresherwave.com/today-ei-samay-epaper-in-pdf-p24/';

fetch(url)
  .then(res => res.text())
  .then(text => {
    // extract all a tags using regex
    const matches = [...text.matchAll(/<a[^>]+href="([^">]+)"[^>]*>(.*?)<\/a>/gi)];
    matches.forEach(m => {
        if (m[1].includes('drive.google.com') || m[1].includes('.pdf') || String(m[2]).toLowerCase().includes('download')) {
            console.log(m[1], ' --- ', m[2].replace(/<[^>]+>/g, '').trim());
        }
    });
  })
  .catch(console.error);
