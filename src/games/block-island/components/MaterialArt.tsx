import React, { memo } from 'react';
import Svg, { Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { MaterialId, material } from '../logic/materials';
import { FLOOR_H, SLAB_H, Rotation, screenFacing } from '../logic/projection';

const points=(p:number[][])=>p.map(a=>a.join(',')).join(' ');
export function Cube({x=0,y=0,w=48,h=28,depth=12,top='#9BCD72',left='#A5794E',right='#795638',grass=false}:{x?:number;y?:number;w?:number;h?:number;depth?:number;top?:string;left?:string;right?:string;grass?:boolean}){
  const a=w/2,b=h/2;
  return <G transform={`translate(${x} ${y})`}>
    <Polygon points={points([[0,b],[a,h],[a,h+depth],[0,b+depth]])} fill={left}/>
    <Polygon points={points([[a,h],[w,b],[w,b+depth],[a,h+depth]])} fill={right}/>
    <Polygon points={points([[a,0],[w,b],[a,h],[0,b]])} fill={top}/>
    {grass&&<><Path d={`M0 ${b+2} ${a} ${h+2} ${w} ${b+2}`} stroke="#5C9B45" strokeWidth={4} fill="none"/><Path d={`m6 ${b+9} 6 3m21 0 6-3`} stroke="#D0A674" strokeWidth={1.5} opacity={.7}/></>}
    <Path d={`M1 ${b} ${a} .6 ${w-1} ${b}`} fill="none" stroke="#F7F4C7" strokeOpacity={.4} strokeWidth={.8}/>
  </G>;
}
const palette:Record<string,[string,string,string]>={grass:['#9CD46E','#AA7D50','#815738'],dirt:['#B48C60','#92704B','#70523B'],stone:['#C5C9BB','#9AA798','#778D83'],paving:['#E5D6AA','#BFAE84','#9E906D'],wood:['#D4AA69','#AA7A47','#81552F'],sand:['#F0DDA0','#D9BD7D','#B89A60'],brick:['#DA9D77','#BE7B5E','#965947'],path:['#D5CEAF','#AFAB8E','#8B9279'],bridge:['#D7AE72','#AC7F4C','#8E633D']};
function Rails({edge=0}:{edge?:number}){
  const e=[[0,14,24,0],[48,14,24,28],[24,0,48,14],[0,14,24,28]][edge];
  return <G><Path d={`M${e[0]} ${e[1]-7} ${e[2]} ${e[3]-7}M${e[0]} ${e[1]-13} ${e[2]} ${e[3]-13}`} stroke="#B18750" strokeWidth={2.6} fill="none"/>{[0,2].map(i=><Cube key={i} x={e[i]-2} y={e[i+1]-19} w={4} h={3} depth={18} top="#F0D6A0" left="#BF9259" right="#92663C"/>)}</G>;
}
function floorDrawing(id:MaterialId,variant:number,floorIndex:number){
  const [top,left,right]=palette[id]??palette.grass;
  return <G>{floorIndex>0&&<Cube x={22} y={28+SLAB_H} w={4} h={3} depth={FLOOR_H-SLAB_H-3} top="#E0C393" left="#B89969" right="#8E7752"/>}<Cube top={top} left={left} right={right} depth={SLAB_H} grass={id==='grass'}/>
    {id==='grass'&&<Path d={`M12 15l2-3 1 3m10 4 2-4 2 3m5-5 2-2`} stroke="#67A145" strokeWidth={1.1} fill="none"/>}
    {id==='dirt'&&<G fill="#D9B07C"><Path d="m10 14 4-2 3 2-4 2Zm17 5 4-2 3 2-4 2Z"/><Path d="m31 12 3-2 2 2-3 2Z"/></G>}
    {id==='stone'&&<><Path d={variant%2?'M9 9l13 7 9-5m-9 5-2 9m2-9-2-12':'M10 19l11-5 9 2 8-5m-17 3 2-9m7 11-2 8'} stroke="#8E9E94" strokeWidth={1} fill="none"/><Path d="m4 18 5 3 2 4m28-5-4 2v4" stroke="#697E74" strokeWidth={.9} fill="none"/><Polygon points="24,1 44,13 33,15 19,7" fill="#D6D9CC" opacity={.55}/></>}
    {(id==='paving'||id==='path')&&<><Path d="M12 7l24 14M24 0v28M36 7 12 21" stroke="#B6AB8D" strokeWidth={1} fill="none"/><Path d="M2 15 23 27 45 15" stroke="#F3EACD" opacity={.7} strokeWidth={1}/>{id==='path'&&<G fill="#9EB274"><Path d="m9 18 5 1-4 3Zm23-7 4-1 2 3-4 1Z"/></G>}</>}
    {(id==='wood'||id==='bridge')&&<><Path d="m6 10 24 14M12 7l24 14M18 4l24 14" stroke="#9E713F" strokeWidth={1} fill="none"/><Path d="m12 11 8 4m1 2 7 4m-4-13 9 5" stroke="#EFD19B" strokeWidth={.9}/><Path d="m13 16 5-1 4 4-5 1Z" fill="none" stroke="#A57A48" strokeWidth={.6}/></>}
    {id==='brick'&&<><Path d="M0 18l24 14 24-14M8 19v4m8 1v4m16-1v4m8-9v4" stroke="#EEC2A0" strokeWidth={.9} fill="none"/><Path d="M12 7l24 14M24 0 0 14m36-7L12 21" stroke="#BA785D" strokeWidth={1}/></>}
    {id==='sand'&&<G stroke="#D2B878" strokeWidth={1} fill="none"><Path d="m9 15 4-1 4 1m6-4 5-1 5 1m-10 9 5-1 6 1"/><Path d="m8 24 3 2m22 3 4-2"/></G>}
    {id==='bridge'&&<><Rails edge={0}/><Rails edge={1}/><Path d="M5 27q12-4 18 9m2 0q6-13 18-18" fill="none" stroke="#795639" strokeWidth={2}/></>}
  </G>;
}
function tree(id:MaterialId){
  const pink=id==='cherry',pine=id==='pine';
  return <G><Ellipse cx={24} cy={17} rx={19} ry={7} fill="#42674E" opacity={.19}/><Cube x={21} y={-16} w={7} h={5} depth={31} top="#BD8A51" left="#9A6A3F" right="#71502F"/>
    <Path d="M24 7v-21m0 4-10-8m11 2 9-9" stroke="#7C5939" strokeWidth={4}/>
    {pine?<>{[[-1,-17,50,27], [3,-31,42,24],[8,-43,32,19],[15,-53,18,11]].map(([x,y,w,h],i)=><Cube key={i} x={x} y={y} w={w} h={h} depth={9} top={i%2?'#78AB6B':'#86BC76'} left="#507D55" right="#3B6450"/>)}</>:<>{[[0,-27,27,18],[21,-31,31,20],[7,-45,30,19],[26,-46,20,13],[14,-54,17,11]].map(([x,y,w,h],i)=><Cube key={i} x={x} y={y} w={w} h={h} depth={i%2?13:10} top={pink?i%2?'#F3BCC0':'#F1A4AE':i%2?'#A1CD6F':'#87BB5D'} left={pink?'#D9859A':'#639946'} right={pink?'#B96B85':'#447A40'}/>)}<Path d="m8-16 4-2m21-17 4-2m-12-10 3-1" stroke={pink?'#FFE6D5':'#C7E79B'} strokeWidth={2}/></>}
  </G>;
}
function wall(id:MaterialId,flip:boolean){return <G transform={flip?'translate(48 0) scale(-1 1)':undefined}><Polygon points="1,14 24,28 24,0 1,-14" fill={id==='brick-wall'?'#CB8B70':'#C79E63'}/><Polygon points="24,28 30,24 30,-4 24,0" fill={id==='brick-wall'?'#9D6756':'#90643F'}/><Polygon points="1,-14 7,-18 30,-4 24,0" fill={id==='brick-wall'?'#EDB89C':'#E4C088'}/>{id==='brick-wall'?<Path d="M1-5 24 9M1 4l23 14M1 13l23 14M8-10v9m8 5v9M8 9v9" stroke="#F2C5AA" strokeWidth={1} fill="none"/>:<><Path d="M7-10v27m6-24v28m6-25v28" stroke="#976D42" strokeWidth={1.3}/><Path d="m1-7 23 14m-23 3 23 14" stroke="#DEC18C" strokeWidth={2}/></>}</G>;}
/** Local anchor is the back vertex of a 1x1 top diamond (x=24, y=0).
 * Every asset uses the same screen-space lighting; rotation changes world axes. */
export const MaterialDrawing=memo(function MaterialDrawing({id,variant=0,rotation=0,facing=0,floorIndex=0}:{id:MaterialId;variant?:number;rotation?:Rotation;facing?:number;floorIndex?:number}){
  const role=material(id).role;
  if(role==='floor')return floorDrawing(id,variant,floorIndex);
  if(id==='water')return <G><Cube top="#6ECED1" left="#3D9FAF" right="#31889E" depth={3}/><Path d="m9 13 8-4 7 4m1 5 7-3 7 2m-23 2 4-2" stroke="#C9F7E7" strokeWidth={1.2} fill="none"/><Path d="m5 15 16 10 22-12" stroke="#4EB7BF" strokeWidth={1} fill="none"/></G>;
  if(id==='oak'||id==='pine'||id==='cherry')return tree(id);
  if(id==='bush')return <G><Ellipse cx={24} cy={18} rx={20} ry={8} fill="#42674E" opacity={.16}/><Cube x={4} y={-1} w={40} h={23} depth={11} top="#9FCC68" left="#6A9E4B" right="#4B7F40"/><Cube x={10} y={-10} w={27} h={17} depth={12} top="#AED97D" left="#81B75D" right="#669A4A"/><Path d="m11 6 4-2m10 2 5-3m3 9 4-2m-22 3 5-2" stroke="#CDEBA0" strokeWidth={2}/></G>;
  if(id==='flowers')return <G><Ellipse cx={24} cy={16} rx={16} ry={6} fill="#70A75A" opacity={.6}/>{[[10,10],[18,15],[28,9],[35,16],[24,19]].map(([x,y],i)=><G key={i}><Path d={`M${x} ${y+5}v-9m0 5-4-3`} stroke="#50864E" strokeWidth={1.6}/><Rect x={x-3} y={y-8} width={6} height={5} fill={['#FFE5A3','#EDABC3','#FFF1C8'][i%3]}/><Rect x={x-1} y={y-7} width={2} height={2} fill="#E8B45C"/></G>)}</G>;
  if(id==='moss-rock')return <G><Ellipse cx={24} cy={19} rx={20} ry={8} fill="#416B55" opacity={.15}/><Polygon points="4,14 11,-3 29,-9 43,0 46,18 30,27 10,24" fill="#AEBBA6"/><Polygon points="4,14 26,10 30,27 10,24" fill="#899C8A"/><Polygon points="26,10 43,0 46,18 30,27" fill="#718B7E"/><Polygon points="11,-3 29,-9 43,0 26,10 4,14" fill="#C7D0B6"/><Path d="m14-3 6 9-3 8m4-8 9-3 8 5" stroke="#889A86" strokeWidth={1} fill="none"/><Path d="m6 16 10-4 6 4-4 5-9 1m18-27 10 3 3 4-10 3-5-4" fill="#86AC65"/></G>;
  if(id==='brick-wall'||id==='wood-wall')return wall(id,(rotation+facing)%2===1);
  if(id==='stone-column'||id==='wood-column'){const stone=id==='stone-column';return <G><Cube x={14} y={8} w={20} h={12} depth={6} top={stone?'#D6D7C3':'#D8B97F'} left={stone?'#A9B4A0':'#B58A51'} right={stone?'#879D8D':'#89613A'}/><Cube x={19} y={-23} w={10} h={7} depth={36} top={stone?'#D8DECB':'#E7C68B'} left={stone?'#B1C0AC':'#BC915B'} right={stone?'#8CA18E':'#8D653C'}/><Cube x={14} y={-27} w={20} h={12} depth={5} top={stone?'#E3E6D1':'#EED6A1'} left={stone?'#BAC8AF':'#CAA36B'} right={stone?'#96AD96':'#A27848'}/><Path d={stone?'m20-12 4 3-1 10':'M22-16v24'} stroke={stone?'#829A86':'#926D43'} fill="none" strokeWidth={.8}/></G>;}
  if(id==='stairs')return <G>{[0,1,2].map(i=><Cube key={i} x={i*8+2} y={7-i*5} w={28} h={14} depth={5+i*6} top="#DFD6B8" left="#B8B69D" right="#939F8F"/>)}<Path d="m7 13 13 7m0-8 11 6m-1-15 10 5" stroke="#F7EACB" strokeWidth={1}/></G>;
  if(id==='roof')return <G><Polygon points="0,17 23,-15 48,16 25,30" fill="#B57763"/><Polygon points="0,17 23,-15 25,8" fill="#D59679"/><Polygon points="25,8 23,-15 48,16 25,30" fill="#AB665A"/><Path d="m7 9 19 13m-12-22 17 13m-11-20 15 13m-8 5 13 8" stroke="#F0B493" strokeWidth={1}/></G>;
  if(id==='fence')return <Rails edge={screenFacing(facing,rotation)}/>;
  return <G><Ellipse cx={24} cy={18} rx={12} ry={5} fill="#4E785C" opacity={.2}/><Cube x={19} y={10} w={10} h={7} depth={4} top="#A5B69C" left="#849C83" right="#677F71"/><Path d="M24 13v-29" stroke="#6B7965" strokeWidth={3}/><Cube x={18} y={-23} w={13} h={9} depth={13} top="#F7E8AA" left="#F4CD7F" right="#DBAB64"/><Path d="M17-23 24-29 32-23" stroke="#71866A" strokeWidth={3} fill="none"/><Path d="M19-18v8m10-9v7" stroke="#A48C59" strokeWidth={1}/></G>;
});
export const MaterialIcon=memo(function MaterialIcon({id,size=42}:{id:MaterialId;size?:number}){const box=material(id).role==='floor'||id==='water'?'-5 -5 58 54':['oak','pine','cherry'].includes(id)?'-8 -56 64 106':'-8 -33 64 78';return <Svg width={size} height={size} viewBox={box}><MaterialDrawing id={id}/></Svg>;});
