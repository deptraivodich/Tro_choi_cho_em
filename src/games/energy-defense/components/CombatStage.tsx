import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { portraitPoint, scenePoint } from '../presentation/portrait';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { clamp01, MAP, muzzleAt, projectileAt, recoilAt, SHOT, type Point } from '../presentation/combat';

type Timeline = { clock: SharedValue<number>; start: SharedValue<number>; firing: boolean; targetPoint: SharedValue<Point>; portrait?: boolean };
const road = 'M-25 134H327Q351 134 351 158V245Q351 269 375 269H611';
export const PaintedGround = React.memo(function PaintedGround({ portrait = false }: { portrait?: boolean }) {
  return <>
    {!portrait && <Image source={require('../assets/round3/ground.webp')} resizeMode="stretch" fadeDuration={0} style={s.fillImage} />}
    <Svg width={portrait ? 440 : 700} height={portrait ? 700 : 440} viewBox={portrait ? "0 0 440 700" : "0 0 700 440"} style={StyleSheet.absoluteFill}><G transform={portrait ? "matrix(0 1 -1 0 440 0)" : undefined}>
      <Path d={road} transform="translate(0 4)" stroke="#46502D" strokeWidth={66} strokeLinejoin="round" fill="none" opacity={.35} />
      <Path d={road} stroke="#4F6132" strokeWidth={64} strokeLinejoin="round" fill="none" />
      <Path d={road} stroke="#B4995E" strokeWidth={58} strokeLinejoin="round" fill="none" />
      <Path d={road} stroke="#DCC18A" strokeWidth={51} strokeLinejoin="round" fill="none" />
      <Path d={road} stroke="#ECD29A" strokeWidth={38} strokeLinejoin="round" strokeDasharray="3 14" strokeOpacity={.3} fill="none" />
      {[55, 115, 202, 274].map((x,i) => <G key={x}><Ellipse cx={x} cy={126+i%2*14} rx={4} ry={2} fill="#B99A62" /><Path d={'M'+(x+9)+' 146l6-2'} stroke="#B69A65" strokeWidth={2} /></G>)}
      {!portrait && <Ellipse cx={216} cy={329} rx={70} ry={21} fill="#374B2C" opacity={.28} />}
      <G transform="translate(12 93)"><Path d="M0 55V8h13v47m27 0V8h13v47M-4 10V0h61v10Z" fill="#A58250" stroke="#4F4E32" strokeWidth={3} /><Path d="M7 4h43" stroke="#E5C58C" strokeWidth={3} /></G>
    </G>{portrait && <Ellipse cx={186} cy={288} rx={70} ry={21} fill="#374B2C" opacity={.28}/>}</Svg>
  </>;
});

export function CrystalTurret({ clock, start, firing, targetPoint, portrait = false }: Timeline) {
  const reduced = useReducedMotion();
  const turret = scenePoint({ x: MAP.turretX, y: MAP.turretY }, portrait);
  const head = useAnimatedStyle(() => {
    const p = targetPoint.get();
    const angle = Math.atan2(p.y - turret.y, p.x - turret.x);
    const ms = firing ? clock.get() - start.get() : -1;
    const recoil = recoilAt(ms, reduced);
    return { transform: [{ rotate: `${angle}rad` }, { translateX: -recoil }] };
  });
  const core = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1;
    const charge = ms >= 0 && ms < SHOT.charge ? ms / SHOT.charge : ms >= SHOT.charge && ms < SHOT.end ? 1 - (ms - SHOT.charge) / (SHOT.end - SHOT.charge) : 0;
    return { opacity: .12 + charge * .65 + (reduced ? 0 : Math.sin(clock.get() / 650) * .04), transform: [{ scale: 1 + charge * .28 }] };
  });
  return <View pointerEvents="none" testID="energy-turret" style={StyleSheet.absoluteFill}>
    <Image testID="energy-turret-base" source={require('../assets/round3/turret-base.png')} fadeDuration={0} style={[s.turretBase, portrait && { left: turret.x - 74, top: turret.y + 72 - 148 * .93 }]} />
    <Animated.View testID="energy-turret-head" style={[s.turretHead, portrait && { left: turret.x - 82, top: turret.y - 82 }, head]}>
      <Image source={require('../assets/round3/turret-head.png')} fadeDuration={0} style={s.fillImage} />
      <Animated.View style={[s.core, core]} />
      <View testID="energy-muzzle-anchor" style={{ position: 'absolute', left: 148, top: 81, width: 2, height: 2 }} />
    </Animated.View>
  </View>;
}

export function CrystalCitadel({ hp, damage, clock, portrait = false }: { hp: number; damage: SharedValue<number>; clock: SharedValue<number>; portrait?: boolean }) {
  const reduced = useReducedMotion();
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: reduced ? 0 : Math.sin(damage.get() * Math.PI * 6) * damage.get() * 4 }] }));
  const shield = useAnimatedStyle(() => ({ opacity: .15 + damage.get() * .7 + (hp <= 30 && !reduced ? Math.sin(clock.get() / 350) * .1 + .1 : 0), transform: [{ scale: 1 + damage.get() * .08 }] }));
  const flash = useAnimatedStyle(() => ({ opacity: damage.get() * .6 }));
  return <View pointerEvents="none" testID="energy-citadel" style={[s.citadel, portrait && { left: portraitPoint({ x: MAP.baseX, y: MAP.baseY }).x - 100, top: MAP.baseX - 200 * .953 }]}>
    <View style={s.castleShadow} />
    <Animated.View style={[StyleSheet.absoluteFill, shake]}><Image source={require('../assets/round3/citadel.png')} fadeDuration={0} style={s.fillImage} />
      <Animated.Image source={require('../assets/round3/citadel.png')} fadeDuration={0} tintColor="#FFE6A8" style={[s.fillImage, flash]} />
    </Animated.View>
    <Animated.View style={[s.shield, { borderColor: hp <= 30 ? '#FFB38E' : '#AFF5DF', backgroundColor: hp <= 30 ? 'rgba(245,136,104,.1)' : 'rgba(170,255,221,.06)' }, shield]} />
  </View>;
}

function MagicParticle({ index, clock, start, targetPoint, firing }: Timeline & { index: number }) {
  const reduced = useReducedMotion();
  const motion = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1;
    const progress = clamp01((ms - SHOT.impact) / (SHOT.end - SHOT.impact));
    const p = targetPoint.get(), angle = index / 6 * Math.PI * 2;
    return { opacity: ms >= SHOT.impact && ms < SHOT.end ? (1 - progress) * .95 : 0,
      transform: [{ translateX: p.x - 3 + Math.cos(angle) * progress * (reduced ? 8 : 37) }, { translateY: p.y - 3 + Math.sin(angle) * progress * (reduced ? 8 : 32) + progress * progress * 12 }, { rotate: `${index * 60 + progress * 100}deg` }, { scale: 1 - progress * .6 }] };
  });
  return <Animated.View style={[s.spark, index % 2 === 0 && { backgroundColor: '#FFF4C6' }, motion]} />;
}

export function CombatEffects({ clock, start, firing, targetPoint, hasTarget, award = 25, portrait = false }: Timeline & { hasTarget: boolean; award?: number }) {
  const reduced = useReducedMotion();
  const turret = scenePoint({ x: MAP.turretX, y: MAP.turretY }, portrait);
  const charge = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1;
    const t = clamp01(ms / SHOT.charge);
    return { opacity: ms >= 0 && ms < SHOT.charge ? .75 : 0, transform: [{ scale: reduced ? 1 : 1.5 - t * .65 }, { rotate: `${t * 65}deg` }] };
  });
  const muzzle = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1;
    const p = targetPoint.get(), angle = Math.atan2(p.y - turret.y, p.x - turret.x), origin = muzzleAt(angle, recoilAt(ms, reduced), turret);
    return { opacity: hasTarget && ms >= SHOT.charge && ms < SHOT.charge + 95 ? 1 - (ms - SHOT.charge) / 95 : 0,
      transform: [{ translateX: origin.x - 17 }, { translateY: origin.y - 17 }, { scale: reduced ? 1 : 1 + clamp01((ms - SHOT.charge) / 95) }] };
  });
  const projectile = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1;
    const p = targetPoint.get(), angle = Math.atan2(p.y - turret.y, p.x - turret.x), origin = muzzleAt(angle, recoilAt(ms, reduced), turret);
    const point = projectileAt(ms, origin, p);
    return { opacity: hasTarget && ms >= SHOT.charge && ms < SHOT.impact ? 1 : 0,
      transform: [{ translateX: point.x - 16 }, { translateY: point.y - 8 }, { rotate: `${angle}rad` }] };
  });
  const impact = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1, p = targetPoint.get();
    const t = clamp01((ms - SHOT.impact) / 210);
    return { opacity: hasTarget && ms >= SHOT.impact && ms < SHOT.impact + 210 ? 1 - t : 0,
      transform: [{ translateX: p.x - 26 }, { translateY: p.y - 26 }, { scale: reduced ? 1 : .5 + t * 1.4 }, { rotate: `${t * 40}deg` }] };
  });
  const score = useAnimatedStyle(() => {
    const ms = firing ? clock.get() - start.get() : -1, p = targetPoint.get();
    const t = clamp01((ms - SHOT.impact) / (SHOT.end - SHOT.impact));
    return { opacity: hasTarget && ms >= SHOT.impact && ms < SHOT.end ? 1 - t * .5 : 0,
      transform: [{ translateX: p.x - 24 }, { translateY: p.y - 28 - (reduced ? 0 : t * 28) }] };
  });
  return <View pointerEvents="none" testID="energy-shot" style={StyleSheet.absoluteFill}>
    <Animated.View testID="energy-charge" style={[s.charge, portrait && { left: turret.x - 29, top: turret.y - 29 }, charge]}><View style={s.chargeInner} /></Animated.View>
    <Animated.View testID="energy-muzzle" style={[s.muzzle, muzzle]}><View style={s.muzzleCore} /></Animated.View>
    <Animated.View testID="energy-projectile" style={[s.projectile, projectile]}><View style={s.trail} /><View style={s.projectileCore} /></Animated.View>
    <Animated.View testID="energy-impact" style={[s.impact, impact]}><Svg width={52} height={52}><Path d="m26 1 5 15 15-7-7 15 12 6-16 3 2 16-11-12-11 12 2-16L1 30l12-6L6 9l15 7Z" fill="#FFEDAC" stroke="#F8FFFF" strokeWidth={1.5} /><Circle cx={26} cy={26} r={8} fill="#FFFFFF" /></Svg></Animated.View>
    {hasTarget && Array.from({ length: 6 }, (_, index) => <MagicParticle key={index} index={index} clock={clock} start={start} targetPoint={targetPoint} firing={firing} />)}
    <Animated.Text testID="energy-floating-score" style={[s.floatingScore, score]}>+{award}</Animated.Text>
  </View>;
}

export function Firefly({ index, clock }: { index: number; clock: SharedValue<number> }) {
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({ opacity: reduced ? .3 : .25 + Math.sin(clock.get() / 1100 + index * 2) * .2,
    transform: [{ translateY: reduced ? 0 : Math.sin(clock.get() / 1600 + index) * 7 }] }));
  return <Animated.View style={[s.firefly, { left: [116, 455, 632][index], top: [337, 335, 94][index] }, style]} />;
}

const s = StyleSheet.create({
  fillImage: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  turretBase: { position: 'absolute', width: 148, height: 148, left: MAP.turretX - 74, top: 326 - 148 * .93 },
  turretHead: { position: 'absolute', width: 164, height: 164, left: MAP.turretX - 82, top: MAP.turretY - 82 },
  core: { position: 'absolute', left: 66, top: 65, width: 31, height: 31, borderRadius: 18, backgroundColor: '#EEE0FF', borderWidth: 2, borderColor: '#FFFFFF' },
  citadel: { position: 'absolute', width: 200, height: 200, left: MAP.baseX - 100, top: MAP.baseY - 200 * .953 },
  castleShadow: { position: 'absolute', width: 157, height: 30, left: 22, bottom: 0, borderRadius: 80, backgroundColor: 'rgba(11,45,37,.3)' },
  shield: { position: 'absolute', left: 6, top: 16, width: 189, height: 174, borderRadius: 100, borderWidth: 2 },
  charge: { position: 'absolute', left: MAP.turretX - 29, top: MAP.turretY - 29, width: 58, height: 58, borderRadius: 30, borderWidth: 3, borderColor: '#DFD3FF', borderStyle: 'dashed' },
  chargeInner: { margin: 8, flex: 1, borderRadius: 30, borderWidth: 2, borderColor: '#FFF0BF' },
  muzzle: { position: 'absolute', width: 34, height: 34, borderRadius: 18, borderWidth: 3, borderColor: '#E3C3FF', backgroundColor: 'rgba(195,158,255,.55)', alignItems: 'center', justifyContent: 'center' },
  muzzleCore: { width: 18, height: 18, borderRadius: 10, backgroundColor: '#FFFFF0' },
  projectile: { position: 'absolute', width: 32, height: 16, borderRadius: 9, backgroundColor: '#C5AEFF', borderWidth: 2, borderColor: '#F3DEFF' },
  projectileCore: { position: 'absolute', right: 1, top: 2, width: 12, height: 8, borderRadius: 6, backgroundColor: '#FFFFEA' },
  trail: { position: 'absolute', right: 25, top: 2, width: 28, height: 7, borderRadius: 7, backgroundColor: '#BB9CE9', opacity: .55 },
  impact: { position: 'absolute', width: 52, height: 52 }, spark: { position: 'absolute', width: 6, height: 6, borderRadius: 1, backgroundColor: '#B8EBE1' },
  floatingScore: { position: 'absolute', color: '#FFF3C5', backgroundColor: '#3B5D49', borderWidth: 1, borderColor: '#DAC68D', borderRadius: 9, overflow: 'hidden', fontWeight: '900', fontSize: 22, width: 48, textAlign: 'center' },
  firefly: { position: 'absolute', width: 4, height: 4, borderRadius: 3, backgroundColor: '#FCF4B7' },
});
