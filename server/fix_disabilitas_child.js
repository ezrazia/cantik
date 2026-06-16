import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const kegiatan = await prisma.kegiatan.findFirst({
    where: { name: { contains: 'Cantik' } }
  });

  if (!kegiatan) {
    console.log('No kegiatan found');
    return;
  }

  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: kegiatan.id }
  });

  const blockIds = blocks.map(b => b.id);

  // Get all questions
  const allQuestions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blockIds } },
    orderBy: { sort_order: 'asc' }
  });

  // Update disabilitas questions - REMOVE is_loop but keep loop_group
  // Child questions should NOT have is_loop because they render inside parent loop
  const disabilitasQuestions = allQuestions.filter(q =>
    q.label && q.label.includes('Disabilitas')
  );

  // Only keep loop_group for grouping purposes, not for creating own loop
  const loopGroupConfig = JSON.stringify({
    loop_group: "sosial_ekonomi"
  });

  console.log('Updating disabilitas questions to remove is_loop...');

  for (const q of disabilitasQuestions) {
    await prisma.formQuestion.update({
      where: { id: q.id },
      data: {
        validation: loopGroupConfig
      }
    });
    console.log(`Updated question ${q.id}: ${q.label}`);
  }

  console.log('\nDone!');

  // Verify the update
  const updatedQuestions = await prisma.formQuestion.findMany({
    where: {
      id: { in: disabilitasQuestions.map(q => q.id) }
    }
  });

  console.log('\n=== Updated Disabilitas Questions ===');
  updatedQuestions.forEach(q => {
    console.log('ID:', q.id, '| Label:', q.label);
    console.log('Validation:', q.validation);
    console.log('---');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());