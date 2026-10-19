import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BattleState } from '../logic/controller';
import { WAVE_CONFIG } from '../logic/config';
import { formatTime, MODES } from '../theme';
import { DefenseIcon, type IconName } from './DefensePrimitives';

function Tool({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [s.tool, pressed && { opacity: .7 }]}><DefenseIcon name={icon} color="#FFF2CE" size={22}/></Pressable>;
}
export function MobileDefenseHUD({ state, top, left, right, onExit, onPause, onHeight }: {
  state: BattleState; top: number; left: number; right: number; onExit: () => void; onPause: () => void; onHeight: (height: number) => void;
}) {
  const time = state.endless ? state.endlessSeconds : Math.max(0, 360 - state.elapsedSeconds);
  return <View testID="energy-mobile-hud" style={[s.hud, { paddingTop: top + 4, paddingLeft: left + 8, paddingRight: right + 8 }]}
    onLayout={e => onHeight(e.nativeEvent.layout.height)}>
    <View style={s.row}>
      <Tool icon="back" label="Về sảnh" onPress={onExit}/>
      <View style={s.modeWrap}><Text style={s.mode}>{state.endless ? 'VÔ TẬN' : MODES.find(m => m.id === state.mode)!.label.toUpperCase()}</Text>
        <Text testID="energy-progression" style={s.stage}>CHẶNG {state.wave}{state.endless ? '' : ' / ' + WAVE_CONFIG[state.mode].length}</Text></View>
      <View style={s.time}><DefenseIcon name="clock" size={16} color="#DFEAC5"/><Text testID="energy-timer" style={[s.timeText, !state.endless && time < 60 && { color: '#FFBC9B' }]}>{formatTime(time)}</Text></View>
      <Tool icon="pause" label="Tạm dừng" onPress={onPause}/>
    </View>
    <View style={[s.row, s.stats]}>
      <View style={s.health}><View style={s.hpRow}><DefenseIcon name="shield" size={14} color="#BDEBC4"/><Text testID="energy-base-hp" style={s.small}>{state.hp} / 100 HP</Text></View>
        <View style={s.track}><View style={[s.fill, { width: `${state.hp}%`, backgroundColor: state.hp > 30 ? '#A8DE9B' : '#FF9D79' }]}/></View></View>
      <View style={s.enemy}><Text testID="energy-wave-count" style={s.small}>{state.enemies.length} quái</Text><Text style={s.secondary}>Ra {state.spawned}/{state.waveTotal} · Xong {state.processed}</Text></View>
      <View style={s.score}><DefenseIcon name="star" size={16} color="#EFCE83"/><Text testID="energy-score" style={s.small}>{state.endless ? state.endlessScore : state.score} đ</Text></View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  hud: { position: 'absolute', top: 0, left: 0, right: 0, gap: 5, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tool: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#213F32', borderColor: '#A59962', borderWidth: 1, borderBottomWidth: 3, borderRadius: 16 },
  modeWrap: { flex: 1, minWidth: 0, backgroundColor: '#213F32', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 8 },
  mode: { color: '#F3E8BC', fontSize: 10, fontWeight: '900' }, stage: { color: '#CDDFC3', fontSize: 11, fontWeight: '800', marginTop: 3 },
  time: { flexDirection: 'row', gap: 4, alignItems: 'center', padding: 8, backgroundColor: '#213F32', borderRadius: 13 },
  timeText: { color: '#FFF2C9', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  stats: { backgroundColor: '#213F32', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderColor: '#69845D', borderWidth: 1, justifyContent: 'space-between' },
  health: { width: 106, gap: 3 }, hpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  small: { fontSize: 11, color: '#F1F2DA', fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#536749' }, fill: { height: '100%' },
  enemy: { alignItems: 'center', gap: 2 }, secondary: { color: '#BBD1AE', fontSize: 9 }, score: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
