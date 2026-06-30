import prisma from './database.js';

// Helper to normalize string
const normalizeString = (str) => String(str || '').trim().toLowerCase();

// Helper to normalize SLS format
const normalizeSls = (sls) => {
  if (!sls) return '';
  const str = normalizeString(sls);
  const match = str.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10).toString();
  }
  return str;
};

// Helper to parse assignment string
const parseAssignment = (asn) => {
  let subSls = '', sls = '', desa = '';
  const asnStr = String(asn).trim().toLowerCase();
  
  if (asnStr.includes(' [')) {
    const parts = asnStr.split(' [');
    const prefix = parts[0];
    const suffix = parts[1].replace(']', '');
    
    if (suffix.includes(' - ')) {
      const suffixParts = suffix.split(' - ');
      subSls = prefix;
      sls = suffixParts[0];
      desa = suffixParts[1];
    } else {
      sls = prefix;
      desa = suffix;
    }
  } else {
    desa = asnStr;
  }
  return { desa, sls, subSls };
};

/**
 * Synchronizes the PetugasKegiatan table based on current Dokumen assignments.
 * Useful when assignments are made in AdminDataReview.jsx (per SLS).
 */
export async function syncPetugasKegiatanFromDokumen(kegiatanId) {
  try {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: kegiatanId }
    });
    if (!kegiatan) return;

    let lokus = null;
    if (kegiatan.lokus) {
      lokus = typeof kegiatan.lokus === 'string' ? JSON.parse(kegiatan.lokus) : kegiatan.lokus;
    }

    // 1. Get all documents for this kegiatan
    const docs = await prisma.dokumen.findMany({
      where: { kegiatan_id: kegiatanId },
      select: {
        id: true,
        petugas_id: true,
        desa: true,
        sls: true,
        sub_sls: true,
        assigned_pcls: true,
        assigned_pmls: true
      }
    });

    // 2. Fetch all petugas
    const allPetugas = await prisma.petugas.findMany({
      include: {
        petugas_kegiatan: {
          where: { kegiatan_id: kegiatanId }
        }
      }
    });

    // Auto-fix petugas_id on Dokumen if it doesn't match the first PCL in assigned_pcls
    for (const doc of docs) {
      const pcls = Array.isArray(doc.assigned_pcls) ? doc.assigned_pcls : [];
      if (pcls.length > 0) {
        const firstPcl = pcls[0];
        const petugasRecord = allPetugas.find(p => p.username === firstPcl || p.name === firstPcl);
        if (petugasRecord) {
          if (doc.petugas_id !== petugasRecord.id) {
            await prisma.dokumen.update({
              where: { id: doc.id },
              data: { petugas_id: petugasRecord.id }
            });
            doc.petugas_id = petugasRecord.id;
          }
        }
      } else {
        if (doc.petugas_id !== null) {
          await prisma.dokumen.update({
            where: { id: doc.id },
            data: { petugas_id: null }
          });
          doc.petugas_id = null;
        }
      }
    }

    const pclsSlsAssignments = {};
    const pmlsSlsAssignments = {};
    const pclPengawasMap = {};

    function getAssignmentStringForDoc(doc, lokus) {
      if (!doc.desa) return null;

      const desaNorm = doc.desa.trim().toLowerCase();
      const slsNorm = normalizeSls(doc.sls);
      const subSlsNorm = normalizeSls(doc.sub_sls);

      if (subSlsNorm && lokus && Array.isArray(lokus.subSls)) {
        const match = lokus.subSls.find(s => {
          const isLegacy = s.includes('||');
          const cleanSub = isLegacy ? s.split('||')[0] : s.split(' [')[0];
          const cleanSls = isLegacy ? s.split('||')[1] : s.split(' [')[1]?.split(' - ')[0];
          const cleanDesa = isLegacy ? s.split('||')[2] : s.split(' [')[1]?.replace(']', '')?.split(' - ').pop();
          return normalizeSls(cleanSub) === subSlsNorm && 
                 (!cleanSls || normalizeSls(cleanSls) === slsNorm) &&
                 (!cleanDesa || cleanDesa.trim().toLowerCase() === desaNorm);
        });
        if (match) return match;
      }

      if (slsNorm && lokus && Array.isArray(lokus.sls)) {
        const match = lokus.sls.find(s => {
          const isLegacy = s.includes('||');
          const cleanSls = isLegacy ? s.split('||')[0] : s.split(' [')[0];
          const cleanDesa = isLegacy ? s.split('||')[1] : s.split(' [')[1]?.replace(']', '');
          return normalizeSls(cleanSls) === slsNorm && 
                 (!cleanDesa || cleanDesa.trim().toLowerCase() === desaNorm);
        });
        if (match) return match;
      }

      if (subSlsNorm && slsNorm) {
        return `${doc.sub_sls} [${doc.sls} - ${doc.desa}]`;
      }
      if (slsNorm) {
        return `${doc.sls} [${doc.desa}]`;
      }
      return doc.desa;
    }

    docs.forEach(doc => {
      const slsStr = getAssignmentStringForDoc(doc, lokus);
      if (!slsStr) return;

      const pcls = Array.isArray(doc.assigned_pcls) ? doc.assigned_pcls : [];
      const pmls = Array.isArray(doc.assigned_pmls) ? doc.assigned_pmls : [];

      pcls.forEach(pcl => {
        if (!pclsSlsAssignments[pcl]) pclsSlsAssignments[pcl] = new Set();
        pclsSlsAssignments[pcl].add(slsStr);
      });
      pmls.forEach(pml => {
        if (!pmlsSlsAssignments[pml]) pmlsSlsAssignments[pml] = new Set();
        pmlsSlsAssignments[pml].add(slsStr);
      });

      pcls.forEach(pcl => {
        if (!pclPengawasMap[pcl]) pclPengawasMap[pcl] = new Set();
        pmls.forEach(pml => pclPengawasMap[pcl].add(pml));
      });
    });

    for (const p of allPetugas) {
      const pk = p.petugas_kegiatan[0];
      if (!pk) continue;

      let nextSls = [];
      if (pk.role === 'PCL') {
        nextSls = pclsSlsAssignments[p.username] ? Array.from(pclsSlsAssignments[p.username]) : [];
      } else if (pk.role === 'PML') {
        nextSls = pmlsSlsAssignments[p.username] ? Array.from(pmlsSlsAssignments[p.username]) : [];
      }

      let nextPengawas = pk.pengawas;
      if (pk.role === 'PCL') {
        const pmlsForPcl = pclPengawasMap[p.username] ? Array.from(pclPengawasMap[p.username]) : [];
        if (pmlsForPcl.length > 0) {
          const pmlObj = allPetugas.find(x => x.username === pmlsForPcl[0]);
          nextPengawas = pmlObj ? pmlObj.name : pmlsForPcl[0];
        } else {
          nextPengawas = null;
        }
      }

      await prisma.petugasKegiatan.update({
        where: { id: pk.id },
        data: {
          sls_assignments: nextSls,
          pengawas: nextPengawas
        }
      });
    }
  } catch (error) {
    console.error('Error syncing PetugasKegiatan from Dokumen:', error);
  }
}

/**
 * Synchronizes the Dokumen table based on current PetugasKegiatan assignments.
 * Useful when assignments are made in AdminPetugasKegiatan.jsx.
 */
export async function syncDokumenFromPetugasKegiatan(kegiatanId) {
  try {
    // 1. Get all petugasKegiatan for this activity
    const petugasKegiatan = await prisma.petugasKegiatan.findMany({
      where: { kegiatan_id: kegiatanId },
      include: { petugas: true }
    });

    if (petugasKegiatan.length === 0) return 0;

    // 2. Map assignments by PCL and PML
    const petugasAssignments = [];
    for (const pk of petugasKegiatan) {
      let pmlUsernames = [];
      if (pk.pengawas) {
        // find PML by name or username
        const pmlPk = petugasKegiatan.find(x => x.petugas.name === pk.pengawas || x.petugas.username === pk.pengawas);
        if (pmlPk) {
          pmlUsernames.push(pmlPk.petugas.username);
        } else {
          pmlUsernames.push(pk.pengawas);
        }
      }

      petugasAssignments.push({
        pName: pk.petugas.name,
        pUsername: pk.petugas.username,
        role: pk.role,
        assignments: pk.sls_assignments || [],
        pmls: pmlUsernames
      });
    }

    // 3. Get all documents for this activity
    const docs = await prisma.dokumen.findMany({
      where: { kegiatan_id: kegiatanId, is_prelist: true },
      select: { id: true, sls: true, sub_sls: true, desa: true }
    });

    let updatedCount = 0;

    // 4. Update each document
    const tx = prisma;
    for (const doc of docs) {
      const docDesaNorm = normalizeString(doc.desa);
      const docSlsNorm = normalizeSls(doc.sls);

      const assignedPcls = [];
      const assignedPmls = new Set();

      for (const pa of petugasAssignments) {
        let isMatch = false;
        for (const asn of pa.assignments) {
          const parsed = parseAssignment(asn);
          
          if (parsed.subSls) {
            if (normalizeSls(parsed.subSls) === normalizeSls(doc.sub_sls) &&
                normalizeSls(parsed.sls) === docSlsNorm &&
                parsed.desa === docDesaNorm) {
              isMatch = true;
              break;
            }
          } else if (parsed.sls) {
            if (normalizeSls(parsed.sls) === docSlsNorm &&
                parsed.desa === docDesaNorm) {
              isMatch = true;
              break;
            }
          } else if (parsed.desa) {
            if (parsed.desa === docDesaNorm) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          assignedPcls.push(pa.pUsername);
          pa.pmls.forEach(pml => assignedPmls.add(pml));
        }
      }

      let primaryPetugasId = null;
      if (assignedPcls.length > 0) {
        const p = await tx.petugas.findFirst({
          where: {
            OR: [
              { username: assignedPcls[0] },
              { name: assignedPcls[0] }
            ]
          }
        });
        if (p) primaryPetugasId = p.id;
      }

      await tx.dokumen.update({
        where: { id: doc.id },
        data: {
          assigned_pcls: assignedPcls,
          assigned_pmls: Array.from(assignedPmls),
          petugas_id: primaryPetugasId
        }
      });
      updatedCount++;
    }

    return updatedCount;
  } catch (error) {
    console.error('Error syncing Dokumen from PetugasKegiatan:', error);
    return 0;
  }
}
