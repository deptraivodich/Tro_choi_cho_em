import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { asFloor, blockKey, boundaryEdges, blueprintAdditions, BuildBlock, BuildPoint, floorAt, InputOwner, IslandState, material, ownerOf, placementIssue, targetEntity } from '../logic/island';
import { blockPosition, cellCenter, clampCamera, DEFAULT_CAMERA, focusCamera, hitTest, project, rotateCamera, rotateCell, Rotation, SLAB_H, WORLD_H, WORLD_W } from '../logic/projection';
import { useIslandCamera } from '../hooks/useIslandCamera';
import { MaterialDrawing } from './MaterialArt';
import { IslandLandscape } from './IslandLandscape';

function Landing({block,rotation,paused}:{block:BuildBlock;rotation:Rotation;paused:boolean}){
  const progress=useSharedValue(0),reduced=useReducedMotion(),p=blockPosition(block,rotation,block.blockType!=='water');
  useEffect(()=>{if(!paused)progress.set(withTiming(1,{duration:reduced?0:Math.max(1,220*(1-progress.get()))}));return()=>cancelAnimation(progress);},[paused,reduced,progress]);
  const style=useAnimatedStyle(()=>({opacity:1-progress.value,transform:[{translateY:-18*(1-progress.value)}]}));
  return <Animated.View testID="island-build-motion" pointerEvents="none" style={[{position:'absolute',left:p.x-24,top:p.y-56,width:80,height:126},style]}><Svg width={80} height={126} viewBox="0 -56 80 126"><MaterialDrawing id={block.material} floorIndex={block.floorIndex} rotation={rotation} facing={block.facing}/></Svg></Animated.View>;
}
function SealEffect({paused}:{paused:boolean}){
  const p=useSharedValue(0),reduced=useReducedMotion();useEffect(()=>{if(!paused)p.set(withTiming(1,{duration:reduced?0:600*(1-p.get())}));return()=>cancelAnimation(p);},[p,paused,reduced]);
  const style=useAnimatedStyle(()=>({opacity:1-p.value,transform:[{translateY:-14*p.value},{scale:.95+.1*p.value}]}));
  return <Animated.View testID="island-seal-effect" pointerEvents="none" style={[s.seal,style]}><Text style={s.sealText}>Đã niêm phong phần mới!</Text></Animated.View>;
}
function diamond(p:BuildPoint,rotation:Rotation,occupied=false){const a=blockPosition(p,rotation,occupied);return `${a.x},${a.y} ${a.x+24},${a.y+14} ${a.x},${a.y+28} ${a.x-24},${a.y+14}`;}
const Geometry=memo(function Geometry({state,rotation}:{state:IslandState;rotation:Rotation}){
  const floor=state.blocks.filter(b=>b.blockType==='floor'),floorSet=new Set(floor.map(blockKey));
  const ghosts=state.hint?blueprintAdditions(state.hint,state.blocks):[];
  const renderables=[...state.blocks.map(b=>({point:b,ghost:false})),...ghosts.map(p=>({point:{...p,id:`ghost:${blockKey(p)}`,material:state.hint?.materials?.[blockKey(p)]??'grass',facing:0,sealed:false,blockType:'floor'} as BuildBlock,ghost:true}))];
  renderables.sort((a,b)=>{const u=rotateCell(a.point.x,a.point.y,rotation),v=rotateCell(b.point.x,b.point.y,rotation);return u.x+u.y-v.x-v.y||a.point.floorIndex-b.point.floorIndex||(a.point.blockType==='water'?-1:a.point.blockType==='floor'?0:1)-(b.point.blockType==='water'?-1:b.point.blockType==='floor'?0:1);});
  return <G testID="island-geometry">{renderables.map(({point:b,ghost})=>{
    const p=blockPosition(b,rotation,b.blockType!=='water'),above=b.floorIndex>state.floorIndex,feature=b.blockType!=='floor'&&b.blockType!=='water';
    const opacity=ghost?(above?.1:b.floorIndex===state.floorIndex?.42:.16):above?.16:feature&&state.tool==='build'&&material(state.material).role==='floor'?.52:1;
    return <G key={b.id} testID={ghost?`island-ghost-${blockKey(b)}`:`island-entity-${b.id}`} transform={`translate(${p.x-24} ${p.y})`} opacity={opacity}>
      <MaterialDrawing id={b.material} variant={b.x+b.y} floorIndex={b.floorIndex} rotation={rotation} facing={b.facing}/>
      {ghost&&<Path d="M0 14 24 0 48 14 24 28Z" stroke="#F9E8A2" strokeWidth={1.7} fill="none" strokeDasharray="3 2"/>}
      {b.sealed&&b.blockType==='floor'&&!floorSet.has(blockKey({...b,floorIndex:b.floorIndex+1}))&&<Path d="m31 15 2 2 5-5" stroke="#F5EDBE" strokeWidth={1.3} fill="none"/>}
    </G>;
  })}
  {boundaryEdges(floor.filter(b=>b.floorIndex===0)).map(([x,y,u,v],i)=>{const a=project(x,y,SLAB_H,rotation),b=project(u,v,SLAB_H,rotation);return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#F8E7A1" strokeWidth={1.8} strokeLinecap="round"/>;})}
  {state.hint?.removals.map(id=>{const b=state.blocks.find(b=>b.id===id);if(!b||b.floorIndex!==state.floorIndex)return null;const c=cellCenter(b,true,rotation);return <G key={id}><Polygon points={diamond(b,rotation,true)} fill="#E36D6466" stroke="#B94B45" strokeWidth={2}/><Path d={`m${c.x-5} ${c.y-4} 10 8m-10 0 10-8`} stroke="#FFF0DB" strokeWidth={2}/></G>;})}
  </G>;
},(a,b)=>a.rotation===b.rotation&&a.state.blocks===b.state.blocks&&a.state.floorIndex===b.state.floorIndex&&a.state.hint===b.state.hint&&a.state.tool===b.state.tool&&a.state.material===b.state.material);

export const IslandWorld=memo(function IslandWorld({state,disabled,paused,onCell,onPreview,hero=false}:{state:IslandState;disabled:boolean;paused:boolean;onCell:(p:BuildPoint,owner:InputOwner)=>void;onPreview:(p:BuildPoint|null,owner:InputOwner)=>void;hero?:boolean}){
  const [size,setSize]=useState({width:320,height:400});
  const {camera,setCamera,style:cameraStyle,toWorld}=useIslandCamera(state,size.width,size.height,paused,hero),rotation=camera.rotation;
  const gesture=useRef<{active:boolean;pan:boolean;owner:InputOwner;point:BuildPoint|null;last:{x:number;y:number}|null}>({active:false,pan:false,owner:ownerOf(state),point:null,last:null});
  const inputKey=`${state.session}:${state.revision}:${state.floorIndex}:${rotation}:${camera.zoom}:${camera.overview}`;
  useLayoutEffect(()=>{gesture.current.active=false;gesture.current.point=null;gesture.current.last=null;},[inputKey,disabled,paused]);
  const clear=()=>{const g=gesture.current;g.active=false;g.point=null;g.last=null;onPreview(null,g.owner);};
  const locate=(e:GestureResponderEvent)=>{const g=gesture.current,p=hitTest(toWorld({x:e.nativeEvent.locationX,y:e.nativeEvent.locationY}),state,rotation);if(p?.x!==g.point?.x||p?.y!==g.point?.y){g.point=p;onPreview(p,g.owner);}return p;};
  const preview=state.preview,issue=preview?placementIssue(state,preview,state.tool==='remove'?'REMOVE':'PLACE'):null;
  const selected=preview?targetEntity(state,preview):null,occupied=preview?!!floorAt(state.blocks,preview):false;
  const marker=preview?cellCenter(preview,occupied,rotation):null;
  const latest=useMemo(()=>state.blocks.find(b=>b.id===state.lastPlaced&&!b.sealed),[state.blocks,state.lastPlaced]);
  const moveCamera=(update:Parameters<typeof setCamera>[0])=>{clear();setCamera(update);};
  const rotate=(direction:number)=>moveCamera(c=>c.overview?{...c,rotation:((c.rotation+direction+4)%4) as Rotation}:rotateCamera({...focusCamera(state.hint?state.hint.target.map(asFloor):state.blocks,c.rotation),zoom:c.zoom},direction));
  const canTouch=!hero&&!paused,controlsDisabled=paused;
  return <View testID="island-world" style={s.world}>
    {!hero&&<View testID="island-camera" style={s.camera}>
      <Pressable accessibilityRole="button" accessibilityLabel="Xem toàn đảo" testID="island-overview" disabled={controlsDisabled} style={s.cameraButton} onPress={()=>moveCamera({...DEFAULT_CAMERA,rotation})}><Text style={s.small}>Đảo</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Căn giữa công trình" testID="island-focus" disabled={controlsDisabled} style={s.cameraButton} onPress={()=>moveCamera(focusCamera(state.blocks,rotation))}><Text style={s.small}>Nhà</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Xoay trái" testID="island-rotate-left" disabled={controlsDisabled} style={s.cameraButton} onPress={()=>rotate(-1)}><Text style={s.cameraText}>↶</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Xoay phải" testID="island-rotate-right" disabled={controlsDisabled} style={s.cameraButton} onPress={()=>rotate(1)}><Text style={s.cameraText}>↷</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Thu nhỏ" testID="island-zoom-out" disabled={controlsDisabled} style={s.cameraButton} onPress={()=>moveCamera(c=>clampCamera({...c,zoom:c.zoom-.2}))}><Text style={s.cameraText}>−</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Phóng to" testID="island-zoom-in" disabled={controlsDisabled} style={s.cameraButton} onPress={()=>moveCamera(c=>clampCamera({...c,zoom:c.zoom+.2}))}><Text style={s.cameraText}>+</Text></Pressable>
    </View>}
    <View testID="island-board" accessibilityLabel="Đảo xây dựng liên tục. Chọn Kéo để di chuyển; nhấn xem trước, thả để đặt." style={s.viewport} onLayout={e=>{const{width,height}=e.nativeEvent.layout;setSize(old=>old.width===width&&old.height===height?old:{width,height});}}
      onStartShouldSetResponder={()=>canTouch}
      onResponderGrant={e=>{if(!canTouch)return;const g=gesture.current;g.active=true;g.pan=state.tool==='pan'||e.nativeEvent.touches.length>1||disabled;g.owner=ownerOf(state);g.last={x:e.nativeEvent.locationX,y:e.nativeEvent.locationY};if(!g.pan)locate(e);}}
      onResponderMove={e=>{const g=gesture.current;if(!canTouch||!g.active)return;if(e.nativeEvent.touches.length>1){g.pan=true;g.point=null;onPreview(null,g.owner);}const p={x:e.nativeEvent.locationX,y:e.nativeEvent.locationY};if(g.pan&&g.last){const a=toWorld(g.last),b=toWorld(p);g.last=p;setCamera(c=>clampCamera({...c,x:c.x+a.x-b.x,y:c.y+a.y-b.y}));}else locate(e);}}
      onResponderRelease={()=>{const g=gesture.current;if(canTouch&&!disabled&&g.active&&!g.pan&&g.point)onCell(g.point,g.owner);clear();}}
      onResponderTerminate={clear} onResponderTerminationRequest={()=>true}>
      <Animated.View testID="island-scene" pointerEvents="none" style={[{position:'absolute',width:WORLD_W,height:WORLD_H,left:(size.width-WORLD_W)/2,top:(size.height-WORLD_H)/2},cameraStyle]}>
        <Svg width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}>
          <IslandLandscape rotation={rotation}/>
          <Geometry state={state} rotation={rotation}/>
          {!state.blocks.length&&!state.hint&&(()=>{const p=project(7.5,8,0,rotation);return <G><Circle cx={p.x} cy={p.y} r={17} fill="#F3E9B855" stroke="#F0E9C5" strokeDasharray="3 4"/><SvgText x={p.x} y={p.y-27} textAnchor="middle" fill="#4C7658" fontSize={12} fontWeight="700">Chọn vật liệu rồi xây ở đây</SvgText></G>;})()}
          {preview&&state.tool!=='pan'&&<G><Polygon points={diamond(preview,rotation,occupied)} fill={issue?'#E98F7066':'#F2EBA76B'} stroke={issue?'#E1987C':'#FFF1B1'} strokeWidth={2.2}/>{marker&&<G><Path d={`M${marker.x-48} ${marker.y-53}h96v20h-96Z`} fill="#FFF4D6"/><SvgText x={marker.x} y={marker.y-40} fontSize={10} textAnchor="middle" fill="#3E6650">{selected?.sealed&&issue?'Đã niêm phong':issue?'Chưa hợp lệ':state.tool==='remove'?'Thả để gỡ':'Thả để đặt'}</SvgText></G>}</G>}
        </Svg>
        {latest&&<Landing key={`${latest.id}:${latest.material}`} block={latest} rotation={rotation} paused={paused}/>}
      </Animated.View>
    </View>
    {!hero&&<View pointerEvents="none" style={s.caption}><Text testID="island-view-angle" style={s.captionText}>{state.tool==='pan'?`Góc ${rotation*90}° · Kéo để ngắm đảo · Xây để đặt`:`Góc ${rotation*90}° · Tầng ${state.floorIndex+1} · Viền vàng: chu vi tầng 1`}</Text></View>}
    {!hero&&state.phase!=='editing'&&<SealEffect key={state.index} paused={paused}/>}
  </View>;
});
const s=StyleSheet.create({world:{flex:1,minHeight:0,overflow:'hidden'},camera:{position:'absolute',top:0,right:0,zIndex:2,height:36,alignSelf:'flex-end',flexDirection:'row',backgroundColor:'#ECF5DEEB',borderRadius:12,margin:4,paddingHorizontal:2},cameraButton:{width:35,height:36,alignItems:'center',justifyContent:'center'},small:{fontSize:10,fontWeight:'800',color:'#35634E'},cameraText:{fontSize:23,fontWeight:'700',color:'#35634E'},viewport:{flex:1,minHeight:0,overflow:'hidden'},caption:{position:'absolute',bottom:0,zIndex:1,alignSelf:'center',paddingVertical:2,paddingHorizontal:9,borderRadius:8,backgroundColor:'#E4F0D9DB',marginBottom:4},captionText:{fontSize:9,lineHeight:13,color:'#48765E'},seal:{position:'absolute',top:'35%',alignSelf:'center',backgroundColor:'#FFF1BE',padding:14,borderRadius:16},sealText:{fontSize:16,fontWeight:'800',color:'#3C7250'}});
