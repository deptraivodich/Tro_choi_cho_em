import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { ART } from '../assets';
import { ANCHOR, gapWorld, ROAD_STRIDE } from '../engine/world';
import { clamp, ease } from '../animation/math';
import type { Simulation, World } from '../types';
import { SpriteCar } from './SpriteCar';
import { WorldEffects } from './WorldEffects';

interface Props {world: SharedValue<World>;simulation: SharedValue<Simulation>;width:number;height:number;}
interface Geometry extends Props {scale:number;scaleX:number;}
function Road({world,width,scale,index}: Geometry & {index:number}){
  const style=useAnimatedStyle(()=>({transform:[{translateY:((world.value.C%ROAD_STRIDE+ROAD_STRIDE)%ROAD_STRIDE+index*ROAD_STRIDE)*scale}]}));
  return <Animated.Image source={ART.road} fadeDuration={0} resizeMode="stretch"
    style={[styles.origin,{width,height:ROAD_STRIDE*scale+.5},style]} />;
}
function Gap({world,simulation,scale,scaleX,index}:Geometry & {index:number}){
  const style=useAnimatedStyle(()=>{
    const s=simulation.value,stage=index+1;
    const visible=stage<s.stage||(stage===s.stage&&s.phase!=='chase');
    const open=stage===s.stage&&s.phase==='collapse'?ease(clamp(s.elapsed/1.2)):1;
    const y=ANCHOR+world.value.C-gapWorld(stage);
    return {opacity:visible?1:0,transform:[{translateX:107*scaleX},
      {translateY:(y-89)*scale},{scaleY:Math.max(.002,open)}]};
  });
  return <Animated.Image testID={`supercar-gap-${index+1}`} source={ART.gap} resizeMode="stretch" fadeDuration={0}
    style={[styles.origin,{width:330*scaleX,height:178*scale},style]} />;
}
function Crack({world,simulation,scale,scaleX}: Geometry){
  const style=useAnimatedStyle(()=>{
    const s=simulation.value;
    return {opacity:s.phase==='chase'?clamp((s.elapsed-1.7)/.5):0,
      transform:[{translateX:128*scaleX},{translateY:(ANCHOR+world.value.C-world.value.gap)*scale}]};
  });
  return <Animated.View style={[styles.origin,{width:290*scaleX,height:7*scale},style]}>
    {Array.from({length:12},(_,index)=><View key={index} style={{position:'absolute',left:index*24*scaleX,
      width:26*scaleX,height:2*scale,backgroundColor:'#2a211e',transform:[{rotate:index%2?'12deg':'-12deg'}]}} />)}
  </Animated.View>;
}
function LaneMarks({world,scale,scaleX}:Geometry){
  const style=useAnimatedStyle(()=>({transform:[{translateY:((ANCHOR+world.value.C)%78-78)*scale}]}));
  return <Animated.View style={[StyleSheet.absoluteFill,style]}>
    {Array.from({length:24},(_,index)=><View key={index} style={{position:'absolute',left:268*scaleX,
      top:index*78*scale,width:4*scaleX,height:29*scale,backgroundColor:'#f4d373'}} />)}
  </Animated.View>;
}
function SkidMarks({world,simulation,scale,scaleX}:Geometry){
  const style=useAnimatedStyle(()=>{
    const police=['policeRoll','escape','victory'].includes(simulation.value.phase);
    const high=['impact','settle','result'].includes(simulation.value.phase)&&simulation.value.outcome==='high';
    const pose=police?world.value.police:world.value.hero;
    return {opacity:police||high ? .5 : 0,transform:[{translateX:(pose.x-22)*scaleX},
      {translateY:(pose.y+20)*scale},{rotate:`${pose.angle}rad`}]};
  });
  return <Animated.View style={[styles.origin,{width:44*scaleX,height:80*scale},style]}>
    <View style={{position:'absolute',left:0,height:'100%',width:3*scale,backgroundColor:'#29282a'}} />
    <View style={{position:'absolute',right:0,height:'100%',width:3*scale,backgroundColor:'#29282a'}} />
  </Animated.View>;
}
export function WorldScene(props: Props){
  const scaleX=props.width/540;
  // Keep cars/gap above a real 48dp answer grid on short phones. Sprite aspect stays 1:1.
  const scale=Math.min(scaleX,Math.max(.20,(props.height-290)/680));
  const geometry={...props,scale,scaleX};
  const shake=useAnimatedStyle(()=>({transform:[{translateX:props.world.value.shake*scaleX},
    {translateY:props.world.value.shake*.35*scale}]}));
  const count=Math.ceil(props.height/(ROAD_STRIDE*scale))+2;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[StyleSheet.absoluteFill,shake]}>
      {Array.from({length:count},(_,index)=><Road key={index} {...geometry} index={index-1} />)}
      <LaneMarks {...geometry} />
      <Crack {...geometry} />
      {[0,1,2,3,4].map(index=><Gap key={index} {...geometry} index={index} />)}
      <SkidMarks {...geometry} />
      <WorldEffects {...geometry} />
      <SpriteCar kind="police" {...geometry} />
      <SpriteCar kind="hero" {...geometry} />
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({origin:{position:'absolute',left:0,top:0}});
