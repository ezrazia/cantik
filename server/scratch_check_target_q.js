import prisma from './config/database.js';

async function main() {
  const qs = await prisma.formQuestion.findMany({
    where: {
      form_blok: { kegiatan_id: 10 },
      label: { contains: "anggota keluarga" }
    },
    include: {
      form_blok: true
    }
  });

  console.log("Matching Questions:");
  qs.forEach(q => {
    console.log(`ID: ${q.id} | Blok ID: ${q.blok_id} | Blok Kode: ${q.form_blok.kode} | Label: ${q.label}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
