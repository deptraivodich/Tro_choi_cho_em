import { activeBlocks, asFloor, blockKey, BuildPoint, createIsland, Difficulty, entityKey, floorAt, generateGardenQuests, GRID_SIZE, islandReducer, IslandState, MATERIALS, measurements, measureWorld, objectiveIssue, ownerOf, rectangle, restoreGarden, saveGarden, sealedBlocks, shapeIssue } from '../logic/island';
import { blockPosition, cellCenter, DEFAULT_CAMERA, focusCamera, hitTest, project, Rotation, rotateCamera, unproject, viewportToWorld, worldToViewport } from '../logic/projection';
const action=(s:IslandState,type:'CHECK'|'CLEAR'|'UNDO'|'ADVANCE'|'HINT')=>islandReducer(s,{type,...ownerOf(s)});
const floor=(s:IslandState,floorIndex:number)=>islandReducer(s,{type:'FLOOR',floorIndex,...ownerOf(s)});
function build(s:IslandState,points:BuildPoint[]){for(const p of points){if(floorAt(s.blocks,p))continue;if(s.floorIndex!==p.floorIndex)s=floor(s,p.floorIndex);s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});}return s;}
const solve=(s:IslandState)=>action(build(s,s.quests[s.index].witness),'CHECK');
const points=(s:IslandState,w:number,h:number,floorIndex=0)=>rectangle(w,h).map(p=>({...p,x:p.x+5,y:p.y+6,floorIndex,missionId:s.quests[s.index].id}));

test.each([[1,1,1,4],[2,1,2,6],[2,2,4,8],[4,4,16,16],[8,2,16,20],[8,4,32,24],[8,8,64,32]])('unit-square rectangle %sx%s: area %s perimeter %s',(w,h,area,perimeter)=>expect(measurements(rectangle(w,h))).toEqual({area,perimeter}));
test('duplicates, L and concave shapes, shared edges, corner contact and holes',()=>{
 const l=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];expect(measurements([...l,...l])).toEqual({area:3,perimeter:8});expect(shapeIssue(l)).toBeNull();
 const concave=rectangle(3,3).filter(p=>p.x!==2||p.y!==2);expect(measurements(concave)).toEqual({area:8,perimeter:12});expect(shapeIssue(concave)).toBeNull();
 expect(measurements([{x:0,y:0},{x:1,y:1}]).perimeter).toBe(8);expect(shapeIssue([{x:0,y:0},{x:1,y:1}])).not.toBeNull();
 const hole=rectangle(3,3).filter(p=>p.x!==1||p.y!==1);expect(measurements(hole).perimeter).toBe(16);expect(shapeIssue(hole)).not.toBeNull();
});
test('18 cumulative objectives have nested valid blueprints; mandatory 16 -> P20 -> S20 example',()=>{
 expect(GRID_SIZE).toBe(20);
 expect(generateGardenQuests('easy').map(q=>[q.area??null,q.perimeter??null])).toEqual([[16,null],[null,20],[20,null],[null,24],[28,null],[null,28]]);
 expect(generateGardenQuests('medium').map(q=>[q.area,q.perimeter])).toEqual([[4,8],[6,10],[8,12],[9,12],[10,14],[12,14]]);
 expect(generateGardenQuests('hard').map(q=>[q.area,q.perimeter,q.floors])).toEqual([[8,8,2],[10,10,2],[14,12,2],[19,12,3],[27,14,3],[37,16,3]]);
 for(const mode of ['easy','medium','hard'] as Difficulty[]){let old=new Set<string>();for(const q of generateGardenQuests(mode)){expect(objectiveIssue(q.witness.map(asFloor),q)).toBeNull();const current=new Set(q.witness.map(blockKey));for(const k of old)expect(current.has(k)).toBe(true);old=current;}}
});
test.each<Difficulty>(['easy','medium','hard'])('%s: six missions enlarge one construction, all sealed floors still count',mode=>{
 let s=createIsland(mode),previous=s.blocks;
 for(let i=0;i<6;i++){
  s=solve(s);expect(s.correct).toBe(i+1);expect(s.phase).toBe(i===5?'complete':'celebrating');expect(s.score).toBe((i+1)*50);expect(s.blocks.every(b=>b.sealed)).toBe(true);expect(s.history).toHaveLength(0);
  for(const b of previous)expect(s.blocks.find(a=>a.id===b.id)).toBe(b);previous=s.blocks;
  if(i<5){const measure=measureWorld(s.blocks);s=action(s,'ADVANCE');expect(s.phase).toBe('editing');expect(measureWorld(s.blocks)).toEqual(measure);expect(s.blocks).toBe(previous);}
 }
 expect(s.blocks.length).toBe(mode==='easy'?30:mode==='medium'?12:37);
});
test('sealed area and old/new shared edges contribute to the same perimeter',()=>{
 let s=action(solve(createIsland()),'ADVANCE');expect(measureWorld(s.blocks).area).toBe(16);expect(measureWorld(s.blocks).perimeter).toBe(16);
 const next=s.quests[1].witness.filter(p=>!floorAt(s.blocks,p));s=build(s,[next[0]]);expect(measureWorld(s.blocks)).toMatchObject({area:17,perimeter:18});s=build(s,[next[1]]);expect(measureWorld(s.blocks)).toMatchObject({area:18,perimeter:20});expect(action(s,'CHECK').correct).toBe(2);
});
test.each(MATERIALS)('$id actually places with its own material and mathematical role',m=>{
 let s=createIsland(),p=s.quests[0].witness[0];if(m.role!=='floor'&&m.role!=='water')s=build(s,[p]);
 const before=measureWorld(s.blocks).area;s=islandReducer(s,{type:'MATERIAL',material:m.id,...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});
 const b=s.blocks.find(b=>b.material===m.id);expect(b).toMatchObject({material:m.id,blockType:m.role,id:entityKey(p,m.id)});expect(measureWorld(s.blocks).area).toBe(before+(m.role==='floor'?1:0));
});
test('unlimited stock within finite world; duplicate and material replacement never duplicate floor area',()=>{
 let s=build(createIsland(),points(createIsland(),8,8));expect(s.blocks).toHaveLength(64);expect(measureWorld(s.blocks).area).toBe(64);
 const p=s.blocks[0];s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(s.blocks).toHaveLength(64);
 s=islandReducer(s,{type:'MATERIAL',material:'brick',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(s.blocks).toHaveLength(64);expect(measureWorld(s.blocks).area).toBe(64);expect(s.blocks.find(b=>b.id===p.id)?.material).toBe('brick');
 for(const p of [{x:-1,y:2},{x:20,y:2},{x:2.5,y:2}]){const before=s.blocks;s=islandReducer(s,{type:'PLACE',point:{...p,missionId:s.quests[0].id,floorIndex:0},...ownerOf(s)});expect(s.blocks).toBe(before);}
});
test('water is not floor area; bridge over water is a walkable floor; features need a floor',()=>{
 let s=createIsland(),p=s.quests[0].witness[0];s=islandReducer(s,{type:'MATERIAL',material:'oak',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(s.blocks).toHaveLength(0);
 s=islandReducer(s,{type:'MATERIAL',material:'water',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(measureWorld(s.blocks).area).toBe(0);
 s=islandReducer(s,{type:'MATERIAL',material:'grass',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(s.blocks).toHaveLength(1);
 s=islandReducer(s,{type:'MATERIAL',material:'bridge',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(measureWorld(s.blocks)).toMatchObject({area:1,perimeter:4});expect(s.blocks).toHaveLength(2);
});
test('floating upper floor refused, sealed base can support new upper floor, floors do not increase land area',()=>{
 let s=floor(createIsland('hard'),1),p=s.quests[0].witness.find(p=>p.floorIndex===1)!;s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});expect(s.blocks).toHaveLength(0);
 s=solve(createIsland('hard'));expect(measureWorld(s.blocks)).toEqual({area:8,groundArea:4,perimeter:8,floorAreas:[4,4,0]});s=action(s,'ADVANCE');
 s=build(s,s.quests[1].witness);expect(measureWorld(s.blocks).area).toBe(10);s=floor(s,0);const base=s.blocks.find(b=>!b.sealed&&b.floorIndex===0)!;s=floor(s,1);s=islandReducer(s,{type:'PLACE',point:{...base,floorIndex:1},...ownerOf(s)});expect(floorAt(s.blocks,{...base,floorIndex:1})).toBeDefined();
 s=floor(s,0);const before=s.blocks;s=islandReducer(s,{type:'REMOVE',point:base,...ownerOf(s)});expect(s.blocks).toBe(before);
});
test('sealed floor, material and decoration survive delete, undo, current reset and stale callbacks',()=>{
 let s=createIsland('medium');s=build(s,s.quests[0].witness);const p=s.blocks[0];s=islandReducer(s,{type:'MATERIAL',material:'oak',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});s=action(s,'CHECK');const previous=sealedBlocks(s),oldOwner=ownerOf(s);s=action(s,'ADVANCE');
 for(const id of ['grass','stone','oak'] as const){s=islandReducer(s,{type:'MATERIAL',material:id,...ownerOf(s)});for(const type of ['PLACE','REMOVE'] as const){const b=s.blocks;s=islandReducer(s,{type,point:p,...ownerOf(s)});expect(s.blocks).toBe(b);}}
 s=islandReducer(s,{type:'MATERIAL',material:'grass',...ownerOf(s)});s=build(s,s.quests[1].witness);const count=activeBlocks(s).length;s=action(s,'CLEAR');expect(s.blocks).toEqual(previous);s=action(s,'UNDO');expect(activeBlocks(s)).toHaveLength(count);expect(sealedBlocks(s)).toEqual(previous);
 expect(islandReducer(s,{type:'REMOVE',point:p,...oldOwner})).toBe(s);const dirty={...s,history:[previous]};expect(action(dirty,'UNDO')).toBe(dirty);
});
test('single objective never secretly grades the other; both metrics and structure are required in medium/hard',()=>{
 const q=createIsland().quests[0];expect(objectiveIssue(rectangle(8,2).map(p=>asFloor({...p,floorIndex:0,missionId:q.id})),q)).toBeNull();
 const easy=generateGardenQuests('easy')[1];const twenty=rectangle(5,5).filter(p=>p.x!==4||p.y!==4).map(p=>asFloor({...p,floorIndex:0,missionId:easy.id}));expect(measurements(twenty).perimeter).toBe(20);expect(objectiveIssue(twenty,easy)).toBeNull();
 const medium=createIsland('medium');expect(action(build(medium,points(medium,4,1)),'CHECK').correct).toBe(0);expect(action(build(medium,points(medium,3,1)),'CHECK').correct).toBe(0);
 const hard=createIsland('hard');expect(action(build(hard,hard.quests[0].witness.filter(p=>p.floorIndex===0)),'CHECK').correct).toBe(0);
});
test('sealing requires confirmation and verified continuation; rapid repeats do not double advance',()=>{
 const s=build(createIsland('medium'),createIsland('medium').quests[0].witness);expect(s.blocks.every(b=>!b.sealed)).toBe(true);const done=action(s,'CHECK');expect(action(done,'CHECK')).toBe(done);expect(action(done,'UNDO')).toBe(done);expect(action(done,'CLEAR')).toBe(done);const event={type:'ADVANCE' as const,...ownerOf(done)},next=islandReducer(done,event);expect(islandReducer(next,event)).toBe(next);
});
test('versioned saves preserve cumulative seals and materials, reject old plots and malformed state',()=>{
 let s=action(solve(createIsland('medium')),'ADVANCE');s=build(s,s.quests[1].witness);const saved=saveGarden(s),restored=restoreGarden(saved,99);expect(restored).toMatchObject({session:99,blocks:s.blocks,index:1,history:[],hint:null});
 for(const v of [null,{version:3},{...saved,score:900},{...saved,blocks:[...saved.blocks,saved.blocks[0]]},{...saved,blocks:saved.blocks.map((b,i)=>i?b:{...b,sealed:false})}])expect(restoreGarden(v)).toBeNull();
});
test('four camera rotations, pan/zoom and selected floors round trip and hit the visible cell center',()=>{
 const initial=createIsland('hard');let s={...initial,index:5};s=build(s,s.quests[5].witness);
 for(const rotation of [0,1,2,3] as Rotation[])for(const f of [0,1,2]){s=floor(s,f);for(const[x,y]of [[0,0],[19,0],[0,19],[19,19],[5,6],[7,7],[9,9]]){
  const p={x,y,missionId:s.quests[5].id,floorIndex:f},occupied=!!floorAt(s.blocks,p),c=cellCenter(p,occupied,rotation);
  for(const camera of [{...DEFAULT_CAMERA,rotation},{...focusCamera(s.blocks,rotation),zoom:1.7,x:600,y:400}])for(const[w,h]of [[308,240],[380,470],[1100,500]]){const screen=worldToViewport(c,w,h,camera),world=viewportToWorld(screen,w,h,camera);expect(world.x).toBeCloseTo(c.x);expect(world.y).toBeCloseTo(c.y);expect(hitTest(world,s,rotation)).toEqual(p);}
 }}
 let camera=focusCamera();for(let i=0;i<4;i++)camera=rotateCamera(camera,1);expect(camera.x).toBeCloseTo(focusCamera().x);expect(camera.y).toBeCloseTo(focusCamera().y);const p=project(4,7,24,3);expect(unproject(p.x,p.y,24,3)).toEqual({x:4,y:7});
});
test('touching a tree canopy removes that feature rather than an unrelated ground cell',()=>{
 let s=createIsland();const p=s.quests[0].witness[0];s=build(s,[p]);s=islandReducer(s,{type:'MATERIAL',material:'oak',...ownerOf(s)});s=islandReducer(s,{type:'PLACE',point:p,...ownerOf(s)});s=islandReducer(s,{type:'TOOL',tool:'remove',...ownerOf(s)});
 for(const r of [0,1,2,3] as Rotation[]){const c=blockPosition(p,r);expect(hitTest({x:c.x,y:c.y-25},s,r)).toEqual(p);}
 s=islandReducer(s,{type:'REMOVE',point:p,...ownerOf(s)});expect(s.blocks).toHaveLength(1);expect(s.blocks[0].blockType).toBe('floor');expect(s.lastPlaced).toBeNull();
});
