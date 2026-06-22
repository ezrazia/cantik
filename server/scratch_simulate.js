import prisma from './config/database.js';

// Helper functions copied from PetugasQuestionnaire.jsx
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

async function main() {
  const activityId = 10;
  
  // Load blocks and questions
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: { sort_order: 'asc' }
  });
  
  const questions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blocks.map(b => b.id) } },
    orderBy: { sort_order: 'asc' }
  });

  const activeBlock = blocks.find(b => b.kode === "Blok V");
  console.log("Active Block:", activeBlock.kode, "ID:", activeBlock.id);

  const orderedBlockQs = getActiveBlockOrderedQuestions(activeBlock, questions, blocks);
  console.log("Ordered Block Questions length:", orderedBlockQs.length);

  const renderedGroups = new Set();
  
  const output = orderedBlockQs.flatMap(q => {
    const loopGroupName = getQuestionLoopGroup(q, questions);

    if (loopGroupName) {
      if (renderedGroups.has(loopGroupName)) {
        return [];
      }
      renderedGroups.add(loopGroupName);

      // Look at this line!
      const groupQs = orderedBlockQs.filter(x => getQuestionLoopGroup(x, questions) === loopGroupName);
      
      return [{
        type: 'loop_group',
        groupName: loopGroupName,
        questions: groupQs.map(x => ({ id: x.id, label: x.label, block_id: x.blok_id }))
      }];
    }

    return [{
      type: 'single',
      id: q.id,
      label: q.label,
      block_id: q.blok_id
    }];
  });

  console.log("\nSimulation of rendered elements:");
  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
