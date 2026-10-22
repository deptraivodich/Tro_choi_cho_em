import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { IslandWorld } from '../components/IslandWorld';
import { IslandLandscape } from '../components/IslandLandscape';
import { createIsland, islandReducer, ownerOf } from '../logic/island';
import { cellCenter } from '../logic/projection';
jest.mock('../components/IslandLandscape',()=>({IslandLandscape:jest.fn(()=>null)}));
jest.mock('../hooks/useIslandCamera',()=>({useIslandCamera:()=>({camera:jest.requireActual('../logic/projection').focusCamera(),setCamera:jest.fn(),style:{},toWorld:(p:unknown)=>p})}));
jest.mock('react-native-reanimated',()=>({...jest.requireActual('react-native-reanimated'),useReducedMotion:()=>false}));
test('idle timer does not redraw the SVG world',async()=>{
 (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;let renderer:ReactTestRenderer;const state=createIsland(),cell=jest.fn(),preview=jest.fn();
 function Harness({seconds}:{seconds:number}){return <View><Text>{seconds}</Text><IslandWorld state={state} disabled={false} paused={false} onCell={cell} onPreview={preview}/></View>;}
 await act(()=>{renderer=create(<Harness seconds={0}/>);});const count=jest.mocked(IslandLandscape).mock.calls.length;for(let i=1;i<=20;i++)await act(()=>renderer.update(<Harness seconds={i}/>));expect(jest.mocked(IslandLandscape).mock.calls).toHaveLength(count);await act(()=>renderer.unmount());
});
test('gesture ownership, pause, floor/tool/session changes and multitouch prevent stale placement',async()=>{
 (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;let renderer:ReactTestRenderer;const cell=jest.fn(),preview=jest.fn(),s=createIsland('hard');
 const render=(state=s,disabled=false)=><IslandWorld state={state} disabled={disabled} paused={disabled} onCell={cell} onPreview={preview}/>;await act(()=>{renderer=create(render());});const board=()=>renderer!.root.findByProps({testID:'island-board'}),p=s.quests[0].witness[0],c=cellCenter(p),finger={nativeEvent:{locationX:c.x,locationY:c.y,touches:[{}]}};
 await act(()=>board().props.onResponderGrant(finger));expect(cell).not.toHaveBeenCalled();expect(preview).toHaveBeenLastCalledWith(p,ownerOf(s));await act(()=>board().props.onResponderRelease());expect(cell).toHaveBeenCalledWith(p,ownerOf(s));cell.mockClear();
 await act(()=>board().props.onResponderGrant(finger));const release=board().props.onResponderRelease;await act(()=>renderer.update(render(s,true)));await act(()=>release());expect(cell).not.toHaveBeenCalled();
 for(const state of [islandReducer(s,{type:'FLOOR',floorIndex:1,...ownerOf(s)}),islandReducer(s,{type:'TOOL',tool:'pan',...ownerOf(s)}),createIsland('hard',99)]){await act(()=>renderer.update(render()));await act(()=>board().props.onResponderGrant(finger));await act(()=>renderer.update(render(state)));await act(()=>release());expect(cell).not.toHaveBeenCalled();}
 await act(()=>renderer.update(render()));await act(()=>board().props.onResponderGrant(finger));await act(()=>renderer.root.findByProps({testID:'island-focus'}).props.onPress());await act(()=>board().props.onResponderRelease());expect(cell).not.toHaveBeenCalled();
 await act(()=>renderer.update(render()));await act(()=>board().props.onResponderGrant(finger));await act(()=>board().props.onResponderMove({nativeEvent:{...finger.nativeEvent,touches:[{},{}]}}));await act(()=>board().props.onResponderRelease());expect(cell).not.toHaveBeenCalled();await act(()=>renderer.unmount());
});
