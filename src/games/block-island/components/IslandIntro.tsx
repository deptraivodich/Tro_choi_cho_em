import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { asFloor, createIsland, Difficulty, IslandState, MODE_NAMES } from '../logic/island';
import { IslandButton } from './IslandButton';
import { INK, PAPER } from './IslandArt';
import { IslandWorld } from './IslandWorld';
const initial=createIsland('hard');
const DISPLAY:IslandState={...initial,index:5,phase:'complete',completedMissionIds:initial.quests.map(q=>q.id),blocks:initial.quests[5].witness.map(p=>({...asFloor(p),sealed:true,material:p.floorIndex===2?'wood':p.floorIndex===1?'brick':'grass'}))};
const noop=()=>{};
export function IslandIntro({difficulty,onSelect,onStart,onContinue,onExit,loaded,wide,short,hasSaved}:{difficulty:Difficulty;onSelect:(d:Difficulty)=>void;onStart:()=>void;onContinue:()=>void;onExit:()=>void;loaded:boolean;wide:boolean;short:boolean;hasSaved:boolean}) {
  return <View testID="island-intro" style={[s.root,wide&&s.wide]}>
    <View style={s.art}><IslandWorld state={DISPLAY} disabled paused={false} onCell={noop} onPreview={noop} hero/></View>
    <View style={[s.copy,wide&&{width:390,padding:24},short&&{gap:6,padding:12}]}>
      <Text style={s.eyebrow}>XÂY THẾ GIỚI CỦA EM</Text>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={[s.title,short&&{fontSize:27,lineHeight:31}]}>Lãnh Chúa Đảo Khối</Text>
      <Text maxFontSizeMultiplier={1.15} style={s.description}>Một công trình lớn lên qua sáu nhiệm vụ. Xây, ngắm blueprint và giữ thành quả trên đảo!</Text>
      <View style={s.modes}>{(['easy','medium','hard'] as Difficulty[]).map(d=><IslandButton key={d} label={MODE_NAMES[d]} testID={`island-mode-${d}`} secondary selected={difficulty===d} onPress={()=>onSelect(d)} style={{flex:1,paddingHorizontal:2}}><Text style={s.modeText}>{MODE_NAMES[d]}</Text></IslandButton>)}</View>
      <Text style={s.note}>{difficulty==='easy'?'Diện tích HOẶC chu vi · Một tầng':difficulty==='medium'?'Diện tích VÀ chu vi · Một tầng':'2–3 tầng · Tổng sàn VÀ chu vi tầng 1'}</Text>
      <IslandButton label="Bắt đầu hành trình mới" testID="island-start" disabled={!loaded} onPress={onStart}/>
      {hasSaved&&<IslandButton label={`Tiếp tục ${MODE_NAMES[difficulty]} đã lưu`} testID="island-continue" secondary onPress={onContinue}/>}
      <IslandButton label="Về sảnh trò chơi" testID="island-intro-exit" secondary onPress={onExit}/>
      {!short&&<Text style={s.note}>Kho vật liệu ∞ · 6 nhiệm vụ · Không giới hạn thời gian</Text>}
    </View>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,minHeight:0,padding:10,gap:4,maxWidth:1200,width:'100%',alignSelf:'center'},wide:{flexDirection:'row',alignItems:'center',padding:30,gap:24},art:{flex:1,minHeight:50},copy:{gap:10,padding:18,backgroundColor:PAPER,borderRadius:23,borderWidth:1,borderColor:'#E0DEC0'},eyebrow:{fontSize:9,color:'#71846A',letterSpacing:1.8,fontWeight:'800'},title:{fontSize:34,lineHeight:39,fontWeight:'900',color:INK},description:{fontSize:13,lineHeight:19,color:'#577065'},modes:{flexDirection:'row',gap:5},modeText:{fontSize:11,fontWeight:'800',color:INK},note:{fontSize:11,lineHeight:15,color:'#687E6B',textAlign:'center'}});
