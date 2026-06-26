const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'exams_rows.json');
const outputFile = path.join(__dirname, '..', 'public', 'offline_exams.json');

console.log('Reading exams_rows.json...');
const raw = fs.readFileSync(inputFile, 'utf-8');
const rows = JSON.parse(raw);
console.log(`Found ${rows.length} rows`);

// Robust JSON string parser with multiple fallback strategies
function tryParseJsonStr(str) {
  if (!str || str === '' || str === 'null') return null;
  if (typeof str !== 'string') return str; // already parsed

  const strategies = [
    // 1. Direct parse
    s => JSON.parse(s),
    // 2. Unescape \" → " (PostgreSQL JSON-in-SQL escape)
    s => JSON.parse(s.replace(/\\"/g, '"')),
    // 3. Remove invalid escape sequences, keep valid ones
    s => JSON.parse(s.replace(/\\"/g, '"').replace(/\\([^"\\/bfnrtu])/g, '$1')),
    // 4. Strip all backslashes
    s => JSON.parse(s.replace(/\\"/g, '"').replace(/\\/g, '')),
    // 5. Try removing control chars and retry
    s => JSON.parse(s.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\\"/g, '"').replace(/\\/g, '')),
  ];

  for (const fn of strategies) {
    try { return fn(str); } catch(e) {}
  }
  return null;
}

const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
const now = Date.now();

let withQs = 0, withoutQs = 0;

const exams = rows.map((row, i) => {
  // Parse questions
  let questions = row.questions;
  if (typeof questions === 'string') {
    const parsed = tryParseJsonStr(questions);
    questions = Array.isArray(parsed) ? parsed : [];
    if (questions.length === 0 && row.questions && row.questions !== '[]') {
      console.warn(`  Row ${i+1} "${row.title}": could not parse questions`);
    }
  }
  if (!Array.isArray(questions)) questions = [];

  // Parse answer_key
  let answer_key = row.answer_key;
  if (typeof answer_key === 'string') {
    const parsed = tryParseJsonStr(answer_key);
    answer_key = parsed && typeof parsed === 'object' ? parsed : {};
  }
  if (!answer_key || typeof answer_key !== 'object' || Array.isArray(answer_key)) answer_key = {};

  const meta = answer_key?._metadata || {};

  if (questions.length > 0) withQs++; else withoutQs++;

  return {
    // Raw DB fields
    id: row.id,
    professor_id: row.professor_id,
    title: row.title,
    subject: row.subject,
    exam_type: row.exam_type,
    exam_date: row.exam_date || null,
    exam_time: row.exam_time || null,
    class_year: row.class_year,
    bimester: row.bimester,
    content: row.content || '',
    questions,
    answer_key,
    study_guide: row.study_guide || '',
    font_size: row.font_size || 12,
    font_family: row.font_family || 'Inter',
    created_at: row.created_at,

    // App-mapped camelCase fields (what React components read)
    answerKey: answer_key,
    studyGuide: row.study_guide || '',
    professorId: row.professor_id,
    examType: row.exam_type || meta.examType || '',
    examDate: row.exam_date || meta.examDate || '',
    examTime: row.exam_time || meta.examTime || null,
    classYear: row.class_year || meta.classYear || '',
    fontSize: meta.fontSize || row.font_size || 12,
    fontFamily: meta.fontFamily || row.font_family || 'Inter',
    createdAt: row.created_at,
    isDiaryOnly: meta.isDiaryOnly === true,
    isAnnouncement:
      (meta.isAnnouncement === true ||
        row.exam_type === 'Recado' ||
        row.subject === 'Coordenação') &&
      !(questions.length > 0),
    deletedAt: meta.deletedAt || null,
  };
});

// Filter permanently expired trash (deleted > 15 days ago)
const active = exams.filter(e => {
  if (!e.deletedAt) return true;
  return (now - new Date(e.deletedAt).getTime()) <= fifteenDaysMs;
});

console.log(`Total: ${rows.length} | Active: ${active.length} | With questions: ${withQs} | Content-only: ${withoutQs}`);

// List content-only for info
const noQs = active.filter(e => e.questions.length === 0);
if (noQs.length > 0) {
  console.log('Content-only exams (no structured questions):');
  noQs.forEach(e => console.log(`  - [${e.subject}] ${e.title}`));
}

fs.writeFileSync(outputFile, JSON.stringify(active));
const sizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
console.log(`\nWritten: public/offline_exams.json (${sizeMB} MB) ✓`);
