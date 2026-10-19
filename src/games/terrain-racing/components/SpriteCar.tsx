import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { ART } from '../assets';
import { HERO_CELL, POLICE_CELL } from '../engine/world';
import type { Simulation, World } from '../types';

interface Props {
  kind: 'hero' | 'police';
  world: SharedValue<World>;
  simulation: SharedValue<Simulation>;
  scaleX: number;
  scale: number;
}
function Frame({kind,index,world}: Pick<Props,'kind'|'world'> & {index: number}) {
  const opacity=useAnimatedStyle(()=>({opacity:Math.max(0,1-Math.abs(world.value[kind].frame-index))}));
  return <Animated.Image source={ART[kind][index]} resizeMode="stretch" fadeDuration={0}
    style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'},opacity]} />;
}

export function SpriteCar({kind,world,simulation,scaleX,scale}: Props) {
  const cell=kind==='hero'?HERO_CELL:POLICE_CELL;
  const body=useAnimatedStyle(()=>{
    const pose=world.value[kind];
    return {opacity:pose.alpha,transform:[
      {translateX:pose.x*scaleX-cell*scale/2},
      {translateY:(pose.y-pose.jump)*scale-cell*scale/2},
      {rotate:`${pose.angle}rad`},{scale:pose.scale},
    ]};
  });
  const shadow=useAnimatedStyle(()=>{
    const pose=world.value[kind];
    return {opacity:pose.alpha*.22,transform:[
      {translateX:pose.x*scaleX-28*scale}, {translateY:(pose.y+15)*scale-42*scale},
      {scale:pose.scale*(1-Math.max(0,pose.jump)/400)},
    ]};
  });
  const light=useAnimatedStyle(()=>({opacity:world.value.police.frame<.3?1:0}));
  const red=useAnimatedStyle(()=>({opacity:Math.floor(simulation.value.time*6)%2===0?1:.15}));
  const blue=useAnimatedStyle(()=>({opacity:Math.floor(simulation.value.time*6)%2===1?1:.15}));
  return <>
    <Animated.View style={[styles.shadow,{width:56*scale,height:84*scale},shadow]} />
    <Animated.View testID={`supercar-${kind}`} style={[styles.car,{width:cell*scale,height:cell*scale},body]}>
      {[0,1,2].map(index=><Frame key={index} kind={kind} index={index} world={world} />)}
      {kind==='police'&&<Animated.View style={[styles.lights,{left:cell*scale/2-12*scale,top:cell*scale/2-19*scale},light]}>
        <Animated.View style={[{width:11*scale,height:6*scale,backgroundColor:'#ff3941'},red]} />
        <View style={{width:3*scale}} />
        <Animated.View style={[{width:11*scale,height:6*scale,backgroundColor:'#35bfff'},blue]} />
      </Animated.View>}
    </Animated.View>
  </>;
}
const styles=StyleSheet.create({
  car:{position:'absolute',top:0,left:0},shadow:{position:'absolute',top:0,left:0,backgroundColor:'#202722',borderRadius:100},
  lights:{position:'absolute',flexDirection:'row'},
});
