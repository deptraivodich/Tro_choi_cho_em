import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Image,
} from 'react-native';
import { GameHeader } from '../../../shared/components/GameHeader';
import { GameModal } from '../../../shared/components/GameModal';
import { useRaceGame } from '../hooks/useRaceGame';
import { GameBoardView } from '../components/GameBoardView';
import { PlayerBanner } from '../components/PlayerBanner';
import { TurnDashboard } from '../components/TurnDashboard';
import { SetupModal } from '../components/SetupModal';
import { MathQuestionModal } from '../components/MathQuestionModal';
import { MysteryRollModal } from '../components/MysteryRollModal';
import { ForkChoiceModal } from '../components/ForkChoiceModal';
import { TurnHandoverModal } from '../components/TurnHandoverModal';
import { VictoryModal } from '../components/VictoryModal';
import { RACE_ASSETS } from '../assets/index';
import { getTileOrder, getTile } from '../data/boardConfig';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const RaceToFinishScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { width, height } = useWindowDimensions();
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | null>(null);
  const boardScroll = useRef<ScrollView>(null);
  const arenaScroll = useRef<ScrollView>(null);
  const [boardTop, setBoardTop] = useState(140);
  const [arenaHeight, setArenaHeight] = useState(height - 68);
  const reducedMotion = useReducedMotion();

  const {
    gameMode, actionId, motion, question, submittedAnswer, answerCorrect, handleAnswer, onMovementComplete, onSpinComplete, saveError,
    players,
    activePlayerIndex,
    activePlayer,
    gamePhase,
    currentDiceValue,
    mysteryRollState,
    forkChoiceState,
    winner,
    logMessage,
    isPaused,
    setIsPaused,
    startGame,
    handleRollDice,
    handleSelectBranch,
    handleClaimBonus,
    handleApplyPenalty,
    handleUseCleanse,
    confirmHandover,
  } = useRaceGame();

  // Landscape board dimension calculation (16:9 aspect ratio)
  const isLandscape = width >= height;

  const { boardWidth, boardHeight, needsHorizontalScroll } = useMemo(() => {
    if (isLandscape) {
      // Landscape mode (desktop / tablet / rotated phone)
      const maxW = width - 24;
      const maxH = height - 160; // Leave space for header and bottom dashboard
      let bW = maxW;
      let bH = bW * (9 / 16);

      if (bH > maxH) {
        bH = maxH;
        bW = bH * (16 / 9);
      }

      return {
        boardWidth: Math.min(bW, 1024),
        boardHeight: Math.min(bH, 576),
        needsHorizontalScroll: false,
      };
    } else {
      // Portrait mobile mode: keep readable landscape board with horizontal scrolling
      const minReadableW = Math.max(width * 1.55, 620);
      const bH = minReadableW * (9 / 16);
      return {
        boardWidth: minReadableW,
        boardHeight: bH,
        needsHorizontalScroll: true,
      };
    }
  }, [width, height, isLandscape]);

  const activeTileId = activePlayer?.currentTileId;
  useEffect(() => {
    if (!needsHorizontalScroll || !activeTileId || isPaused) return;
    const center = getTile(activeTileId).xPercent * boardWidth / 100 + 12;
    boardScroll.current?.scrollTo({ x: Math.max(0, Math.min(boardWidth + 24 - width, center - width / 2)), animated: !reducedMotion });
  }, [activeTileId, boardWidth, width, needsHorizontalScroll, isPaused, reducedMotion]);

  useEffect(() => {
    if (!activeTileId || isPaused || !['moving', 'applying_effect'].includes(gamePhase)) return;
    const centerY = boardTop + getTile(activeTileId).yPercent * boardHeight / 100;
    arenaScroll.current?.scrollTo({ y: Math.max(0, centerY - arenaHeight / 2), animated: !reducedMotion });
  }, [activeTileId, isPaused, gamePhase, boardTop, boardHeight, arenaHeight, reducedMotion]);

  const handleScreenExit = () => {
    setIsPaused(true);
    onExit();
  };

  return (
    <View style={styles.container}>
      {/* Universal GameHeader */}
      <GameHeader
        title="Đua Về Đích"
        topicBadge={width < 600 ? 'Toán lớp 5' : 'Rừng Phiêu Lưu • 1-6 Bước'}
        onPause={() => {
          setIsPaused(true);
          setModalType('pause');
        }}
        onHelp={() => {
          setIsPaused(true);
          setModalType('tutorial');
        }}
        onExit={handleScreenExit}
        extraStats={width >= 600 ? (
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {gameMode === 'single' ? '🤖 Đấu với Máy' : '👥 Nhiều người'}
            </Text>
          </View>
        ) : undefined}
      />

      {/* Main Arena */}
      <ScrollView ref={arenaScroll} style={styles.mainArena} contentContainerStyle={styles.mainArenaContent} nestedScrollEnabled
        onLayout={event => setArenaHeight(event.nativeEvent.layout.height)}>
        {players.length > 0 && (
          <View style={styles.arenaContent}>
            {/* Top Area: Wooden Sign & 4 Player Portraits */}
            <View style={styles.topAreaOverlay}>
              <Image
                source={RACE_ASSETS.ui.header_sign}
                style={styles.headerSignImg}
                resizeMode="contain"
              />
              <PlayerBanner players={players} activePlayerIndex={activePlayerIndex} />
            </View>

            {/* Game Board (with horizontal scrolling on portrait phone) */}
            {needsHorizontalScroll ? (
              <ScrollView
                ref={boardScroll}
                onLayout={event => setBoardTop(event.nativeEvent.layout.y)}
                horizontal
                nestedScrollEnabled
                style={{ width: '100%', height: boardHeight, flexGrow: 0, flexShrink: 0 }}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollBoardContainer}
              >
                <GameBoardView
                  players={players}
                  moving={!!motion && (gamePhase === 'moving' || gamePhase === 'applying_effect')}
                  paused={isPaused} actionId={actionId} onMovementComplete={onMovementComplete}
                  activePlayerIndex={activePlayerIndex}
                  boardWidth={boardWidth}
                  boardHeight={boardHeight}
                  activeForkTileId={forkChoiceState?.forkTileId}
                />
              </ScrollView>
            ) : (
              <View style={styles.boardCenterWrapper}>
                <GameBoardView
                  players={players}
                  moving={!!motion && (gamePhase === 'moving' || gamePhase === 'applying_effect')}
                  paused={isPaused} actionId={actionId} onMovementComplete={onMovementComplete}
                  activePlayerIndex={activePlayerIndex}
                  boardWidth={boardWidth}
                  boardHeight={boardHeight}
                  activeForkTileId={forkChoiceState?.forkTileId}
                />
              </View>
            )}

            {/* Bottom Turn Dashboard */}
            {activePlayer && (
              <View style={styles.bottomAreaOverlay}>
                <TurnDashboard
                  activePlayer={activePlayer}
                  currentDiceValue={currentDiceValue}
                  gamePhase={gamePhase} paused={isPaused}
                  logMessage={logMessage}
                  onRollPress={handleRollDice}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Game Modals */}

      {/* 1. Setup Modal */}
      <SetupModal
        visible={gamePhase === 'setup'}
        onStartGame={startGame}
        onExit={handleScreenExit}
      />

      {/* 2. Interactive Mystery Roll Modal (Bonus or Penalty) */}
      <MysteryRollModal
        visible={gamePhase === 'rolling_mystery' || gamePhase === 'mystery_result'}
        state={mysteryRollState}
        paused={isPaused} revealed={gamePhase === 'mystery_result'}
        actionId={actionId} onSpinComplete={onSpinComplete}
        activePlayer={activePlayer}
        onClaimReward={handleClaimBonus}
        onApplyPenalty={handleApplyPenalty}
        onUseCleanse={handleUseCleanse}
      />

      {question && activePlayer && <MathQuestionModal key={question.key} question={question}
        player={activePlayer} dice={currentDiceValue} submittedAnswer={submittedAnswer}
        correct={answerCorrect} paused={isPaused} onAnswer={handleAnswer} />}
      {saveError && <Text accessibilityRole="alert">{saveError}</Text>}

      {/* 3. Fork Branch Selection Modal */}
      <ForkChoiceModal
        visible={gamePhase === 'awaiting_fork_choice'}
        activePlayer={activePlayer}
        remainingSteps={forkChoiceState?.remainingSteps || 1}
        forkTileOrder={forkChoiceState ? getTileOrder(forkChoiceState.forkTileId) : 4}
        onSelectBranch={handleSelectBranch}
        paused={isPaused}
      />

      {/* 4. Local Multiplayer Handover */}
      {players[activePlayerIndex] && (
        <TurnHandoverModal
          visible={gamePhase === 'turn_handover'}
          nextPlayer={players[activePlayerIndex]}
          onReady={confirmHandover}
        />
      )}

      {/* 5. Victory Modal */}
      <VictoryModal
        visible={gamePhase === 'finished'}
        winner={winner}
        allPlayers={players}
        onPlayAgain={() => startGame(gameMode, players)}
        onExit={handleScreenExit}
      />

      {/* 6. Standard Pause & Tutorial Modal */}
      <GameModal
        type={modalType}
        title="Hướng Dẫn: Đua Về Đích"
        onResume={() => {
          setIsPaused(false);
          setModalType(null);
        }}
        onRestart={() => {
          setIsPaused(false);
          setModalType(null);
          startGame(gameMode, players);
        }}
        onExit={handleScreenExit}
        onCloseTutorial={() => {
          setIsPaused(false);
          setModalType(null);
        }}
        tutorialContent={
          <View>
            <Text style={styles.tutText}>
              🏁 **Mục tiêu**: Vượt qua cung đường phiêu lưu uốn lượn để trở thành người đầu tiên cán đích tại bục cúp vinh quang!
            </Text>
            <Text style={styles.tutText}>
              🎲 **Luật Xúc Xắc**:
              {'\n'}• Tung xúc xắc, trả lời toán đúng rồi đi đủ số ô (1–6 ô). Sai thì đứng yên.
              {'\n'}• Tới đích trước khi hết bước vẫn thắng ngay!
            </Text>
            <Text style={styles.tutText}>
              ⚡ **Đường Tắt**:
              {'\n'}• Tại các điểm rẽ (có ký hiệu mũi tên trắng {`>>>`}), em được chọn đi **Đường chính** hoặc phóng qua **Đường tắt** để bỏ qua nhiều ô chướng ngại vật!
            </Text>
            <Text style={styles.tutText}>
              🎁 **Ô Thưởng Bí Ẩn**:
              {'\n'}• Dừng ở ô hộp quà xanh để quay bánh xe may mắn: Tiến thêm 1-2 ô, nhận Khiên Thần bảo vệ, hoặc Ngôi Sao Giải Hạn.
            </Text>
            <Text style={styles.tutText}>
              ⚠️ **Ô Phạt Bí Ẩn**:
              {'\n'}• Dừng ở ô đỏ để quay hình phạt: Lùi 1-2 ô, mất lượt kế tiếp.
              {'\n'}• Hình phạt “Về xuất phát” chỉ có thể xuất hiện trong 10 ô đầu; từ ô thứ 11 trở đi hoàn toàn không có!
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
  },
  statPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  mainArena: {
    flex: 1,
    width: '100%',
  },
  mainArenaContent: {
    flexGrow: 1,
  },
  arenaContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  topAreaOverlay: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
    zIndex: 10,
  },
  headerSignImg: {
    width: 170,
    height: 38,
    marginBottom: 2,
  },
  boardCenterWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBoardContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  bottomAreaOverlay: {
    width: '100%',
    zIndex: 10,
  },
  tutText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
});
