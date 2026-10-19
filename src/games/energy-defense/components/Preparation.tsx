import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WAVE_CONFIG, type Mode } from '../logic/config';
import { MODES } from '../theme';
import { DefenseButton, IconButton } from './DefensePrimitives';
export function Preparation({ mode, onMode, onStart, onHistory, onExit }: { mode: Mode; onMode: (mode: Mode) => void; onStart: () => void; onHistory: () => void; onExit: () => void }) {
  return <ScrollView testID="energy-mode-selection" contentContainerStyle={s.page}><View style={s.wrap}>
    <View style={s.header}><IconButton icon="back" label="Về sảnh" onPress={onExit}/><Text style={s.brand}>PHÁO ĐÀI PHA LÊ</Text></View>
    <View style={s.banner}><Image source={require('../assets/round3/ground.webp')} style={{position:'absolute',left:0,top:0,width:'100%',height:'100%'}} resizeMode="cover"/><Image source={require('../assets/round3/citadel.png')} style={{ width:130,height:130 }}/><View style={{ flex:1 }}><Text style={s.title}>Thủ Thành{ '\n' }Năng Lượng</Text><Text style={s.copy}>Ghép pha lê. Bảo vệ thành trì.</Text></View></View>
    <Text style={s.section}>CHỌN HÀNH TRÌNH</Text>
    <View style={s.modes}>{MODES.map((m,i) => <Pressable key={m.id} testID={'energy-mode-'+m.id} accessibilityRole="radio" accessibilityState={{ checked: mode===m.id }} aria-selected={mode===m.id} onPress={() => onMode(m.id)}
      style={({pressed})=>[s.card,mode===m.id&&s.active,pressed&&{transform:[{scale:.99}]}]}>
      <View style={[s.number,mode===m.id&&{backgroundColor:'#326C58'}]}><Text style={[s.numberText,mode===m.id&&{color:'#FFF1C9'}]}>{m.mark}</Text></View>
      <View style={{flex:1}}><Text style={s.modeTitle}>{m.label}</Text><Text style={s.modeCopy}>{['Cộng số thập phân','Phân số & số thập phân','Phân số & hỗn số'][i]}</Text><Text style={s.stats}>{WAVE_CONFIG[m.id].length} chặng · {WAVE_CONFIG[m.id].reduce((a,b)=>a+b,0)} quái · 6 phút</Text></View>
      <View style={[s.dot,mode===m.id&&{backgroundColor:'#60936A',borderColor:'#60936A'}]}/>
    </Pressable>)}</View>
    <DefenseButton testID="energy-start" icon="play" label="BẮT ĐẦU" onPress={onStart}/>
    <DefenseButton testID="energy-history-open" label="LỊCH SỬ VÔ TẬN" tone="quiet" onPress={onHistory}/>
    <Text style={s.note}>Hoàn thành 7 chặng Thử thách để mở Vô Tận.{ '\n' }Chọn chế độ trước trận; chế độ được khóa khi đang chơi.</Text>
  </View></ScrollView>;
}
const s=StyleSheet.create({page:{flexGrow:1,padding:14,backgroundColor:'#EDF1E1'},wrap:{width:'100%',maxWidth:650,alignSelf:'center',gap:10},header:{flexDirection:'row',gap:12,alignItems:'center'},brand:{color:'#718365',fontWeight:'800',letterSpacing:1.2,fontSize:11},banner:{borderRadius:20,overflow:'hidden',height:145,flexDirection:'row',alignItems:'center',padding:8,borderWidth:2,borderColor:'#B5C395'},title:{color:'#1F433A',fontSize:27,fontWeight:'900',lineHeight:31},copy:{color:'#3E6045',fontSize:12,fontWeight:'700',marginTop:5},section:{fontSize:11,fontWeight:'900',color:'#72816A',letterSpacing:1.2,marginTop:8},modes:{gap:8},card:{flexDirection:'row',alignItems:'center',gap:12,padding:13,minHeight:92,backgroundColor:'#FAFAEF',borderWidth:2,borderColor:'#D9DFC8',borderRadius:15},active:{borderColor:'#73966B',backgroundColor:'#F4F7E8'},number:{width:36,height:40,borderRadius:10,backgroundColor:'#E1E6D1',alignItems:'center',justifyContent:'center'},numberText:{fontSize:13,fontWeight:'900',color:'#8D9B7C'},modeTitle:{fontSize:19,fontWeight:'900',color:'#315443'},modeCopy:{fontSize:12,color:'#62755A',marginTop:3},stats:{fontSize:11,color:'#7B8769',marginTop:4},dot:{width:16,height:16,borderWidth:2,borderColor:'#CAD4B9',borderRadius:8},note:{fontSize:11,color:'#738366',lineHeight:18,textAlign:'center',marginVertical:4}});
