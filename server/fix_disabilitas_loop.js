import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find kegiatan with 'Cantik' in name
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

  // Get all questions from these blocks
  const allQuestions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blockIds } },
    orderBy: { sort_order: 'asc' }
  });

  // Find the question that asks for ART count (loop_by_question_id for sosial_ekonomi)
  // Looking at the output, question 430 is referenced as loop_by_question_id for sosial_ekonomi
  const artCountQuestion = allQuestions.find(q =>
    q.validation && q.validation.includes('430')
  );

  console.log('ART count question:', artCountQuestion ? {
    id: artCountQuestion.id,
    label: artCountQuestion.label,
    validation: artCountQuestion.validation
  } : 'Not found');

  // Find pertanyaan disabilitas
  const disabilitasQuestions = allQuestions.filter(q =>
    q.label && q.label.includes('Disabilitas')
  );

  console.log('\nDisabilitas questions:', disabilitasQuestions.map(q => ({
    id: q.id,
    label: q.label
  })));

  // Update disabilitas questions to have loop configuration
  // They should be part of sosial_ekonomi group with loop_by_question_id: 430
  const loopConfig = JSON.stringify({
    is_loop: true,
    loop_by_question_id: 430,
    loop_group: "sosial_ekonomi"
  });

  console.log('\nUpdating disabilitas questions with loop config...');

  for (const q of disabilitasQuestions) {
    await prisma.formQuestion.update({
      where: { id: q.id },
      data: {
        validation: loopConfig
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