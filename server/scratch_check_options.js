import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.formQuestion.findMany({
    where: { type: { in: ['select', 'radio', 'search'] } },
    orderBy: { updated_at: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(questions.map(q => ({
    id: q.id,
    label: q.label,
    optionsLength: (q.options || []).length
  })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
