import prisma from './config/database.js';

async function main() {
  const activities = await prisma.kegiatan.findMany();

  for (const act of activities) {
    console.log(`\nActivity: ${act.name} (ID: ${act.id})`);
    const blocks = await prisma.formBlok.findMany({
      where: { kegiatan_id: act.id }
    });
    const blockIds = blocks.map(b => b.id);
    const questions = await prisma.formQuestion.findMany({
      where: { blok_id: { in: blockIds } }
    });

    questions.forEach(q => {
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed.loop_group) {
            const block = blocks.find(b => b.id === q.blok_id);
            console.log(`  Block: ${block.kode} | Q: R.${q.id} (Label: ${q.label.substring(0, 30)}) | Loop Group: ${parsed.loop_group}`);
          }
        } catch (e) {}
      }
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
