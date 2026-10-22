import React, { memo } from 'react';
import { Ellipse, G, Path, Polygon } from 'react-native-svg';
import { project, Rotation, rotatePoint } from '../logic/projection';
import { Cube, MaterialDrawing } from './MaterialArt';
const OUTLINE=[[-2,-2],[7,-2],[7,-3],[16,-3],[16,-2],[22,-2],[22,6],[23,6],[23,15],[22,15],[22,22],[15,22],[15,23],[7,23],[7,22],[-2,22],[-2,15],[-3,15],[-3,6],[-2,6]];
const nature=[[-1,1,'pine'],[-1,4,'moss-rock'],[-1,11,'cherry'],[-1,17,'oak'],[2,-1,'cherry'],[7,-1,'pine'],[13,-1,'oak'],[18,-1,'moss-rock'],[21,2,'pine'],[21,9,'cherry'],[21,16,'oak'],[18,21,'moss-rock'],[10,21,'cherry'],[3,21,'bush']] as const;
export const IslandLandscape=memo(function IslandLandscape({rotation}:{rotation:Rotation}){
  const outline=OUTLINE.map(([x,y])=>project(x,y,0,rotation));
  return <G><Ellipse cx={720} cy={550} rx={590} ry={220} fill="#2D8F95" opacity={.15}/><Ellipse cx={720} cy={560} rx={640} ry={245} fill="#C9F3DA" opacity={.09}/>
    {outline.map((a,i)=>{const j=(i+1)%outline.length,b=outline[j],u=rotatePoint(...OUTLINE[i] as [number,number],rotation),v=rotatePoint(...OUTLINE[j] as [number,number],rotation);if(!(v.x<u.x||v.y>u.y))return null;return <G key={i}><Polygon points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y+66} ${a.x},${a.y+66}`} fill={v.y>u.y?'#8C8D78':'#A4A18A'}/><Polygon points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y+24} ${a.x},${a.y+24}`} fill={v.y>u.y?'#97734F':'#B38C5E'}/><Path d={`M${a.x} ${a.y+4} ${b.x} ${b.y+4}`} stroke="#6E9E54" strokeWidth={7}/><Path d={`M${a.x} ${a.y+36} ${b.x} ${b.y+36}M${a.x} ${a.y+55} ${b.x} ${b.y+55}`} stroke="#C0BDA1" strokeWidth={2} opacity={.45}/>{[.2,.6,.85].map((t,k)=><Path key={k} d={`M${a.x+(b.x-a.x)*t} ${a.y+(b.y-a.y)*t+30}l-3 12 4 15`} stroke="#747C6C" opacity={.4} fill="none"/>)}</G>;})}
    <Polygon points={outline.map(p=>`${p.x},${p.y}`).join(' ')} fill="#95BD75"/>
    {Array.from({length:65},(_,i)=>{const x=(i*7)%20+.4,y=(i*11+Math.floor(i/7))%20+.5,c=project(x,y,0,rotation);return <G key={i} opacity={.4}><Ellipse cx={c.x} cy={c.y} rx={5+i%4} ry={2} fill={i%3?'#A7CD83':'#7FA764'}/><Path d={`m${c.x-2} ${c.y} 1-3 2 3 2-2`} stroke="#7B9F57" strokeWidth={.8} fill="none"/></G>;})}
    {[[0,-1,18],[-1,0,28],[-1,-1,48],[-1,-2,70],[0,-2,40],[1,-2,24]].map(([x,y,d],i)=>{const c=project(x,y,0,rotation);return <G key={i}><Cube x={c.x-24} y={c.y-d} depth={d} top={i%2?'#B8C5AC':'#CAD0B9'} left="#96A58F" right="#7F9586"/><Path d={`m${c.x-10} ${c.y-d+10} 8 4 10-5m-10 5-2 8`} stroke="#82937D" fill="none"/></G>;})}
    {[[-1,7,12],[-1,8,20],[-1,9,8],[20,17,14],[20,18,24]].map(([x,y,d],i)=>{const c=project(x,y,0,rotation);return <Cube key={i} x={c.x-24} y={c.y-d} depth={d} grass top="#9AC779"/>;})}
    {nature.map(([x,y,id],i)=>{const c=project(x+.5,y+.5,0,rotation);return <G key={i} transform={`translate(${c.x-24} ${c.y-14}) scale(.9)`}><MaterialDrawing id={id}/></G>;})}
    {[0,1,2,3].map(i=>{const c=project(13+i,21,0,rotation);return <G key={i} transform={`translate(${c.x-24} ${c.y})`}><MaterialDrawing id="water"/></G>;})}
    {(()=>{const c=project(15,21,0,rotation);return <G transform={`translate(${c.x-24} ${c.y-12})`}><MaterialDrawing id="bridge"/></G>;})()}
    {(()=>{const c=project(22,13,0,rotation);return <G><Path d={`M${c.x} ${c.y}v64l20-12V${c.y-12}Z`} fill="#55BDBD"/><Path d={`M${c.x+5} ${c.y}v53m8-61v47`} stroke="#B0EEE0" strokeWidth={2}/><Ellipse cx={c.x+9} cy={c.y+62} rx={27} ry={9} fill="#B0EAD8" opacity={.7}/></G>;})()}
    <Path d="M70 790q76 20 129-4m765 70q89 10 157-20M70 296q42-26 79-18" stroke="#CFEEE0" strokeWidth={3} fill="none" opacity={.5}/>
  </G>;
});
