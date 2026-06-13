import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, 'wilayah_data.json');

async function run() {
  try {
    console.log('Reading wilayah_data.json...');
    const rawData = readFileSync(jsonPath, 'utf8');
    const list = JSON.parse(rawData);
    console.log(`Loaded ${list.length} rows. Clearing existing wilayah table...`);

    // Delete existing records
    await prisma.wilayah.deleteMany();
    console.log('Existing table cleared. Importing new records...');

    // Bulk create new records
    const result = await prisma.wilayah.createMany({
      data: list
    });

    console.log(`Successfully imported ${result.count} wilayah records!`);
  } catch (error) {
    console.error('Failed to import wilayah:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
