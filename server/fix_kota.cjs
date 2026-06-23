const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
  const docs = await p.dokumen.findMany({ 
    where: { desa: 'Kota' }, 
    include: { 
      dokumen_jawaban: {
        include: { question: true }
      } 
    } 
  });
  let count = 0;
  for (const d of docs) {
    const desaAns = d.dokumen_jawaban.find(a => {
      const l = a.question?.label?.toLowerCase() || '';
      return (l.includes('desa') || l.includes('kelurahan')) && !l.includes('klasifikasi') && !l.includes('status');
    });
    
    let correctDesa = desaAns ? desaAns.value : 'Limbu Sedulun';
    
    await p.dokumen.update({
      where: { id: d.id },
      data: { desa: correctDesa }
    });
    count++;
  }
  console.log(`Updated ${count} documents`);
  await p.$disconnect();
}

fix();
