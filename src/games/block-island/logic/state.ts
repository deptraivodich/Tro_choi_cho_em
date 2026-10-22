import { blockKey, inBounds, measureWorld, neighbors, objectiveIssue, pointKey, structureIssue } from './construction';
import { isMaterial, material, MaterialId, materialLayer, needsOpenSky } from './materials';
import { generateGardenQuests } from './missions';
import { buildHint, clearanceBlockers, planContinuation } from './planner';
import { BuildBlock, BuildPoint, Difficulty, InputOwner, IslandState, REWARD, Tool } from './model';

export const ownerOf=(s:IslandState):InputOwner=>({session:s.session,revision:s.revision});
export const resultMaximum=(s:IslandState)=>s.quests.length*REWARD;
export const activeBlocks=(s:IslandState)=>s.blocks.filter(b=>!b.sealed);
export const sealedBlocks=(s:IslandState)=>s.blocks.filter(b=>b.sealed);
export const entityKey=(p:BuildPoint,id:MaterialId)=>`${materialLayer(id)}:${blockKey(p)}`;
export const floorAt=(blocks:BuildBlock[],p:Pick<BuildPoint,'x'|'y'|'floorIndex'>)=>blocks.find(b=>b.blockType==='floor'&&blockKey(b)===blockKey(p));
export function createIsland(difficulty:Difficulty='easy',session=1):IslandState{
  return {version:4,session,difficulty,quests:generateGardenQuests(difficulty),index:0,blocks:[],completedMissionIds:[],history:[],tool:'build',material:'grass',floorIndex:0,preview:null,hint:null,lastPlaced:null,revision:0,phase:'editing',score:0,correct:0,incorrect:0,resultRecorded:false,feedback:null};
}
export const goalHint=(s:IslandState)=>objectiveIssue(s.blocks,s.quests[s.index])??'Đúng số đo! Kiểm tra để niêm phong phần mới và xây tiếp.';
export function targetEntity(s:IslandState,p:BuildPoint){
  const at=s.blocks.filter(b=>blockKey(b)===blockKey(p));
  if(s.tool==='remove')return at.find(b=>b.blockType!=='floor'&&b.blockType!=='water')??at.find(b=>b.blockType==='floor')??at[0];
  return at.find(b=>b.id===entityKey(p,s.material))??at.find(b=>b.blockType!=='floor'&&b.blockType!=='water')??at.find(b=>b.blockType==='floor')??at[0];
}
export function placementIssue(s:IslandState,p:BuildPoint,type:'PLACE'|'REMOVE'):string|null{
  const q=s.quests[s.index];
  if(!inBounds(p)||!Number.isInteger(p.floorIndex)||p.floorIndex<0||p.floorIndex>=q.floors)return 'Ngoài đảo hoặc tầng được phép xây.';
  if(p.floorIndex!==s.floorIndex)return 'Chọn đúng tầng trước khi đặt vật liệu.';
  const entity=type==='REMOVE'?targetEntity(s,p):s.blocks.find(b=>b.id===entityKey(p,s.material));
  if(entity?.sealed)return 'Khối này đã niêm phong: không thể gỡ hoặc đổi vật liệu. Em có thể xây thêm bên cạnh hoặc phía trên.';
  if(type==='REMOVE'){
    if(!entity)return 'Ô này chưa có vật thể để gỡ.';
    if(entity.blockType==='floor'&&(s.blocks.some(b=>b.blockType==='floor'&&b.x===p.x&&b.y===p.y&&b.floorIndex===p.floorIndex+1)||s.blocks.some(b=>b.blockType!=='floor'&&b.blockType!=='water'&&blockKey(b)===blockKey(p))))return 'Sàn đang đỡ tầng trên hoặc đồ vật. Gỡ phần chưa khóa phía trên trước.';
    return null;
  }
  const m=material(s.material),base=floorAt(s.blocks,p),water=s.blocks.find(b=>b.blockType==='water'&&blockKey(b)===blockKey(p));
  if(m.role==='floor'){
    if(p.floorIndex>0&&!floorAt(s.blocks,{...p,floorIndex:p.floorIndex-1}))return 'Cần ô sàn đỡ ngay dưới. Sàn niêm phong vẫn được dùng làm điểm đỡ.';
    if(s.blocks.some(b=>b.x===p.x&&b.y===p.y&&b.floorIndex===p.floorIndex-1&&needsOpenSky(b.material)))return 'Cây cao, đèn hoặc mái bên dưới cần khoảng trống. Gỡ vật thể chưa khóa đó hoặc chọn vị trí khác.';
    if(water&&m.id!=='bridge')return 'Ô này là hồ. Chọn Cầu gỗ để tạo sàn qua nước, hoặc gỡ ô nước chưa khóa.';
  }else if(m.role==='water'){
    if(p.floorIndex!==0)return 'Hồ nước chỉ đặt ở tầng đất.';
    if(base&&base.material!=='bridge')return 'Gỡ nền chưa khóa trước khi tạo hồ; không biến sàn khóa thành nước.';
  }else{
    if(!base)return 'Vật liệu này cần một ô nền hoặc sàn có sẵn. Cây, tường và đồ vật không tự tạo diện tích.';
    if(needsOpenSky(m.id)&&floorAt(s.blocks,{...p,floorIndex:p.floorIndex+1}))return 'Vật thể cao hoặc mái cần một ô không bị tầng phía trên che.';
    if(m.role==='fence'&&neighbors(p).every(n=>floorAt(s.blocks,{...p,...n})))return 'Hàng rào cần đặt ở một ô mép sàn.';
  }
  return null;
}
export interface SavedGarden {version:4;difficulty:Difficulty;index:number;blocks:BuildBlock[];completedMissionIds:string[];phase:IslandState['phase'];floorIndex:number;score:number;correct:number;incorrect:number;resultRecorded:boolean}
export interface SavedJourneys {version:4;journeys:Partial<Record<Difficulty,SavedGarden>>}
export function saveGarden(s:IslandState):SavedGarden{
  return {version:4,difficulty:s.difficulty,index:s.index,blocks:s.blocks,completedMissionIds:s.completedMissionIds,phase:s.phase,floorIndex:s.floorIndex,score:s.score,correct:s.correct,incorrect:s.incorrect,resultRecorded:s.resultRecorded};
}
export function restoreGarden(value:unknown,session=1):IslandState|null{
  if(!value||typeof value!=='object')return null;const v=value as SavedGarden;
  if(v.version!==4||!['easy','medium','hard'].includes(v.difficulty)||!Number.isInteger(v.index)||v.index<0||v.index>5||!Array.isArray(v.blocks)||!Array.isArray(v.completedMissionIds)||!['editing','celebrating','complete'].includes(v.phase)||![v.score,v.correct,v.incorrect].every(n=>Number.isInteger(n)&&n>=0)||typeof v.resultRecorded!=='boolean')return null;
  const s=createIsland(v.difficulty,session),count=v.index+(v.phase==='editing'?0:1);
  if(v.completedMissionIds.length!==count||v.correct!==count||v.score!==count*REWARD||v.completedMissionIds.some((id,i)=>id!==s.quests[i].id)||(v.phase==='complete')!==(count===6)||v.resultRecorded&&v.phase!=='complete'||!Number.isInteger(v.floorIndex)||v.floorIndex<0||v.floorIndex>=s.quests[v.index].floors)return null;
  const ids=new Set<string>();
  for(const b of v.blocks){
    if(!b||!isMaterial(b.material)||b.blockType!==material(b.material).role||!inBounds(b)||!Number.isInteger(b.floorIndex)||b.floorIndex<0||b.floorIndex>=s.quests[v.index].floors||!Number.isInteger(b.facing)||b.facing<0||b.facing>3||typeof b.sealed!=='boolean')return null;
    const i=s.quests.findIndex(q=>q.id===b.missionId);if(i<0||i>v.index||b.sealed!==(i<count)||b.id!==entityKey(b,b.material)||ids.has(b.id))return null;ids.add(b.id);
  }
  if(structureIssue(v.blocks,s.quests[v.index],false))return null;
  for(const b of v.blocks)if(b.blockType!=='floor'&&b.blockType!=='water'&&!floorAt(v.blocks,b)||b.blockType==='water'&&(b.floorIndex!==0||floorAt(v.blocks,b)&&floorAt(v.blocks,b)!.material!=='bridge')||needsOpenSky(b.material)&&floorAt(v.blocks,{...b,floorIndex:b.floorIndex+1}))return null;
  for(let i=0;i<count;i++)if(objectiveIssue(v.blocks.filter(b=>s.quests.findIndex(q=>q.id===b.missionId)<=i),s.quests[i]))return null;
  if(v.phase==='editing'&&!planContinuation(s.quests,v.index,v.blocks.filter(b=>b.sealed&&b.blockType==='floor'),undefined,24000,clearanceBlockers(v.blocks.filter(b=>b.sealed))).plan)return null;
  return {...s,index:v.index,blocks:v.blocks.map(b=>({...b})),completedMissionIds:[...v.completedMissionIds],phase:v.phase,floorIndex:v.floorIndex,score:v.score,correct:v.correct,incorrect:v.incorrect,resultRecorded:v.resultRecorded};
}
type OwnedEvent=
  |{type:'TOOL';tool:Tool}|{type:'MATERIAL';material:MaterialId}|{type:'FLOOR';floorIndex:number}|{type:'PREVIEW';point:BuildPoint|null}
  |{type:'PLACE'|'REMOVE';point:BuildPoint}|{type:'UNDO'|'CLEAR'|'CHECK'|'ADVANCE'|'RESULT_RECORDED'|'HINT'};
export type IslandEvent=(OwnedEvent&InputOwner)|{type:'RESTORE';state:IslandState}|{type:'START';difficulty:Difficulty;session:number}|{type:'RESTART';session:number};
export function islandReducer(s:IslandState,e:IslandEvent):IslandState{
  if(e.type==='START')return createIsland(e.difficulty,e.session);
  if(e.type==='RESTART')return createIsland(s.difficulty,e.session);
  if(e.type==='RESTORE')return e.state;
  if(e.session!==s.session||e.revision!==s.revision)return s;
  if(e.type==='RESULT_RECORDED')return s.phase==='complete'&&!s.resultRecorded?{...s,resultRecorded:true}:s;
  if(e.type==='ADVANCE')return s.phase==='celebrating'?{...s,index:s.index+1,history:[],preview:null,hint:null,phase:'editing',feedback:null,revision:s.revision+1}:s;
  if(s.phase!=='editing')return s;
  if(e.type==='TOOL')return {...s,tool:e.tool,preview:null,lastPlaced:null,feedback:null,revision:s.revision+1};
  if(e.type==='MATERIAL')return isMaterial(e.material)?{...s,material:e.material,tool:'build',preview:null,lastPlaced:null,feedback:null,revision:s.revision+1}:s;
  if(e.type==='FLOOR')return Number.isInteger(e.floorIndex)&&e.floorIndex>=0&&e.floorIndex<s.quests[s.index].floors?{...s,floorIndex:e.floorIndex,preview:null,lastPlaced:null,revision:s.revision+1}:s;
  if(e.type==='PREVIEW')return {...s,preview:e.point&&inBounds(e.point)?e.point:null};
  if(e.type==='HINT'){
    if(s.hint)return {...s,hint:null,preview:null,feedback:null};
    const {hint,message}=buildHint(s);return {...s,hint,preview:null,feedback:hint?null:{tone:'info',text:message}};
  }
  if(e.type==='CHECK'){
    const q=s.quests[s.index],issue=objectiveIssue(s.blocks,q);
    if(issue)return {...s,incorrect:s.incorrect+1,preview:null,revision:s.revision+1,feedback:{tone:'error',text:issue}};
    const proof=planContinuation(s.quests,s.index+1,s.blocks.filter(b=>b.blockType==='floor'),undefined,24000,clearanceBlockers(s.blocks));
    if(!proof.plan)return {...s,preview:null,feedback:{tone:'info',text:'Số đo đã đúng, nhưng chưa xác minh được đường mở rộng cho bài sau. Chưa niêm phong. Nhấn Gợi ý xây để sửa phần chưa khóa.'}};
    return {...s,blocks:s.blocks.map(b=>b.sealed?b:{...b,sealed:true}),completedMissionIds:[...s.completedMissionIds,q.id],phase:s.index===5?'complete':'celebrating',preview:null,hint:null,lastPlaced:null,history:[],revision:s.revision+1,correct:s.correct+1,score:s.score+REWARD,feedback:{tone:'success',text:`Đã niêm phong phần mới! ${s.index===5?'Cả hành trình hoàn thành.':'Bài sau tiếp tục chính công trình này.'}`}};
  }
  if(e.type==='UNDO'){
    const previous=s.history.at(-1);if(!previous||previous.some(b=>b.sealed||b.missionId!==s.quests[s.index].id))return s;
    const blocks=[...sealedBlocks(s),...previous];if(structureIssue(blocks,s.quests[s.index],false))return s;
    return {...s,blocks,history:s.history.slice(0,-1),preview:null,hint:null,lastPlaced:null,feedback:null,revision:s.revision+1};
  }
  let blocks:BuildBlock[];const own=activeBlocks(s);
  if(e.type==='CLEAR'){if(!own.length)return s;blocks=sealedBlocks(s);}
  else if(e.type==='PLACE'||e.type==='REMOVE'){
    const issue=placementIssue(s,e.point,e.type);if(issue)return {...s,preview:null,feedback:{tone:'info',text:issue}};
    const p={...e.point,missionId:s.quests[s.index].id};
    if(e.type==='REMOVE'){const target=targetEntity(s,p)!;blocks=s.blocks.filter(b=>b.id!==target.id);}
    else{
      const id=entityKey(p,s.material),old=s.blocks.find(b=>b.id===id);if(old?.material===s.material)return {...s,preview:null,feedback:{tone:'info',text:'Vật liệu này đã có tại đây. Không đếm trùng ô.'}};
      const set=new Set(s.blocks.filter(b=>b.blockType==='floor'&&b.floorIndex===p.floorIndex).map(pointKey));
      const facing=s.material==='fence'?Math.max(0,neighbors(p).findIndex(n=>!set.has(pointKey(n)))):0;
      const block:BuildBlock={...p,id,sealed:false,material:s.material,blockType:material(s.material).role,facing};
      blocks=[...s.blocks.filter(b=>b.id!==id),block];
    }
  }else return s;
  const floorKeys=new Set(s.hint?.target.map(blockKey)),hint=s.hint&&blocks.filter(b=>b.blockType==='floor').every(b=>floorKeys.has(blockKey(b)))?{...s.hint,removals:s.hint.removals.filter(id=>blocks.some(b=>b.id===id))}:null;
  return {...s,blocks,history:[...s.history.slice(-255),own],preview:null,hint,lastPlaced:e.type==='PLACE'?entityKey(e.point,s.material):null,feedback:null,revision:s.revision+1};
}
export const missionMeasurements=(blocks:BuildBlock[],_missionId:string,floors=3)=>measureWorld(blocks,floors);
export const missionBlocks=(s:IslandState)=>s.blocks.filter(b=>b.blockType==='floor');
export const INITIAL_BLOCKS:BuildBlock[]=[];
