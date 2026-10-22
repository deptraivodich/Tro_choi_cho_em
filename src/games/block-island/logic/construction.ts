import { GridPoint } from '../../../shared/math/geometry';
import { BuildBlock, BuildPoint, GardenQuest, GRID_SIZE } from './model';
export const rectangle=(w:number,h:number):GridPoint[]=>Array.from({length:w*h},(_,i)=>({x:i%w,y:Math.floor(i/w)}));
export const pointKey=({x,y}:GridPoint)=>`${x},${y}`;
// Physical occupancy is global. Mission provenance never creates a second cell.
export const blockKey=(p:Pick<BuildPoint,'x'|'y'|'floorIndex'>)=>`${p.floorIndex}:${pointKey(p)}`;
export const inBounds=({x,y}:GridPoint)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<GRID_SIZE&&y<GRID_SIZE;
export function uniqueBlocks(blocks:GridPoint[]){return [...new Map(blocks.filter(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)).map(p=>[pointKey(p),p])).values()];}
export const neighbors=({x,y}:GridPoint)=>[{x:x-1,y},{x:x+1,y},{x,y:y-1},{x,y:y+1}];
export function boundaryEdges(blocks:GridPoint[]):number[][]{
  const cells=uniqueBlocks(blocks),set=new Set(cells.map(pointKey));
  return cells.flatMap(({x,y})=>[
    !set.has(`${x},${y-1}`)?[x,y,x+1,y]:null,!set.has(`${x+1},${y}`)?[x+1,y,x+1,y+1]:null,
    !set.has(`${x},${y+1}`)?[x,y+1,x+1,y+1]:null,!set.has(`${x-1},${y}`)?[x,y,x,y+1]:null,
  ].filter((e):e is number[]=>e!==null));
}
export function measurements(blocks:GridPoint[]){return {area:uniqueBlocks(blocks).length,perimeter:boundaryEdges(blocks).length};}
export function measureWorld(blocks:BuildBlock[],floors=3){
  const floor=blocks.filter(b=>b.blockType==='floor'),floorAreas=Array.from({length:floors},(_,f)=>measurements(floor.filter(b=>b.floorIndex===f)).area);
  return {area:floorAreas.reduce((a,b)=>a+b,0),groundArea:floorAreas[0]??0,perimeter:measurements(floor.filter(b=>b.floorIndex===0)).perimeter,floorAreas};
}
export function shapeIssue(blocks:GridPoint[]):string|null{
  const cells=uniqueBlocks(blocks),set=new Set(cells.map(pointKey));if(!cells.length)return 'Chưa có ô sàn.';
  const seen=new Set<string>(),queue=[cells[0]];
  while(queue.length){const p=queue.pop()!;if(seen.has(pointKey(p)))continue;seen.add(pointKey(p));queue.push(...neighbors(p).filter(n=>set.has(pointKey(n))&&!seen.has(pointKey(n))));}
  if(seen.size!==cells.length)return 'Các ô trên mỗi tầng cần nối nhau bằng cạnh.';
  const minX=Math.min(...cells.map(p=>p.x))-1,maxX=Math.max(...cells.map(p=>p.x))+1,minY=Math.min(...cells.map(p=>p.y))-1,maxY=Math.max(...cells.map(p=>p.y))+1;
  const outside=new Set<string>(),air=[{x:minX,y:minY}];
  while(air.length){const p=air.pop()!,k=pointKey(p);if(outside.has(k)||set.has(k))continue;outside.add(k);air.push(...neighbors(p).filter(n=>n.x>=minX&&n.x<=maxX&&n.y>=minY&&n.y<=maxY&&!outside.has(pointKey(n))&&!set.has(pointKey(n))));}
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(!set.has(`${x},${y}`)&&!outside.has(`${x},${y}`))return 'Mỗi tầng cần không có lỗ kín: lấp lỗ hoặc mở ra ngoài.';
  return null;
}
export const asFloor=(p:BuildPoint):BuildBlock=>({...p,id:`floor:${blockKey(p)}`,sealed:false,blockType:'floor',material:'grass',facing:0});
export function structureIssue(blocks:BuildBlock[],q:GardenQuest,complete=true):string|null{
  const own=blocks.filter(b=>b.blockType==='floor'),set=new Set(own.map(blockKey));
  for(const b of own){
    if(!inBounds(b)||!Number.isInteger(b.floorIndex)||b.floorIndex<0||b.floorIndex>=q.floors)return 'Vị trí hoặc tầng nằm ngoài đảo xây dựng.';
    if(b.floorIndex>0&&!set.has(blockKey({...b,floorIndex:b.floorIndex-1})))return 'Ô tầng trên cần ô sàn đỡ ngay dưới; sàn đã niêm phong vẫn làm điểm đỡ.';
  }
  if(complete)for(let f=0;f<q.floors;f++){
    const floor=own.filter(b=>b.floorIndex===f);
    if(uniqueBlocks(floor).length<q.minFloorArea)return `Tầng ${f+1} cần ít nhất ${q.minFloorArea} ô sàn; không xây thành một cột.`;
    const issue=shapeIssue(floor);if(issue)return `Tầng ${f+1}: ${issue}`;
  }
  return null;
}
export function objectiveIssue(blocks:BuildBlock[],q:GardenQuest):string|null{
  const m=measureWorld(blocks,q.floors),issues:string[]=[];
  if(q.area!==undefined&&m.area!==q.area)issues.push(`${m.area<q.area?'Thêm':'Gỡ'} ${Math.abs(q.area-m.area)} ô sàn để tổng đạt ${q.area} m².`);
  if(q.perimeter!==undefined&&m.perimeter!==q.perimeter)issues.push(`${q.area===m.area?'Đã đủ diện tích! ':''}Chu vi${q.floors>1?' tầng 1':''}: cần ${q.perimeter} m, hiện ${m.perimeter} m.`);
  return issues.join(' ')||structureIssue(blocks,q)||null;
}
