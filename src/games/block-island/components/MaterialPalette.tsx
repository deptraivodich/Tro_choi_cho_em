import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GROUP_NAMES, MaterialGroup, MaterialId, MATERIALS } from '../logic/materials';
import { MaterialIcon } from './MaterialArt';
export function MaterialPalette({selected,disabled,onSelect}:{selected:MaterialId;disabled:boolean;onSelect:(id:MaterialId)=>void}){
  const [group,setGroup]=useState<MaterialGroup>('earth');
  return <View testID="island-inventory" style={s.root}>
    <View style={s.tabs}><Text accessibilityLabel="Kho vật liệu không giới hạn" style={s.infinity}>∞</Text>{(Object.keys(GROUP_NAMES) as MaterialGroup[]).map(g=><Pressable key={g} testID={`island-category-${g}`} accessibilityRole="tab" accessibilityState={{selected:group===g}} onPress={()=>setGroup(g)} style={[s.tab,group===g&&s.activeTab]}><Text maxFontSizeMultiplier={1.15} style={s.tabText}>{GROUP_NAMES[g]}</Text></Pressable>)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.items} testID="island-material-items">{MATERIALS.filter(m=>m.group===group).map(m=><Pressable key={m.id} testID={`island-material-${m.id}`} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${m.name}, không giới hạn. ${m.note}`} accessibilityState={{selected:selected===m.id,disabled}} onPress={()=>onSelect(m.id)} style={[s.item,selected===m.id&&s.selected]}><MaterialIcon id={m.id} size={30}/><Text maxFontSizeMultiplier={1.1} style={s.name}>{m.name}</Text></Pressable>)}</ScrollView>
  </View>;
}
const s=StyleSheet.create({root:{backgroundColor:'#FFF8E7',borderRadius:14,borderWidth:1,borderColor:'#D0D6B7',overflow:'hidden'},tabs:{height:26,flexDirection:'row',alignItems:'center',gap:3,paddingHorizontal:4},infinity:{fontSize:18,fontWeight:'700',color:'#5D815E',width:20,textAlign:'center'},tab:{flex:1,height:24,alignItems:'center',justifyContent:'center',borderRadius:7},activeTab:{backgroundColor:'#DCE9C9'},tabText:{fontSize:10,lineHeight:14,fontWeight:'800',color:'#416A54'},items:{paddingHorizontal:4,gap:4,paddingBottom:3},item:{width:59,height:48,borderRadius:9,borderWidth:1,borderColor:'transparent',alignItems:'center',justifyContent:'center'},selected:{backgroundColor:'#DFEBC8',borderColor:'#4E8C5C'},name:{fontSize:9,lineHeight:13,color:'#315B48',fontWeight:'700'}});
