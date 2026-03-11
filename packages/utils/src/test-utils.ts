import { formatKwanza } from './currency';
import { getInitials, slugify } from './string';

try {
  console.assert(formatKwanza(5000) === "5.000 Kz", `formatKwanza(5000) falhou: ${formatKwanza(5000)}`);
  console.assert(getInitials("Carlos Silva") === "CS", `getInitials("Carlos Silva") falhou: ${getInitials("Carlos Silva")}`);
  console.assert(slugify("Clínica Multipla") === "clinica-multipla", `slugify("Clínica Multipla") falhou: ${slugify("Clínica Multipla")}`);
  
  console.log("✅ Testes inline de utils passaram!");
} catch (error) {
  console.error("❌ Testes inline de utils falharam:", error);
  process.exit(1);
}
