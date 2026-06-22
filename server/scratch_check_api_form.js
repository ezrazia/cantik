import prisma from './config/database.js';

async function main() {
  const kegiatanId = 10;
  // Ambil semua blok
  const blocks = await prisma.formBlok.findMany({
    where: {
      kegiatan_id: kegiatanId,
    },
    orderBy: [
      { sort_order: 'asc' },
      { id: 'asc' },
    ],
  });

  const blockIds = blocks.map(b => b.id);

  // Ambil semua pertanyaan di blok-blok tersebut
  const questions = await prisma.formQuestion.findMany({
    where: {
      blok_id: { in: blockIds },
    },
    orderBy: [
      { sort_order: 'asc' },
      { id: 'asc' },
    ],
  });

  console.log(`Total blocks: ${blocks.length}`);
  console.log(`Total questions: ${questions.length}`);

  // Group questions by blok_id
  const grouped = {};
  questions.forEach(q => {
    if (!grouped[q.blok_id]) grouped[q.blok_id] = [];
    grouped[q.blok_id].push(q);
  });

  for (const block of blocks) {
    console.log(`\nBlock: ${block.kode} (ID: ${block.id}) - Title: ${block.title}`);
    const qs = grouped[block.id] || [];
    console.log(`  Questions count: ${qs.length}`);
    qs.slice(0, 5).forEach(q => {
      console.log(`    Question ID: ${q.id} | Label: ${q.label}`);
    });
    if (qs.length > 5) console.log(`    ... and ${qs.length - 5} more`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
