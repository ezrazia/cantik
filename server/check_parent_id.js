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

  // Find R.506 pertanyaan (keterbatasan)
  const r506Questions = allQuestions.filter(q =>
    q.label && q.label.includes('keterbatasan')
  );

  console.log('=== R.506 Questions (keterbatasan) ===');
  r506Questions.forEach(q => {
    console.log('ID:', q.id, '| parent_id:', q.parent_id, '| Label:', q.label.substring(0, 60));
    console.log('---');
  });

  // Check disabilitas questions
  const disabilitasQuestions = allQuestions.filter(q =>
    q.label && q.label.includes('Disabilitas')
  );

  console.log('\n=== Disabilitas Questions ===');
  disabilitasQuestions.forEach(q => {
    console.log('ID:', q.id, '| parent_id:', q.parent_id, '| Label:', q.label);
    console.log('---');
  });

  // Check R.506a questions (which should be children of R.506)
  const r506aQuestions = allQuestions.filter(q =>
    q.label && q.label.match(/R\.506/i)
  );

  console.log('\n=== All R.506 related questions ===');
  r506aQuestions.forEach(q => {
    console.log('ID:', q.id, '| parent_id:', q.parent_id, '| Label:', q.label.substring(0, 60));
    console.log('---');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());