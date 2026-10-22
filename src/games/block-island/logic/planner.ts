import { GridPoint } from '../../../shared/math/geometry';
import { asFloor, blockKey, inBounds, measurements, neighbors, objectiveIssue, pointKey, shapeIssue, uniqueBlocks } from './construction';
import { Blueprint, BuildBlock, BuildPoint, GardenQuest, GRID_SIZE, IslandState } from './model';
import { material, MaterialId, needsOpenSky } from './materials';
export const clearanceBlockers=(blocks:BuildBlock[])=>new Set(blocks.filter(b=>needsOpenSky(b.material)).map(b=>blockKey({...b,floorIndex:b.floorIndex+1})));

// Constructive templates + a bounded search. A returned plan is always checked;
// exhausting this budget means "not found", never a guessed mathematical answer.
interface Budget {nodes:number;checks:number;maxNodes:number;maxChecks:number}
const templateCache=new Map<string,GridPoint[][]>();
function templates(area:number,perimeter?:number):GridPoint[][]{
  const cacheKey=`${area}:${perimeter}`,cached=templateCache.get(cacheKey);if(cached)return cached;
  const output:GridPoint[][]=[],seen=new Set<string>();
  function add(widths:number[]){
    const points=widths.flatMap((w,y)=>Array.from({length:w},(_,x)=>({x,y})));
    for(let r=0;r<8;r++){
      const raw=points.map(({x,y})=>r<4?{x:r&1?-x:x,y:r&2?-y:y}:{x:r&1?-y:y,y:r&2?-x:x});
      const minX=Math.min(...raw.map(p=>p.x)),minY=Math.min(...raw.map(p=>p.y)),p=raw.map(a=>({x:a.x-minX,y:a.y-minY}));
      const k=p.map(pointKey).sort().join(';');if(!seen.has(k)){seen.add(k);output.push(p);}
    }
  }
  function rows(left:number,width:number,path:number[],height:number){
    if(output.length>=1600)return;
    if(!left){if(path.length===height)add(path);return;}
    const slots=height-path.length;if(slots<=0||left<slots||left>slots*width)return;
    for(let w=Math.min(width,left-slots+1);w>=1;w--)rows(left-w,w,[...path,w],height);
  }
  const dims:[number,number][]=[];
  for(let w=1;w<=GRID_SIZE;w++)for(let h=1;h<=GRID_SIZE;h++)if(w*h>=area&&w+h-1<=area&&(perimeter===undefined||2*(w+h)===perimeter))dims.push([w,h]);
  dims.sort((a,b)=>Math.abs(a[0]-a[1])-Math.abs(b[0]-b[1]));
  for(const[w,h]of dims)rows(area-w,w,[w],h);
  templateCache.set(cacheKey,output);return output;
}
function samePoints(a:GridPoint[],b:GridPoint[]){const set=new Set(a.map(pointKey));return a.length===b.length&&b.every(p=>set.has(pointKey(p)));}
function grow(required:GridPoint[],preferred:GridPoint[],area:number,container?:Set<string>):GridPoint[]|null{
  let cells=uniqueBlocks(required);const allowed=(p:GridPoint)=>inBounds(p)&&(!container||container.has(pointKey(p)));
  if(cells.some(p=>!allowed(p))||cells.length>area)return null;
  if(!cells.length)cells=[preferred.find(allowed)??{x:5,y:6}];
  if(!allowed(cells[0]))return null;
  while(cells.length<area){
    const set=new Set(cells.map(pointKey)),pref=new Set(preferred.map(pointKey));
    const frontier=uniqueBlocks(cells.flatMap(neighbors)).filter(p=>allowed(p)&&!set.has(pointKey(p)));
    const cx=cells.reduce((sum,p)=>sum+p.x,0)/cells.length,cy=cells.reduce((sum,p)=>sum+p.y,0)/cells.length;
    frontier.sort((a,b)=>(pref.has(pointKey(b))?100:0)-(pref.has(pointKey(a))?100:0)+(Math.abs(a.x-cx)+Math.abs(a.y-cy))-(Math.abs(b.x-cx)+Math.abs(b.y-cy)));
    if(!frontier.length)return null;cells.push(frontier[0]);
  }
  return shapeIssue(cells)?null:cells;
}
function floorOptions(required:GridPoint[],preferred:GridPoint[],area:number,perimeter:number|undefined,witness:GridPoint[],budget:Budget,container?:GridPoint[]):GridPoint[][]{
  if(required.length>area)return [];
  const allowed=container?new Set(container.map(pointKey)):undefined,options:GridPoint[][]=[],seen=new Set<string>();
  const req=new Set(required.map(pointKey)),pref=new Set(preferred.map(pointKey));
  const add=(points:GridPoint[]|null)=>{
    if(!points||points.length!==area||points.some(p=>!inBounds(p)||allowed&&!allowed.has(pointKey(p))))return;
    const set=new Set(points.map(pointKey));if([...req].some(k=>!set.has(k))||perimeter!==undefined&&measurements(points).perimeter!==perimeter)return;
    const k=[...set].sort().join(';');if(!seen.has(k)&&!shapeIssue(points)){seen.add(k);options.push(points);}
  };
  add(witness);if(preferred.length===area)add(preferred);if(required.length===area)add(required);
  add(grow(required,preferred,area,allowed));
  // Template placement is anchored by the actual required cells, not a fixed plot.
  const minX=required.length?Math.min(...required.map(p=>p.x)):0,maxX=required.length?Math.max(...required.map(p=>p.x)):GRID_SIZE-1;
  const minY=required.length?Math.min(...required.map(p=>p.y)):0,maxY=required.length?Math.max(...required.map(p=>p.y)):GRID_SIZE-1;
  for(const template of templates(area,perimeter)){
    const w=Math.max(...template.map(p=>p.x))+1,h=Math.max(...template.map(p=>p.y))+1;
    if(required.length&&(maxX-minX>=w||maxY-minY>=h))continue;
    const fromX=required.length?Math.max(0,maxX-w+1):Math.max(0,Math.min(GRID_SIZE-w,5));
    const toX=required.length?Math.min(minX,GRID_SIZE-w):fromX;
    const fromY=required.length?Math.max(0,maxY-h+1):Math.max(0,Math.min(GRID_SIZE-h,6));
    const toY=required.length?Math.min(minY,GRID_SIZE-h):fromY;
    for(let y=fromY;y<=toY;y++)for(let x=fromX;x<=toX;x++){
      if(++budget.checks>budget.maxChecks)return options.slice(0,20);
      add(template.map(p=>({x:p.x+x,y:p.y+y})));
    }
    if(options.length>100)break;
  }
  const score=(p:GridPoint[])=>p.filter(a=>pref.has(pointKey(a))).length*100+(samePoints(p,witness)?10:0)-p.reduce((sum,a)=>sum+Math.abs(a.x-7)+Math.abs(a.y-8),0)*.001;
  return options.sort((a,b)=>score(b)-score(a)).slice(0,20);
}
function candidates(q:GardenQuest,required:BuildPoint[],preferred:BuildPoint[],future:GardenQuest[],budget:Budget):BuildPoint[][]{
  if(required.some(p=>p.floorIndex>=q.floors))return [];
  if(!objectiveIssue(required.map(asFloor),q))return [required];
  const req=Array.from({length:q.floors},(_,f)=>required.filter(p=>p.floorIndex===f)),pref=Array.from({length:q.floors},(_,f)=>preferred.filter(p=>p.floorIndex===f));
  const witness=Array.from({length:q.floors},(_,f)=>q.witness.filter(p=>p.floorIndex===f));
  const out:BuildPoint[][]=[];
  const futureArea=future.find(a=>a.area!==undefined)?.area;
  const maxGround=q.area===undefined?Math.min(futureArea??Math.max(q.witness.length,required.length+6),Math.floor((q.perimeter??80)**2/16)):Math.min(q.area-q.minFloorArea*(q.floors-1),q.perimeter?Math.floor(q.perimeter**2/16):q.area);
  const minGround=q.area===undefined?Math.max(1,req[0].length):Math.max(req[0].length,q.minFloorArea,Math.ceil(q.area/q.floors));
  const sizes=Array.from({length:Math.max(0,maxGround-minGround+1)},(_,i)=>i+minGround).sort((a,b)=>Math.abs(a-witness[0].length)-Math.abs(b-witness[0].length));
  function upper(f:number,lower:GridPoint[],remaining:number,base:BuildPoint[]){
    if(out.length>=20||budget.checks>budget.maxChecks)return;
    if(f===q.floors){if(!remaining&&!objectiveIssue(base.map(asFloor),q))out.push(base);return;}
    const left=q.floors-f,min=Math.max(q.minFloorArea,req[f].length,Math.ceil(remaining/left)),max=Math.min(lower.length,remaining-q.minFloorArea*(left-1));
    const counts=Array.from({length:Math.max(0,max-min+1)},(_,i)=>min+i).sort((a,b)=>Math.abs(a-witness[f].length)-Math.abs(b-witness[f].length));
    for(const n of counts)for(const shape of floorOptions(req[f],pref[f],n,undefined,witness[f],budget,lower)){
      const p=shape.map(a=>({...a,floorIndex:f,missionId:q.id}));upper(f+1,shape,remaining-n,[...base,...p]);if(out.length>=20)return;
    }
  }
  for(const n of sizes)for(const shape of floorOptions(req[0],pref[0],n,q.perimeter,witness[0],budget)){
    const p=shape.map(a=>({...a,floorIndex:0,missionId:q.id}));
    if(q.floors===1){if(q.area===undefined||q.area===n)out.push(p);}else upper(1,shape,q.area!-n,p);
    if(out.length>=20)return out;
  }
  return out;
}
export interface PlanResult {plan:BuildPoint[][]|null;nodes:number;checks:number;limited:boolean}
function feasibleBounds(q:GardenQuest,required:BuildPoint[],blocked:Set<string>){
  if(required.some(p=>p.floorIndex>=q.floors||!inBounds(p)||blocked.has(blockKey(p))))return false;
  const floors=Array.from({length:q.floors},(_,f)=>required.filter(p=>p.floorIndex===f));
  const minimum=floors.map(p=>Math.max(q.minFloorArea,p.length));
  for(let f=q.floors-1;f>0;f--){const unavailable=floors[f-1].filter(p=>blocked.has(blockKey({...p,floorIndex:f}))).length;minimum[f-1]=Math.max(minimum[f-1],minimum[f]+unavailable);}
  if(q.area!==undefined&&minimum.reduce((a,b)=>a+b,0)>q.area)return false;
  if(q.perimeter!==undefined){
    const base=floors[0],w=base.length?Math.max(...base.map(p=>p.x))-Math.min(...base.map(p=>p.x))+1:1,h=base.length?Math.max(...base.map(p=>p.y))-Math.min(...base.map(p=>p.y))+1:1;
    let capacity=0;for(let x=w;x<=GRID_SIZE;x++)for(let y=h;y<=GRID_SIZE;y++)if(2*(x+y)<=q.perimeter)capacity=Math.max(capacity,x*y);
    if(minimum[0]>capacity||q.area!==undefined&&q.area>capacity*q.floors)return false;
  }
  return true;
}
function canonicalPlan(quests:GardenQuest[],index:number,required:BuildPoint[],blocked:Set<string>):BuildPoint[][]|null{
  if(index===quests.length)return [];
  for(let r=0;r<8;r++){
    const transform=(p:BuildPoint)=>({...p,...(r<4?{x:r&1?-p.x:p.x,y:r&2?-p.y:p.y}:{x:r&1?-p.y:p.y,y:r&2?-p.x:p.x})});
    const current=quests[index].witness.map(transform),anchor=required[0];
    const offsets=anchor?current.filter(p=>p.floorIndex===anchor.floorIndex).map(p=>({x:anchor.x-p.x,y:anchor.y-p.y})):[{x:0,y:0}];
    for(const offset of offsets){
      const plan=quests.slice(index).map(q=>q.witness.map(transform).map(p=>({...p,x:p.x+offset.x,y:p.y+offset.y}))),set=new Set(plan[0].map(blockKey));
      if(required.every(p=>set.has(blockKey(p)))&&plan.every(p=>p.every(a=>inBounds(a)&&!blocked.has(blockKey(a)))))return plan;
    }
  }
  return null;
}
export function planContinuation(quests:GardenQuest[],index:number,required:BuildPoint[],preferred:BuildPoint[]=required,maxChecks=24000,blocked=new Set<string>()):PlanResult{
  if(quests.slice(index).some(q=>!feasibleBounds(q,required,blocked)))return {plan:null,nodes:0,checks:0,limited:false};
  const canonical=canonicalPlan(quests,index,required,blocked);if(canonical)return {plan:canonical,nodes:quests.length-index,checks:0,limited:false};
  const budget:Budget={nodes:0,checks:0,maxNodes:240,maxChecks};
  function visit(i:number,need:BuildPoint[]):BuildPoint[][]|null{
    if(i===quests.length)return [];
    if(quests.slice(i).some(q=>!feasibleBounds(q,need,blocked)))return null;
    if(++budget.nodes>budget.maxNodes||budget.checks>budget.maxChecks)return null;
    const reference=canonicalPlan(quests,i,need,blocked);if(reference)return reference;
    for(const candidate of candidates(quests[i],need,i===index?preferred:need,quests.slice(i+1),budget)){
      if(candidate.some(p=>blocked.has(blockKey(p))))continue;
      const tail=visit(i+1,candidate);if(tail)return [candidate,...tail];
    }
    return null;
  }
  const plan=visit(index,required);return {plan,nodes:budget.nodes,checks:budget.checks,limited:budget.nodes>budget.maxNodes||budget.checks>budget.maxChecks};
}
export function buildHint(s:IslandState):{hint:Blueprint|null;message:string}{
  const floor=s.blocks.filter(b=>b.blockType==='floor'),sealed=floor.filter(b=>b.sealed);
  let answer=planContinuation(s.quests,s.index,floor,floor,24000,clearanceBlockers(s.blocks));
  if(!answer.plan)answer=planContinuation(s.quests,s.index,sealed,floor,24000,clearanceBlockers(s.blocks.filter(b=>b.sealed)));
  if(!answer.plan)return {hint:null,message:'Chưa tìm được đường xây tiếp trong giới hạn tìm kiếm. Khối khóa được giữ nguyên. Thử gỡ các ô chưa khóa ở xa hoặc làm lại nhiệm vụ rồi xem Gợi ý xây.'};
  const target=answer.plan[0],keys=new Set(target.map(blockKey)),removeFloor=new Set(floor.filter(b=>!b.sealed&&!keys.has(blockKey(b))).map(blockKey));
  const future=new Set(answer.plan.flat().map(blockKey));
  const removals=s.blocks.filter(b=>!b.sealed&&(b.blockType==='floor'&&removeFloor.has(blockKey(b))||b.blockType!=='water'&&b.blockType!=='floor'&&removeFloor.has(blockKey(b))||needsOpenSky(b.material)&&future.has(blockKey({...b,floorIndex:b.floorIndex+1})))).map(b=>b.id);
  const materials:Record<string,MaterialId>={};
  for(const p of target){const old=floor.find(b=>blockKey(b)===blockKey(p)),water=s.blocks.some(b=>b.blockType==='water'&&blockKey(b)===blockKey(p));materials[blockKey(p)]=old?.material??(water?'bridge':material(s.material).role==='floor'?s.material:'grass');}
  return {hint:{target,materials,continuation:answer.plan,nodes:answer.nodes,removals,note:removals.length?`Gỡ ${removals.length} vật thể chưa khóa được đánh dấu đỏ, rồi thêm các ô trong suốt. Khối niêm phong giữ nguyên.`:'Ô trong suốt là phần cần thêm. Gợi ý không đặt khối hoặc hoàn thành hộ em.'},message:''};
}
export const blueprintAdditions=(hint:Blueprint,blocks:BuildBlock[])=>{const set=new Set(blocks.filter(b=>b.blockType==='floor').map(blockKey));return hint.target.filter(p=>!set.has(blockKey(p)));};
