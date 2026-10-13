// Exercise the real pure engine to select reproducible first-turn UI scenarios.
// No production RNG weights or application test APIs are changed.
require.extensions['.ts'] = (module, file) => module._compile(require('@babel/core').transformFileSync(file, {
  configFile:false, babelrc:false, presets:['@babel/preset-typescript'], plugins:['@babel/plugin-transform-modules-commonjs'],
}).code, file);
const {PRNG}=require('../src/shared/math/prng.ts');
const {QuestionGenerator,answerText}=require('../src/games/race-to-finish/logic/questions.ts');
const {initialRaceState,raceReducer}=require('../src/games/race-to-finish/state/raceReducer.ts');
const {getTile}=require('../src/games/race-to-finish/data/boardConfig.ts');
const {rollDice,rollMysteryBonus,rollMysteryPenalty}=require('../src/games/race-to-finish/logic/gameEngine.ts');
const {canActivateTileEffect}=require('../src/games/race-to-finish/state/tileEffectChain.ts');
const found={};
for(let seed=1;seed<10000&&Object.keys(found).length<2;seed++) {
  const random=new PRNG(seed),rng=()=>random.next(),generator=new QuestionGenerator(rng);
  const players=['p1','p2'].map(id=>({id,name:id,isBot:false,character:'bunny'}));
  let s=raceReducer(initialRaceState,{type:'START',mode:'local_multiplayer',players});
  const send=e=>{s=raceReducer(s,{...e,id:s.actionId});};
  const dice=rollDice(rng);if(dice!==5&&dice!==6)continue;
  send({type:'ROLL',value:dice});send({type:'DICE_DONE',question:generator.next('tile_0')});
  send({type:'ANSWER',answer:answerText(s.question)});send({type:'ANSWER_FEEDBACK_DONE'});send({type:'ANSWER_FEEDBACK_DISMISSED'});
  const effects=[];
  for(let i=0;i<100&&s.gamePhase!=='turn_end';i++) {
    if(s.motion)send({type:'MOTION_DONE'});
    else if(s.gamePhase==='evaluating_tile') {
      const tile=getTile(s.players[0].currentTileId);
      const result=!canActivateTileEffect(s.effectChain,tile.id)?undefined:tile.type==='bonus'?rollMysteryBonus(undefined,rng)
        :tile.type==='penalty'?rollMysteryPenalty(tile.id,undefined,rng):undefined;
      send({type:'LAND',result});
    }else if(s.gamePhase==='rolling_mystery') {effects.push({...s.mysteryRollState});send({type:'SPIN_DONE'});}
    else if(s.gamePhase==='mystery_result')send({type:'APPLY'});
    else break;
  }
  if(effects.length!==2||s.gamePhase!=='turn_end')continue;
  const key=effects[0].type==='bonus'&&effects[0].result==='advance_1'&&effects[1].result==='retreat_1'?'bonus-penalty-cycle'
    :effects[0].type==='penalty'&&effects[0].result==='retreat_1'&&effects[1].result==='shield'?'penalty-bonus':null;
  if(key&&!found[key])found[key]={seed,dice,effects:effects.map(({type,tileId,result})=>({type,tileId,result})),finalTile:s.players[0].currentTileId};
}
if(Object.keys(found).length!==2)throw Error('Could not find both reference chains');
console.log(JSON.stringify(found,null,2));
