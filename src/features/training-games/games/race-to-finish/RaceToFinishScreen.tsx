import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { GameHeader } from '../../components/GameHeader';
import { GameModal } from '../../components/GameModal';
import { useRaceGame } from './useRaceGame';
import { GameBoardView } from './components/GameBoardView';
import { PlayerBanner } from './components/PlayerBanner';
import { TurnDashboard } from './components/TurnDashboard';
import { SetupModal } from './components/SetupModal';
import { CleanseChoiceModal } from './components/CleanseChoiceModal';
import { TurnHandoverModal } from './components/TurnHandoverModal';
import { VictoryModal } from './components/VictoryModal';
import { RACE_ASSETS } from './assets';
import { colors } from '../../theme/colors';

export const RaceToFinishScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { width, height } = useWindowDimensions();
  const [modalType, setModalType] = useState<'pause' | 'tutorial' | null>(null);

  const {
    gameMode,
    players,
    activePlayerIndex,
    gamePhase,
    currentDiceValue,
    pendingPenalty,
    winner,
    logMessage,
    isPaused,
    setIsPaused,
    startGame,
    handleRollDice,
    handleUseCleanse,
    handleKeepCleanse,
    handleHandoverReady,
    exitGame,
  } = useRaceGame();

  // Unified responsive canvas matching 941 x 1672 aspect ratio (0.5628)
  const canvasHeight = useMemo(() => {
    const availableHeight = height - 58; // header height + margins
    return Math.min(Math.max(availableHeight - 12, 540), 840);
  }, [height]);

  const canvasWidth = useMemo(() => {
    const idealW = canvasHeight * (941 / 1672);
    return Math.min(width - 12, idealW, 460);
  }, [width, canvasHeight]);

  const activePlayer = players[activePlayerIndex] || players[0];

  const handleScreenExit = () => {
    exitGame(onExit);
  };

  return (
    <View style={styles.container}>
      {/* Universal Safe GameHeader */}
      <GameHeader
        title="Đua Về Đích"
        topicBadge="Chẵn / Lẻ & Chiến thuật"
        onPause={() => {
          setIsPaused(true);
          setModalType('pause');
        }}
        onHelp={() => {
          setIsPaused(true);
          setModalType('tutorial');
        }}
        onExit={handleScreenExit}
        extraStats={
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {gameMode === 'single' ? '🤖 Đấu với Máy' : '👥 Nhiều người'}
            </Text>
          </View>
        }
      />

      {/* Main Board Arena */}
      <View style={styles.mainArena}>
        {players.length > 0 && (
          <View style={[styles.boardWrapper, { width: canvasWidth, height: canvasHeight }]}>
            {/* Top Area: Wooden Sign & 4 Player Portraits */}
            <View style={styles.topAreaOverlay}>
              <Image
                source={RACE_ASSETS.ui.header_sign}
                style={styles.headerSignImg}
                resizeMode="contain"
              />
              <PlayerBanner players={players} activePlayerIndex={activePlayerIndex} />
            </View>

            {/* Game Board: Background, Tiles, Arrows, Characters */}
            <GameBoardView
              players={players}
              activePlayerIndex={activePlayerIndex}
              boardWidth={canvasWidth}
              boardHeight={canvasHeight}
            />

            {/* Bottom Turn Dashboard (Fixed at bottom of canvas) */}
            {activePlayer && (
              <View style={styles.bottomAreaOverlay}>
                <TurnDashboard
                  activePlayer={activePlayer}
                  currentDiceValue={currentDiceValue}
                  gamePhase={gamePhase}
                  logMessage={logMessage}
                  onRollPress={handleRollDice}
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Game Modals */}

      {/* 1. Setup Modal (on launch or replay) */}
      <SetupModal
        visible={gamePhase === 'setup'}
        onStartGame={startGame}
        onExit={handleScreenExit}
      />

      {/* 2. Cleanse Choice Modal (human holding Cleanse Star facing penalty) */}
      <CleanseChoiceModal
        visible={gamePhase === 'awaiting_cleanse_choice'}
        pendingPenalty={pendingPenalty}
        onUseCleanse={handleUseCleanse}
        onKeepCleanse={handleKeepCleanse}
      />

      {/* 3. Local Multiplayer Turn Handover */}
      {players[activePlayerIndex] && (
        <TurnHandoverModal
          visible={gamePhase === 'turn_handover'}
          nextPlayer={players[activePlayerIndex]}
          onReady={handleHandoverReady}
        />
      )}

      {/* 4. Victory / Champion Modal */}
      <VictoryModal
        visible={gamePhase === 'finished'}
        winner={winner}
        allPlayers={players}
        onPlayAgain={() => startGame(gameMode, players.map((p) => ({ ...p, position: 0, hasShield: false, cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1' })))}
        onExit={handleScreenExit}
      />

      {/* 5. Standard Game Pause & Tutorial Modal */}
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
          startGame(gameMode, players.map((p) => ({ ...p, position: 0, hasShield: false, cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1' })));
        }}
        onExit={handleScreenExit}
        onCloseTutorial={() => {
          setIsPaused(false);
          setModalType(null);
        }}
        tutorialContent={
          <View>
            <Text style={styles.tutText}>
              🏁 **Mục tiêu**: Người chơi điều khiển nhân vật di chuyển trên 21 ô đá uốn lượn để về đích đầu tiên.
            </Text>
            <Text style={styles.tutText}>
              🎲 **Quy tắc xúc xắc**:
              {'\n'}• Ra số **Lẻ (1, 3, 5)**: Tiến **1 ô**.
              {'\n'}• Ra số **Chẵn (2, 4, 6)**: Tiến **2 ô**.
            </Text>
            <Text style={styles.tutText}>
              🪶 **Ô Thưởng**:
              {'\n'}• Ô 2, 17: Tiến thêm 1 ô.
              {'\n'}• Ô 5: Tiến thêm 2 ô thần tốc.
              {'\n'}• Ô 9: Nhận Khiên Phép tự động chặn 1 lần phạt tiếp theo.
              {'\n'}• Ô 13: Nhận Ngôi Sao Giải Bất Lợi (được giữ để tự chọn hóa giải phạt).
            </Text>
            <Text style={styles.tutText}>
              ⚠️ **Ô Phạt**:
              {'\n'}• Ô 4: Lùi 1 ô.
              {'\n'}• Ô 14: Lùi 2 ô.
              {'\n'}• Ô 11, 19: Bị mất 1 lượt đổ xúc xắc kế tiếp.
              {'\n'}• Ô 7: Cổng hư không hút về Vị trí Xuất phát (0).
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
    backgroundColor: '#064E3B', // Deep forest background
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
  },
  boardWrapper: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#065F46',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  topAreaOverlay: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  headerSignImg: {
    width: 170,
    height: 42,
  },
  bottomAreaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 25,
  },
  tutText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
});
