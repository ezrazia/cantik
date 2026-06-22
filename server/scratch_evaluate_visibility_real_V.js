import prisma from './config/database.js';

// Replicate functions exactly as in PetugasQuestionnaire.jsx
const getQuestionLoopGroup = (q, questions) => {
  if (!q) return "";
  const parentId = q.parent_id || q.parentId;
  if (parentId) {
    const parent = questions.find(p => p.id === parentId);
    if (parent) {
      return getQuestionLoopGroup(parent, questions);
    }
  }
  if (q.validation) {
    try {
      const parsed = JSON.parse(q.validation);
      if (parsed && parsed.loop_group) {
        return parsed.loop_group;
      }
    } catch (e) {}
  }
  return "";
};

const checkOptionTrigger = (val, triggerOptions) => {
  if (val === undefined || val === null || val === '') return false;
  const trimmed = typeof val === 'string' ? val.trim() : '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedVal = JSON.parse(trimmed);
      if (Array.isArray(parsedVal)) {
        return parsedVal.some(item => triggerOptions.includes(String(item)));
      }
      if (parsedVal && typeof parsedVal === 'object') {
        if ('value' in parsedVal) {
          return triggerOptions.includes(String(parsedVal.value));
        }
        return triggerOptions.some(opt => {
          const optVal = parsedVal[opt];
          return optVal !== undefined && optVal !== null && optVal !== '' && optVal !== 0 && optVal !== '0';
        });
      }
    } catch (e) {}
  }
  return triggerOptions.includes(String(val));
};

const evaluateCondition = (c, values) => {
  const val = values[c.question_id];
  if (c.operator && ['=', '>', '>=', '<', '<='].includes(c.operator)) {
    if (val === undefined || val === null || val === '') return false;
    let actualVal = val;
    if (typeof val === 'string' && val.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        if (parsed && 'value' in parsed) {
          actualVal = parsed.value;
        }
      } catch (e) {}
    }
    const numericVal = parseFloat(actualVal);
    const targetVal = parseFloat(c.value);
    if (isNaN(numericVal) || isNaN(targetVal)) return false;
    switch (c.operator) {
      case '=': return numericVal === targetVal;
      case '>': return numericVal > targetVal;
      case '>=': return numericVal >= targetVal;
      case '<': return numericVal < targetVal;
      case '<=': return numericVal <= targetVal;
      default: return false;
    }
  }
  const triggerOptions = String(c.value).split(",").map(x => x.trim()).filter(Boolean);
  return checkOptionTrigger(val, triggerOptions);
};

const getResolvedValuesForIndex = (values, idx) => {
  if (idx === null) return values;
  const resolved = {};
  for (const qId in values) {
    const raw = values[qId];
    if (raw && typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{'))) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
        } else if (typeof parsed === 'object' && parsed !== null) {
          resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
        } else {
          resolved[qId] = raw;
        }
      } catch (e) {
        resolved[qId] = raw;
      }
    } else {
      resolved[qId] = raw;
    }
  }
  return resolved;
};

async function main() {
  const activityId = 10;
  
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: { sort_order: 'asc' }
  });
  
  const questions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blocks.map(b => b.id) } },
    orderBy: { sort_order: 'asc' }
  });

  // Let's mock a state where we clicked "Tambah Isian" in Blok IV.
  // We added a second member.
  // 1859 is R.401 (Nomor urut) -> ["1", "2"]
  // 1947 is R.402 (Nama) -> ["Kepala", "Istri"]
  // 2198 is R.409/age -> ["25", "2"]
  // 1885 is R.500 (Jumlah Anggota Keluarga) -> "2"
  const ansValues = {
    "1859": JSON.stringify(["1", "2"]),
    "1947": JSON.stringify(["Kepala", "Istri"]),
    "2198": JSON.stringify(["25", "2"]),
    "1885": "2"
  };

  const isQuestionVisibleIgnoreBlock = (q, activeInstanceIdx = null) => {
    const resolvedValues = getResolvedValuesForIndex(ansValues, activeInstanceIdx);
    const showIfValue = q.show_if_value;
    if (showIfValue) {
      let matchesShowIf = true;
      let isJson = false;
      try {
        const parsed = JSON.parse(showIfValue);
        if (parsed && parsed.conditions) {
          isJson = true;
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, resolvedValues));
          matchesShowIf = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) {}

      if (isJson) {
        if (!matchesShowIf) return false;
      }
    }
    return true;
  };

  const blockV = blocks.find(b => b.kode.includes("Blok V"));
  const blockVQs = questions.filter(q => q.blok_id === blockV.id);

  console.log(`Checking questions visibility in Blok V (activeInstanceIdx = null):`);
  blockVQs.forEach(q => {
    const visible = isQuestionVisibleIgnoreBlock(q, null);
    console.log(`  Q ID: ${q.id} | Label: ${q.label.substring(0, 40)} | Visible Ignore Block: ${visible}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
