const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
report.forEach(file => {
  if (file.errorCount > 0) {
    console.log(`FILE: ${file.filePath}`);
    file.messages.forEach(msg => {
      if (msg.severity === 2) {
        console.log(`  L${msg.line}:${msg.column} - ${msg.ruleId}: ${msg.message}`);
      }
    });
  }
});
