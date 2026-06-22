import prisma from './config/database.js';

async function main() {
  const kegiatanId = 10;
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: kegiatanId },
    orderBy: { sort_order: 'asc' }
  });

  const questions = await prisma.formQuestion.findMany({
    where: {
      blok_id: { in: blocks.map(b => b.id) }
    },
    orderBy: { sort_order: 'asc' }
  });

  // Mock ans.values (empty)
  const values = {};

  const checkOptionTrigger = (val, triggerOptions) => {
    if (val === undefined || val === null || val === '') return false;
    return triggerOptions.includes(String(val));
  };

  const evaluateCondition = (c, values) => {
    const val = values[c.question_id];
    const triggerOptions = String(c.value).split(",").map(x => x.trim()).filter(Boolean);
    return checkOptionTrigger(val, triggerOptions);
  };

  const getQuestionCode = (q, allQuestions, allBlocks) => {
    const block = allBlocks.find(b => b.id === q.blok_id);
    if (!block) return "";
    return block.kode + "_" + q.id;
  };

  const getActiveSkips = () => {
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

  const getBlocksToHideBySkip = () => {
    const activeSkips = getActiveSkips();
    const blocksToHide = new Set();
    if (activeSkips.length === 0) return blocksToHide;
    // ... logic to hide blocks
    return blocksToHide;
  };

  const isQuestionVisibleIgnoreBlock = (q) => {
    return true; // Simple mock
  };

  const isBlockVisible = (block) => {
    const blocksToHide = getBlocksToHideBySkip();
    if (blocksToHide.has(block.id) || blocksToHide.has(block.kode)) {
      return false;
    }
    if (block.hide_logic) {
      try {
        const parsed = JSON.parse(block.hide_logic);
        if (parsed && parsed.conditions && parsed.conditions.length > 0) {
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, values));
          const met = operator === "OR" ? results.some(r => r) : results.every(r => r);
          if (met) return false;
        }
      } catch (e) {}
    }

    const blockQuestions = questions.filter(q => q.blok_id === block.id);
    if (blockQuestions.length > 0) {
      const hasAnyVisibleQuestion = blockQuestions.some(q => isQuestionVisibleIgnoreBlock(q));
      if (!hasAnyVisibleQuestion) {
        return false;
      }
    }
    return true;
  };

  const visibleBlocks = blocks.filter(isBlockVisible);
  console.log("Visible Blocks:");
  visibleBlocks.forEach(b => console.log(`  Kode: ${b.kode} | ID: ${b.id} | Title: ${b.title}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
