import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { answerOptions } from '../data/questions';
import type { Simulation, SpeedQuestion } from '../types';

export function GameButton({label,onPress,testID,secondary=false}: {
  label:string;onPress:()=>void;testID?:string;secondary?:boolean;
}){return <Pressable accessibilityRole="button" accessibilityLabel={label} testID={testID}
  onPress={onPress} style={({pressed})=>[styles.button,secondary&&styles.secondary,pressed&&styles.pressed]}>
  <Text style={[styles.buttonText,secondary&&{color:'#243952'}]}>{label}</Text>
</Pressable>;}

export function QuestionPanel({question,onChoose}: {question:SpeedQuestion;onChoose:(speed:number)=>void}){
  return <View testID="supercar-question" style={styles.panel}>
    <Text style={styles.title}>CHỌN VẬN TỐC ĐỂ VƯỢT RÃNH</Text>
    <View style={styles.parameters}>
      <View style={styles.parameter}><Text style={styles.caption}>Quãng đường</Text><Text style={styles.value}>{question.distance} m</Text></View>
      <View style={styles.parameter}><Text style={styles.caption}>Thời gian</Text><Text style={styles.value}>{question.time} s</Text></View>
    </View>
    <Text style={styles.prompt}>Vận tốc cần đạt là bao nhiêu?</Text>
    <View style={styles.grid}>
      {answerOptions(question).map(speed=><Pressable key={speed} accessibilityRole="button"
        accessibilityLabel={`Chọn ${speed} mét mỗi giây`} testID={`supercar-answer-${speed}`}
        onPress={()=>onChoose(speed)} style={({pressed})=>[styles.answer,pressed&&styles.pressed]}>
        <Text style={styles.answerText}>{speed} m/s</Text>
      </Pressable>)}
    </View>
    <Text style={styles.hint}>Chọn một đáp án để tăng tốc</Text>
  </View>;
}
export function ResultPanel({meta,question,onReplay,saveError}: {
  meta:Simulation;question:SpeedQuestion;onReplay:()=>void;saveError:string|null;
}){
  const win=meta.phase==='victory';
  return <View testID={win?'supercar-victory':'supercar-loss'} style={[styles.panel,win?styles.winPanel:styles.lossPanel]}>
    <Text accessibilityRole="header" style={[styles.resultTitle,{color:win?'#00867b':'#cb3338'}]}>{win?'CHIẾN THẮNG!':'ĐÃ THUA'}</Text>
    {win?<>
      <Text style={styles.message}>Bạn đã thoát khỏi cuộc truy đuổi!</Text>
      <Text style={styles.completed}>Hoàn thành 5/5 chặng</Text>
    </>:<>
      <View style={styles.reason}><Text style={styles.reasonText}>{meta.speed} m/s: {meta.outcome==='low'?'chưa đủ vận tốc, xe rơi xuống rãnh':'vượt ngưỡng an toàn, xe mất kiểm soát và lật'}</Text></View>
      <View style={styles.solution}>
        <Text style={styles.solutionTitle}>Đáp án đúng: {question.correct_speed} m/s</Text>
        <Text style={styles.formula}>Vận tốc = Quãng đường : Thời gian</Text>
        <Text style={styles.value}>v = {question.distance} : {question.time} = {question.correct_speed} m/s</Text>
      </View>
    </>}
    {saveError&&<Text style={styles.hint}>Chưa lưu được kết quả trên thiết bị.</Text>}
    <GameButton label="CHƠI LẠI" onPress={onReplay} testID="supercar-replay" />
  </View>;
}
export function PausePanel({onResume,onExit}: {onResume:()=>void;onExit:()=>void}){
  return <View testID="supercar-pause-overlay" accessibilityViewIsModal style={styles.pauseOverlay}>
    <View style={styles.pausePanel}>
      <Text style={styles.pauseTitle}>ĐÃ TẠM DỪNG</Text>
      <Text style={styles.pauseText}>Cuộc truy đuổi sẽ tiếp tục khi bạn sẵn sàng.</Text>
      <GameButton label="TIẾP TỤC" onPress={onResume} testID="supercar-resume" />
      <GameButton label="THOÁT VỀ SẢNH" onPress={onExit} testID="supercar-exit" secondary />
    </View>
  </View>;
}
export function PanelDock({children,maxHeight}: {children:React.ReactNode;maxHeight:number}){
  return <View style={[styles.dock,{maxHeight}]}><ScrollView bounces={false} contentContainerStyle={styles.scroll}>{children}</ScrollView></View>;
}
const styles=StyleSheet.create({
  dock:{position:'absolute',bottom:8,left:8,right:8},scroll:{alignItems:'center'},
  panel:{width:'100%',maxWidth:540,borderRadius:22,padding:12,gap:8,backgroundColor:'#fff6e8',borderColor:'#e6b55b',borderWidth:2},
  title:{color:'#142746',fontSize:15,fontWeight:'900',textAlign:'center'},
  parameters:{flexDirection:'row',gap:12},parameter:{flex:1,alignItems:'center',padding:7,backgroundColor:'#eef5fb',borderWidth:1,borderColor:'#c8d9e8',borderRadius:12},
  caption:{fontSize:12,color:'#53718a'},value:{fontSize:21,color:'#142746',fontWeight:'900',textAlign:'center'},
  prompt:{textAlign:'center',fontSize:14,color:'#142746',fontWeight:'600'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  answer:{width:'48%',flexGrow:1,minHeight:48,justifyContent:'center',alignItems:'center',backgroundColor:'#e9f5fc',borderWidth:1.5,borderColor:'#bdd7e9',borderRadius:14},
  answerText:{fontSize:21,fontWeight:'900',color:'#152546'},hint:{fontSize:11,color:'#58687a',textAlign:'center'},
  button:{minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center',paddingVertical:10,paddingHorizontal:12,backgroundColor:'#009b98'},
  buttonText:{fontSize:17,fontWeight:'900',color:'white',textAlign:'center'},secondary:{backgroundColor:'#e9f5fc'},pressed:{opacity:.75},
  winPanel:{borderColor:'#29c7b5'},lossPanel:{borderColor:'#f1887a'},
  resultTitle:{fontSize:29,fontWeight:'900',textAlign:'center'},message:{fontSize:16,color:'#142746',textAlign:'center',paddingVertical:10},
  completed:{fontSize:21,fontWeight:'800',color:'#1e6774',textAlign:'center',marginBottom:14},
  reason:{backgroundColor:'#ffe8e3',borderRadius:12,padding:8},reasonText:{fontSize:14,color:'#ae3033',textAlign:'center',fontWeight:'700'},
  solution:{padding:10,gap:4,borderRadius:12,backgroundColor:'#e9f4fc'},solutionTitle:{fontSize:16,fontWeight:'800',color:'#142746',textAlign:'center'},
  formula:{fontSize:12,color:'#365c78',textAlign:'center'},
  pauseOverlay:{...StyleSheet.absoluteFill,backgroundColor:'#0c1c36ba',alignItems:'center',justifyContent:'center',padding:18},
  pausePanel:{width:'100%',maxWidth:420,padding:20,borderRadius:24,backgroundColor:'#142a43',gap:14,borderWidth:1,borderColor:'#647f99'},
  pauseTitle:{fontSize:25,color:'white',fontWeight:'900',textAlign:'center'},pauseText:{fontSize:14,color:'#c6d7e8',textAlign:'center',lineHeight:20},
});
