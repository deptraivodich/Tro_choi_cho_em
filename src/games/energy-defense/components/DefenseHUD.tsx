import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { defense, formatTime } from '../theme';
import { CrystalArt } from './GameArt';
import { DefenseIcon, IconButton } from './DefensePrimitives';

type Props = { score: number; elapsed: number; total: number; sound: boolean; compact: boolean; dense?: boolean; combat?: boolean; endless?: boolean; onSound: () => void; onExit: () => void; onHelp: () => void; onPause: () => void };

export function DefenseHUD({ score, elapsed, total, sound, compact, dense, combat, endless = false, onSound, onExit, onHelp, onPause }: Props) {
  const remaining = Math.max(0, total - elapsed);
  const tools = <View style={s.tools}>
    <IconButton icon={sound ? 'sound' : 'mute'} label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'} onPress={onSound} />
    <IconButton icon="help" label="Hướng dẫn" onPress={onHelp} />
    <IconButton icon="pause" label="Tạm dừng" onPress={onPause} gold />
  </View>;
  return <>
    <View style={[s.header, dense && { paddingVertical: 12 }, compact && s.headerCompact, combat && { paddingVertical: 1 }]}>
      <View style={[s.headerMain, combat && { gap: 8 }]}>
        <IconButton icon="back" label="Về sảnh" onPress={onExit} />
        {!compact && <View style={s.crest}><CrystalArt size={37} /></View>}
        <View style={s.titleWrap}><Text style={[s.title, compact && s.titleSmall]}>Thủ Thành Năng Lượng</Text>
          {!compact && <Text style={s.subtitle}>PHÁO ĐÀI PHA LÊ <Text style={s.dot}> / </Text> Cộng thập phân & phân số</Text>}
        </View>
        <View style={[s.score, compact && s.scoreSmall]}>
          <DefenseIcon name="star" color="#C48D2E" size={compact ? 19 : 25} />
          <View>{!compact && <Text style={s.scoreLabel}>{endless ? 'ĐIỂM VÔ TẬN' : 'ĐIỂM NĂNG LƯỢNG'}</Text>}<Text testID="energy-score" style={s.scoreValue}>{score}<Text style={s.scoreUnit}> đ</Text></Text></View>
        </View>
        {combat ? <IconButton icon="pause" label="Tạm dừng" onPress={onPause} gold /> : !compact && tools}
      </View>
      {compact && !combat && <View style={s.mobileTools}><Text style={s.mobileTopic}>Cộng thập phân & phân số</Text>{tools}</View>}
    </View>
    <View style={[s.timeCard, dense && { marginBottom: 14 }, combat && { paddingVertical: 4, paddingHorizontal: 9, marginBottom: 6, gap: 8 }]}>
      <View style={s.timeCaption}><View style={s.clock}><DefenseIcon name="clock" color={defense.teal} size={19} /></View><Text style={s.timeLabel}>{endless ? 'Thời lượng vô tận' : 'Thời gian còn'}</Text></View>
      <View style={s.timeTrack} accessibilityRole={endless ? undefined : 'progressbar'} accessibilityLabel={endless ? 'Vô tận không giới hạn thời gian' : 'Thời gian còn lại'} accessibilityValue={endless ? undefined : { min: 0, max: total, now: remaining }}>
          <View style={[s.timeFill, { width: `${endless ? 100 : remaining / total * 100}%`, backgroundColor: !endless && remaining < 60 ? '#D98B64' : '#52BDA8' }]}><View style={s.timeHighlight} /></View>
        {[1, 2, 3, 4, 5].map(mark => <View key={mark} style={[s.timeMark, { left: `${mark / 6 * 100}%` }]} />)}
      </View>
      <Text testID="energy-timer" style={s.timeValue}>{formatTime(endless ? elapsed : remaining)}</Text>
    </View>
  </>;
}

const s = StyleSheet.create({
  header: { paddingVertical: 20, gap: 12 }, headerCompact: { paddingTop: 8, paddingBottom: 14 },
  headerMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  crest: { width: 54, height: 54, backgroundColor: '#E2EFE9', borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C5DFD3', transform: [{ rotate: '-4deg' }] },
  titleWrap: { flex: 1, minWidth: 0, gap: 5 }, title: { color: defense.ink, fontSize: 25, fontWeight: '900', letterSpacing: -.7 },
  titleSmall: { fontSize: 17, lineHeight: 23, letterSpacing: -.4 }, subtitle: { color: '#64837F', fontSize: 11, fontWeight: '600', letterSpacing: .6 }, dot: { color: '#ACC1B7' },
  tools: { flexDirection: 'row', gap: 8 }, score: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF2D2', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ECDCAC' },
  scoreSmall: { paddingHorizontal: 10, paddingVertical: 8, gap: 5 }, scoreLabel: { fontSize: 8, letterSpacing: 1, fontWeight: '800', color: '#98742F' }, scoreValue: { color: '#94672C', fontSize: 23, lineHeight: 28, fontWeight: '900', fontVariant: ['tabular-nums'] }, scoreUnit: { fontSize: 13 },
  mobileTools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, mobileTopic: { flex: 1, fontSize: 11, color: defense.muted, fontWeight: '600' },
  timeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: '#E3F0EA', borderWidth: 1, borderColor: '#D1E4D9', marginBottom: 24 },
  timeCaption: { flexDirection: 'row', gap: 8, alignItems: 'center' }, clock: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F9FDF9', alignItems: 'center', justifyContent: 'center' }, timeLabel: { color: '#52766F', fontSize: 11, fontWeight: '700' },
  timeTrack: { height: 12, flex: 1, backgroundColor: '#C9DED4', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#C0D7CB' }, timeFill: { height: '100%', borderRadius: 5 }, timeHighlight: { height: 3, backgroundColor: '#C6F1D8', marginTop: 1, marginHorizontal: 2, borderRadius: 2 }, timeMark: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#E3F0EA', opacity: .7 },
  timeValue: { color: '#287D6E', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], minWidth: 46, textAlign: 'right' },
});
