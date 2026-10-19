import { readFileSync } from 'node:fs';
import { castlePlacement, roadRibbon, routePoint, turretBasePlacement, turretPoint, PORTRAIT_ROUTE, PORTRAIT_DISTANCE_SCALE } from '../presentation/route';
import { portalDepth, FRONTAL_PORTAL_ART, portalPlacement } from '../presentation/portal';

test('mobile route uses three alternating runs, with cannon in the middle-left pocket',()=>{
 const spans=PORTRAIT_ROUTE.slice(1).map((p,i)=>({a:PORTRAIT_ROUTE[i],b:p})).filter(({a,b})=>Math.abs(a.y-b.y)<.001&&Math.abs(a.x-b.x)>100);
 expect(spans.map(({a,b})=>Math.sign(b.x-a.x))).toEqual([1,-1,1]);
 const cannon=turretPoint(true);expect(cannon.x).toBeLessThan(220);
 let nearest=Infinity;for(let d=0;d<=370;d+=.1){const p=routePoint(d,true);nearest=Math.min(nearest,Math.hypot(p.x-cannon.x,p.y-cannon.y));}
 expect(nearest).toBeGreaterThan(32); // aiming hinge, not the old nominal foundation centre
 const base=turretBasePlacement(true);
 expect(base.top).toBeGreaterThan(315+32);
 expect(base.left+35*base.width/512).toBeGreaterThan(60+32); // visible stone bounds
 expect(castlePlacement(true).width).toBe(170);expect(castlePlacement(false).width).toBe(200);
});

test('mobile road retains its full width through the castle approach',()=>{
 const portrait=true;
 const vertices=[...roadRibbon(portrait).matchAll(/[ML](-?[\d.e]+) (-?[\d.e]+)/g)].map(m=>({x:+m[1],y:+m[2]}));
 expect(vertices).toHaveLength(742);
 for(let i=0;i<=370;i++)expect(Math.hypot(vertices[i].x-vertices[741-i].x,vertices[i].y-vertices[741-i].y)).toBeCloseTo(64,8);
 const source=readFileSync(require.resolve('../components/CombatStage.tsx'),'utf8');
 expect(source).toContain('strokeWidth={51}');expect(source).toContain('strokeDasharray="3 14"');
});

test('frontal portal changes depth at its measured ground plane, before the right turn',()=>{
 const gate=portalPlacement(true), plane=gate.top+FRONTAL_PORTAL_ART.frontY/1536*gate.width;
 let crossed=false;
 for(let d=0;d<30;d+=.05){const p=routePoint(d/PORTRAIT_DISTANCE_SCALE,true),z=portalDepth(d,true);expect(z).toBe(p.y<=plane?1:3);if(z===3&&!crossed){expect(p.x).toBe(115);crossed=true;}}
 expect(crossed).toBe(true);expect(portalDepth(200,true)).toBe(3);
});
