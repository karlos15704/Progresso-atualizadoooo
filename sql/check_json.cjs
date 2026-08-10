const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./public/offline_exams.json','utf8'));
const noQs = data.filter(e => !(Array.isArray(e.questions) && e.questions.length > 0));
console.log('Without questions:', noQs.length);
noQs.forEach(e => console.log(' -', e.subject, '|', e.title));
