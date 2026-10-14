import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Simulation } from '../types';

export function statusText(s: Simulation): string {
  switch(s.phase){
    case 'chase':return 'Cảnh sát đang đuổi phía sau!';
    case 'collapse':return 'ĐƯỜNG PHÍA TRƯỚC SẠT LỞ!';
    case 'question':return 'Tính vận tốc để vượt rãnh';
    case 'launch':return `TĂNG TỐC · ${s.speed} m/s`;
    case 'jump':return 'ĐANG VƯỢT RÃNH';
    case 'impact':return s.outcome==='correct'?'TIẾP TỤC CHẠY':s.outcome==='low'?'CHƯA ĐỦ VẬN TỐC':'VƯỢT NGƯỠNG AN TOÀN';
    case 'heroRun':return 'TIẾP TỤC CUỘC RƯỢT ĐUỔI';
    case 'policeLaunch':case 'policeJump':return 'CẢNH SÁT ĐANG VƯỢT THEO';
    case 'transition':return `TIẾN TỚI CHẶNG ${s.stage+1}`;
    case 'policeRoll':return 'CẢNH SÁT VƯỢT RÃNH NHƯNG BỊ LẬT!';
    case 'escape':return 'TĂNG TỐC THOÁT KHỎI TRUY ĐUỔI';
    default:return '';
  }
}
export function GameHUD({meta,sound,onSound,onPause}: {
  meta:Simulation;sound:boolean;onSound:()=>void;onPause:()=>void;
}){return <View style={styles.hud}>
  <Text style={styles.title}>SIÊU XE</Text>
  <Text testID="supercar-stage" style={styles.stage}>Chặng {meta.stage}/5</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={sound?'Tắt âm thanh':'Bật âm thanh'}
    testID="supercar-sound" onPress={onSound} style={styles.control}><Text style={styles.icon}>{sound?'♪':'♪ ×'}</Text></Pressable>
  <Pressable accessibilityRole="button" accessibilityLabel="Tạm dừng" testID="supercar-pause"
    onPress={onPause} style={styles.control}><Text style={styles.icon}>Ⅱ</Text></Pressable>
</View>;}
const styles=StyleSheet.create({
  hud:{flexDirection:'row',alignItems:'center',paddingLeft:14,paddingRight:4,minHeight:56,backgroundColor:'#142942',gap:6},
  title:{flex:1,fontSize:21,fontWeight:'900',color:'white'},stage:{fontSize:14,fontWeight:'800',color:'#ffd169'},
  control:{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'},icon:{fontSize:24,color:'white'},
});
