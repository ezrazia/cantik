import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

async function main() {
  const petugas = await prisma.petugas.findMany();
  for (const p of petugas) {
    if (p.name) {
      const newName = toTitleCase(p.name);
      if (newName !== p.name) {
        await prisma.petugas.update({
          where: { id: p.id },
          data: { name: newName }
        });
        console.log(`Updated: ${p.name} -> ${newName}`);
      }
    }
  }
  console.log('All names updated successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
