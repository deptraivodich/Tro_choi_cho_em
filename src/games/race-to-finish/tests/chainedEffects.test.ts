import { initialRaceState, raceReducer, RaceEvent, RaceState } from '../state/raceReducer';
import { RaceController } from '../state/RaceController';
import { MAX_CHAIN_EFFECTS } from '../state/tileEffectChain';
import * as board from '../data/boardConfig';
import * as engine from '../logic/gameEngine';
import { answerText } from '../logic/questions';
import { BoardTile, BonusEffectType, PenaltyEffectType, Player } from '../types';

type Result = BonusEffectType | PenaltyEffectType;
const route = Object.values(board.BOARD_TILES).sort((a,b) => a.order-b.order);
const player = (id: string, isBot = false): Player => ({ id, name:id, isBot, character:'bunny',
  currentTileId:'tile_0', position:0, pathHistory:['tile_0'], currentPose:'idle_1',
  hasShield:false, cleanseCount:0, skipNextTurn:false, rank:null });
let s: RaceState;
function send(event: Omit<Extract<RaceEvent,{id:number}>,'id'> & Record<string,unknown>) {
  s=raceReducer(s,{...event,id:s.actionId} as RaceEvent);
}
function at(id: string, flags: Partial<Player> = {}) {
  s={...s,gamePhase:'evaluating_tile',players:[{...s.players[0],currentTileId:id,position:board.getTileOrder(id),
    pathHistory:route.slice(0,board.getTileOrder(id)+1).map(t=>t.id),...flags},s.players[1]]};
}
function open(result: Result) {
  send({type:'LAND',result});expect(s.gamePhase).toBe('rolling_mystery');
  expect(s.motion).toBeNull();expect(s.mysteryRollState?.tileId).toBe(s.players[0].currentTileId);
}
function apply() { send({type:'SPIN_DONE'});send({type:'APPLY'}); }
function finishMovement() {
  let steps=0;
  while(s.motion) {
    expect(++steps).toBeLessThanOrEqual(6);
    expect(s.mysteryRollState).toBeNull();
    const moving=s;send({type:'LAND',result:'shield'});send({type:'NEXT'});send({type:'ROLL',value:1});
    expect(s).toBe(moving);send({type:'MOTION_DONE'});
  }
  expect(s.gamePhase).toBe('evaluating_tile');expect(s.diceLanding).toBeNull();return steps;
}
// Some requested topologies (adjacent bonuses/penalties, eight in a row) do
// not exist on the artwork. Override only tile types in these isolated tests;
// IDs, main edges, positions, production board and probability pools stay intact.
function types(overrides: Record<string,BoardTile['type']>) {
  jest.spyOn(board,'getTile').mockImplementation(id => {
    const tile=board.BOARD_TILES[id] ?? board.BOARD_TILES.tile_0;
    return overrides[id] ? {...tile,type:overrides[id]} : tile;
  });
}
beforeEach(()=>{
  jest.useFakeTimers();
  s=raceReducer(initialRaceState,{type:'START',mode:'single',players:[player('p1'),player('p2')],startedAt:0});
});
afterEach(()=>{jest.restoreAllMocks();jest.useRealTimers();});

test.each([false,true])('real board: bonus advances 1 to penalty in the same turn (bot=%s)', bot=>{
  at('tile_4_bonus',{isBot:bot});open('advance_1');const id=s.effectChain!.id,turn=s.turnId;
  apply();expect(s.players[0].currentTileId).toBe('tile_5');expect(s.motion?.cause).toBe('bonus');
  expect(s.mysteryRollState).toBeNull();finishMovement();open('skip_turn');
  expect(s.effectChain).toMatchObject({id,effectCount:2,triggeredTileIds:['tile_4_bonus','tile_5']});
  expect(s.turnId).toBe(turn);expect(s.activePlayerIndex).toBe(0);apply();
  expect(s.gamePhase).toBe('turn_end');expect(s.players[0].skipNextTurn).toBe(true);expect(s.effectChain).toBeNull();
});
test.each([false,true])('real board: penalty retreats 1 to bonus in the same turn (bot=%s)', bot=>{
  at('tile_5',{isBot:bot});open('retreat_1');apply();expect(finishMovement()).toBe(1);
  expect(s.players[0].currentTileId).toBe('tile_4_bonus');open('shield');
  expect(s.effectChain?.triggeredTileIds).toEqual(['tile_5','tile_4_bonus']);apply();
  expect(s.players[0].hasShield).toBe(true);expect(s.gamePhase).toBe('turn_end');
});
test.each([
  ['bonus','advance_2','tile_11','tile_12','tile_13','penalty','skip_turn'],
  ['penalty','retreat_2','tile_13','tile_12','tile_11','bonus','shield'],
] as const)('%s moves two steps; intermediate special tile is ignored', (origin,result,start,intermediate,end,target,last)=>{
  types({[start]:origin,[intermediate]:target,[end]:target});at(start);open(result);apply();
  expect(s.players[0].currentTileId).toBe(intermediate);expect(s.motion?.remaining).toBe(1);
  const inFlight=s;send({type:'LAND',result:last});expect(s).toBe(inFlight);
  send({type:'MOTION_DONE'});expect(s.players[0].currentTileId).toBe(end);expect(s.mysteryRollState).toBeNull();
  expect(s.effectChain?.triggeredTileIds).toEqual([start]);
  send({type:'MOTION_DONE'});open(last);expect(s.effectChain?.triggeredTileIds).toEqual([start,end]);apply();
  expect(s.gamePhase).toBe('turn_end');
});
test.each([
  ['bonus','tile_11','tile_12','advance_1','shield'],
  ['penalty','tile_12','tile_11','retreat_1','skip_turn'],
] as const)('%s to same type opens a distinct second reel', (type,start,end,result,last)=>{
  types({[start]:type,[end]:type});at(start);open(result);const first=s.mysteryRollState!.id;
  apply();finishMovement();open(last);expect(s.mysteryRollState!.id).toBeGreaterThan(first);
  expect(s.effectChain?.effectCount).toBe(2);apply();expect(s.gamePhase).toBe('turn_end');
});
test('bonus -> penalty -> a different bonus resolves three effects sequentially',()=>{
  types({tile_11:'bonus',tile_12:'bonus',tile_13:'penalty'});at('tile_11');
  open('advance_2');apply();finishMovement();open('retreat_1');apply();finishMovement();open('cleanse');
  expect(s.effectChain?.triggeredTileIds).toEqual(['tile_11','tile_13','tile_12']);
  apply();expect(s.players[0].cleanseCount).toBe(1);expect(s.gamePhase).toBe('turn_end');
});
test('real-board cycle returns to the visited bonus but never opens it twice',()=>{
  at('tile_4_bonus');open('advance_1');apply();finishMovement();open('retreat_1');apply();finishMovement();
  expect(s.players[0].currentTileId).toBe('tile_4_bonus');
  expect(s.players[0].pathHistory.at(-1)).toBe('tile_4_bonus');
  expect(s.effectChain?.triggeredTileIds).toEqual(['tile_4_bonus','tile_5']);
  send({type:'LAND'});expect(s.gamePhase).toBe('turn_end');expect(s.mysteryRollState).toBeNull();expect(s.effectChain).toBeNull();
});
test('eight distinct effects are allowed; the ninth destination is reached but not activated',()=>{
  const tiles=route.slice(1,MAX_CHAIN_EFFECTS+2).map(t=>t.id);
  types(Object.fromEntries(tiles.map(id=>[id,'bonus'])));at(tiles[0]);
  for(let i=0;i<MAX_CHAIN_EFFECTS;i++) {
    open('advance_1');expect(s.effectChain?.effectCount).toBe(i+1);apply();finishMovement();
  }
  expect(s.players[0].currentTileId).toBe(tiles[MAX_CHAIN_EFFECTS]);
  send({type:'LAND',result:'shield'});expect(s.gamePhase).toBe('turn_end');expect(s.players[0].hasShield).toBe(false);
});
test.each([['tile_14','advance_2','tile_16'],['tile_5','retreat_2','tile_4']] as const)(
  '%s effect reaches fork %s without granting shortcut eligibility', (start,result,end)=>{
    at(start);open(result);apply();finishMovement();expect(s.players[0].currentTileId).toBe(end);
    send({type:'LAND'});expect(s.gamePhase).toBe('turn_end');expect(s.motion).toBeNull();
    const stopped=s;send({type:'SHORTCUT_READY'});expect(s).toBe(stopped);
  });
test.each(['shield','cleanse','save-cleanse'] as const)('chained penalty respects %s exactly once', protection=>{
  at('tile_4_bonus',{hasShield:protection==='shield',cleanseCount:1});open('advance_1');apply();finishMovement();
  open('retreat_1');send({type:'SPIN_DONE'});const id=s.actionId;
  send({type:'APPLY',cleanse:protection==='cleanse'});const applied=s;
  s=raceReducer(s,{type:'APPLY',id,cleanse:true});expect(s).toBe(applied);
  if(protection==='save-cleanse') {finishMovement();send({type:'LAND'});expect(s.players[0].currentTileId).toBe('tile_4_bonus');}
  else {expect(s.motion).toBeNull();expect(s.players[0].currentTileId).toBe('tile_5');}
  expect(s.players[0].cleanseCount).toBe(protection==='cleanse'?0:1);
  expect(s.players[0].hasShield).toBe(false);expect(s.gamePhase).toBe('turn_end');
});
test('skip effect in a chain skips exactly one later turn; duplicate NEXT is rejected',()=>{
  at('tile_4_bonus');open('advance_1');apply();finishMovement();open('skip_turn');apply();
  const id=s.actionId;send({type:'NEXT'});const next=s;
  s=raceReducer(s,{type:'NEXT',id});expect(s).toBe(next);expect(s.activePlayerIndex).toBe(1);
  // The other participant finishes a real, normal one-step turn.
  send({type:'ROLL',value:2});send({type:'DICE_DONE',question:{key:'q',prompt:'1+1',answer:{n:2,d:1},kind:'numeric'}});
  send({type:'ANSWER',answer:'2'});send({type:'ANSWER_FEEDBACK_DONE'});send({type:'ANSWER_FEEDBACK_DISMISSED'});
  send({type:'MOTION_DONE'});send({type:'MOTION_DONE'});send({type:'LAND'});send({type:'NEXT'});
  expect(s.activePlayerIndex).toBe(0);expect(s.gamePhase).toBe('turn_end');expect(s.players[0].skipNextTurn).toBe(false);
  send({type:'NEXT'});expect(s.activePlayerIndex).toBe(1);expect(s.gamePhase).toBe('ready_to_roll');
});
test('reset-to-start closes a chain; late penalty cannot draw or apply reset',()=>{
  at('tile_4_bonus');open('advance_1');apply();finishMovement();open('reset_start');apply();finishMovement();
  expect(s.players[0].pathHistory).toEqual(['tile_0']);send({type:'LAND'});expect(s.gamePhase).toBe('turn_end');
  at('tile_15');const before=s;send({type:'LAND',result:'reset_start'});expect(s).toBe(before);
  for(let i=0;i<=100;i++)expect(engine.rollMysteryPenalty('tile_15',undefined,()=>i/101)).not.toBe('reset_start');
});
test('stale LAND/SPIN/APPLY/MOTION/NEXT cannot repeat a chained effect or advance the turn',()=>{
  at('tile_4_bonus');const land=s.actionId;open('advance_1');const spin=s.actionId;
  send({type:'SPIN_DONE'});const applyId=s.actionId;send({type:'APPLY'});const motion=s.actionId;
  finishMovement();open('retreat_1');const second=s;
  for(const event of [{type:'LAND',id:land,result:'advance_1'}, {type:'SPIN_DONE',id:spin},
    {type:'APPLY',id:applyId}, {type:'MOTION_DONE',id:motion}, {type:'NEXT',id:motion}] as RaceEvent[]) {
    s=raceReducer(s,event);expect(s).toBe(second);
  }
  send({type:'NEXT'});send({type:'MOTION_DONE'});expect(s).toBe(second);
  apply();const travelling=s;send({type:'APPLY'});expect(s).toBe(travelling);
  finishMovement();send({type:'LAND'});expect(s.gamePhase).toBe('turn_end');
  expect(s.players[0].currentTileId).toBe('tile_4_bonus');
});

function controllerAtFirstBonus() {
  const c=new RaceController(()=>.1);c.connect();c.startGame('single',[player('p1'),player('p2')]);
  c.send({type:'ROLL',id:c.getSnapshot().actionId,value:5});jest.advanceTimersByTime(750);
  c.answer(answerText(c.getSnapshot().question!));jest.advanceTimersByTime(1100);
  c.send({type:'ANSWER_FEEDBACK_DISMISSED',id:c.getSnapshot().actionId});
  for(let i=0;i<5;i++)c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});
  jest.advanceTimersByTime(0);return c;
}
test('controller automatically opens chained reels; pause preserves result delay, motion, and pending landing',()=>{
  const bonus=jest.spyOn(engine,'rollMysteryBonus').mockReturnValue('advance_1');
  const penalty=jest.spyOn(engine,'rollMysteryPenalty').mockReturnValue('retreat_1');
  const c=controllerAtFirstBonus();expect(c.getSnapshot().mysteryRollState?.tileId).toBe('tile_4_bonus');
  const chain=c.getSnapshot().effectChain!.id;
  c.send({type:'SPIN_DONE',id:c.getSnapshot().actionId});jest.advanceTimersByTime(500);
  c.send({type:'PAUSE',paused:true});const paused=c.getSnapshot();jest.advanceTimersByTime(30000);
  expect(c.getSnapshot()).toBe(paused);expect(penalty).not.toHaveBeenCalled();
  c.send({type:'PAUSE',paused:false});jest.advanceTimersByTime(899);expect(c.getSnapshot().motion).toBeNull();
  jest.advanceTimersByTime(1);expect(c.getSnapshot().motion?.cause).toBe('bonus');
  c.send({type:'PAUSE',paused:true});jest.advanceTimersByTime(30000);
  c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});expect(c.getSnapshot().motion).not.toBeNull();
  c.send({type:'PAUSE',paused:false});jest.advanceTimersByTime(30000);expect(penalty).not.toHaveBeenCalled();
  c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});c.send({type:'PAUSE',paused:true});
  jest.advanceTimersByTime(30000);expect(penalty).not.toHaveBeenCalled();
  c.send({type:'PAUSE',paused:false});jest.advanceTimersByTime(0);
  expect(penalty).toHaveBeenCalledTimes(1);expect(c.getSnapshot().mysteryRollState?.type).toBe('penalty');
  expect(c.getSnapshot().effectChain!.id).toBe(chain);expect(c.getSnapshot().activePlayerIndex).toBe(0);
  c.send({type:'SPIN_DONE',id:c.getSnapshot().actionId});jest.advanceTimersByTime(1400);
  c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});jest.advanceTimersByTime(0);
  expect(c.getSnapshot().gamePhase).toBe('turn_end');expect(bonus).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(699);expect(c.getSnapshot().activePlayerIndex).toBe(0);
  jest.advanceTimersByTime(1);expect(c.getSnapshot().activePlayerIndex).toBe(1);c.disconnect();
});
test('disconnect cancels a pending chained landing; restarting clears context and rejects old callbacks',()=>{
  jest.spyOn(engine,'rollMysteryBonus').mockReturnValue('advance_1');
  const penalty=jest.spyOn(engine,'rollMysteryPenalty').mockReturnValue('skip_turn');
  const c=controllerAtFirstBonus();c.send({type:'SPIN_DONE',id:c.getSnapshot().actionId});jest.advanceTimersByTime(1400);
  c.send({type:'MOTION_DONE',id:c.getSnapshot().actionId});const old=c.getSnapshot();c.disconnect();jest.advanceTimersByTime(60000);
  expect(c.getSnapshot()).toBe(old);expect(penalty).not.toHaveBeenCalled();expect(jest.getTimerCount()).toBe(0);
  c.startGame('single',[player('p1'),player('p2')]);const fresh=c.getSnapshot();
  c.send({type:'LAND',id:old.actionId,result:'skip_turn'});expect(c.getSnapshot()).toBe(fresh);expect(fresh.effectChain).toBeNull();
});
