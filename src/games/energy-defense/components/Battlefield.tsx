import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { portraitCamera } from '../presentation/portrait';
import { enemyBodyPoint, enemyGroundPoint } from '../presentation/enemy';
import type { Enemy } from '../logic/controller';
import { clamp01, MAP, type ShotTarget } from '../presentation/combat';
import { AncientPortal } from './AncientPortal';
import { CreatureSprite } from './CreatureSprite';
import { CombatEffects, CrystalCitadel, CrystalTurret, Firefly, PaintedGround } from './CombatStage';
import { DefenseIcon } from './DefensePrimitives';

type Props = {
  creeps: Enemy[]; hp: number; correct: number; charged: boolean; target: ShotTarget | null;
  fullscreen?: boolean; hudHeight?: number; active: boolean; compact?: boolean; landscape?: boolean;
  clock: SharedValue<number>; shotStart: SharedValue<number>; award?: number;
};
export function Battlefield({ creeps, hp, correct, charged, target, active, compact = false, landscape = false, clock, shotStart, award = 25, fullscreen = false, hudHeight = 104 }: Props) {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const scale = width / MAP.width;
  const lastBirth = Math.max(-10000,...creeps.map(e=>e.bornAt));
  const targetPoint = useSharedValue({ x: 120, y: 100 });
  const damageStart = useSharedValue(-1000), oldHp = useSharedValue(hp);
  const previousHp = useRef(hp);
  const reduced = useReducedMotion();
  const damage = useDerivedValue(() => {
    const ms = clock.get() - damageStart.get();
    return ms < 0 || ms >= 465 ? 0 : ms < 45 ? ms / 45 : 1 - (ms - 45) / 420;
  });
  const targetId = target?.id, targetX = target?.x, targetY = target?.y, targetDistance=target?.distance;
  useEffect(() => {
    if (targetId !== undefined && targetX !== undefined && targetY !== undefined) {
      const distance = targetDistance ?? (targetY <= 70 ? targetX : targetX <= 170 ? 170 + targetY - 70 : 245 + targetX - 170);
      targetPoint.set(enemyBodyPoint(enemyGroundPoint(distance, targetId, fullscreen), 72));
    }
  }, [targetId, targetX, targetY, targetDistance, targetPoint, fullscreen]);
  useEffect(() => {
    if (hp < previousHp.current) {
      oldHp.set(previousHp.current);
      damageStart.set(clock.get());
    } else oldHp.set(hp);
    previousHp.current = hp;
  }, [hp, damageStart, oldHp, clock]);
  const hpFill = useAnimatedStyle(() => ({ width: `${oldHp.get() + (hp - oldHp.get()) * (reduced ? 1 : clamp01((clock.get() - damageStart.get()) / 180))}%` as `${number}%` }));
  const outline = useAnimatedStyle(() => ({ opacity: damage.get() * .7 }));
  const status = !active ? 'TẠM DỪNG' : hp <= 30 ? 'BẢO VỆ CĂN CỨ!' : 'ĐANG PHÒNG THỦ';
  const health = <View style={[s.hpBadge, compact && s.hpCompact, landscape && s.hpLandscape]}>
    {!compact && <View style={s.hpCaption}><DefenseIcon name="shield" size={14} color="#D6EBCF" /><Text style={s.hpName}>Căn cứ Hoàng Gia</Text></View>}
    <View style={s.hpLine}>{compact && <DefenseIcon name="shield" size={13} color={hp > 30 ? '#CFF8D8' : '#FFC7A1'} />}<Text testID="energy-base-hp" style={[s.hpValue, compact && s.hpValueCompact]}>{hp}<Text style={s.hpMax}> / 100 HP</Text></Text></View>
    <View style={s.hpTrack}><Animated.View style={[s.hpFill, { backgroundColor: hp > 30 ? '#A5E7B5' : '#FFAD80' }, hpFill]} /></View>
  </View>;
  if (fullscreen) {
    const camera = portraitCamera(width, height, hudHeight + 4);
    return <View testID="energy-battlefield" style={{ flex: 1, minHeight: 0 }}>
      <View testID="energy-combat-viewport" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        onLayout={e => { setWidth(e.nativeEvent.layout.width); setHeight(e.nativeEvent.layout.height); }}>
        <Image source={require('../assets/round3/ground.webp')} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill}/>
        {width > 0 && height > 0 && <View pointerEvents="none" testID="energy-portrait-world" style={{ position: 'absolute', width: 440, height: 700, left: camera.x, top: camera.y, transformOrigin: [0, 0, 0], transform: [{ scale: camera.scale }] }}>
          <PaintedGround portrait/>
          <AncientPortal portrait clock={clock} lastBirth={lastBirth}/>
          <CrystalCitadel portrait hp={hp} damage={damage} clock={clock}/>
          <CrystalTurret portrait clock={clock} start={shotStart} targetPoint={targetPoint} firing={charged}/>
          {creeps.map(creep => <CreatureSprite key={creep.id} portrait creep={creep} scale={1} active={active}
            tracked={creep.id === (target?.id ?? creeps[0]?.id)} attacked={charged && creep.id === target?.id}
            clock={clock} shotStart={shotStart} targetPoint={targetPoint}/>)}
          <AncientPortal portrait foreground clock={clock} lastBirth={lastBirth}/>
          {charged && <View style={[StyleSheet.absoluteFill,{zIndex:4}]}><CombatEffects portrait clock={clock} start={shotStart} targetPoint={targetPoint} firing={charged} hasTarget={!!target} award={award}/></View>}
        </View>}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.damageOutline, outline]}/>
      </View>
    </View>;
  }
  return <View style={[s.card, compact && s.cardCompact]} testID="energy-battlefield">
    {!landscape && <View style={[s.heading, compact && s.headingCompact]}>
      <View>{!compact && <Text style={s.eyebrow}>VÙNG PHÒNG THỦ</Text>}<Text style={[s.name, compact && s.nameCompact]}>Thung lũng pha lê</Text>
      </View>
      {compact ? health : <View style={s.live}><View style={[s.liveDot, !active && { backgroundColor: '#EBC576' }]} /><Text style={s.liveText}>{status}</Text></View>}
    </View>}
    <View testID="energy-combat-viewport" style={[s.scene, landscape && { aspectRatio: 700 / 400 }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && <>
        <View pointerEvents="none" style={[s.world, { transform: [{ scale }], transformOrigin: [0, 0, 0] }]}>
          <PaintedGround />
          <AncientPortal clock={clock} lastBirth={lastBirth}/>
          <CrystalCitadel hp={hp} damage={damage} clock={clock} />
          <CrystalTurret clock={clock} start={shotStart} targetPoint={targetPoint} firing={charged} />
          {[0, 1, 2].map(index => <Firefly key={index} index={index} clock={clock} />)}
        </View>
        {creeps.map(creep => <CreatureSprite key={creep.id} creep={creep} scale={scale} active={active}
          tracked={creep.id === (target?.id ?? creeps[0]?.id)} attacked={charged && creep.id === target?.id}
          clock={clock} shotStart={shotStart} targetPoint={targetPoint} />)}
        <View pointerEvents="none" style={[s.world,{zIndex:2,transform:[{scale}],transformOrigin:[0,0,0]}]}>
          <AncientPortal foreground clock={clock} lastBirth={lastBirth}/>
        </View>
        {charged && <View pointerEvents="none" style={[s.world, { zIndex:4, transform: [{ scale }], transformOrigin: [0, 0, 0] }]}>
          <CombatEffects clock={clock} start={shotStart} targetPoint={targetPoint} firing={charged} hasTarget={!!target} award={award} />
        </View>}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.damageOutline, outline]} />
      </>}
      {(!compact || landscape) && health}
    </View>
    {!compact && <View style={s.bottom}><View style={s.missionIcon}><DefenseIcon name="shield" color="#C3EACB" size={25} /></View>
      <View style={s.mission}><Text style={s.missionTitle}>Giữ vững căn cứ!</Text><Text style={s.missionCopy}>Ghép năng lượng đúng để đẩy lùi quái vật.</Text></View>
      <View style={s.solved}><Text style={s.solvedValue}>{correct.toString().padStart(2, '0')}</Text><Text style={s.solvedLabel}>CÂU ĐÚNG</Text></View>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 23, backgroundColor: '#163E43', overflow: 'hidden', borderWidth: 1, borderColor: '#286265', boxShadow: '0 12px 30px rgba(20,63,58,.12)' },
  cardCompact: { borderRadius: 16, boxShadow: 'none' },
  heading: { paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, headingCompact: { paddingHorizontal: 10, paddingVertical: 6, minHeight: 38, flexWrap: 'nowrap' },
  eyebrow: { color: '#81B6A8', fontSize: 8, fontWeight: '800', letterSpacing: 1.8 }, name: { color: '#F0F3D9', fontSize: 17, fontWeight: '800', marginTop: 4 }, nameCompact: { fontSize: 12, marginTop: 0 }, freezeLabel: { color: '#EADAA7', fontSize: 9, marginTop: 2 },
  live: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, backgroundColor: '#224E50' }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#83E4B0' }, liveText: { fontSize: 8, letterSpacing: .5, color: '#B5DCCE', fontWeight: '700' },
  scene: { width: '100%', aspectRatio: 700 / 440, overflow: 'hidden', backgroundColor: '#659878' }, world: { position: 'absolute', left: 0, top: 0, width: 700, height: 440 }, damageOutline: { borderWidth: 4, borderColor: '#FFD6A5', backgroundColor: 'rgba(255,206,156,.08)' },
  hpBadge: { position: 'absolute', top: 14, right: 14, padding: 10, backgroundColor: 'rgba(18,61,56,.94)', borderRadius: 13, borderWidth: 1, borderColor: '#9BC4A0', minWidth: 132 }, hpCompact: { position: 'relative', top: undefined, right: undefined, padding: 0, backgroundColor: 'transparent', minWidth: 96, borderWidth: 0, borderRadius: 0 }, hpLandscape: { position: 'absolute', top: 7, right: 7, padding: 6, backgroundColor: 'rgba(18,61,56,.94)', borderRadius: 9 },
  hpCaption: { flexDirection: 'row', gap: 5, alignItems: 'center', marginBottom: 5 }, hpName: { fontSize: 10, color: '#E7F2D9', fontWeight: '700' }, hpLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }, hpTrack: { height: 4, borderRadius: 3, backgroundColor: '#48665A', marginTop: 4, overflow: 'hidden' }, hpFill: { height: '100%', borderRadius: 3 }, hpValue: { color: '#E6FFD7', fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] }, hpValueCompact: { fontSize: 12 }, hpMax: { fontSize: 9, color: '#B5D5B7' },
  bottom: { flexDirection: 'row', padding: 19, gap: 12, alignItems: 'center' }, missionIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#28554F', borderWidth: 1, borderColor: '#426C5C' }, mission: { flex: 1, gap: 5 }, missionTitle: { fontSize: 14, color: '#EDF3D7', fontWeight: '700' }, missionCopy: { color: '#B0CEB7', fontSize: 11, lineHeight: 16 }, solved: { paddingLeft: 16, borderLeftWidth: 1, borderColor: '#38605A', alignItems: 'center' }, solvedValue: { fontSize: 26, color: '#EBD38A', fontWeight: '800' }, solvedLabel: { fontSize: 7, color: '#A4C3AB', letterSpacing: 1, fontWeight: '700' },
});
