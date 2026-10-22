import { GridPoint } from '../../../shared/math/geometry';
import { blockKey, BuildBlock, BuildPoint, GRID_SIZE, inBounds, IslandState, material } from './island';
export const WORLD_W=1440,WORLD_H=980,HALF_W=24,HALF_H=14,FLOOR_H=32,SLAB_H=8,BLOCK_H=SLAB_H;
export const CAMERA_MS=220;
export type Rotation=0|1|2|3;
export interface Camera {zoom:number;x:number;y:number;overview:boolean;rotation:Rotation}
export const DEFAULT_CAMERA:Camera={zoom:1,x:720,y:400,overview:true,rotation:0};
export function rotatePoint(x:number,y:number,r:Rotation=0):GridPoint{
  if(r===1)return {x:GRID_SIZE-y,y:x};if(r===2)return {x:GRID_SIZE-x,y:GRID_SIZE-y};if(r===3)return {x:y,y:GRID_SIZE-x};return {x,y};
}
export function rotateCell(x:number,y:number,r:Rotation=0):GridPoint{
  if(r===1)return {x:GRID_SIZE-1-y,y:x};if(r===2)return {x:GRID_SIZE-1-x,y:GRID_SIZE-1-y};if(r===3)return {x:y,y:GRID_SIZE-1-x};return {x,y};
}
export function projectRaw(x:number,y:number,z=0){return {x:WORLD_W/2+(x-y)*HALF_W,y:100+(x+y)*HALF_H-z};}
export function project(x:number,y:number,z=0,r:Rotation=0){const a=rotatePoint(x,y,r);return projectRaw(a.x,a.y,z);}
export function unproject(x:number,y:number,z=0,r:Rotation=0):GridPoint{
  const a=(x-WORLD_W/2)/HALF_W,b=(y+z-100)/HALF_H;return rotatePoint((a+b)/2,(b-a)/2,((4-r)%4) as Rotation);
}
export function focusCamera(blocks:BuildBlock[]=[],rotation:Rotation=0):Camera{
  const floor=blocks.filter(b=>b.blockType==='floor');
  if(!floor.length){const p=project(12.3,12.3,0,rotation);return {zoom:.8,x:p.x,y:p.y,overview:false,rotation};}
  const x=floor.length?(Math.min(...floor.map(b=>b.x))+Math.max(...floor.map(b=>b.x))+1)/2:7.5;
  const y=floor.length?(Math.min(...floor.map(b=>b.y))+Math.max(...floor.map(b=>b.y))+1)/2:8;
  const p=project(x,y,12,rotation);return {zoom:1,x:p.x,y:p.y,overview:false,rotation};
}
export function rotateCamera(camera:Camera,direction:number):Camera{
  const world=unproject(camera.x,camera.y,0,camera.rotation),rotation=((camera.rotation+direction+4)%4) as Rotation,p=project(world.x,world.y,0,rotation);return {...camera,...p,rotation};
}
export function cameraScale(width:number,height:number,camera:Camera){return Math.min(width/(camera.overview?1300:400),height/(camera.overview?850:340))*camera.zoom;}
export function worldToViewport(p:GridPoint,width:number,height:number,camera:Camera){const scale=cameraScale(width,height,camera);return {x:width/2+(p.x-camera.x)*scale,y:height/2+(p.y-camera.y)*scale};}
export function viewportToWorld(p:GridPoint,width:number,height:number,camera:Camera){const scale=cameraScale(width,height,camera);return {x:(p.x-width/2)/scale+camera.x,y:(p.y-height/2)/scale+camera.y};}
export function blockPosition(p:BuildPoint,rotation:Rotation=0,surface=true){const c=rotateCell(p.x,p.y,rotation);return projectRaw(c.x,c.y,p.floorIndex*FLOOR_H+(surface?SLAB_H:0));}
export function cellCenter(p:BuildPoint,occupied=false,rotation:Rotation=0){return project(p.x+.5,p.y+.5,p.floorIndex*FLOOR_H+(occupied?SLAB_H:0),rotation);}
function tileAt(p:GridPoint,s:IslandState,z:number,r:Rotation):BuildPoint|null{
  const a=unproject(p.x,p.y,z,r),cell={x:Math.floor(a.x),y:Math.floor(a.y)};return inBounds(cell)?{...cell,missionId:s.quests[s.index].id,floorIndex:s.floorIndex}:null;
}
export function screenFacing(facing:number,rotation:Rotation){let [x,y]=[[-1,0],[1,0],[0,-1],[0,1]][facing];for(let i=0;i<rotation;i++)[x,y]=[-y,x];return [[-1,0],[1,0],[0,-1],[0,1]].findIndex(([a,b])=>x===a&&y===b);}
function polygonContains(x:number,y:number,polygon:number[][]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function featureHit(p:GridPoint,b:BuildBlock,r:Rotation){
  const a=blockPosition(b,r),x=p.x-a.x+24,y=p.y-a.y;
  if(['oak','pine','cherry'].includes(b.material))return ((x-24)/27)**2+((y+25)/30)**2<=1||x>=20&&x<=29&&y>=-9&&y<=19;
  if(b.material==='bush'||b.material==='moss-rock'||b.material==='flowers')return ((x-24)/(b.material==='flowers'?17:22))**2+((y-(b.material==='bush'?1:10))/(b.material==='flowers'?11:17))**2<=1;
  if(b.material==='brick-wall'||b.material==='wood-wall')return polygonContains((r+b.facing)%2?48-x:x,y,[[1,-14],[24,0],[30,-4],[30,24],[24,28],[1,14]]);
  if(b.material==='roof')return polygonContains(x,y,[[0,17],[23,-15],[48,16],[25,30]]);
  if(b.material==='stairs')return polygonContains(x,y,[[2,7],[18,-3],[46,11],[46,38],[2,26]]);
  if(b.material==='fence'){
    const e=[[0,14,24,0],[48,14,24,28],[24,0,48,14],[0,14,24,28]][screenFacing(b.facing,r)];
    if([0,2].some(i=>Math.abs(x-e[i])<=3&&y>=e[i+1]-20&&y<=e[i+1]+3))return true;
    const dx=e[2]-e[0],dy=e[3]-e[1];return [7,13].some(h=>{const t=Math.max(0,Math.min(1,((x-e[0])*dx+(y-e[1]+h)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-e[0]-t*dx,y-e[1]+h-t*dy)<3;});
  }
  return x>=14&&x<=34&&y>=-29&&y<=25;
}
export function hitTest(p:GridPoint,s:IslandState,r:Rotation=0):BuildPoint|null{
  if(s.tool==='remove'||!['floor','water'].includes(material(s.material).role)){
    const features=s.blocks.filter(b=>b.floorIndex===s.floorIndex&&b.blockType!=='floor'&&b.blockType!=='water').sort((a,b)=>{const u=rotateCell(a.x,a.y,r),v=rotateCell(b.x,b.y,r);return v.x+v.y-u.x-u.y;});
    const feature=features.find(b=>featureHit(p,b,r));if(feature)return {x:feature.x,y:feature.y,floorIndex:feature.floorIndex,missionId:s.quests[s.index].id};
  }
  const occupied=new Set(s.blocks.filter(b=>b.blockType==='floor').map(blockKey));
  const top=tileAt(p,s,s.floorIndex*FLOOR_H+SLAB_H,r);if(top&&occupied.has(blockKey(top)))return top;
  return tileAt(p,s,s.floorIndex*FLOOR_H,r);
}
export function clampCamera(camera:Camera):Camera{return {...camera,zoom:Math.max(.65,Math.min(2.6,camera.zoom)),x:Math.max(100,Math.min(WORLD_W-100,camera.x)),y:Math.max(30,Math.min(WORLD_H-60,camera.y))};}
export const CELLS=Array.from({length:GRID_SIZE*GRID_SIZE},(_,i)=>({x:i%GRID_SIZE,y:Math.floor(i/GRID_SIZE)}));
