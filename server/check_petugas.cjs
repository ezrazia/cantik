const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.petugas.findMany().then(console.log).finally(() => prisma.$disconnect());
