import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler } from 'react-native';
import { Asset } from 'expo-asset';
import { useIsFocused } from 'expo-router';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { runOnJS, runOnUI, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { ART, WAV } from '../assets';
import { GameAudio, type SoundName, type PlayerPort } from '../audio/GameAudio';
import { QUESTIONS } from '../data/questions';
import { TerrainQuestions } from '../data/questionGenerator';
import { questionHistory } from '../../../shared/math/questionHistory';
import { advanceSimulation, chooseSpeed, initialSimulation } from '../engine/simulation';
import { worldAt } from '../engine/world';
import type { Simulation } from '../types';
import { profileManager } from '../../../shared/storage/profileManager';

const TARGETS=QUESTIONS.map(q=>q.correct_speed);
export function useSupercar(onExit: () => void) {
  const focused=useIsFocused();
  const [meta,setMeta]=useState(()=>initialSimulation());
  const [questionBank]=useState(()=>new TerrainQuestions());
  const [question,setQuestion]=useState(QUESTIONS[0]);
  const questionRef=useRef(question);
  const simulation=useSharedValue(meta);
  const alive=useSharedValue(true);
  const world=useDerivedValue(()=>worldAt(simulation.value));
  const [ready,setReady]=useState(false);
  const [loadError,setLoadError]=useState<string|null>(null);
  const [sound,setSound]=useState(false);
  const audio=useRef<GameAudio|null>(null);
  const active=useRef(true),session=useRef(1),revision=useRef(0),locked=useRef(false);
  const saved=useRef(new Set<number>());
  const started=useRef(new Date().toISOString());
  const [saveError,setSaveError]=useState<string|null>(null);

  const publish=useCallback((next: Simulation)=>{
    if(!active.current||next.session!==session.current||next.revision<revision.current)return;
    revision.current=next.revision;
    if(next.phase==='question'&&!next.paused)locked.current=false;
    audio.current?.setSuspended(next.paused);
    audio.current?.setPhase(next.phase,next.outcome!=='correct');
    if(next.stage!==questionRef.current.stage){const q=questionBank.forStage(next.stage);questionRef.current=q;setQuestion(q);}
    setMeta(next);
  },[questionBank]);

  useEffect(()=>{
    let cancelled=false;
    void questionHistory.ready.then(()=>{if(!cancelled){const q=questionBank.forStage(1);questionRef.current=q;setQuestion(q);}});
    return()=>{cancelled=true;};
  },[questionBank]);

  const frame=useFrameCallback(info=>{
    'worklet';
    if(!alive.value||simulation.value.paused)return;
    const before=simulation.value;
    const next=advanceSimulation(before,(info.timeSincePreviousFrame||0)/1000,TARGETS);
    simulation.set(next);
    if(next.revision!==before.revision)runOnJS(publish)(next);
  },false);
  const setFrameActive=frame.setActive;

  useEffect(()=>{
    active.current=true;alive.set(true);
    let cancelled=false;
    void Asset.loadAsync([ART.road,ART.gap,...ART.hero,...ART.police]).then(()=>{
      if(!cancelled)setReady(true);
    }).catch(error=>{if(!cancelled)setLoadError(String(error));});
    const players={} as Record<SoundName,PlayerPort>;
    for(const name of Object.keys(WAV) as SoundName[])players[name]=createAudioPlayer(WAV[name],{updateInterval:500});
    const controller=new GameAudio(players);audio.current=controller;
    // Playback only. Background and recording are disabled; no microphone prompt.
    void setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false,allowsRecording:false,
      interruptionMode:'mixWithOthers'}).catch(error=>{controller.error=String(error);});
    return ()=>{
      cancelled=true;active.current=false;alive.set(false);controller.dispose();audio.current=null;
    };
  },[alive]);

  useEffect(()=>{
    setFrameActive(ready&&focused);
    return ()=>setFrameActive(false);
  },[ready,focused,setFrameActive]);

  const setPaused=useCallback((paused: boolean)=>{
    if(!active.current)return;
    audio.current?.setSuspended(paused);
    const expected=session.current;
    runOnUI((value: boolean, id: number)=>{
      'worklet';
      if(!alive.value||simulation.value.session!==id)return;
      const next={...simulation.value,paused:value,revision:simulation.value.revision+1};
      simulation.set(next);runOnJS(publish)(next);
    })(paused,expected);
  },[alive,simulation,publish]);

  useEffect(()=>{
    if(!focused)setPaused(true);
  },[focused,setPaused]);

  useEffect(()=>{
    const app=AppState.addEventListener('change',state=>{if(state!=='active')setPaused(true);});
    if(AppState.currentState&&AppState.currentState!=='active')setPaused(true);
    const back=focused?BackHandler.addEventListener('hardwareBackPress',()=>{setPaused(true);return true;}):null;
    return ()=>{app.remove();back?.remove();};
  },[setPaused,focused]);

  const choose=useCallback((speed: number)=>{
    if(!active.current||locked.current||meta.paused||meta.phase!=='question'||
      !question.sample_choices.includes(speed))return;
    locked.current=true;
    audio.current?.play('select');
    const expected=session.current;
    runOnUI((value: number,id: number)=>{
      'worklet';
      if(!alive.value)return;
      const next=chooseSpeed(simulation.value,value,id);
      if(next===simulation.value)return;
      simulation.set(next);runOnJS(publish)(next);
    })(speed,expected);
  },[alive,simulation,publish,meta,question]);

  const replay=useCallback(()=>{
    if(!active.current)return;
    session.current++;revision.current=0;locked.current=false;started.current=new Date().toISOString();
    audio.current?.replay();setSaveError(null);
    questionBank.reset();const q=questionBank.forStage(1);questionRef.current=q;setQuestion(q);
    const next=initialSimulation(session.current,TARGETS[0]);
    simulation.set(next);setMeta(next);
  },[simulation,questionBank]);
  const toggleSound=useCallback(()=>{
    const enabled=!sound;setSound(enabled);audio.current?.setEnabled(enabled);
  },[sound]);
  const exit=useCallback(()=>{
    if(!active.current)return;
    active.current=false;alive.set(false);setFrameActive(false);audio.current?.dispose();onExit();
  },[alive,onExit,setFrameActive]);

  useEffect(()=>{
    if(!['result','victory'].includes(meta.phase)||saved.current.has(meta.session))return;
    saved.current.add(meta.session);
    const id=meta.session;
    void profileManager.saveSessionResult({sessionId:`tr-${started.current}-${id}`,gameId:'terrain-racing',
      profileId:'local-learner-sandbox-01',difficulty:'medium',startedAt:started.current,
      completedAt:new Date().toISOString(),actualPlaytimeSeconds:meta.time,isWon:meta.phase==='victory',
      score:meta.completed*60,maxScore:300,correctCount:meta.completed,incorrectCount:meta.phase==='result'?1:0,
      skillsPracticed:['Vận tốc v = s / t','Toán chuyển động đều'],schemaVersion:1,
    }).catch(error=>{if(active.current&&session.current===id)setSaveError(String(error));});
  },[meta]);
  return {meta,question,simulation,world,ready,loadError,saveError,sound,choose,replay,toggleSound,setPaused,exit};
}
