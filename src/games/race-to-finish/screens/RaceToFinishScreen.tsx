import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, AppState, BackHandler, Keyboard } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useIsFocused, useFocusEffect } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRaceGame } from '../hooks/useRaceGame';
import { GameCamera } from '../components/GameCamera';
import { RaceHUD, PauseButton } from '../components/RaceHUD';
import { DiceOverlay } from '../components/DiceOverlay';
import { EmbeddedRaceModal } from '../components/RaceModal';
import { SetupModal } from '../components/SetupModal';
import { MathQuestionModal } from '../components/MathQuestionModal';
import { MysteryRollModal } from '../components/MysteryRollModal';
import { TurnHandoverModal } from '../components/TurnHandoverModal';
import { VictoryModal } from '../components/VictoryModal';
import { RACE_ASSETS } from '../assets';
import { GameMode, Player } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useVietnameseGameText } from '../hooks/useVietnameseGameText';

// First-use asset requests must finish before the short roll/movement animations start.
const PRELOAD_ASSETS = [
  { key: 'board', source: RACE_ASSETS.mapLandscape },
  { key: 'character-atlas', source: RACE_ASSETS.characterAtlas },
  ...([1, 2, 3, 4, 5, 6] as const).map(face => ({ key: `dice-${face}`, source: RACE_ASSETS.dice[face] })),
  ...(['fox', 'penguin', 'bunny', 'turtle'] as const).flatMap(character =>
    (['avatar'] as const).map(pose =>
      ({ key: `${character}-${pose}`, source: RACE_ASSETS.characters[character][pose] }))),
];

export const RaceToFinishScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  useVietnameseGameText();
  const game = useRaceGame();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const [menu, setMenu] = useState(false);
  const [intro, setIntro] = useState(false);
  const [background, setBackground] = useState(AppState.currentState !== 'active');
  const [allowExit, setAllowExit] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState<Record<string, boolean>>({});
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusPending, setFocusPending] = useState(false);
  const requestCounter = useRef(0);
  const pendingRoll = useRef<{ request: number; actionId: number; complete: boolean } | null>(null);
  const assetsReady = PRELOAD_ASSETS.every(asset => assetsLoaded[asset.key]);
  const exiting = useRef(false);
  const latest = useRef({ game, intro, menu, focused });
  React.useLayoutEffect(() => { latest.current = { game, intro, menu, focused }; }, [game, intro, menu, focused]);
  const requestPause = useCallback(() => {
    Keyboard.dismiss(); latest.current.game.setIsPaused(true); setMenu(true);
  }, []);
  const exit = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true; latest.current.game.setIsPaused(true); setAllowExit(true);
  }, []);
  useEffect(() => { if (allowExit) onExit(); }, [allowExit, onExit]);
  usePreventRemove(!allowExit && game.gamePhase !== 'setup' && game.gamePhase !== 'finished', requestPause);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      const inactive = state !== 'active'; setBackground(inactive);
      if (inactive && latest.current.game.gamePhase !== 'setup') requestPause();
    });
    return () => subscription.remove();
  }, [requestPause]);
  useFocusEffect(useCallback(() => () => {
    if (!exiting.current && latest.current.game.gamePhase !== 'setup') requestPause();
  }, [requestPause]));
  useEffect(() => {
    if (!focused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (latest.current.game.gamePhase === 'setup' || latest.current.game.gamePhase === 'finished') exit();
      else requestPause();
      return true;
    });
    return () => subscription.remove();
  }, [focused, exit, requestPause]);
  const start = (mode: GameMode, players: Player[]) => {
    pendingRoll.current = null; setFocusPending(false); setFocusRequest(0);
    setMenu(false); setIntro(true); game.startGame(mode, players);
    game.setIsPaused(true); // The first turn waits for the camera introduction.
  };
  const finishIntro = () => {
    setIntro(false);
    if (!exiting.current && latest.current.focused && !latest.current.menu && AppState.currentState === 'active')
      latest.current.game.setIsPaused(false);
  };
  const resume = () => {
    if (background || !focused || exiting.current) return;
    setMenu(false); if (!intro) game.setIsPaused(false);
    const pending = pendingRoll.current;
    if (!intro && pending?.complete && pending.actionId === game.actionId && game.gamePhase === 'ready_to_roll') {
      pendingRoll.current = null; setFocusPending(false); game.handleRollDice();
    }
  };
  const requestRoll = () => {
    if (pendingRoll.current || game.isPaused || intro || game.gamePhase !== 'ready_to_roll' || game.activePlayer?.isBot) return;
    Keyboard.dismiss();
    const request = ++requestCounter.current;
    pendingRoll.current = { request, actionId: game.actionId, complete: false };
    setFocusPending(true); setFocusRequest(request);
  };
  const finishFocus = (request: number) => {
    const pending = pendingRoll.current, current = latest.current;
    if (!pending || pending.request !== request || pending.actionId !== current.game.actionId || exiting.current) return;
    pending.complete = true;
    if (current.game.isPaused || current.menu || !current.focused || AppState.currentState !== 'active') return;
    pendingRoll.current = null; setFocusPending(false); current.game.handleRollDice();
  };
  const modalVisible = menu || !!game.question || ['rolling_mystery', 'mystery_result', 'turn_handover', 'finished'].includes(game.gamePhase);
  const cameraPaused = (game.isPaused && !intro) || menu || background || !focused || allowExit || !!game.question;
  return <GestureHandlerRootView style={styles.root} onLayout={event => setViewport(event.nativeEvent.layout)}>
    <StatusBar hidden />
    <Image source={RACE_ASSETS.background} style={StyleSheet.absoluteFill} resizeMode="cover" />
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
      {PRELOAD_ASSETS.map(asset => <Image key={asset.key} source={asset.source} style={{ width: 1, height: 1 }}
        onLoad={() => setAssetsLoaded(loaded => ({ ...loaded, [asset.key]: true }))} />)}
    </View>
        {game.gamePhase === 'setup' ? <SafeAreaView style={styles.safe} edges={['left', 'right', 'top', 'bottom']}>
          <SetupModal visible assetsReady={assetsReady} onStartGame={start} onExit={exit} />
        </SafeAreaView> : game.activePlayer && <>
          <GameCamera width={viewport.width} height={viewport.height} players={game.players} activePlayerIndex={game.activePlayerIndex}
            moving={!!game.motion && ['moving', 'applying_effect'].includes(game.gamePhase)} shortcut={game.motion?.kind === 'shortcut'}
            paused={cameraPaused} sessionId={game.sessionId} actionId={game.actionId} reduced={reduced}
            panEnabled={!intro && !modalVisible && !focusPending} rolling={game.gamePhase === 'rolling'}
            focusRequest={focusRequest} onFocusComplete={finishFocus}
            onIntroComplete={finishIntro} onMovementComplete={game.onMovementComplete} />
          {game.gamePhase === 'rolling' && <DiceOverlay key={game.actionId} value={game.currentDiceValue} paused={game.isPaused}
            reduced={reduced} getRemaining={game.getDiceTimeRemaining} />}
          <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill} edges={['left', 'right', 'top', 'bottom']}>
          <View pointerEvents="box-none" style={styles.arena}>
          <RaceHUD player={game.activePlayer} players={game.players} canRoll={!focusPending && !intro && !game.isPaused && game.gamePhase === 'ready_to_roll' && !game.activePlayer.isBot}
            rolling={game.gamePhase === 'rolling'} intro={intro} message={game.logMessage} onRoll={requestRoll} onPause={requestPause} />
          </View>
          </SafeAreaView>
        </>}
    {/* In-tree overlays avoid Android Dialog dismissal lag. The feedback fade
        explicitly completes before the engine can move; BackHandler owns Back. */}
    {modalVisible && <View testID="race-modal-host" accessibilityViewIsModal style={styles.modalHost}>
      <View style={[styles.modalSafe, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <View style={styles.arena}>
          <EmbeddedRaceModal.Provider value>
            <MysteryRollModal visible={game.gamePhase === 'rolling_mystery' || game.gamePhase === 'mystery_result'} state={game.mysteryRollState}
              paused={game.isPaused} revealed={game.gamePhase === 'mystery_result'} actionId={game.actionId} onSpinComplete={game.onSpinComplete}
              activePlayer={game.activePlayer} onUseCleanse={game.handleUseCleanse} />
            {game.question && game.activePlayer && <MathQuestionModal key={game.question.key} question={game.question}
              player={game.activePlayer} dice={game.currentDiceValue} submittedAnswer={game.submittedAnswer} correct={game.answerCorrect}
              failure={game.answerFailure} paused={game.isPaused} onAnswer={game.handleAnswer} onAcknowledge={game.handleAcknowledgeAnswer}
              closing={game.gamePhase === 'closing_answer'} actionId={game.actionId} onDismissed={game.onFeedbackDismissed}
              getTimeRemaining={game.getQuestionTimeRemaining} />}
            {game.activePlayer && <TurnHandoverModal visible={game.gamePhase === 'turn_handover'} nextPlayer={game.activePlayer} onReady={game.confirmHandover} />}
            <VictoryModal visible={game.gamePhase === 'finished'} winner={game.winner} allPlayers={game.players}
              onPlayAgain={() => start(game.gameMode, game.players)} onExit={exit} />
          </EmbeddedRaceModal.Provider>
          {game.saveError && <Text accessibilityRole="alert" style={styles.error}>{game.saveError}</Text>}
          {!menu && game.gamePhase !== 'finished' && <View style={styles.modalPause}><PauseButton onPress={requestPause} /></View>}
          {menu && <View testID="race-pause-menu" accessibilityViewIsModal style={styles.pauseOverlay}>
            <View style={styles.pauseCard}>
              <Text style={styles.pauseTitle}>TẠM DỪNG</Text>
              <Pressable testID="race-resume" accessibilityRole="button" onPress={resume} style={styles.resume}><Text style={styles.buttonText}>TIẾP TỤC</Text></Pressable>
              <Pressable testID="race-exit" accessibilityRole="button" onPress={exit} style={styles.exit}><Text style={styles.buttonText}>THOÁT</Text></Pressable>
            </View>
          </View>}
        </View>
      </View>
    </View>}
  </GestureHandlerRootView>;
};
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#064E3B' }, safe: { flex: 1 }, arena: { flex: 1, minHeight: 0 },
  modalSafe: { flex: 1 }, modalPause: { position: 'absolute', right: 8, top: 8 }, error: { position: 'absolute', bottom: 8, color: '#fff' },
  modalHost: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 2000 },
  pauseOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.72)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  pauseCard: { width: '100%', maxWidth: 330, borderRadius: 24, borderWidth: 3, borderColor: '#D97706', backgroundColor: '#FEF3C7', padding: 20, gap: 12 },
  pauseTitle: { fontSize: 25, fontWeight: '900', color: '#78350F', textAlign: 'center', marginBottom: 4 },
  resume: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#059669', borderRadius: 14 },
  exit: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#B45309', borderRadius: 14 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '900' } });
