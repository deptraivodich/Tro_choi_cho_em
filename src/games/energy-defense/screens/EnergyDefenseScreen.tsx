import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, BackHandler, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { soundManager } from '../../../shared/audio/audioController';
import { profileManager } from '../../../shared/storage/profileManager';
import { DefenseController, type EndlessRecord } from '../logic/controller';
import { WAVE_CONFIG } from '../logic/config';
import { pathPosition, travelled } from '../logic/path';
import { endlessHistory } from '../logic/history';
import { useBattleClock } from '../hooks/useBattleClock';
import { Battlefield } from '../components/Battlefield';
import { DefenseHUD } from '../components/DefenseHUD';
import { EnergyConsole } from '../components/EnergyConsole';
import { DefenseOverlay } from '../components/DefenseOverlay';
import { Preparation } from '../components/Preparation';
import { MODES } from '../theme';
export function EnergyDefenseScreen({ onExit }: { onExit: () => void }) {
  const [controller]=useState(()=>new DefenseController());
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [view,setView]=useState<'help'|'history'|null>(null);
  const [records,setRecords]=useState<EndlessRecord[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [sound,setSound]=useState(()=>soundManager.isSoundEnabled());
  const mounted=useRef(true),leaving=useRef(false),normalSaved=useRef(new Set<string>());
  const lastHp=useRef(100),lastStatus=useRef(state.status);
  useEffect(()=>{
    if(state.hp<lastHp.current)soundManager.playIncorrect();
    if(state.status==='won'&&lastStatus.current!=='won')soundManager.playVictory();
    if(state.status==='lost'&&state.reason==='timeout'&&lastStatus.current!=='lost')soundManager.playIncorrect();
    lastHp.current=state.hp;lastStatus.current=state.status;
  },[state.hp,state.status,state.reason]);
  const {width,height}=useWindowDimensions();
  const compact=width<1000||height<1000,landscape=compact&&width>=700&&width>height;
  const active=state.status==='running'&&!state.paused;
  const clock=useBattleClock(active),shotStart=useSharedValue(0);
  useEffect(()=>{if(state.shot)shotStart.set(state.shot.startAt);},[state.shot,shotStart]);
  useEffect(()=>{
    if(!active)return;
    const interval=setInterval(()=>controller.advanceTo(clock.get()),33);
    return()=>clearInterval(interval);
  },[active,controller,clock]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.dispose();};},[controller]);
  const pause=useCallback(()=>{controller.advanceTo(clock.get());controller.pause();},[clock,controller]);
  const resume=()=>{clock.set(controller.now);setView(null);controller.resume();};
  const readHistory=useCallback(async()=>{
    try{const rows=await endlessHistory.list();if(mounted.current){setRecords(rows);setError(null);}}
    catch{if(mounted.current)setError('Không đọc được lịch sử. Dữ liệu cũ được giữ nguyên; em có thể thử lại.');}
  },[]);
  const persist=useCallback(async()=>{
    const record=controller.getEndlessRecord();
    if(record)await endlessHistory.save(record);
  },[controller]);
  const choose=useCallback(async()=>{
    if(leaving.current)return;leaving.current=true;
    controller.advanceTo(clock.get());controller.finish('exit');
    try{await persist();if(mounted.current){controller.chooseAgain();clock.set(0);setView(null);setError(null);}}
    catch{if(mounted.current)setError('Chưa lưu được lượt Vô Tận. Em hãy thử lại trước khi rời màn hình.');}
    finally{leaving.current=false;}
  },[controller,clock,persist]);
  const exit=useCallback(async()=>{
    if(leaving.current)return;leaving.current=true;
    controller.advanceTo(clock.get());controller.finish('exit');
    try{await persist();onExit();}
    catch{if(mounted.current)setError('Chưa lưu được lịch sử. Em hãy thử lại.');leaving.current=false;}
  },[clock,controller,onExit,persist]);
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',next=>{if(next!=='active')pause();});
    const hidden=()=>{if(typeof document!=='undefined'&&document.hidden)pause();};
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',hidden);
    return()=>{subscription.remove();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',hidden);};
  },[pause]);
  const back=useCallback(()=>{
    if(view){setView(null);return true;}
    const current=controller.getSnapshot();
    if(current.status==='select'){void exit();return true;}
    if(current.status==='offer'){controller.acceptEndless(false);return true;}
    if(current.status==='running'){pause();return true;}
    void choose();return true;
  },[controller,view,exit,pause,choose]);
  useEffect(()=>{const listener=BackHandler.addEventListener('hardwareBackPress',back);return()=>listener.remove();},[back]);
  useEffect(()=>{
    if(!['offer','won','lost','exited'].includes(state.status))return;
    void persist().catch(()=>{if(mounted.current)setError('Chưa lưu được lịch sử Vô Tận. Hãy thử lưu lại.');});
    if(!state.endless&&state.runId&&state.status!=='exited'&&!normalSaved.current.has(state.runId)){
      normalSaved.current.add(state.runId);
      void profileManager.saveSessionResult({sessionId:state.runId,gameId:'energy-defense',profileId:'local-learner-sandbox-01',difficulty:state.mode,
        startedAt:new Date(Date.now()-state.elapsedSeconds*1000).toISOString(),completedAt:new Date().toISOString(),actualPlaytimeSeconds:state.elapsedSeconds,
        isWon:state.status==='offer'||state.status==='won',score:state.score,maxScore:Math.max(100,state.score),correctCount:state.correct,incorrectCount:state.incorrect,
        skillsPracticed:['Cộng số thập phân','Phân số tương đương','Ghép năng lượng'],schemaVersion:1}).catch(()=>{normalSaved.current.delete(state.runId);});
    }
  },[state.status,state.runId,state.endless,state.mode,state.score,state.correct,state.incorrect,state.elapsedSeconds,persist]);
  const target=useMemo(()=>{
    const enemy=state.enemies.find(e=>e.id===state.shot?.targetId);
    if(!enemy||!state.shot)return null;
    return{id:enemy.id,...pathPosition(travelled(enemy,state.shot.startAt))};
  },[state.enemies,state.shot]);
  const toggleSound=()=>{const next=!sound;setSound(next);soundManager.setSoundEnabled(next);};
  const start=()=>{clock.set(0);controller.start();soundManager.playTap();};
  const fire=()=>{controller.advanceTo(clock.get());if(controller.fire()){shotStart.set(controller.getSnapshot().shot!.startAt);soundManager.playCorrect();}else soundManager.playIncorrect();};
  const openHistory=()=>{setView('history');void readHistory();};
  const overlay=<DefenseOverlay state={state} view={view} records={records} error={error} sound={sound} onResume={resume} onChoose={()=>void choose()} onExit={()=>void exit()}
    onOffer={yes=>{clock.set(controller.now);controller.acceptEndless(yes);}} onClose={back} onHistory={openHistory} onRetry={()=>{void persist().then(readHistory).catch(()=>setError('Thiết bị chưa lưu được lịch sử. Em có thể thử lại.'));}} onSound={toggleSound}/>;
  if(state.status==='select')return <SafeAreaView style={s.root}><Preparation mode={state.mode} onMode={mode=>controller.selectMode(mode)} onStart={start} onHistory={openHistory} onExit={()=>void exit()}/>{overlay}</SafeAreaView>;
  const modeName=MODES.find(m=>m.id===state.mode)!.label;
  return <SafeAreaView edges={['top','bottom','left','right']} style={s.root} testID="energy-defense">
    <ScrollView scrollEnabled={!compact} contentContainerStyle={[s.page,compact&&{flex:1,paddingHorizontal:8,paddingBottom:2}]} showsVerticalScrollIndicator={false}>
      <View style={[s.content,compact&&{flex:1,minHeight:0}]}>
        <DefenseHUD score={state.endless?state.endlessScore:state.score} elapsed={state.endless?state.endlessSeconds:state.elapsedSeconds} total={360} sound={sound}
          compact={compact||width<800} combat={compact} dense={height<900} endless={state.endless} onExit={()=>void exit()} onSound={toggleSound} onPause={pause} onHelp={()=>{pause();setView('help');}}/>
        <View style={[s.progress,compact&&{paddingVertical:5,marginBottom:6}]} testID="energy-progression">
          <View style={{flex:1}}><Text style={s.mode}>{state.endless?'VÔ TẬN':modeName.toUpperCase()} · CHẶNG {state.wave}{!state.endless?' / '+WAVE_CONFIG[state.mode].length:''}</Text>
            <Text style={s.waveCopy}>Đã xuất hiện {state.spawned}/{state.waveTotal} · Đã xử lý {state.processed}/{state.waveTotal}</Text></View>
          <Text testID="energy-wave-count" style={s.waveCount}>{state.endless?state.endlessKills+' hạ':state.enemies.length+' trên đường'}</Text>
        </View>
        <View style={[s.layout,(width>=1000||landscape)&&s.wide,compact&&{flex:1,minHeight:0,gap:7},landscape&&{alignItems:'stretch'}]}>
          <View style={[(width>=1000||landscape)?{flex:1.5,minWidth:0}:{width:'100%'},landscape&&{flex:1}]}>
            <View style={state.paused?{opacity:0}:undefined}><Battlefield creeps={state.enemies} hp={state.hp} correct={state.correct} charged={!!state.shot} target={target} active={active} compact={compact} landscape={landscape} clock={clock} shotStart={shotStart} award={state.endless?10:25}/></View>
          </View>
          <View style={[width>=1000?{flex:1,minWidth:0,maxWidth:490}:compact?{flex:1,minHeight:0}:undefined,landscape&&{flex:1}]}>
            <EnergyConsole state={state} sum={controller.selectedSum()} compact={compact} roomy={landscape&&height>=650} onToggle={id=>{controller.toggle(id);soundManager.playTap();}} onFire={fire}/>
          </View>
        </View>
      </View>
    </ScrollView>{overlay}
  </SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#EDF1E3'},page:{flexGrow:1,paddingHorizontal:18,paddingBottom:18},content:{width:'100%',maxWidth:1400,alignSelf:'center'},layout:{gap:16},wide:{flexDirection:'row',alignItems:'flex-start',gap:20},progress:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:10,backgroundColor:'#DEE6CF',borderWidth:1,borderColor:'#CCD8B9',borderRadius:12,marginBottom:12,gap:7},mode:{fontSize:12,fontWeight:'900',color:'#3A6048'},waveCopy:{fontSize:10,color:'#6E805D',marginTop:3},waveCount:{fontSize:11,fontWeight:'800',color:'#62804E'}});
