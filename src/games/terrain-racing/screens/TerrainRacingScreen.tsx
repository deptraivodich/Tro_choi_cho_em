import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameHUD, statusText } from '../components/GameHUD';
import { GameButton, PanelDock, PausePanel, QuestionPanel, ResultPanel } from '../components/GamePanels';
import { WorldScene } from '../components/WorldScene';
import { useSupercar } from '../hooks/useSupercar';
import { QUESTIONS } from '../data/questions';

export const TerrainRacingScreen: React.FC<{onExit:()=>void}> = ({onExit})=>{
  const game=useSupercar(onExit);
  const insets=useSafeAreaInsets(),window=useWindowDimensions();
  const [layout,setLayout]=useState({width:window.width,height:window.height-insets.top-insets.bottom-56});
  const {meta}=game;
  const status=statusText(meta);
  return <View testID={`supercar-state-${meta.phase}-${meta.stage}`} style={[styles.container,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
    <GameHUD meta={meta} sound={game.sound} onSound={game.toggleSound} onPause={()=>game.setPaused(true)} />
    <View style={styles.viewport} onLayout={e=>setLayout(e.nativeEvent.layout)}>
      <WorldScene world={game.world} simulation={game.simulation} width={layout.width} height={layout.height} />
      {status&&<View pointerEvents="none" style={[styles.status,meta.phase==='collapse'&&styles.warning]}>
        <Text testID="supercar-status" style={styles.statusText}>{status}</Text>
      </View>}
      {meta.phase==='question'&&<PanelDock maxHeight={layout.height*.58}>
        <QuestionPanel question={QUESTIONS[meta.stage-1]} onChoose={game.choose} />
      </PanelDock>}
      {['result','victory'].includes(meta.phase)&&<PanelDock maxHeight={layout.height*.65}>
        <ResultPanel meta={meta} question={QUESTIONS[meta.stage-1]} onReplay={game.replay} saveError={game.saveError} />
      </PanelDock>}
      {!game.ready&&<View style={styles.loading}>
        {game.loadError?<><Text style={styles.error}>Không tải được tài nguyên Siêu Xe.</Text><GameButton label="THOÁT VỀ SẢNH" onPress={game.exit} /></>:
          <><ActivityIndicator color="#ffd169" size="large" /><Text style={styles.loadingText}>Đang chuẩn bị cuộc truy đuổi…</Text></>}
      </View>}
    </View>
    {meta.paused&&<PausePanel onResume={()=>game.setPaused(false)} onExit={game.exit} />}
  </View>;
};
const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#142942'},viewport:{flex:1,overflow:'hidden',backgroundColor:'#343d40'},
  status:{position:'absolute',top:8,left:18,right:18,paddingHorizontal:8,paddingVertical:8,borderRadius:10,backgroundColor:'#182d3ce6'},
  statusText:{fontSize:12,fontWeight:'800',color:'#fff1c9',textAlign:'center'},warning:{backgroundColor:'#803216ed'},
  loading:{...StyleSheet.absoluteFill,backgroundColor:'#142942',justifyContent:'center',alignItems:'center',gap:14,padding:20},
  loadingText:{color:'white',fontSize:15},error:{color:'#ffb0a0',fontSize:16,textAlign:'center'},
});
