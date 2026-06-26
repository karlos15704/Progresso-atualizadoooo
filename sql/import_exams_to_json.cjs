/**
 * Robust SQL parser for exams_rows.sql
 * 
 * The file has: INSERT INTO "exams" (...) VALUES (row1), (row2), ... (row69);
 * All in one INSERT statement. The parser uses a state machine to handle
 * quotes, escaped quotes, and nested JSON correctly.
 */
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'exams_rows.sql');
const outputFile = path.join(__dirname, '..', 'public', 'offline_exams.json');

console.log('Reading SQL file...');
const sql = fs.readFileSync(sqlFile, 'utf-8');
console.log(`File size: ${(sql.length / 1024 / 1024).toFixed(2)} MB`);

/**
 * Parse a single SQL-quoted string starting right after the opening '.
 * Handles PostgreSQL '' escape for literal single quotes.
 * Returns { value: string, endIdx: number (points to char after closing ') }
 */
function parseSqlStr(s, start) {
  let out = '';
  let i = start;
  while (i < s.length) {
    if (s[i] === "'" && s[i+1] === "'") { // '' = escaped quote
      out += "'";
      i += 2;
    } else if (s[i] === "'") {            // closing quote
      return { value: out, endIdx: i + 1 };
    } else {
      out += s[i++];
    }
  }
  return { value: out, endIdx: i };
}

/**
 * Skip whitespace. Returns new index.
 */
function skipWS(s, i) {
  while (i < s.length && (s[i] === ' ' || s[i] === '\n' || s[i] === '\r' || s[i] === '\t')) i++;
  return i;
}

/**
 * Parse all fields in a VALUES row starting right after the opening '('.
 * Returns { fields: string[], endIdx } where endIdx points to char AFTER the closing ')'
 */
function parseRow(s, start, numFields) {
  const fields = [];
  let i = start;

  for (let f = 0; f < numFields; f++) {
    i = skipWS(s, i);
    if (s[i] === ',') { i = skipWS(s, i + 1); } // skip comma between fields

    if (s[i] === ')') { break; } // end of row

    if (s.substring(i, i+4).toLowerCase() === 'null') {
      fields.push(null);
      i += 4;
    } else if (s[i] === "'") {
      const { value, endIdx } = parseSqlStr(s, i + 1);
      fields.push(value);
      i = endIdx;
    } else {
      // numeric literal
      let lit = '';
      while (i < s.length && s[i] !== ',' && s[i] !== ')') lit += s[i++];
      fields.push(lit.trim());
    }
  }

  // Skip to closing ')'
  while (i < s.length && s[i] !== ')') i++;
  if (s[i] === ')') i++;

  return { fields, endIdx: i };
}

// --- MAIN ---
// Find the start of VALUES
const valuesStart = sql.indexOf('VALUES');
if (valuesStart === -1) { console.error('VALUES not found!'); process.exit(1); }

// Skip to first '('
let pos = sql.indexOf('(', valuesStart + 6);
if (pos === -1) { console.error('No opening ( after VALUES'); process.exit(1); }

const COLS = 16; // id, professor_id, title, subject, exam_type, exam_date, exam_time, class_year, bimester, content, questions, answer_key, study_guide, font_size, font_family, created_at
const exams = [];
let rowCount = 0;
let errCount = 0;

while (pos < sql.length) {
  if (sql[pos] !== '(') {
    // Skip to next '('
    const next = sql.indexOf('(', pos);
    if (next === -1) break;
    pos = next;
  }

  pos++; // skip '('
  const { fields, endIdx } = parseRow(sql, pos, COLS);
  pos = endIdx;
  rowCount++;

  if (fields.length < 16) {
    console.warn(`Row ${rowCount}: only ${fields.length} fields, skipping`);
    errCount++;
  } else {
    const [
      id, professor_id, title, subject, exam_type, exam_date, exam_time,
      class_year, bimester, content, questionsStr, answer_keyStr,
      study_guide, font_size, font_family, created_at
    ] = fields;

    let questions = [];
    if (questionsStr) {
      const tryParseJson = (str) => {
        // Step 1: direct parse
        try { return JSON.parse(str); } catch(e1) {}
        // Step 2: replace \" with " (PostgreSQL escape)
        try { return JSON.parse(str.replace(/\\"/g, '"')); } catch(e2) {}
        // Step 3: remove ALL invalid JSON escape sequences (keep \n \t \r \\ \" \/ \b \f and unicode \uXXXX)
        try {
          const fixed = str.replace(/\\"/g, '"').replace(/\\([^"\\/bfnrtu])/g, '$1');
          return JSON.parse(fixed);
        } catch(e3) {}
        // Step 4: strip all backslashes entirely
        try {
          const stripped = str.replace(/\\"/g, '"').replace(/\\/g, '');
          return JSON.parse(stripped);
        } catch(e4) {}
        return null;
      };
      const p = tryParseJson(questionsStr);
      if (Array.isArray(p)) questions = p;
      else if (p !== null) console.warn(`  Row ${rowCount} "${title}": questions not array`);
      else console.warn(`  Row ${rowCount} "${title}": questions parse FAILED`);
    }

    let answer_key = {};
    if (answer_keyStr) {
      const tryParseJson = (str) => {
        try { return JSON.parse(str); } catch(e1) {}
        try { return JSON.parse(str.replace(/\\"/g, '"')); } catch(e2) {}
        try { return JSON.parse(str.replace(/\\"/g, '"').replace(/\\([^"\\/bfnrtu])/g, '$1')); } catch(e3) {}
        try { return JSON.parse(str.replace(/\\"/g, '"').replace(/\\/g, '')); } catch(e4) {}
        return {};
      };
      answer_key = tryParseJson(answer_keyStr) || {};
    }

    const meta = answer_key?._metadata || {};

    exams.push({
      id, professor_id, title, subject, exam_type,
      exam_date: exam_date || null,
      exam_time: exam_time || null,
      class_year, bimester, content,
      questions,
      answer_key,
      study_guide: study_guide || '',
      font_size: parseInt(font_size) || 12,
      font_family: font_family || 'Inter',
      created_at,
      // App-mapped fields
      answerKey: answer_key,
      studyGuide: study_guide || '',
      professorId: professor_id,
      examType: exam_type || meta.examType || '',
      examDate: exam_date || meta.examDate || '',
      examTime: exam_time || meta.examTime || null,
      classYear: class_year || meta.classYear || '',
      fontSize: meta.fontSize || parseInt(font_size) || 12,
      fontFamily: meta.fontFamily || font_family || 'Inter',
      createdAt: created_at,
      isDiaryOnly: meta.isDiaryOnly === true,
      isAnnouncement:
        (meta.isAnnouncement === true || exam_type === 'Recado' || subject === 'Coordenação') &&
        !(Array.isArray(questions) && questions.length > 0),
      deletedAt: meta.deletedAt || null,
    });
  }

  // After row, skip whitespace then look for ',' (more rows) or end
  pos = skipWS(sql, pos);
  if (sql[pos] === ',') {
    pos = skipWS(sql, pos + 1);
    // Continue to next '('
  } else {
    break; // no more rows
  }
}

console.log(`Parsed ${rowCount} rows (${errCount} errors)`);
const withQs = exams.filter(e => Array.isArray(e.questions) && e.questions.length > 0).length;
console.log(`With questions: ${withQs} / Without: ${exams.length - withQs}`);

// Filter expired trash
const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
const now = Date.now();
const active = exams.filter(e => {
  if (!e.deletedAt) return true;
  return (now - new Date(e.deletedAt).getTime()) <= fifteenDaysMs;
});
console.log(`Active (not expired): ${active.length}`);

fs.writeFileSync(outputFile, JSON.stringify(active));
const sizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
console.log(`Written: ${outputFile} (${sizeMB} MB)`);
