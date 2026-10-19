import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { ANCHOR } from '../engine/world';
import { clamp, ease } from '../animation/math';
import type { Simulation, World } from '../types';

interface Props {world: SharedValue<World>;simulation: SharedValue<Simulation>;scale: number;scaleX: number;}
function Particle({world,simulation,scale,scaleX,index}: Props & {index: number}) {
  const style=useAnimatedStyle(()=>{
    const s=simulation.value,w=world.value;
    const collapse=s.phase==='collapse',roll=s.phase==='policeRoll',impact=s.phase==='impact';
    const visible=collapse||roll||impact||(!['question','result','victory','settle'].includes(s.phase)&&index<4);
    const pose=roll?w.police:w.hero;
    const life=(s.time*.55+index*.037)%1.1,p=life/1.1;
    const x=collapse?270:pose.x,y=collapse?ANCHOR+w.C-w.gap:pose.y+40;
    return {opacity:visible?(1-p)*.35:0,transform:[
      {translateX:(x+Math.sin(index*3.8)*p*95)*scaleX},
      {translateY:(y+Math.cos(index*2.4)*p*30+p*10)*scale},
      {scale:.4+p*1.5},
    ]};
  });
  return <Animated.View style={[styles.particle,{width:30*scale,height:22*scale,
    backgroundColor:index%2?'#e9d4b5':'#bda987'},style]} />;
}
function Chunk({world,simulation,scale,scaleX,index}: Props & {index:number}){
  const style=useAnimatedStyle(()=>{
    const s=simulation.value,p=clamp(s.elapsed/1.2),y=ANCHOR+world.value.C-world.value.gap;
    return {opacity:s.phase==='collapse'?(1-p)*.95:0,transform:[
      {translateX:(147+index*27+Math.sin(index*2)*p*18)*scaleX},
      {translateY:(y-60+ease(p)*105)*scale},{rotate:`${index*.32+p*3}rad`},
    ]};
  });
  return <Animated.View style={[styles.chunk,{width:15*scale,height:12*scale},style]} />;
}
function Streak({world,simulation,scale,scaleX,index}:Props & {index:number}){
  const style=useAnimatedStyle(()=>({opacity:['launch','policeLaunch','escape'].includes(simulation.value.phase) ? .4 : 0,
    transform:[{translateX:(world.value.hero.x-22+index*15)*scaleX},
      {translateY:(world.value.hero.y+40)*scale}]}));
  return <Animated.View style={[styles.streak,{height:38*scale,width:1.5*scale},style]} />;
}
export function WorldEffects(props: Props){return <>
  {Array.from({length:16},(_,index)=><Particle key={`dust-${index}`} {...props} index={index} />)}
  {Array.from({length:10},(_,index)=><Chunk key={`chunk-${index}`} {...props} index={index} />)}
  {Array.from({length:4},(_,index)=><Streak key={`streak-${index}`} {...props} index={index} />)}
</>;}
const styles=StyleSheet.create({
  particle:{position:'absolute',top:0,left:0,borderRadius:100},
  chunk:{position:'absolute',top:0,left:0,backgroundColor:'#9f9285',borderColor:'#ccba9b',borderWidth:1,borderRadius:3},
  streak:{position:'absolute',top:0,left:0,backgroundColor:'#e4f9fa'},
});
