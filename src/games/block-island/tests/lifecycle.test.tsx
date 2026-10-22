import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { AppState } from 'react-native';
import { useIsland } from '../hooks/useIsland';
import { profileManager } from '../../../shared/storage/profileManager';
import { asFloor, createIsland, floorAt, ownerOf, SAVE_KEY, saveGarden, sealedBlocks } from '../logic/island';
jest.mock('../../../shared/storage/profileManager',()=>({profileManager:{getGameState:jest.fn().mockResolvedValue(null),setGameState:jest.fn().mockResolvedValue(undefined),saveSessionResult:jest.fn().mockResolvedValue(undefined)}}));
jest.mock('../../../shared/audio/audioController',()=>({soundManager:{playTap:jest.fn(),playCorrect:jest.fn(),playIncorrect:jest.fn(),playVictory:jest.fn()}}));
let game:ReturnType<typeof useIsland>,renderer:ReactTestRenderer;
const Harness=()=>{const current=useIsland();React.useLayoutEffect(()=>{game=current;});return null;};
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.useFakeTimers();jest.spyOn(AppState,'addEventListener').mockReturnValue({remove:jest.fn()});jest.clearAllMocks();jest.mocked(profileManager.getGameState).mockResolvedValue(null);});
afterEach(async()=>{if(renderer)await act(()=>renderer.unmount());jest.restoreAllMocks();jest.useRealTimers();});
async function mount(){await act(async()=>{renderer=create(<Harness/>);});}
async function solve(){for(const p of game.state.quests[game.state.index].witness){if(floorAt(game.state.blocks,p))continue;if(game.state.floorIndex!==p.floorIndex)await act(()=>game.floor(p.floorIndex));await act(()=>game.cell(p));}await act(()=>game.check());}

test('three mode saves remain independent and the old separated-plot storage key is untouched',async()=>{
 const s=createIsland('easy');s.blocks=[asFloor(s.quests[0].witness[0])];jest.mocked(profileManager.getGameState).mockResolvedValue({version:4,journeys:{easy:saveGarden(s)}});await mount();
 expect(profileManager.getGameState).toHaveBeenCalledWith(SAVE_KEY,expect.any(String),null);expect(game.savedModes).toEqual(['easy']);await act(()=>jest.advanceTimersByTime(5000));expect(game.timer.elapsedSeconds).toBe(0);expect(profileManager.setGameState).not.toHaveBeenCalled();
 await act(()=>game.start('hard'));await act(()=>game.backToStart());await act(()=>game.start('easy',true));expect(game.state.blocks).toEqual(s.blocks);await act(async()=>{});const saved=jest.mocked(profileManager.setGameState).mock.calls.at(-1)!;expect(saved[0]).toBe(SAVE_KEY);expect(Object.keys((saved[2] as {journeys:object}).journeys).sort()).toEqual(['easy','hard']);
});
test('same-frame duplicate touches, stale gestures and reset cannot edit sealed or replayed blocks',async()=>{
 await mount();await act(()=>game.start('medium'));const p=game.state.quests[0].witness[0],old=ownerOf(game.state);await act(()=>{game.cell(p,old);game.cell(p,old);});expect(game.state.blocks).toHaveLength(1);
 await solve();const sealed=sealedBlocks(game.state);await act(()=>{game.next();game.next();});expect(game.state).toMatchObject({index:1,phase:'editing',correct:1});await act(()=>game.cell(p,old));expect(game.state.blocks).toEqual(sealed);
 await act(()=>game.restart());const before=game.state;await act(()=>game.cell(p,old));expect(game.state).toBe(before);
});
test('hint is a reversible overlay; pause prevents hint or placement mutations',async()=>{
 await mount();await act(()=>game.start('hard'));const before=game.state.blocks;await act(()=>game.hint());expect(game.state.hint?.target).toHaveLength(8);expect(game.state.blocks).toBe(before);await act(()=>game.hint());expect(game.state.hint).toBeNull();
 await act(()=>game.preview(game.state.quests[0].witness[0]));await act(()=>game.timer.pause());expect(game.state.preview).toBeNull();const held=game.state;await act(()=>{game.hint();game.cell(game.state.quests[0].witness[0]);});expect(game.state).toBe(held);await act(()=>game.timer.resume());await act(()=>game.hint());expect(game.state.hint).not.toBeNull();
});
test('six accumulating multi-floor objectives record one result only after mission 6',async()=>{
 await mount();await act(()=>game.start('hard'));for(let i=0;i<6;i++){await solve();if(i<5){expect(profileManager.saveSessionResult).not.toHaveBeenCalled();await act(()=>game.next());}}
 await act(async()=>{});expect(game.state).toMatchObject({phase:'complete',score:300,correct:6,resultRecorded:true});expect(game.state.blocks).toHaveLength(37);expect(profileManager.saveSessionResult).toHaveBeenCalledTimes(1);await act(()=>jest.advanceTimersByTime(10000));expect(profileManager.saveSessionResult).toHaveBeenCalledTimes(1);
 await act(()=>game.backToStart());await act(()=>game.start('hard',true));expect(game.state.phase).toBe('complete');expect(profileManager.saveSessionResult).toHaveBeenCalledTimes(1);
});
test('background and unmount cancel preview and reject all old callbacks',async()=>{
 await mount();await act(()=>game.start('easy'));const p=game.state.quests[0].witness[0],owner=ownerOf(game.state),background=jest.mocked(AppState.addEventListener).mock.calls.at(-1)![1];await act(()=>background('background'));expect(game.timer.isPaused).toBe(true);await act(()=>game.cell(p,owner));expect(game.state.blocks).toEqual([]);
 const oldCell=game.cell,oldHint=game.hint;await act(()=>renderer.unmount());const writes=jest.mocked(profileManager.setGameState).mock.calls.length;await act(()=>{oldCell(p,owner);oldHint();});expect(profileManager.setGameState).toHaveBeenCalledTimes(writes);
});
