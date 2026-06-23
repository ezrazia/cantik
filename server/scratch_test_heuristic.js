import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
    try {
        const rows = [
            { "No. KK": "123", "Nama": "Andi" },
            { "No. KK": "456", "Nama": "Budi" }
        ];
        
        const firstRowKeys = Object.keys(rows[0] || {});
        const noKkColHeuristic = firstRowKeys.find(c => ['no_kk', 'nokk', 'nomor_kk', 'no kk', 'nomor kk', 'kartu_keluarga'].includes(c.toLowerCase())) || firstRowKeys.find(c => c.toLowerCase().includes('kk') && !c.toLowerCase().includes('nik'));

        console.log("Heuristic:", noKkColHeuristic);
        
        const familyGroups = {};
        const mapping = {};
        rows.forEach((row, index) => {
            const noKkColName = mapping?.no_kk || noKkColHeuristic;
            let noKk = noKkColName ? String(row[noKkColName] || '').trim() : '';
            
            if (!noKk) {
                noKk = `AUTO-${index}-${Math.random().toString(36).substr(2, 6)}`;
            }

            if (!familyGroups[noKk]) {
                familyGroups[noKk] = [];
            }
            familyGroups[noKk].push(row);
        });
        
        console.log("Groups:", familyGroups);
    } catch(e) {
        console.error(e);
    }
}
check();
