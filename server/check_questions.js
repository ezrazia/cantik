import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find kegiatan with 'Cantik' in name
  const kegiatan = await prisma.kegiatan.findFirst({
    where: { name: { contains: 'Cantik' } }
  });

  console.log('Kegiatan:', kegiatan ? kegiatan.name : 'Not found');

  if (!kegiatan) return;

  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: kegiatan.id }
  });

  console.log('Blocks found:', blocks.length);

  const blockIds = blocks.map(b => b.id);

  // Get all questions from these blocks
  const allQuestions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blockIds } },
    orderBy: { sort_order: 'asc' }
  });

  console.log('Total questions:', allQuestions.length);

  // Filter questions with validation containing 'loop'
  const loopQuestions = allQuestions.filter(q =>
    q.validation && q.validation.includes('loop')
  );

  console.log('\n=== Questions with loop in validation ===');
  loopQuestions.forEach(q => {
    console.log('ID:', q.id, '| Label:', q.label.substring(0, 60));
    console.log('Validation:', q.validation);
    console.log('---');
  });

  console.log('\nTotal loop questions:', loopQuestions.length);

  // Also check for R.506 questions
  const r506Questions = allQuestions.filter(q =>
    q.label && q.label.includes('Disabilitas')
  );

  console.log('\n=== Disabilitas Questions ===');
  r506Questions.forEach(q => {
    console.log('ID:', q.id, '| Label:', q.label);
    console.log('Validation:', q.validation ? q.validation.substring(0, 100) : 'null');
    console.log('---');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
