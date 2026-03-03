const fs = require('fs');
const path = require('path');

const inputFolder = process.argv[2];

if (!inputFolder) {
  console.error('Usage: bun vtt-to-html.js <path-to-input-folder>');
  process.exit(1);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseVtt(content) {
  const lines = content.split('\n');
  const cues = [];
  let currentCue = [];
  const timestampRe = /^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'WEBVTT' || timestampRe.test(trimmed)) {
      continue;
    }

    if (trimmed === '') {
      if (currentCue.length > 0) {
        cues.push(currentCue.join(' '));
        currentCue = [];
      }
    } else {
      currentCue.push(trimmed);
    }
  }

  if (currentCue.length > 0) {
    cues.push(currentCue.join(' '));
  }

  return cues;
}

function mergeCues(cues) {
  if (cues.length === 0) return cues;
  const endsWithPunctuation = /[.?!…"')\]]+$/;
  const startsWithCapital = /^[A-Z]/;
  const result = [cues[0]];
  for (let i = 1; i < cues.length; i++) {
    const prev = result[result.length - 1];
    const curr = cues[i];
    if (!startsWithCapital.test(curr) || !endsWithPunctuation.test(prev)) {
      result[result.length - 1] = prev + ' ' + curr;
    } else {
      result.push(curr);
    }
  }
  return result;
}

(async () => {
  try {
    const sourceUrl = fs.readFileSync(path.join(inputFolder, 'source.txt'), 'utf8').trim();

    const transcriptFiles = fs.readdirSync(inputFolder)
      .filter(f => f.endsWith('.txt') && f !== 'source.txt')
      .sort();

    const folderName = path.basename(inputFolder);
    const multiFile = transcriptFiles.length > 1;

    let bodyHtml = `  <p><a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>\n`;

    for (const file of transcriptFiles) {
      const content = fs.readFileSync(path.join(inputFolder, file), 'utf8');
      const cues = mergeCues(parseVtt(content));
      const heading = file.replace(/\.txt$/, '');

      if (multiFile) {
        bodyHtml += `  <h2>${escapeHtml(heading)}</h2>\n`;
      }

      for (const cue of cues) {
        bodyHtml += `  <p>${escapeHtml(cue)}</p>\n`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escapeHtml(folderName)}</title></head>
<body>
${bodyHtml}</body>
</html>
`;

    fs.mkdirSync('output-files', { recursive: true });
    const outputPath = path.join('output-files', `${folderName}.html`);
    fs.writeFileSync(outputPath, html, 'utf8');

    console.log(`Written: ${outputPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
