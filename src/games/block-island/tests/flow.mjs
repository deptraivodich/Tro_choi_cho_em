import assert from 'node:assert/strict';
import {browserSession,sleep,observeIsland} from './browser.mjs';
export const out='artifacts/block-island-lord-round23';
export const categories={earth:['grass','dirt','stone','paving','wood','sand'],building:['brick','brick-wall','wood-wall','stone-column','wood-column','stairs','roof'],nature:['oak','pine','cherry','bush','flowers','moss-rock'],outdoor:['fence','bridge','path','water','lamp']};
export async function flow(width=390,height=844,reduced=false){
 const b=await browserSession(width,height,reduced);
 const exists=id=>b.evaluate(`!!document.querySelector('[data-testid="${id}"]')`);
 async function wait(fn,label,ms=90000){const until=Date.now()+ms;while(Date.now()<until){if(await fn())return;await sleep(30);}throw Error('Timeout: '+label);}
 const state=()=>b.evaluate(observeIsland);
 async function tap(id){if(['island-confirm-clear','island-confirm-new','island-home','island-resume','island-cancel-new'].includes(id))await sleep(320);assert(await b.click(`[data-testid="${id}"]`),`Cannot tap ${id}`);await sleep(35);}
 async function settle(){await b.evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)))');await sleep(260);}
 async function load(){await b.send('Page.navigate',{url:process.env.ISLAND_URL||'http://localhost:8090/games/block-island'});await wait(()=>exists('island-start'),'intro');await wait(()=>b.evaluate(`document.querySelector('[data-testid="island-start"]').getAttribute('aria-disabled')!=='true'`),'storage loaded');}
 async function safe(){await b.evaluate(`{const e=document.querySelector('[data-testid="island-screen"]');e.style.paddingTop='24px';e.style.paddingBottom='48px';}`);await settle();}
 async function start(mode='easy'){await tap(`island-mode-${mode}`);await tap('island-start');await tap('island-confirm-new');await wait(()=>exists('island-board'),'board');await wait(async()=>!await exists('island-menu'),'new run');await safe();}
 async function angle(){return b.evaluate(`Number(document.querySelector('[data-testid="island-view-angle"]').textContent.match(/(\\d+)./)[1])/90`);}
 async function screenPoint(point,occupied){const s=await state();if(occupied===undefined)occupied=s.blocks.some(b=>b.blockType==='floor'&&b.floorIndex===point.floorIndex&&b.x===point.x&&b.y===point.y);const r=await angle();let {x,y}=point;if(r===1)[x,y]=[19-y,x];else if(r===2)[x,y]=[19-x,19-y];else if(r===3)[x,y]=[y,19-x];return b.evaluate(`(()=>{const r=document.querySelector('[data-testid="island-scene"]').getBoundingClientRect();return {x:r.x+(720+(${x}-${y})*24)/1440*r.width,y:r.y+(100+(${x}+${y}+1)*14-${point.floorIndex*32+(occupied?8:0)})/980*r.height};})()`);}
 async function touch(type,p){await b.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{...p,id:1,radiusX:1,radiusY:1,force:1}]});}
 async function floor(f){if((await state()).floorIndex===f)return;await tap(`island-floor-${f}`);await settle();assert.equal((await state()).floorIndex,f);}
 async function cell(point,hold=25){const p=await screenPoint(point);const fit=await b.evaluate(`(()=>{const r=document.querySelector('[data-testid="island-board"]').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()`);assert(p.x>=fit.x&&p.x<=fit.right&&p.y>=fit.y&&p.y<=fit.bottom,`Cell outside viewport ${JSON.stringify({point,p,fit})}`);await touch('touchStart',p);if(hold)await sleep(hold);await touch('touchEnd');await sleep(35);return state();}
 async function select(id){const group=Object.keys(categories).find(k=>categories[k].includes(id));assert(group,`Unknown material ${id}`);await tap(`island-category-${group}`);await tap(`island-material-${id}`);assert.equal((await state()).material,id);}
 async function clear(){if(!(await state()).blocks.some(b=>!b.sealed))return;await tap('island-clear');await tap('island-confirm-clear');await wait(async()=>!await exists('island-menu'),'clear closed');await settle();}
 async function build(points){await select('grass');for(const p of points){const s=await state();if(s.blocks.some(b=>b.blockType==='floor'&&b.floorIndex===p.floorIndex&&b.x===p.x&&b.y===p.y))continue;await floor(p.floorIndex);await cell(p);assert((await state()).blocks.some(b=>b.blockType==='floor'&&b.floorIndex===p.floorIndex&&b.x===p.x&&b.y===p.y),`Missing real placement ${JSON.stringify(p)}: ${JSON.stringify(await state())}`);}}
 async function solve(){const s=await state();assert.equal(s.phase,'editing');await build(s.quests[s.index].witness);await tap('island-check');assert.equal((await state()).correct,s.index+1,JSON.stringify((await state()).feedback));}
 async function next(){const before=await state();await tap('island-next');await wait(async()=>(await state()).phase==='editing','next editing');assert.equal((await state()).index,before.index+1);assert.deepEqual((await state()).blocks,before.blocks);await settle();}
 return {b,exists,state,tap,load,start,safe,screenPoint,touch,floor,cell,select,clear,build,solve,next,wait,settle,angle};
}
