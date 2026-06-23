import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.dokumen.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
    select: {
      id: true,
      kode: true,
      desa: true,
      krt: true,
      status: true,
      is_prelist: true,
      created_at: true
    }
  });
  console.log("Latest docs:", docs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
