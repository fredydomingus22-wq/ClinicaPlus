const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src', '__tests__', 'integration');
const files = ['clinicas.test.ts', 'dashboard.test.ts', 'equipa.test.ts', 'especialidades.test.ts', 'exames.test.ts', 'documentos.test.ts', 'prontuarios.test.ts', 'medicos.test.ts'];
for (const file of files) {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace("import request from '../helpers/request';", "import { createTestApp } from '../helpers/request';\nconst request = createTestApp();");
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log("Done");
