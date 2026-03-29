console.log("Checking API Environment Variables");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not Set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not Set");
console.log("PORT:", process.env.PORT || "Not Set");

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDB() {
  try {
    await prisma.$connect();
    console.log("Database connection successful");
    const count = await prisma.clinica.count();
    console.log("Clinicas count:", count);
  } catch (e) {
    console.error("Database connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();
