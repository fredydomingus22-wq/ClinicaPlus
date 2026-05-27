"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const currency_1 = require("./currency");
const string_1 = require("./string");
try {
    console.assert((0, currency_1.formatKwanza)(5000) === "5.000 Kz", `formatKwanza(5000) falhou: ${(0, currency_1.formatKwanza)(5000)}`);
    console.assert((0, string_1.getInitials)("Carlos Silva") === "CS", `getInitials("Carlos Silva") falhou: ${(0, string_1.getInitials)("Carlos Silva")}`);
    console.assert((0, string_1.slugify)("Clínica Multipla") === "clinica-multipla", `slugify("Clínica Multipla") falhou: ${(0, string_1.slugify)("Clínica Multipla")}`);
    console.log("✅ Testes inline de utils passaram!");
}
catch (error) {
    console.error("❌ Testes inline de utils falharam:", error);
    process.exit(1);
}
//# sourceMappingURL=test-utils.js.map