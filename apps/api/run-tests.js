const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx dotenv -e .env -- npx vitest run --coverage', { encoding: 'utf-8', stdio: 'pipe' });
  fs.writeFileSync('test_output.txt', output);
  console.log('Tests passed, output written.');
} catch (error) {
  fs.writeFileSync('test_output.txt', (error.stdout || '') + '\n' + (error.stderr || ''));
  console.log('Tests failed, output written.');
}
