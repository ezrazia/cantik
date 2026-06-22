import prisma from './config/database.js';

async function main() {
  const q = await prisma.formQuestion.findFirst({
    where: {
      label: {
        contains: 'Jumlah Anggota Keluarga'
      }
    }
  });

  if (!q) {
    console.log('R500 not found');
    return;
  }

  console.log({
    id: q.id,
    label: q.label,
    type: q.type,
    validation: q.validation
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
