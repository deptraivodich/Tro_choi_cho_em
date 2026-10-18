import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { areFractionsEqual, type Fraction } from '../../../shared/math/fraction';
import type { BattleState } from '../logic/controller';
import { CrystalArt } from './GameArt';
import { DefenseButton, DefenseIcon } from './DefensePrimitives';
import { MathNumber, sumLabel } from './MathNumber';

export function MathActionDock({ state, sum, bottom, left, right, onToggle, onFire }: {
  state: BattleState; sum: Fraction; bottom: number; left: number; right: number;
  onToggle: (id: string) => void; onFire: () => void;
}) {
  const expression = useRef<ScrollView>(null);
  const selected = state.problem.availablePieces.filter(p => state.selected.includes(p.id));
  const exact = selected.length > 0 && areFractionsEqual(sum, state.problem.targetFraction);
  const over = sum.num * state.problem.targetFraction.den > state.problem.targetFraction.num * sum.den;
  const disabled = state.paused || state.status !== 'running' || !!state.shot;
  const message = state.feedback || (exact ? 'Vừa đủ! Sẵn sàng khai hỏa.' : over ? 'Vượt mục tiêu. Em chọn lại nhé.' : 'Ghép pha lê để đủ năng lượng.');
  return <View testID="energy-console" style={[s.dock, { paddingBottom: Math.max(bottom, 6), paddingLeft: left + 8, paddingRight: right + 8 }]}>
    <View style={s.math}>
      <View style={s.target}><Text style={s.targetLabel}>MỤC TIÊU</Text><MathNumber testID="energy-target" value={state.problem.targetDisplay} size={23} color="#FFE6A2"/></View>
      <View style={[s.equation, exact && s.ready, over && s.over]}>
        <Text style={s.caption}>NĂNG LƯỢNG CỦA EM</Text>
        <ScrollView ref={expression} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => expression.current?.scrollToEnd({ animated: false })}>
          <View testID="energy-expression" style={s.expression}>
            {selected.length ? selected.map((p, i) => <React.Fragment key={p.id}>{i > 0 && <Text style={s.operator}>+</Text>}<MathNumber value={p.display} size={18}/></React.Fragment>) : <Text style={s.empty}>? + ?</Text>}
            <Text style={s.operator}>=</Text><MathNumber value={sumLabel(sum, state.mode, selected.map(p => p.display))} size={20} color={exact ? '#137E68' : '#345C50'}/>
          </View>
        </ScrollView>
      </View>
    </View>
    <View testID={state.feedback ? 'energy-feedback' : 'energy-match-status'} accessibilityLiveRegion="polite" style={s.message}>
      <Text numberOfLines={1} style={[s.messageText, over && { color: '#FFD1B8' }]}>{message}</Text>
    </View>
    <View style={s.actions}><View testID="energy-inventory" style={s.inventory}>
      {state.problem.availablePieces.map((p, i) => {
        const active = state.selected.includes(p.id);
        return <Pressable key={p.id} testID={'energy-crystal-' + p.id} accessibilityRole="button" accessibilityLabel={'Pha lê ' + p.display.split('(')[0].trim()}
          accessibilityState={{ selected: active, disabled }} aria-selected={active} disabled={disabled} onPress={() => onToggle(p.id)}
          style={({ pressed }) => [s.crystal, active && s.selected, pressed && { opacity: .8 }]}>
          <CrystalArt size={19} color={(['violet', 'cyan', 'gold', 'pink'] as const)[i % 4]}/>
          <MathNumber value={p.display} size={20} color={active ? '#604685' : '#345442'}/>
          {active && <View style={s.check}><DefenseIcon name="check" color="#FFF" size={10}/></View>}
        </Pressable>;
      })}
    </View>
    <DefenseButton testID="energy-fire" label={state.shot ? 'ĐANG KHAI HỎA…' : 'KHAI HỎA'} icon="bolt" tone={exact ? 'primary' : 'gold'} compact
      style={s.fire} disabled={disabled || !selected.length} onPress={onFire}/></View>
  </View>;
}
const s = StyleSheet.create({
  dock: { backgroundColor: '#203E32', borderTopWidth: 2, borderColor: '#B7AA6B', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 7, gap: 4 },
  math: { flexDirection: 'row', gap: 7, minHeight: 58 },
  target: { minWidth: 77, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  targetLabel: { color: '#CFD9B4', fontSize: 9, fontWeight: '800', letterSpacing: .5 },
  equation: { flex: 1, minWidth: 0, backgroundColor: '#EEF1E4', borderWidth: 1, borderColor: '#B7C6A3', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, justifyContent: 'center' },
  ready: { backgroundColor: '#E8F5DE', borderColor: '#ABD583' }, over: { borderColor: '#D99C7C' },
  caption: { color: '#6F8063', fontSize: 8, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  expression: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: '100%', minHeight: 36 },
  operator: { color: '#7D8D70', fontSize: 17, fontWeight: '800' }, empty: { color: '#8F9C83', fontSize: 22, fontWeight: '800' },
  message: { height: 15, justifyContent: 'center' }, messageText: { color: '#D3DFC0', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 6 },
  inventory: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  crystal: { width: '30%', flexGrow: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderBottomWidth: 3, borderColor: '#C6CCA8', backgroundColor: '#F1EEDC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 3 },
  selected: { backgroundColor: '#EAE0F7', borderColor: '#A786C7' }, check: { position: 'absolute', right: 3, top: 2, borderRadius: 6, backgroundColor: '#8864A6', padding: 1 },
  fire: { width: 68, minHeight: 101, paddingHorizontal: 6, flexDirection: 'column', gap: 6, borderRadius: 13 },
});
