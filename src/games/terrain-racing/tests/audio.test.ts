import { GameAudio, type PlayerPort, type SoundName } from '../audio/GameAudio';

function fixture(){
  const names:SoundName[]=['engine','siren','accelerate','landslide','jump','impact','select','victory','loss'];
  const players={} as Record<SoundName,PlayerPort>;
  for(const name of names)players[name]={
    loop:false,volume:0,playing:false,play:jest.fn(function(this:PlayerPort){this.playing=true;}),
    pause:jest.fn(function(this:PlayerPort){this.playing=false;}),seekTo:jest.fn(()=>Promise.resolve()),remove:jest.fn(),
  };
  return {audio:new GameAudio(players),players};
}
test('muted default; all nine WAV events, loop levels, question silence, and terminal silence',async()=>{
  const {audio,players}=fixture();audio.setPhase('collapse');await Promise.resolve();
  expect(players.landslide.play).not.toHaveBeenCalled();
  audio.setEnabled(true);expect(players.engine.loop).toBe(true);expect(players.siren.loop).toBe(true);
  expect(players.engine.volume).toBeLessThan(players.select.volume);
  audio.play('select');audio.setPhase('launch');await Promise.resolve();
  expect(players.select.play).toHaveBeenCalled();expect(players.accelerate.play).toHaveBeenCalled();
  for(const phase of ['collapse','jump','policeRoll','result','victory'] as const){audio.setPhase(phase);await Promise.resolve();}
  for(const name of ['landslide','jump','impact','loss','victory'] as const)expect(players[name].play).toHaveBeenCalled();
  expect(players.engine.playing).toBe(false);expect(players.siren.playing).toBe(false);
  audio.setPhase('question');expect(players.engine.playing).toBe(false);
});
test('pause resumes sound positions, repeated phase notifications do not retrigger sound',async()=>{
  const {audio,players}=fixture();audio.setEnabled(true);audio.setPhase('jump');await Promise.resolve();
  audio.setSuspended(true);expect(players.jump.playing).toBe(false);
  audio.setSuspended(false);expect(players.jump.playing).toBe(true);
  audio.setPhase('jump');expect(players.jump.seekTo).toHaveBeenCalledTimes(1);
});
test('exit/mute cancels pending seeks and releases every player once',async()=>{
  const {audio,players}=fixture();audio.setEnabled(true);audio.play('jump');audio.dispose();audio.dispose();
  await Promise.resolve();expect(players.jump.play).not.toHaveBeenCalled();
  for(const player of Object.values(players)){expect(player.playing).toBe(false);expect(player.remove).toHaveBeenCalledTimes(1);}
});
test('background and replay cancel stale one-shots',async()=>{
  const {audio,players}=fixture();audio.setEnabled(true);audio.play('jump');audio.setSuspended(true);
  await Promise.resolve();expect(players.jump.play).not.toHaveBeenCalled();
  audio.setSuspended(false);audio.play('impact');audio.replay();await Promise.resolve();
  expect(players.impact.play).not.toHaveBeenCalled();expect(players.engine.playing).toBe(true);
});
