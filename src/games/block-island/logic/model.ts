import { GridPoint } from '../../../shared/math/geometry';
import { MaterialId, MaterialRole } from './materials';
export type Difficulty='easy'|'medium'|'hard';
export type Tool='build'|'remove'|'pan';
export const GRID_SIZE=20;
export const REWARD=50;
export const PROFILE='local-learner-sandbox-01';
// Keep the old separated-plot save intact; its objectives cannot be silently
// reinterpreted as cumulative construction.
export const SAVE_KEY='block-island-round23';
export const MODE_NAMES:Record<Difficulty,string>={easy:'Khởi động',medium:'Rèn luyện',hard:'Thử thách'};
export interface BuildPoint extends GridPoint {floorIndex:number;missionId:string}
export interface BuildBlock extends BuildPoint {id:string;sealed:boolean;blockType:MaterialRole;material:MaterialId;facing:number}
export interface InputOwner {session:number;revision:number}
export interface GardenQuest {id:string;title:string;description:string;floors:number;minFloorArea:number;area?:number;perimeter?:number;witness:BuildPoint[]}
export interface Blueprint {target:BuildPoint[];materials:Record<string,MaterialId>;continuation:BuildPoint[][];nodes:number;removals:string[];note:string}
export interface IslandState {
  version:4;session:number;difficulty:Difficulty;quests:GardenQuest[];index:number;blocks:BuildBlock[];completedMissionIds:string[];
  history:BuildBlock[][];tool:Tool;material:MaterialId;floorIndex:number;preview:BuildPoint|null;hint:Blueprint|null;lastPlaced:string|null;
  revision:number;phase:'editing'|'celebrating'|'complete';score:number;correct:number;incorrect:number;resultRecorded:boolean;
  feedback:{tone:'info'|'success'|'error';text:string}|null;
}
