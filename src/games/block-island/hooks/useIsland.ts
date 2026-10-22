import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { profileManager } from '../../../shared/storage/profileManager';
import { soundManager } from '../../../shared/audio/audioController';
import { useGameTimer } from '../../../shared/hooks/useGameTimer';
import { BuildPoint, createIsland, Difficulty, InputOwner, IslandEvent, IslandState, islandReducer, MaterialId, ownerOf, PROFILE, restoreGarden, resultMaximum, SAVE_KEY, SavedGarden, SavedJourneys, saveGarden, Tool } from '../logic/island';

let sequence=0;
const session=()=>{sequence=Math.max(Date.now(),sequence+1);return sequence;};
export function useIsland(){
  const [state,send]=useReducer(islandReducer,undefined,()=>createIsland());
  const [started,setStarted]=useState(false),[loaded,setLoaded]=useState(false),[storageError,setStorageError]=useState(false);
  const [savedModes,setSavedModes]=useState<Difficulty[]>([]);
  const journeys=useRef<Partial<Record<Difficulty,SavedGarden>>>({}),latest=useRef(state),active=useRef(true),running=useRef(false),paused=useRef(true);
  const startedRef=useRef(false);
  const writes=useRef(Promise.resolve()),savedResults=useRef(new Set<number>());
  const timer=useGameTimer({autoStart:false}),{pause,resume,reset}=timer;
  useLayoutEffect(()=>{latest.current=state;},[state]);
  const publish=useCallback((event:IslandEvent)=>{const before=latest.current,next=islandReducer(before,event);latest.current=next;send(event);return {before,next};},[]);
  const hold=useCallback(()=>{paused.current=true;publish({type:'PREVIEW',point:null,...ownerOf(latest.current)});pause();},[pause,publish]);
  const play=useCallback(()=>{paused.current=false;resume();},[resume]);
  useEffect(()=>{
    active.current=true;running.current=startedRef.current;let alive=true;
    profileManager.getGameState<unknown>(SAVE_KEY,PROFILE,null).then(value=>{
      if(!alive)return;const saved=value as SavedJourneys|null;
      if(saved?.version===4&&saved.journeys&&typeof saved.journeys==='object')for(const mode of ['easy','medium','hard'] as Difficulty[]){const restored=restoreGarden(saved.journeys[mode],session());if(restored?.difficulty===mode)journeys.current[mode]=saveGarden(restored);}
      setSavedModes(Object.keys(journeys.current) as Difficulty[]);
    }).catch(()=>{if(alive)setStorageError(true);}).finally(()=>{if(alive)setLoaded(true);});
    return()=>{alive=false;active.current=false;running.current=false;};
  },[]);
  const persist=useCallback((next:IslandState)=>{
    journeys.current={...journeys.current,[next.difficulty]:saveGarden(next)};
    const snapshot:SavedJourneys={version:4,journeys:{...journeys.current}};
    setSavedModes(Object.keys(snapshot.journeys) as Difficulty[]);
    writes.current=writes.current.catch(()=>{}).then(()=>profileManager.setGameState(SAVE_KEY,PROFILE,snapshot));
    writes.current.catch(()=>{if(active.current)setStorageError(true);});
  },[]);
  const command=useCallback((event:IslandEvent)=>{
    if(!active.current||!running.current||paused.current)return;
    const {before,next}=publish(event);if(next===before)return;
    if(event.type!=='PREVIEW'&&event.type!=='HINT'&&event.type!=='MATERIAL'&&event.type!=='TOOL')persist(next);
    if(event.type==='CHECK'){if(next.correct>before.correct)soundManager.playCorrect();else soundManager.playIncorrect();}
    else if(event.type!=='PREVIEW')soundManager.playTap();
  },[publish,persist]);
  const start=useCallback((difficulty:Difficulty,continueSaved=false)=>{
    const next=continueSaved?restoreGarden(journeys.current[difficulty],session())??createIsland(difficulty,session()):createIsland(difficulty,session());
    publish({type:'RESTORE',state:next});running.current=true;startedRef.current=true;setStarted(true);persist(next);reset();play();
  },[publish,persist,reset,play]);
  const restart=useCallback(()=>start(latest.current.difficulty),[start]);
  const backToStart=useCallback(()=>{hold();running.current=false;startedRef.current=false;setStarted(false);},[hold]);
  const preview=useCallback((point:BuildPoint|null,owner:InputOwner=ownerOf(latest.current))=>command({type:'PREVIEW',point,...owner}),[command]);
  const cell=useCallback((point:BuildPoint,owner:InputOwner=ownerOf(latest.current))=>{if(latest.current.tool!=='pan')command({type:latest.current.tool==='build'?'PLACE':'REMOVE',point,...owner});},[command]);
  const tool=useCallback((value:Tool)=>command({type:'TOOL',tool:value,...ownerOf(latest.current)}),[command]);
  const selectMaterial=useCallback((value:MaterialId)=>command({type:'MATERIAL',material:value,...ownerOf(latest.current)}),[command]);
  const hint=useCallback(()=>command({type:'HINT',...ownerOf(latest.current)}),[command]);
  const floor=useCallback((floorIndex:number)=>command({type:'FLOOR',floorIndex,...ownerOf(latest.current)}),[command]);
  const check=useCallback(()=>command({type:'CHECK',...ownerOf(latest.current)}),[command]);
  const undo=useCallback(()=>command({type:'UNDO',...ownerOf(latest.current)}),[command]);
  const next=useCallback(()=>command({type:'ADVANCE',...ownerOf(latest.current)}),[command]);
  // Only the explicit reset-current-mission confirmation calls this while held.
  const clear=useCallback(()=>{
    if(!active.current||!running.current)return;
    const {before,next}=publish({type:'CLEAR',...ownerOf(latest.current)});if(before!==next)persist(next);
  },[publish,persist]);
  useEffect(()=>{
    if(state.phase!=='complete'||state.resultRecorded||savedResults.current.has(state.session))return;
    savedResults.current.add(state.session);soundManager.playVictory();const now=Date.now();
    profileManager.saveSessionResult({sessionId:`bi-${state.session}`,gameId:'block-island',profileId:PROFILE,difficulty:state.difficulty,
      startedAt:new Date(now-timer.elapsedSeconds*1000).toISOString(),completedAt:new Date(now).toISOString(),actualPlaytimeSeconds:timer.elapsedSeconds,
      isWon:true,score:state.score,maxScore:resultMaximum(state),correctCount:state.correct,incorrectCount:state.incorrect,
      skillsPracticed:['Diện tích mặt bằng','Tổng diện tích sàn','Chu vi tầng 1','Cạnh chung và hình dạng'],schemaVersion:1,
    }).then(()=>{if(active.current&&latest.current.session===state.session){const {next}=publish({type:'RESULT_RECORDED',...ownerOf(latest.current)});persist(next);}}).catch(()=>{if(active.current)setStorageError(true);});
  },[state,timer.elapsedSeconds,publish,persist]);
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof document==='undefined')return;
    const hidden=()=>{if(document.hidden)hold();};document.addEventListener('visibilitychange',hidden);
    return()=>document.removeEventListener('visibilitychange',hidden);
  },[hold]);
  useEffect(()=>{const sub=AppState.addEventListener('change',status=>{if(status!=='active')hold();});return()=>sub.remove();},[hold]);
  return {state,timer:{...timer,pause:hold,resume:play},loaded,started,storageError,savedModes,start,restart,backToStart,cell,preview,tool,floor,check,undo,clear,next,selectMaterial,hint};
}
