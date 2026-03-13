const fs = require('fs');

try {
  let raw = fs.readFileSync('test-results.json');
  // Handle BOM
  let str = raw.toString('utf16le');
  if (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);
  if (!str.startsWith('{')) {
    // maybe it is utf8?
    str = raw.toString('utf8');
  }

  const data = JSON.parse(str);
  console.log("Parsed JSON successfully");

  const fails = [];
  if (data.testResults) {
    for (const tr of data.testResults) {
      if (tr.assertionResults) {
        for (const ar of tr.assertionResults) {
          if (ar.status === 'failed') {
            fails.push(tr.name.split(/[\\/]/).pop() + ': ' + ar.title + '\n' + (ar.failureMessages || []).join('\n'));
          }
        }
      }
    }
  }
  
  fs.writeFileSync('fails.txt', fails.join('\n\n'));
  console.log("Wrote fails.txt");
  
} catch (e) {
  console.error("Error parsing:", e.message);
}
