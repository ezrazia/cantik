const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.dokumen.deleteMany({
    where: {
      desa: "LIMBU SEDULUN",
      is_prelist: true
    }
  });
  console.log("Deleted count:", result.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
