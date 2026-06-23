import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.dokumen.findMany({ select: { desa: true, sls: true, sub_sls: true }, take: 10 }).then(console.log).finally(() => p.$disconnect());
