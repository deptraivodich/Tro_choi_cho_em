import { asFloor, blockKey, blueprintAdditions, buildHint, createIsland, entityKey, generateGardenQuests, islandReducer, IslandState, objectiveIssue, ownerOf, planContinuation, rectangle } from '../logic/island';

test('18 reference milestones are valid, nested, within bounds and have real multi-floor support',()=>{
  for(const mode of ['easy','medium','hard'] as const){const quests=generateGardenQuests(mode);const answer=planContinuation(quests,0,[]);expect(answer.plan).toHaveLength(6);let previous=new Set<string>();
    answer.plan!.forEach((p,i)=>{expect(objectiveIssue(p.map(asFloor),quests[i])).toBeNull();const keys=new Set(p.map(blockKey));for(const old of previous)expect(keys.has(old)).toBe(true);previous=keys;});
  }
});
test('hint follows an off-origin rotated user construction, preserving sealed and new cells',()=>{
  const s=createIsland('medium'),first=s.quests[0].witness.map(p=>({...asFloor(p),x:p.y+5,y:18-p.x,sealed:true}));
  const next:IslandState={...s,index:1,correct:1,score:50,completedMissionIds:[s.quests[0].id],blocks:first};
  const {hint}=buildHint(next);expect(hint).not.toBeNull();const set=new Set(hint!.target.map(blockKey));for(const b of first)expect(set.has(blockKey(b))).toBe(true);expect(objectiveIssue(hint!.target.map(asFloor),next.quests[1])).toBeNull();expect(blueprintAdditions(hint!,next.blocks)).toHaveLength(2);expect(next.blocks).toBe(first);
});
test('non-template compact alternative is accepted by constrained search and can grow',()=>{
  const quests=generateGardenQuests('hard'),q=quests[2];
  // 9+5 rather than the reference 8+6. Upper floor has an L outline.
  const floor=rectangle(3,3).map(p=>({...p,x:p.x+5,y:p.y+6,floorIndex:0,missionId:q.id}));
  const upper=rectangle(3,2).filter(p=>p.x!==2||p.y!==1).map(p=>({...p,x:p.x+5,y:p.y+6,floorIndex:1,missionId:q.id}));
  expect(objectiveIssue([...floor,...upper].map(asFloor),q)).toBeNull();const answer=planContinuation(quests,2,[...floor,...upper]);expect(answer.plan).not.toBeNull();expect(answer.plan![0]).toEqual([...floor,...upper]);
  answer.plan!.forEach((p,i)=>expect(objectiveIssue(p.map(asFloor),quests[i+2])).toBeNull());
});
test('a mathematically valid state that would trap later missions is caught before sealing',()=>{
  const quests=generateGardenQuests('medium'),q=quests[2],bad=rectangle(4,2).map(p=>({...p,x:p.x+5,y:p.y+6,floorIndex:0,missionId:q.id}));
  expect(objectiveIssue(bad.map(asFloor),q)).toBeNull();expect(planContinuation(quests,3,bad).plan).toBeNull();
  const old=quests[1].witness.map(p=>({...asFloor(p),sealed:true})),newCells=bad.filter(p=>!old.some(b=>blockKey(b)===blockKey(p))).map(asFloor);
  const s={...createIsland('medium'),index:2,blocks:[...old,...newCells]};const {hint}=buildHint(s);expect(hint).not.toBeNull();expect(hint!.removals.length).toBeGreaterThan(0);expect(hint!.removals.every(id=>newCells.some(b=>b.id===id))).toBe(true);
});
test('impossible or budget-exhausted hint returns no fake plan and never mutates sealed geometry',()=>{
  const s=createIsland(),far=rectangle(16,1).map(p=>({...asFloor({...p,floorIndex:0,missionId:s.quests[0].id}),sealed:true}));
  const state={...s,blocks:far},before=JSON.stringify(state.blocks);expect(buildHint(state).hint).toBeNull();expect(JSON.stringify(state.blocks)).toBe(before);
  const quests=generateGardenQuests('medium'),q=quests[2],bad=rectangle(4,2).map(p=>({...p,floorIndex:0,missionId:q.id}));const limited=planContinuation(quests,3,bad,bad,0);expect(limited.plan).toBeNull();
});
test('roof clearance is checked before sealing; hint marks only editable obstructions',()=>{
  const initial=createIsland('hard'),q=initial.quests[0],floor=q.witness.map(asFloor),roof=floor.filter(b=>b.floorIndex===1).map(b=>({...b,id:entityKey(b,'roof'),blockType:'structure' as const,material:'roof' as const}));
  const ready={...initial,blocks:[...floor,...roof]},checked=islandReducer(ready,{type:'CHECK',...ownerOf(ready)});
  expect(objectiveIssue(ready.blocks,q)).toBeNull();expect(checked.phase).toBe('editing');expect(checked.blocks).toBe(ready.blocks);expect(checked.correct).toBe(0);
  const h=buildHint(checked).hint!;expect(h.removals.sort()).toEqual(roof.map(b=>b.id).sort());expect(h.target).toHaveLength(8);
});
test('blueprint selects a bridge over water without changing water or counting it as land',()=>{
  const s=createIsland(),p=s.quests[0].witness[0],water={...asFloor(p),id:entityKey(p,'water'),blockType:'water' as const,material:'water' as const};
  s.blocks=[water];const h=buildHint(s).hint!;expect(h.materials[blockKey(p)]).toBe('bridge');expect(s.blocks).toEqual([water]);expect(objectiveIssue(h.target.map(asFloor),s.quests[0])).toBeNull();
});
