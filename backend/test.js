const today = new Date();
const dd = String(today.getDate()).padStart(2, '0');
const mm = String(today.getMonth() + 1).padStart(2, '0');
const yyyy = today.getFullYear();
const date = `${dd}-${mm}-${yyyy}`;

console.log('Testing for date:', date);

fetch(`http://localhost:3000/api/paper?id=the-hindu&date=${date}`)
  .then(r => r.json())
  .then(d => {
    console.log('The Hindu:', JSON.stringify(d, null, 2));
    return fetch(`http://localhost:3000/api/paper?id=economic-times&date=${date}`);
  })
  .then(r => r.json())
  .then(d => {
    console.log('Economic Times:', JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('FAIL:', e.message));
