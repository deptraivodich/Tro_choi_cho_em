import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Player } from '../types';
import { CharacterAvatar } from './CharacterAvatar';
export function PauseButton({ onPress }: { onPress: () => void }) {
  return <Pressable testID="race-pause" accessibilityRole="button" accessibilityLabel="Tạm dừng" onPress={onPress}
    style={styles.pause}><Text style={styles.pauseText}>Ⅱ</Text></Pressable>;
}
export function RaceHUD({ player, players, canRoll, rolling, intro, message, onRoll, onPause }: {
  player: Player; players: Player[]; canRoll: boolean; rolling: boolean; intro: boolean; message: string; onRoll: () => void; onPause: () => void;
}) {
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <View pointerEvents="box-none" style={styles.top}>
      <View testID="race-current-player" accessibilityLabel={player.id} style={styles.player}>
        <View><Text numberOfLines={1} style={styles.name}>{player.name}{player.isBot ? ' • Máy' : ''}</Text>
          <Text style={styles.state}>{intro ? 'Khám phá đường đua' : canRoll ? 'Đến lượt em' : 'Đang chơi'}{player.hasShield ? ' • 🛡' : ''}{player.cleanseCount ? ` • ⭐ ${player.cleanseCount}` : ''}</Text></View>
      </View>
      <View testID="race-player-roster" pointerEvents="none" style={styles.roster}>
        {players.map(participant => <View key={participant.id} testID={`race-avatar-${participant.id}`}
          accessibilityLabel={participant.name} style={[styles.participant, participant.id === player.id && styles.currentParticipant]}>
          <CharacterAvatar character={participant.character} size={34} />
        </View>)}
      </View>
      <PauseButton onPress={onPause} />
    </View>
    {!rolling && !intro && <View pointerEvents="box-none" style={styles.bottom}>
      <Text numberOfLines={2} style={styles.message}>{message}</Text>
      {canRoll && <Pressable testID="roll-dice-button" accessibilityLabel="Tung xúc xắc" accessibilityRole="button" onPress={onRoll} style={styles.roll}>
        <Text style={styles.rollText}>🎲 TUNG</Text></Pressable>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({ top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 8 },
  player: { flexDirection: 'row', gap: 8, padding: 6, paddingRight: 12, borderRadius: 14, backgroundColor: 'rgba(255,251,235,.94)', maxWidth: '48%', flexShrink: 1 },
  roster: { flexDirection: 'row', gap: 4, alignItems: 'center', marginHorizontal: 8 },
  participant: { width: 38, height: 38, borderWidth: 2, borderColor: 'transparent', borderRadius: 20, backgroundColor: 'rgba(255,251,235,.88)' },
  currentParticipant: { borderColor: '#F59E0B' }, rosterAvatar: { width: 34, height: 34 },
  name: { fontSize: 14, fontWeight: '900', color: '#78350F' }, state: { fontSize: 11, color: '#065F46', marginTop: 3 },
  pause: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: '#D97706', borderRadius: 14 },
  pauseText: { fontSize: 26, fontWeight: '900', color: '#78350F' }, bottom: { position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  message: { maxWidth: '65%', fontSize: 12, fontWeight: '700', color: '#fff', backgroundColor: 'rgba(6,78,59,.86)', padding: 7, borderRadius: 10 },
  roll: { minWidth: 100, minHeight: 52, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', borderRadius: 16, borderWidth: 2, borderColor: '#D97706' },
  rollText: { color: '#78350F', fontWeight: '900', fontSize: 17 } });
