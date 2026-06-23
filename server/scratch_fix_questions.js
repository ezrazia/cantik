import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing Tanda Tangan question type...');
  
  const result = await prisma.formQuestion.updateMany({
    where: {
      label: {
        contains: 'Tanda Tangan',
        mode: 'insensitive'
      }
    },
    data: {
      type: 'signature'
    }
  });
  
  console.log(`Successfully updated ${result.count} questions.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
