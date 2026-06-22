import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
  });

  const blockIds = blocks.map(b => b.id);
  const questions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blockIds } },
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
  });

  console.log("BLOCKS MAP:");
  blocks.forEach(b => console.log(`  ID: ${b.id} -> Kode: ${b.kode} | Title: ${b.title}`));

  console.log("\nQUESTIONS OF INTEREST:");
  const targetLabels = [
    "Nomor urut anggota keluarga",
    "Nama anggota keluarga",
    "Jumlah Anggota Keluarga",
    "Apakah $R402 memiliki keterbatasan"
  ];

  questions.forEach(q => {
    if (targetLabels.some(l => q.label.includes(l))) {
      console.log(`  ID: ${q.id} | Label: ${q.label.substring(0, 50)} | blok_id: ${q.blok_id} (Type: ${typeof q.blok_id})`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
