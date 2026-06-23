import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const doc = await prisma.dokumen.findFirst({
      select: {
        id: true,
        kode: true,
        assigned_pcls: true,
        assigned_pmls: true
      }
    });
    console.log('✅ Successfully queried assigned_pcls and assigned_pmls from database:', doc);
  } catch (error) {
    console.error('❌ Failed to query database columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
