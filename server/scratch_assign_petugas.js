import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find herman
  let herman = await prisma.petugas.findFirst({
    where: { username: 'limbu.herman' }
  });
  
  if (!herman) {
    console.log("Membuat user PML limbu.herman");
    herman = await prisma.petugas.create({
      data: {
        username: 'limbu.herman',
        name: 'Herman',
        password: 'password123'
      }
    });
  }

  const pmlUsername = herman.username;

  const rts = {
    '1': [
      'limbu.anita', 'limbu.naftaly', 'limbu.aren', 'limbu.bayu', 
      'limbu.muhammad', 'limbu.ferdiansyah', 'limbu.destiani'
    ],
    '2': [
      'limbu.johansyah', 'limbu.betrice', 'limbu.berry', 'limbu.margareta',
      'limbu.indah', 'limbu.naswa', 'limbu.dessi'
    ],
    '3': [
      'limbu.heri', 'limbu.yessy', 'limbu.cindy', 'limbu.teddy',
      'limbu.syahrika', 'limbu.putri', 'limbu.ardyansyah'
    ],
    '4': [
      'limbu.anggi', 'limbu.ayung', 'limbu.yason', 'limbu.juns',
      'limbu.eko', 'limbu.apriansyah', 'limbu.ekarudiyani', 'limbu.indah'
    ]
  };

  const nameMapping = {
    'limbu.anita': 'Anita', 'limbu.naftaly': 'Naftaly', 'limbu.aren': 'Aren', 'limbu.bayu': 'Bayu Iswandani',
    'limbu.muhammad': 'Muhammad Deffa Nugroho', 'limbu.ferdiansyah': 'Ferdiansyah Raditya', 'limbu.destiani': 'Destiani Lambe',
    'limbu.johansyah': 'Johansyah', 'limbu.betrice': 'Betrice Charin', 'limbu.berry': 'Berry Lawrendika', 'limbu.margareta': 'Margareta Danyati',
    'limbu.indah': 'Indah Ayu Andiani', 'limbu.naswa': 'Naswa Nalisa Nadila', 'limbu.dessi': 'Dessi Susanti',
    'limbu.heri': 'Heri Gunawan', 'limbu.yessy': 'Yessy Kristina', 'limbu.cindy': 'Cindy Tiara', 'limbu.teddy': 'Teddy Irwanto Danel',
    'limbu.syahrika': 'Syahrika Fadhillah', 'limbu.putri': 'Putri Ayu Isabella', 'limbu.ardyansyah': 'Ardyansyah',
    'limbu.anggi': 'Anggi Novalita', 'limbu.ayung': 'Ayung', 'limbu.yason': 'Yason RHW', 'limbu.juns': 'Juns Bastian',
    'limbu.eko': 'Eko Saputra', 'limbu.apriansyah': 'Apriansyah', 'limbu.ekarudiyani': 'Ekarudiyani',
  };

  rts['4'][7] = 'limbu.indah2';
  nameMapping['limbu.indah2'] = 'Indah Sekar Arum Tabahwati';

  const petugasMap = {}; 
  
  for (const [rt, names] of Object.entries(rts)) {
    for (const uname of names) {
      let user = await prisma.petugas.findFirst({ where: { username: uname } });
      if (!user) {
        console.log("Membuat user baru:", uname);
        user = await prisma.petugas.create({
          data: {
            username: uname,
            name: nameMapping[uname] || uname,
            password: 'password123'
          }
        });
      }
      petugasMap[uname] = user.id;
    }
  }

  const docs = await prisma.dokumen.findMany({
    where: {
      is_prelist: true,
      desa: { contains: 'Limbu Sedulun' }
    }
  });

  console.log(`Ditemukan ${docs.length} prelist di Limbu Sedulun`);

  const rtGroups = {};
  for (const doc of docs) {
    let rtNum = '';
    const slsStr = String(doc.sls || '').toLowerCase();
    const rtMatch = slsStr.match(/(\d+)/);
    if (rtMatch) {
      rtNum = parseInt(rtMatch[1], 10).toString();
    } else {
      rtNum = '1'; 
    }
    
    if (!rtGroups[rtNum]) rtGroups[rtNum] = [];
    rtGroups[rtNum].push(doc);
  }

  for (const [rt, groupDocs] of Object.entries(rtGroups)) {
    const unames = rts[rt] || rts['1'];
    console.log(`RT ${rt}: ${groupDocs.length} dokumen akan dibagi ke ${unames.length} petugas`);
    
    for (let i = 0; i < groupDocs.length; i++) {
      const doc = groupDocs[i];
      const uname = unames[i % unames.length];
      const pclId = petugasMap[uname];
      
      try {
        await prisma.dokumen.update({
          where: { id: doc.id },
          data: { 
            petugas: { connect: { id: pclId } }
          }
        });
        
        // Ensure PetugasKegiatan exists and assign PML
        const pk = await prisma.petugasKegiatan.findFirst({
          where: { petugas_id: pclId, kegiatan_id: doc.kegiatan_id }
        });
        if (pk) {
          await prisma.petugasKegiatan.update({
            where: { id: pk.id },
            data: { pengawas: herman.name }
          });
        } else {
          await prisma.petugasKegiatan.create({
            data: {
              petugas_id: pclId,
              kegiatan_id: doc.kegiatan_id,
              role: 'PCL',
              pengawas: herman.name
            }
          });
        }
      } catch (e) {
        console.error("Gagal update doc", doc.id, e.message);
      }
    }
  }

  console.log("Selesai membagi PCL dan PML.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
