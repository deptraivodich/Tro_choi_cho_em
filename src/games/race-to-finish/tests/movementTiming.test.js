/* global jest, test, expect, beforeEach, afterEach */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { AnimatedToken } from '../components/AnimatedToken';
import { RaceController } from '../state/RaceController';
import { tokenPlacements } from '../logic/tokenPlacement';
import { answerText } from '../logic/questions';
import { STEP_DURATION_MS, SHORTCUT_DURATION_MS } from '../logic/tokenMotion';

// Model the actual native boundary: JS setters enqueue UI writes while getters
// still see the last UI value. A synchronous Reanimated/web mock hides this bug.
let mockUI = false, mockJobs = [], mockRN = [], mockAnimations = new Map(), mockNow = 0, mockStarted = [];
function mockShared(initial) {
  let value = initial;
  const shared = {
    get value() { return value; },
    set value(next) {
      const set = () => {
        if (next && next.timing) {
          mockStarted.push({ time: mockNow, duration: next.duration });
          mockAnimations.set(shared, { ...next, from: value, start: mockNow });
        } else { value = next; mockAnimations.delete(shared); }
      };
      if (mockUI) set(); else mockJobs.push(set);
    },
    set(next) { this.value = next; },
    update(next) { value = next; },
  };
  return shared;
}
function mockFlushUI() {
  mockUI = true;
  try { while (mockJobs.length) mockJobs.shift()(); } finally { mockUI = false; }
}
jest.mock('react-native-reanimated', () => {
  const base = jest.requireActual('../../../../__mocks__/racePresentation');
  const React = require('react');
  return { ...base,
    useSharedValue: initial => {
      const ref = React.useRef(null);
      if (!ref.current) ref.current = mockShared(initial);
      return ref.current;
    },
    runOnUI: fn => (...args) => mockJobs.push(() => fn(...args)),
    runOnJS: fn => (...args) => mockRN.push(() => fn(...args)),
    withTiming: (to, config, callback) => ({ timing: true, to, duration: config.duration, callback }),
    cancelAnimation: shared => mockAnimations.delete(shared),
    ReduceMotion: { Never: 'never' },
  };
});
jest.mock('react-native', () => ({ Image:'image', View:'view', StyleSheet:{create:s=>s},
  Animated:{View:'view',Image:'image'}, Easing:{linear:t=>t} }));
jest.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const player = (id, bot = false) => ({ id, name: id, character: 'bunny', isBot: bot,
  currentTileId: 'tile_0', position: 0, pathHistory: ['tile_0'], currentPose: 'idle_1',
  hasShield: false, cleanseCount: 0, skipNextTurn: false, rank: null });
let renderer;
beforeEach(() => {
  jest.useFakeTimers(); mockUI = false; mockJobs = []; mockRN = [];
  mockAnimations = new Map(); mockNow = 0; mockStarted = [];
});
afterEach(async () => {
  if (renderer) await act(() => { renderer.unmount(); });
  renderer = null; mockFlushUI(); jest.useRealTimers();
});
async function frame(ms) {
  mockNow += ms; mockUI = true;
  for (const [shared, animation] of [...mockAnimations]) {
    const t = Math.min(1, (mockNow - animation.start) / animation.duration);
    shared.update(animation.from + (animation.to - animation.from) * t);
    if (t === 1) { mockAnimations.delete(shared); animation.callback?.(true); }
  }
  mockUI = false;
  await act(() => { while (mockRN.length) mockRN.shift()(); });
  mockFlushUI();
}
function Harness({ controller, complete }) {
  const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const p = state.players[0];
  return <AnimatedToken player={p} placement={tokenPlacements(state.players,1024,576)[p.id]}
    active moving={!!state.motion} paused={state.isPaused} shortcut={state.motion?.kind === 'shortcut'}
    actionId={state.actionId} onComplete={id => { complete?.(id); controller.send({ type:'MOTION_DONE',id }); }} />;
}
async function moving(dice, bot = false) {
  const controller = new RaceController();
  controller.startGame('single',[player('p1',bot),player('p2')]);
  const send = event => controller.send({ ...event,id:controller.getSnapshot().actionId });
  await act(() => { renderer = create(<Harness controller={controller} />); }); mockFlushUI();
  await frame(180); mockStarted = [];
  await act(() => {
    send({ type:'ROLL',value:dice });
    send({ type:'DICE_DONE',question:{ key:'test',prompt:'1+1',answer:{n:2,d:1},kind:'numeric' } });
    controller.answer('2'); send({type:'ANSWER_FEEDBACK_DONE'}); send({type:'ANSWER_FEEDBACK_DISMISSED'});
  });
  mockFlushUI(); return { controller,send };
}
test('reproduces old native read-after-reset: completed progress is still 1 on JS, calculating zero duration', () => {
  const progress = mockShared(1);
  progress.value = 0;
  expect(STEP_DURATION_MS * (1-progress.value)).toBe(0);
  mockFlushUI(); expect(progress.value).toBe(0);
});
test.each([false,true].flatMap(bot => [1,2,3,4,5,6].map(dice => [bot,dice])))('native queued setters: bot=%s dice=%i gets N full sequential tile animations', async (bot,dice) => {
  const {controller} = await moving(dice,bot);
  for (let step=0;step<dice;step++) {
    const state = controller.getSnapshot();
    expect(state.gamePhase).toBe('moving'); expect(state.motion.remaining).toBe(dice-step-1);
    expect(mockAnimations.size).toBe(1);
    expect(mockStarted[step].duration).toBe(STEP_DURATION_MS);
    await frame(STEP_DURATION_MS-1);
    expect(controller.getSnapshot().actionId).toBe(state.actionId);
    expect([...mockAnimations.keys()][0].value).toBeGreaterThan(.9);
    await frame(1);
  }
  expect(controller.getSnapshot().gamePhase).toBe('evaluating_tile');
  const walking = mockStarted.slice(0,dice);
  expect(walking).toHaveLength(dice);
  expect(mockStarted.slice(dice).every(a=>a.duration===180)).toBe(true);
  expect(walking.reduce((sum,a)=>sum+a.duration,0)).toBe(dice*STEP_DURATION_MS);
  expect(walking.map(a=>a.time)).toEqual(Array.from({length:dice},(_,i)=>180+i*STEP_DURATION_MS));
});
test('pause mid-step freezes progress, resumes the exact remaining clock, and cannot skip later steps', async () => {
  const {controller,send} = await moving(4);
  await frame(113);
  const progress = [...mockAnimations.keys()][0]; const frozen = progress.value;
  await act(() => send({type:'PAUSE',paused:true})); mockFlushUI();
  await frame(10000); expect(progress.value).toBe(frozen); expect(controller.getSnapshot().motion.remaining).toBe(3);
  await act(() => send({type:'PAUSE',paused:false})); mockFlushUI();
  expect(mockStarted.at(-1).duration).toBeCloseTo(STEP_DURATION_MS-113);
  await frame(186); expect(controller.getSnapshot().motion.remaining).toBe(3);
  await frame(1); expect(controller.getSnapshot().motion.remaining).toBe(2);
  expect(mockStarted.at(-1).duration).toBe(STEP_DURATION_MS);
});
test('unmount cancels UI animation and rejects its delayed JS completion', async () => {
  const {controller} = await moving(2); const before=controller.getSnapshot();
  const animation=[...mockAnimations.values()][0];
  mockUI=true; animation.callback(true); mockUI=false;
  await act(() => renderer.unmount()); renderer=null; mockFlushUI();
  await act(() => { while(mockRN.length) mockRN.shift()(); });
  expect(mockAnimations.size).toBe(0); expect(controller.getSnapshot()).toBe(before);
});
test('shortcut pause retains 450ms budget across repeated pause/resume, consumes entry once, disconnect cancels delay', () => {
  const c=new RaceController(() => .55); c.connect(); c.startGame('single',[player('p1'),player('p2')]); c.roll();
  jest.advanceTimersByTime(750); c.answer(answerText(c.getSnapshot().question)); jest.advanceTimersByTime(1100);
  c.send({type:'ANSWER_FEEDBACK_DISMISSED',id:c.getSnapshot().actionId});
  for(let i=0;i<4;i++) c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});
  jest.advanceTimersByTime(0);
  expect(c.getSnapshot().gamePhase).toBe('shortcut_pause');
  expect(c.getSnapshot().players[0].currentTileId).toBe('tile_4');
  expect(c.getSnapshot().players[0].currentPose).toBe('idle_1');
  const entryId=c.getSnapshot().actionId;
  jest.advanceTimersByTime(175); c.send({type:'PAUSE',paused:true}); jest.advanceTimersByTime(10000);
  expect(c.getSnapshot().gamePhase).toBe('shortcut_pause');
  c.send({type:'PAUSE',paused:false}); jest.advanceTimersByTime(100);
  c.send({type:'PAUSE',paused:true}); jest.advanceTimersByTime(10000);
  c.send({type:'PAUSE',paused:false}); jest.advanceTimersByTime(174);
  expect(c.getSnapshot().gamePhase).toBe('shortcut_pause'); jest.advanceTimersByTime(1);
  const travel=c.getSnapshot(); expect(travel.motion.kind).toBe('shortcut');
  expect(travel.players[0].pathHistory.slice(-2)).toEqual(['tile_4','tile_8_mid']);
  c.send({type:'SHORTCUT_READY',id:entryId}); c.send({type:'SHORTCUT_READY',id:travel.actionId});
  expect(c.getSnapshot()).toBe(travel); jest.advanceTimersByTime(SHORTCUT_DURATION_MS*10);
  expect(c.getSnapshot()).toBe(travel); c.disconnect(); expect(jest.getTimerCount()).toBe(0);
});
test('disconnect during entrance beat prevents background shortcut activation', () => {
  const c=new RaceController(() => .55); c.connect(); c.startGame('single',[player('p1'),player('p2')]); c.roll();
  jest.advanceTimersByTime(750); c.answer(answerText(c.getSnapshot().question)); jest.advanceTimersByTime(1100);
  c.send({type:'ANSWER_FEEDBACK_DISMISSED',id:c.getSnapshot().actionId});
  for(let i=0;i<4;i++) c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});
  jest.advanceTimersByTime(0); jest.advanceTimersByTime(200); c.disconnect();
  jest.advanceTimersByTime(10000); expect(c.getSnapshot().gamePhase).toBe('shortcut_pause'); expect(jest.getTimerCount()).toBe(0);
});

test.each(['advance_1','advance_2','retreat_1','retreat_2'])('reward/penalty %s uses complete sequential step clocks too', async effect => {
  const forward=effect.startsWith('advance');
  const dice=forward?1:6, count=effect.endsWith('2')?2:1;
  const {controller,send}=await moving(dice);
  for(let i=0;i<dice;i++)await frame(STEP_DURATION_MS);
  await act(()=>{send({type:'LAND',result:effect});send({type:'SPIN_DONE'});send({type:'APPLY'});});
  mockFlushUI();mockStarted=[];
  // The APPLY worklet has already started one complete 300ms animation.
  expect([...mockAnimations.values()][0].duration).toBe(STEP_DURATION_MS);
  const before=controller.getSnapshot().players[0].position;
  for(let i=0;i<count;i++) {
    const action=controller.getSnapshot().actionId;
    expect(controller.getSnapshot().motion.kind).toBe(forward?'forward':'backward');
    expect(mockAnimations.size).toBe(1);
    await frame(STEP_DURATION_MS-1);expect(controller.getSnapshot().actionId).toBe(action);
    await frame(1);
  }
  expect(controller.getSnapshot().gamePhase).toBe('evaluating_tile');
  expect(controller.getSnapshot().mysteryRollState).toBeNull();
  expect(controller.getSnapshot().players[0].position).toBe(before+(forward?1:-1)*(count-1));
  expect(mockStarted.filter(a=>a.duration===STEP_DURATION_MS)).toHaveLength(count-1);
});

test('finished on UI just before pause: stale JS callback cannot skip a step; resume commits once', async () => {
  const {controller,send}=await moving(3);
  const [progress,animation]=[...mockAnimations.entries()][0];
  mockUI=true;progress.update(1);mockAnimations.delete(progress);animation.callback(true);mockUI=false;
  // Completion is waiting on RN while the public pause event wins that race.
  await act(()=>send({type:'PAUSE',paused:true}));mockFlushUI();
  await frame(10000);expect(controller.getSnapshot().motion.remaining).toBe(2);
  await act(()=>send({type:'PAUSE',paused:false}));mockFlushUI();await frame(0);
  expect(controller.getSnapshot().motion.remaining).toBe(1);
  expect(mockAnimations.size).toBe(1);expect(mockStarted.at(-1).duration).toBe(STEP_DURATION_MS);
  // Even a duplicate delivery from the old UI run cannot complete the new tile.
  mockUI=true;animation.callback(true);mockUI=false;await frame(0);
  expect(controller.getSnapshot().motion.remaining).toBe(1);
  await frame(STEP_DURATION_MS);expect(controller.getSnapshot().motion.remaining).toBe(0);
});

test('chained bonus/penalty waits for real token clocks, preserves pause progress and stops a revisit', async () => {
  const {controller,send}=await moving(5);
  for(let i=0;i<5;i++)await frame(STEP_DURATION_MS);
  await act(()=>{send({type:'LAND',result:'advance_1'});send({type:'SPIN_DONE'});send({type:'APPLY'});});mockFlushUI();
  const chain=controller.getSnapshot().effectChain.id;
  expect(controller.getSnapshot().motion.cause).toBe('bonus');
  await frame(113);await act(()=>send({type:'PAUSE',paused:true}));mockFlushUI();
  await frame(10000);expect(controller.getSnapshot().mysteryRollState).toBeNull();
  await act(()=>send({type:'PAUSE',paused:false}));mockFlushUI();
  expect(mockStarted.at(-1).duration).toBeCloseTo(187);
  await frame(186);expect(controller.getSnapshot().gamePhase).toBe('applying_effect');
  await frame(1);expect(controller.getSnapshot().gamePhase).toBe('evaluating_tile');
  await act(()=>send({type:'LAND',result:'retreat_1'}));mockFlushUI();
  expect(controller.getSnapshot().mysteryRollState.type).toBe('penalty');
  expect(controller.getSnapshot().effectChain.id).toBe(chain);
  await act(()=>{send({type:'SPIN_DONE'});send({type:'APPLY'});});mockFlushUI();
  expect(mockStarted.at(-1).duration).toBe(STEP_DURATION_MS);
  await frame(299);expect(controller.getSnapshot().motion).not.toBeNull();
  await frame(1);await act(()=>send({type:'LAND'}));mockFlushUI();
  expect(controller.getSnapshot().gamePhase).toBe('turn_end');
  expect(controller.getSnapshot().players[0].currentTileId).toBe('tile_4_bonus');
  expect(controller.getSnapshot().effectChain).toBeNull();
});
