import prisma from './config/database.js';

// Helper functions from PetugasQuestionnaire.jsx
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

const getActiveBlockOrderedQuestions = (currentActiveBlock, questions, blocks) => {
  if (!currentActiveBlock) return [];
  const blockQs = questions.filter(q => String(q.blok_id) === String(currentActiveBlock.id) || String(q.blok_id) === String(currentActiveBlock.kode));
  const mainQs = blockQs.filter(x => !x.parent_id && !x.parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const ordered = [];
  const addChildrenRecursive = (parentId) => {
    const children = blockQs.filter(x => (x.parent_id === parentId || x.parentId === parentId))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    children.forEach(child => {
      ordered.push(child);
      addChildrenRecursive(child.id);
    });
  };
  mainQs.forEach(parent => {
    ordered.push(parent);
    addChildrenRecursive(parent.id);
  });
  return ordered;
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
    } catch (e) {}
  }
  return triggerOptions.includes(String(val));
};

const evaluateCondition = (c, values) => {
  const val = values[c.question_id];
  if (c.operator && ['=', '>', '>=', '<', '<='].includes(c.operator)) {
    if (val === undefined || val === null || val === '') return false;
    let actualVal = val;
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
  const activityId = 6; // Desa Cantik 2026
  
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: { sort_order: 'asc' }
  });
  
  const questions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blocks.map(b => b.id) } },
    orderBy: { sort_order: 'asc' }
  });

  const getSkipTargetBlock = (skipTargetId) => {
    const targetQ = questions.find(q => String(q.id) === String(skipTargetId));
    if (!targetQ) return null;
    return blocks.find(b => b.id === targetQ.blok_id || b.kode === targetQ.blok_id);
  };

  const getActiveSkips = (values) => {
    const activeSkips = [];
    questions.forEach(q => {
      if (!q.skip_target || !q.skip_logic) return;
      let matchesTrigger = false;
      const qVal = values[q.id];
      try {
        const parsed = JSON.parse(q.skip_logic);
        if (parsed && parsed.conditions && parsed.conditions.length > 0) {
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, values));
          matchesTrigger = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) {
        const triggerOptions = String(q.skip_logic).split(",").map(x => x.trim()).filter(Boolean);
        matchesTrigger = checkOptionTrigger(qVal, triggerOptions);
      }
      if (matchesTrigger) {
        activeSkips.push({
          questionId: q.id,
          skipTargetId: q.skip_target
        });
      }
    });
    return activeSkips;
  };

  const getBlocksToHideBySkip = (values) => {
    const activeSkips = getActiveSkips(values);
    const blocksToHide = new Set();
    const sortedBlocks = [...blocks].sort((a, b) => a.id - b.id);
    activeSkips.forEach(skip => {
      const skipperQ = questions.find(q => q.id === skip.questionId);
      if (!skipperQ) return;
      const skipperBlock = blocks.find(b => b.id === skipperQ.blok_id || b.kode === skipperQ.blok_id);
      const targetBlock = getSkipTargetBlock(skip.skipTargetId);
      if (!skipperBlock || !targetBlock) return;

      const skipperBlockIdx = sortedBlocks.findIndex(b => b.id === skipperBlock.id || b.kode === skipperBlock.kode);
      const targetBlockIdx = sortedBlocks.findIndex(b => b.id === targetBlock.id || b.kode === targetBlock.kode);
      if (skipperBlockIdx === -1 || targetBlockIdx === -1 || targetBlockIdx <= skipperBlockIdx) return;

      for (let i = skipperBlockIdx + 1; i < targetBlockIdx; i++) {
        blocksToHide.add(sortedBlocks[i].id);
        blocksToHide.add(sortedBlocks[i].kode);
      }
    });
    return blocksToHide;
  };

  const isQuestionVisibleIgnoreBlock = (q, values, activeInstanceIdx = null) => {
    const resolvedValues = getResolvedValuesForIndex(values, activeInstanceIdx);
    const showIfValue = q.show_if_value || q.showIfValue;
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

  const isBlockVisible = (block, values) => {
    if (!block) return false;
    const blocksToHide = getBlocksToHideBySkip(values);
    if (blocksToHide.has(block.id) || blocksToHide.has(block.kode)) {
      return false;
    }
    const blockQuestions = questions.filter(q => q.blok_id === block.id || q.blok_id === block.kode);
    if (blockQuestions.length > 0) {
      const hasAnyVisibleQuestion = blockQuestions.some(q => isQuestionVisibleIgnoreBlock(q, values));
      if (!hasAnyVisibleQuestion) {
        return false;
      }
    }
    return true;
  };

  // State 1: 1 member
  const values1 = {
    "178": JSON.stringify(["1"]), // R.401 Nomor urut
    "203": JSON.stringify(["DFDFD"]), // R.402 Nama
    "245": JSON.stringify(["25"]), // R.409 Umur
    "430": "1" // R.500 Jumlah Anggota Keluarga
  };

  console.log("=== STATE 1 ===");
  const visibleBlocks1 = blocks.filter(b => isBlockVisible(b, values1));
  console.log("Visible Blocks:", visibleBlocks1.map(b => b.kode));
  const activeBlock1 = visibleBlocks1.find(b => b.kode === "Blok V");
  if (activeBlock1) {
    const q1 = getActiveBlockOrderedQuestions(activeBlock1, questions, blocks);
    console.log("Ordered questions for Blok V count:", q1.length);
  } else {
    console.log("Blok V is not visible in State 1!");
  }

  // State 2: 2 members (after clicking Tambah Isian in Blok IV)
  const values2 = {
    ...values1,
    "178": JSON.stringify(["1", "2"]), // R.401 Nomor urut
    "203": JSON.stringify(["DFDFD"]), // R.402 Nama (not filled for member 2 yet)
    "245": JSON.stringify(["25"]), // R.409 Umur (not filled for member 2 yet)
    "430": "2" // R.500 Jumlah Anggota Keluarga (computed)
  };

  console.log("\n=== STATE 2 ===");
  const visibleBlocks2 = blocks.filter(b => isBlockVisible(b, values2));
  console.log("Visible Blocks:", visibleBlocks2.map(b => b.kode));
  const activeBlock2 = visibleBlocks2.find(b => b.kode === "Blok V");
  if (activeBlock2) {
    const q2 = getActiveBlockOrderedQuestions(activeBlock2, questions, blocks);
    console.log("Ordered questions for Blok V count:", q2.length);
  } else {
    console.log("Blok V is not visible in State 2!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
