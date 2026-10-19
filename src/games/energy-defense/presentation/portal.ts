import { routePoint, PORTRAIT_DISTANCE_SCALE } from './route';

// Measured in the ORIGINAL generated 1254px PNG, retained unchanged in source-art/.
export const PORTAL_ART = { size: 1254, exit: { x: 500, y: 866 }, visibleBounds: [64,58,1217,1197] } as const;
export const PORTAL_MAIN = 'M355 325 Q405 307 458 344 L611 424 L630 459 L628 856 L591 892 L405 812 L364 712 L346 585 L344 415 Z';
export const PORTAL_OPAQUE_MAIN = 'M350 280 L654 424 L654 916 L599 922 L388 827 L326 735 L317 411 Z';
export const PORTAL_SECONDARY = 'M861 579 L952 564 L974 633 L970 881 L932 972 L871 947 L857 832 Z';
export const PORTAL_OPAQUE_SECONDARY = 'M846 545 L988 555 L1000 629 L994 890 L947 1006 L856 959 L838 831 Z';
// Front/middle pillar only; all exterior alpha and moss are from the original PNG.
export const PORTAL_FRONT = 'M620 268 L752 246 L827 323 L842 429 L819 488 L808 834 L858 910 L920 1085 L884 1136 L741 1199 L507 1098 L527 1012 L558 944 L610 878 L627 489 L602 414 Z';
// Frontal source pixels: aperture landing and foreground plinth plane, not bitmap centre.
export const FRONTAL_PORTAL_ART = { size:1536, height:1024, exit:{x:560,y:840}, frontY:922, visibleBounds:[22,105,1517,930] } as const;
export const FRONTAL_MAIN = 'M392 280 L696 280 L762 326 L829 350 L839 680 L774 731 L708 854 L425 854 L397 808 L343 783 L309 682 L309 390 L342 330 Z';
export const FRONTAL_SECONDARY = 'M1107 312 L1225 312 L1267 369 L1285 416 L1285 687 L1249 722 L1185 854 L1109 854 L1078 798 L1020 738 L1014 415 L1038 361 Z';
// Clip source alpha to actual stone surfaces. No energy curtain is composited over an enemy.
export const FRONTAL_FRONT = 'M0 80 H1536 V278 H0 Z M44 270 L310 270 L350 330 L310 395 L310 683 L346 728 L425 873 L370 939 H0 Z M780 270 L1027 270 L1073 352 L1013 414 L1014 692 L1109 876 L1084 941 L700 941 L709 856 L777 727 L839 677 L839 369 L783 335 Z M1230 287 H1536 V943 H1180 L1187 848 L1250 724 L1287 680 L1285 414 L1267 368 Z';
export function portalPresentation(portrait: boolean) {
  return portrait ? { art: FRONTAL_PORTAL_ART, main:FRONTAL_MAIN, secondary:FRONTAL_SECONDARY, opaque:FRONTAL_MAIN+' '+FRONTAL_SECONDARY, front:FRONTAL_FRONT }
    : {art:{...PORTAL_ART,height:PORTAL_ART.size},main:PORTAL_MAIN,secondary:PORTAL_SECONDARY,opaque:PORTAL_OPAQUE_MAIN+' '+PORTAL_OPAQUE_SECONDARY,front:PORTAL_FRONT+' M977 394 L1104 420 L1200 560 L1218 994 L1114 1058 L931 982 L970 877 L974 635 L950 560 Z'};
}
export function portalPlacement(portrait: boolean) {
  const width = portrait ? 220 : 125, source=portrait?FRONTAL_PORTAL_ART:{...PORTAL_ART,height:PORTAL_ART.size}, exit = routePoint(0,portrait);
  return { left: exit.x - source.exit.x / source.size * width,
    top: exit.y - source.exit.y / source.size * width, width, height:width*source.height/source.size };
}
export function portalPulse(now: number, birth: number, reduced = false) {
  'worklet';
  const ms = now-birth;
  return !reduced && ms>=0 && ms<420 ? Math.sin(ms/420*Math.PI) : 0;
}
export function portalDepth(distance: number, portrait = false) {
  'worklet';
  if (!portrait) return 1; // Isolated stone masks occlude only their real pixel footprints.
  const foot=routePoint(distance/PORTRAIT_DISTANCE_SCALE,true), start=routePoint(0,true);
  // Frontal portal: walk DOWN through the plinth plane before turning right.
  // Crossing occurs in the clear central bay, so switching depth cannot pop across a pillar.
  const frontPlane=start.y+(FRONTAL_PORTAL_ART.frontY-FRONTAL_PORTAL_ART.exit.y)*220/FRONTAL_PORTAL_ART.size;
  return foot.y <= frontPlane ? 1 : 3;
}
