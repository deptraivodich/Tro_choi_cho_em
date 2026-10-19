import React, { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { portalPresentation, portalPlacement, portalPulse } from '../presentation/portal';

const angledArt = require('../assets/round35b/source-art/ancient-portal.png');
const frontalArt = require('../assets/round36/source-art/ancient-portal-front.png');
const MovingPath = Animated.createAnimatedComponent(Path);
const MovingCircle = Animated.createAnimatedComponent(Circle);
type Props = { clock: SharedValue<number>; lastBirth: number; portrait?: boolean; foreground?: boolean };
function EdgeParticle({ index, clock, birth }: { index: number; clock: SharedValue<number>; birth: number }) {
  const reduced = useReducedMotion();
  const props = useAnimatedProps(() => {
    const phase = reduced ? .5 : (clock.get()/2400+index*.23)%1;
    return { cx: 360 + index*77 + Math.sin(phase*6.28)*9, cy: 790-phase*320,
      opacity: reduced ? .15 : Math.sin(phase*Math.PI)*.5 + portalPulse(clock.get(),birth)*.15 };
  });
  return <MovingCircle r={6} fill="#E5C0ED" animatedProps={props}/>;
}
export const AncientPortal = React.memo(function AncientPortal({ clock, lastBirth, portrait = false, foreground = false }: Props) {
  const art = portrait ? frontalArt : angledArt, config=portalPresentation(portrait);
  const {main,secondary,opaque,front:frontMask}=config;
  const source=config.art;
  const id = useId().replace(/[^a-zA-Z0-9]/g,''), reduced = useReducedMotion();
  const clip = 'portal-'+id, front = 'portal-front-'+id;
  const band = useAnimatedProps(() => {
    const offset = reduced ? 0 : Math.sin(clock.get()/1900)*64;
    return { d: `M320 ${560+offset} C425 ${410+offset} 520 ${760+offset} 663 ${540+offset} M335 ${760+offset} C430 ${620+offset} 570 ${950+offset} 667 ${700+offset} M846 ${740-offset/2} Q921 ${600-offset/2} 992 ${791-offset/2}`,
      opacity: .18 + (reduced ? 0 : Math.sin(clock.get()/1300)*.07) + portalPulse(clock.get(),lastBirth,reduced)*.2 };
  });
  const spiral = useAnimatedProps(() => {
    const phase = reduced ? 0 : Math.sin(clock.get()/2400)*32;
    return { d:`M389 682 C${400+phase} 535 ${619-phase} 572 574 728 C535 844 ${439+phase} 718 482 662`, opacity: .15 + portalPulse(clock.get(),lastBirth,reduced)*.2 };
  });
  const flash = useAnimatedProps(() => ({ opacity: portalPulse(clock.get(),lastBirth,reduced)*.24 }));
  return <View pointerEvents="none" testID={foreground?'energy-portal-front':'energy-spawn-gate'}
    style={{position:'absolute',...portalPlacement(portrait),zIndex:foreground?2:0}}>
    {foreground ? <Svg width="100%" height="100%" viewBox={`0 0 ${source.size} ${source.height}`}>
      <Defs><ClipPath id={front}><Path d={frontMask}/></ClipPath></Defs>
      <SvgImage testID="energy-portal-front-art" href={art} width={source.size} height={source.height} clipPath={`url(#${front})`}/>
    </Svg> : <>
      <Svg width="100%" height="100%" viewBox={`0 0 ${source.size} ${source.height}`} style={StyleSheet.absoluteFill}>
        {/* Opaque backing makes generated alpha fringes inside the curtain fully non-transmissive. */}
        <Path testID="energy-portal-opaque-core" d={opaque} fill="#3B145A" opacity={1}/>
      </Svg>
      <Image testID="energy-portal-art" source={art} resizeMode="contain" fadeDuration={0} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
      <Svg width="100%" height="100%" viewBox={`0 0 ${source.size} ${source.height}`} style={StyleSheet.absoluteFill}>
        <Defs><ClipPath id={clip}><Path d={main}/><Path d={secondary}/></ClipPath></Defs>
        <G testID="energy-portal-curtain" clipPath={`url(#${clip})`}>
          <MovingPath testID="energy-portal-spawn-pulse" d={main+' '+secondary} fill="#CA9AE2" animatedProps={flash}/>
          <MovingPath testID="energy-portal-bands" fill="none" stroke="#E5B7ED" strokeWidth={23} strokeLinecap="round" animatedProps={band}/>
          <MovingPath testID="energy-portal-spiral" fill="none" stroke="#A479CD" strokeWidth={31} strokeLinecap="round" animatedProps={spiral}/>
          {[0,1,2,3].map(index=><EdgeParticle key={index} index={index} clock={clock} birth={lastBirth}/>)}
        </G>
      </Svg>
    </>}
  </View>;
});
