import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { GREEN, INK } from './IslandArt';
export function IslandButton({label,onPress,testID,secondary=false,disabled=false,selected=false,style,children}:{label:string;onPress:()=>void;testID?:string;secondary?:boolean;disabled?:boolean;selected?:boolean;style?:StyleProp<ViewStyle>;children?:React.ReactNode}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} aria-disabled={disabled} aria-selected={selected} disabled={disabled} onPress={onPress}
    style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>[s.button,{backgroundColor:disabled?'#D7DFCE':secondary?'#EFF1DE':GREEN,borderColor:disabled?'#9FAD98':secondary?'#C7D0AF':'#245C44',transform:[{scale:pressed ? .98 : 1}]},hovered&&!disabled&&{borderColor:'#C99E55'},selected&&{borderColor:GREEN,borderWidth:2,backgroundColor:'#DCE8C7'},style]}>
    {children??<Text maxFontSizeMultiplier={1.2} style={[s.label,{color:secondary||disabled?INK:'#FFF9E9'}]}>{label}</Text>}
  </Pressable>;
}
const s=StyleSheet.create({button:{minHeight:48,borderRadius:13,borderWidth:1,borderBottomWidth:3,alignItems:'center',justifyContent:'center',paddingHorizontal:10},label:{fontSize:14,lineHeight:19,fontWeight:'800',textAlign:'center',paddingVertical:8}});
