import prisma from './config/database.js';

async function main() {
  const activities = await prisma.kegiatan.findMany({
    orderBy: { id: 'asc' }
  });

  for (const act of activities) {
    console.log(`\n==========================================`);
    console.log(`ACTIVITY ID: ${act.id} | NAME: ${act.name}`);
    console.log(`==========================================`);
    
    const blocks = await prisma.formBlok.findMany({
      where: { kegiatan_id: act.id },
      orderBy: { sort_order: 'asc' }
    });

    for (const b of blocks) {
      const qCount = await prisma.formQuestion.count({
        where: { blok_id: b.id }
      });
      console.log(`  Block ID: ${b.id} | Kode: ${b.kode} | Title: ${b.title} | Questions Count: ${qCount}`);
      
      if (b.kode.includes("Blok IV") || b.kode.includes("Blok V")) {
        const qs = await prisma.formQuestion.findMany({
          where: { blok_id: b.id },
          orderBy: { sort_order: 'asc' }
        });
        qs.forEach(q => {
          if (q.label && (q.label.includes("Nomor urut") || q.label.includes("Nama anggota") || q.label.includes("Keberadaan") || q.label.includes("Jumlah Anggota"))) {
            console.log(`    Question ID: ${q.id} | Code/Label: ${q.label.substring(0, 40)} | parent_id: ${q.parent_id} | validation: ${q.validation}`);
          }
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
