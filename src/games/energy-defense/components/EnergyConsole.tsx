import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { areFractionsEqual } from '../../../shared/math/fraction';
import type { BattleState } from '../logic/controller';
import type { Fraction } from '../../../shared/math/fraction';
import { MathNumber, sumLabel } from './MathNumber';
import { CrystalArt } from './GameArt';
import { DefenseButton, DefenseIcon } from './DefensePrimitives';
export function EnergyConsole({ state, sum, compact, roomy = false, onToggle, onFire }: { state: BattleState; sum: Fraction; compact: boolean; roomy?: boolean; onToggle: (id: string) => void; onFire: () => void }) {
  const { height } = useWindowDimensions();
  const tight = compact && !roomy && height < 700;
  const selected = state.problem.availablePieces.filter(p => state.selected.includes(p.id));
  const exact = selected.length > 0 && areFractionsEqual(sum, state.problem.targetFraction);
  const over = sum.num * state.problem.targetFraction.den > state.problem.targetFraction.num * sum.den;
  const disabled = state.paused || state.status !== 'running' || !!state.shot;
  return <View testID="energy-console" style={[s.panel, compact && s.compact]}>
    <ScrollView style={compact ? { flexGrow: 0, flexShrink: 1, minHeight: 0 } : undefined} contentContainerStyle={{ padding: compact ? roomy ? 14 : 6 : 20 }} nestedScrollEnabled>
      {(!compact || roomy) && <View style={s.heading}><DefenseIcon name="bolt" /><View><Text style={s.eyebrow}>TRẠM ĐIỀU KHIỂN</Text><Text style={s.title}>Nạp năng lượng</Text></View></View>}
      <View style={[s.math, compact && { flexDirection: 'row', gap: 7 }]}>
        <View style={[s.target, compact && { padding: 4, gap: 2, minWidth: 77 }]}><Text style={s.targetLabel}>MỤC TIÊU</Text>
          <MathNumber testID="energy-target" value={state.problem.targetDisplay} size={compact && !roomy ? 22 : 38} color="#FFF0C4" />
        </View>
        <View style={[s.equation, exact && s.ready, over && s.over, compact && { flex: 1, padding: 5, minWidth: 0, minHeight: 56 }]}>
          {!compact && <Text style={s.eyebrow}>BIỂU THỨC CỦA EM</Text>}
          <View style={[s.expression, compact && { gap: 3 }]} testID="energy-expression">
            {selected.length ? selected.map((piece,i) => <React.Fragment key={piece.id}>{i>0 && <Text style={[s.operator, compact && s.compactOperator]}>+</Text>}<MathNumber value={piece.display} size={compact ? 18 : 23} /></React.Fragment>) : <Text style={s.empty}>? + ?</Text>}
            <Text style={[s.operator, compact && s.compactOperator]}>=</Text><MathNumber value={sumLabel(sum, state.mode, selected.map(piece => piece.display))} size={compact ? 19 : 24} color={exact ? '#137E68' : '#345C50'} />
          </View>
        </View>
      </View>
      <Text testID="energy-match-status" style={[s.status, compact && {fontSize:11,lineHeight:14,marginVertical:3}, exact && { color: '#137E68' }, over && { color: '#A24B41' }]}>{exact ? 'Vừa đủ! Sẵn sàng khai hỏa.' : selected.length ? over ? 'Tổng đã vượt mục tiêu. Em kiểm tra lại nhé.' : 'Em tiếp tục ghép để đủ năng lượng.' : 'Chọn pha lê để tạo đúng năng lượng mục tiêu.'}</Text>
      {(!compact || roomy) && <Text style={s.inventoryLabel}>KHO PHA LÊ</Text>}
      <View testID="energy-inventory" style={[s.inventory, compact && !roomy && { gap: 5 }]}>
        {state.problem.availablePieces.map((piece,index) => {
          const active=state.selected.includes(piece.id);
          return <Pressable key={piece.id} testID={'energy-crystal-'+piece.id} accessibilityRole="button" accessibilityLabel={'Pha lê '+piece.display.split('(')[0].trim()} accessibilityState={{ selected: active, disabled }} aria-selected={active}
            disabled={disabled} onPress={() => onToggle(piece.id)} style={({ pressed }) => [s.crystal, { width: '30%', flexGrow: 1 }, compact && !roomy && { minWidth: 72, minHeight: tight ? 48 : 60, flexDirection: tight ? 'row' : 'column', paddingHorizontal: 3, paddingVertical:3, gap:2 }, active && s.selected, pressed && { transform: [{ scale: .96 }] }]}>
            <View style={s.gem}><CrystalArt color={(['violet','cyan','gold','pink'] as const)[index%4]} size={compact && !roomy ? tight ? 16 : 20 : 38} /></View>
            <MathNumber value={piece.display} size={compact && !roomy ? 18 : 23} color={active ? '#644B8D' : '#3C5848'} />
            {active && <View style={s.check}><DefenseIcon name="check" color="#FFFFFF" size={10} /></View>}
          </Pressable>;
        })}
      </View>
      {state.feedback && <View testID="energy-feedback" accessibilityLiveRegion="polite" style={[s.feedback, { backgroundColor: state.success ? '#E9F2E3' : '#FFF0DC' }]}><Text style={s.feedbackText}>{state.feedback}</Text>
        {state.success && <View style={s.expression}>{selected.map((p,i)=><React.Fragment key={p.id}>{i>0&&<Text style={s.operator}>+</Text>}<MathNumber value={p.display} size={17}/></React.Fragment>)}<Text style={s.operator}>=</Text><MathNumber value={state.problem.targetDisplay} size={18}/></View>}
      </View>}
    </ScrollView>
    <View style={[s.actions, compact && { padding: 5 }]}><DefenseButton testID="energy-fire" icon="bolt" compact={compact} label={state.shot ? 'Đang khai hỏa…' : 'KHAI HỎA'} disabled={disabled || !selected.length} tone={exact ? 'primary' : 'secondary'} onPress={onFire}/></View>
  </View>;
}
const s=StyleSheet.create({
  panel:{ backgroundColor:'#FCFDF6',borderWidth:1,borderColor:'#CAD8BC',borderRadius:20,overflow:'hidden' },
  compact:{ flexShrink:1,minHeight:0,borderRadius:15 },
  compactOperator:{ fontSize:18,lineHeight:22 },
  heading:{ flexDirection:'row',gap:10,alignItems:'center',marginBottom:17 },eyebrow:{ color:'#6F836B',fontSize:9,fontWeight:'800',letterSpacing:1 },title:{ color:'#234A43',fontSize:22,fontWeight:'900',marginTop:4 },
  math:{ gap:13 },target:{ backgroundColor:'#25685E',borderRadius:13,padding:15,alignItems:'center',gap:4 },targetLabel:{ color:'#CFE2C1',fontSize:10,fontWeight:'800',letterSpacing:.8 },
  equation:{ backgroundColor:'#EEF1E4',borderColor:'#D6DFCC',borderWidth:1,borderRadius:12,padding:13,minHeight:70,justifyContent:'center',gap:8 },ready:{ borderColor:'#85B392',backgroundColor:'#E9F4E5' },over:{ borderColor:'#D5A597' },
  expression:{ flexDirection:'row',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:5 },operator:{ fontSize:21,color:'#8B9B7C',fontWeight:'800' },empty:{ color:'#98A38C',fontSize:23,fontWeight:'800' },
  status:{ color:'#5D7056',fontSize:11,lineHeight:16,marginVertical:9 },inventoryLabel:{ color:'#304F40',fontSize:13,fontWeight:'900',marginVertical:9 },
  inventory:{ flexDirection:'row',flexWrap:'wrap',gap:8 },crystal:{ borderRadius:12,borderWidth:1,borderBottomWidth:3,borderColor:'#D3D6BC',backgroundColor:'#F4F1E3',minHeight:94,padding:7,alignItems:'center',justifyContent:'center',gap:3 },
  selected:{ backgroundColor:'#EBE3F4',borderColor:'#A88BC4' },gem:{ opacity:.85 },check:{ position:'absolute',right:3,top:3,backgroundColor:'#8870A4',borderRadius:7,padding:1 },
  feedback:{ marginTop:10,padding:8,borderRadius:10,gap:6 },feedbackText:{ color:'#55664B',fontSize:12,lineHeight:18 },actions:{ padding:17,paddingTop:9,borderTopWidth:1,borderColor:'#E5E9DB' },
});
