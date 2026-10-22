import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { IslandState } from '../logic/island';
import { Camera, cameraScale, CAMERA_MS, DEFAULT_CAMERA, FLOOR_H, focusCamera, WORLD_H, WORLD_W } from '../logic/projection';

/** Mission changes never move this camera. Only the player controls framing. */
export function useIslandCamera(state:IslandState,width:number,height:number,paused:boolean,hero=false){
  const key=state.session,initial=useMemo(()=>hero?DEFAULT_CAMERA:focusCamera(),[hero]);
  const [manual,setManual]=useState<{key:number;camera:Camera}>(()=>({key,camera:initial}));
  const camera=manual.key===key?manual.camera:initial;
  const setCamera=useCallback((update:Camera|((previous:Camera)=>Camera))=>setManual(previous=>({key,camera:typeof update==='function'?update(previous.key===key?previous.camera:initial):update})),[key,initial]);
  const targetY=camera.y-(camera.overview?0:state.floorIndex*FLOOR_H+(height<300?56:0));
  const x=useSharedValue(camera.x),y=useSharedValue(targetY),scale=useSharedValue(cameraScale(width,height,camera)),reduced=useReducedMotion();
  useLayoutEffect(()=>{
    cancelAnimation(x);cancelAnimation(y);cancelAnimation(scale);
    if(paused)return;
    const duration=reduced?0:CAMERA_MS;
    x.set(withTiming(camera.x,{duration}));y.set(withTiming(targetY,{duration}));scale.set(withTiming(cameraScale(width,height,camera),{duration}));
    return()=>{cancelAnimation(x);cancelAnimation(y);cancelAnimation(scale);};
  },[camera,targetY,width,height,paused,reduced,x,y,scale]);
  const style=useAnimatedStyle(()=>({transform:[{scale:scale.value},{translateX:WORLD_W/2-x.value},{translateY:WORLD_H/2-y.value}]}));
  const toWorld=useCallback((p:{x:number;y:number})=>({x:x.get()+(p.x-width/2)/scale.get(),y:y.get()+(p.y-height/2)/scale.get()}),[x,y,scale,width,height]);
  return {camera,setCamera,style,toWorld};
}
