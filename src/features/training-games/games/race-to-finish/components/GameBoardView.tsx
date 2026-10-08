import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Path, Line, Polygon, Defs, Marker, G } from 'react-native-svg';
import { BOARD_TILES, BOARD_ARROWS, getTileNormalizedCoords, getPlayerTileOffset, START_POSITION } from '../boardConfig';
import { Player, BoardTile, CharacterId, CharacterPose } from '../types';
import { RACE_ASSETS } from '../assets';

interface GameBoardViewProps {
  players: Player[];
  activePlayerIndex: number;
  boardWidth: number;
  boardHeight: number;
}

export const GameBoardView: React.FC<GameBoardViewProps> = ({
  players,
  activePlayerIndex,
  boardWidth,
  boardHeight,
}) => {
  // Tile dimensions proportional to board width
  const tileWidth = Math.min(108, boardWidth * 0.23);
  const tileHeight = tileWidth * 0.56;
  const charSize = Math.min(56, boardWidth * 0.125);

  // Group players by position to calculate offsets
  const playersByPosition: Record<number, { player: Player; originalIndex: number }[]> = {};
  players.forEach((p, idx) => {
    if (!playersByPosition[p.position]) {
      playersByPosition[p.position] = [];
    }
    playersByPosition[p.position].push({ player: p, originalIndex: idx });
  });

  return (
    <View style={[styles.container, { width: boardWidth, height: boardHeight }]}>
      {/* Background Forest Environment */}
      <Image
        source={RACE_ASSETS.background}
        style={[styles.backgroundImage, { width: boardWidth, height: boardHeight }]}
        resizeMode="cover"
      />

      {/* SVG Connecting Arrows (1 -> 2 -> ... -> 21) */}
      <Svg width={boardWidth} height={boardHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <Marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <Polygon points="0 0, 6 3, 0 6" fill="#D97706" />
          </Marker>
        </Defs>
        {BOARD_ARROWS.map((arr, idx) => {
          const fromCoord = getTileNormalizedCoords(arr.fromIndex);
          const toCoord = getTileNormalizedCoords(arr.toIndex);
          const x1 = (fromCoord.x / 100) * boardWidth;
          const y1 = (fromCoord.y / 100) * boardHeight;
          const x2 = (toCoord.x / 100) * boardWidth;
          const y2 = (toCoord.y / 100) * boardHeight;

          if (arr.type === 'straight') {
            // Straight connector with direction arrow
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const isLeft = x2 < x1;
            const arrowHeadPoints = isLeft
              ? `${midX + 5},${midY - 4} ${midX - 5},${midY} ${midX + 5},${midY + 4}`
              : `${midX - 5},${midY - 4} ${midX + 5},${midY} ${midX - 5},${midY + 4}`;

            return (
              <G key={`arr-${idx}`}>
                <Polygon points={arrowHeadPoints} fill="#B45309" opacity={0.85} />
              </G>
            );
          } else {
            // Turn-around curved connector at row edge
            const sweepRight = x1 > boardWidth / 2;
            const ctrlX = sweepRight ? x1 + tileWidth * 0.45 : x1 - tileWidth * 0.45;
            const ctrlY = (y1 + y2) / 2;
            const pathD = `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`;

            return (
              <G key={`arr-${idx}`}>
                <Path
                  d={pathD}
                  stroke="#D97706"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  fill="none"
                  opacity={0.8}
                />
              </G>
            );
          }
        })}
      </Svg>

      {/* Start Plank (Tile 0) */}
      <View
        style={[
          styles.startPlankContainer,
          {
            left: (START_POSITION.xPercent / 100) * boardWidth - tileWidth * 0.6,
            top: (START_POSITION.yPercent / 100) * boardHeight - tileHeight * 0.5,
            width: tileWidth * 1.2,
            height: tileHeight * 1.1,
          },
        ]}
      >
        <Image
          source={RACE_ASSETS.ui.start_board}
          style={styles.startPlankImage}
          resizeMode="contain"
        />
        <View style={styles.startBadgeOverlay}>
          <Text style={styles.startBadgeText}>XUẤT PHÁT</Text>
        </View>
      </View>

      {/* 21 Stone Tiles */}
      {Object.values(BOARD_TILES).map((tile) => {
        const coords = getTileNormalizedCoords(tile.index);
        const tileX = (coords.x / 100) * boardWidth;
        const tileY = (coords.y / 100) * boardHeight;

        // Choose tile graphic according to style
        let tileSource = RACE_ASSETS.tiles.neutral;
        if (tile.tileStyle === 'bonus') tileSource = RACE_ASSETS.tiles.bonus;
        else if (tile.tileStyle === 'penalty') tileSource = RACE_ASSETS.tiles.penalty;
        else if (tile.tileStyle === 'finish') tileSource = RACE_ASSETS.tiles.finish;

        return (
          <View
            key={`tile-${tile.index}`}
            style={[
              styles.tileWrapper,
              {
                left: tileX - tileWidth / 2,
                top: tileY - tileHeight / 2,
                width: tileWidth,
                height: tileHeight,
              },
            ]}
          >
            {/* 3D Stone Texture */}
            <Image
              source={tileSource}
              style={[styles.tileImage, { width: tileWidth, height: tileHeight }]}
              resizeMode="contain"
            />

            {/* Tile Content Overlay: Number & Item Icon */}
            <View style={styles.tileContentRow}>
              <Text
                style={[
                  styles.tileNumberText,
                  tile.tileStyle === 'finish' && styles.tileNumberFinish,
                  tile.tileStyle === 'bonus' && styles.tileNumberBonus,
                  tile.tileStyle === 'penalty' && styles.tileNumberPenalty,
                ]}
              >
                {tile.index}
              </Text>

              {/* Special Item Icon */}
              {tile.itemKey && tile.index !== 21 && (
                <View style={styles.tileItemBadge}>
                  <Image
                    source={RACE_ASSETS.items[tile.itemKey]}
                    style={styles.tileItemImage}
                    resizeMode="contain"
                  />
                  {tile.bonusValue && (
                    <Text
                      style={[
                        styles.bonusValueText,
                        tile.bonusValue > 0 ? styles.bonusPos : styles.bonusNeg,
                      ]}
                    >
                      {tile.bonusValue > 0 ? `+${tile.bonusValue}` : `${tile.bonusValue}`}
                    </Text>
                  )}
                </View>
              )}

              {/* Finish Line Trophy */}
              {tile.index === 21 && (
                <View style={styles.finishTrophyBadge}>
                  <Image
                    source={RACE_ASSETS.items.trophy}
                    style={styles.finishTrophyImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Players Standing On Board */}
      {Object.entries(playersByPosition).map(([posStr, playerGroup]) => {
        const pos = Number(posStr);
        const coords = getTileNormalizedCoords(pos);
        const baseX = (coords.x / 100) * boardWidth;
        const baseY = (coords.y / 100) * boardHeight;

        return playerGroup.map((item, groupIdx) => {
          const { player, originalIndex } = item;
          const { offsetX, offsetY } = getPlayerTileOffset(groupIdx, playerGroup.length);
          const isActive = originalIndex === activePlayerIndex;

          const charSprites = RACE_ASSETS.characters[player.character];
          const spriteSource = charSprites[player.currentPose] || charSprites.idle_1;

          return (
            <View
              key={`player-pin-${player.id}`}
              style={[
                styles.playerPinContainer,
                {
                  left: baseX + offsetX - charSize / 2,
                  top: baseY + offsetY - charSize,
                  width: charSize,
                  height: charSize,
                  zIndex: 50 + pos * 2 + groupIdx,
                },
              ]}
            >
              {/* Active Player Halo Ring */}
              {isActive && (
                <View
                  style={[
                    styles.activeHalo,
                    {
                      width: charSize + 12,
                      height: charSize + 12,
                      left: -6,
                      top: -6,
                      borderRadius: (charSize + 12) / 2,
                    },
                  ]}
                />
              )}

              {/* Shield Aura Icon floating above player */}
              {player.hasShield && (
                <View style={styles.floatingShield}>
                  <Image source={RACE_ASSETS.items.shield} style={styles.miniItemIcon} resizeMode="contain" />
                </View>
              )}

              {/* Cleanse Star floating above player */}
              {player.cleanseCount > 0 && (
                <View style={styles.floatingCleanse}>
                  <Image source={RACE_ASSETS.items.cleanse} style={styles.miniItemIcon} resizeMode="contain" />
                </View>
              )}

              {/* Real Character Sprite with Aligned Baseline */}
              <Image source={spriteSource} style={styles.charSprite} resizeMode="contain" />

              {/* Player Mini Name Pill */}
              <View style={[styles.namePill, { backgroundColor: getCharBg(player.character) }]}>
                <Text style={styles.namePillText} numberOfLines={1}>
                  {player.name}
                </Text>
              </View>
            </View>
          );
        });
      })}
    </View>
  );
};

function getCharBg(charId: CharacterId): string {
  switch (charId) {
    case 'fox':
      return '#EA580C';
    case 'penguin':
      return '#0284C7';
    case 'bunny':
      return '#9333EA';
    case 'turtle':
      return '#059669';
    default:
      return '#059669';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#86EFAC',
    alignSelf: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  tileWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileImage: {
    position: 'absolute',
  },
  tileContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    gap: 4,
  },
  tileNumberText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#374151',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tileNumberBonus: {
    color: '#047857',
  },
  tileNumberPenalty: {
    color: '#B91C1C',
  },
  tileNumberFinish: {
    color: '#B45309',
    fontSize: 18,
  },
  tileItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileItemImage: {
    width: 22,
    height: 22,
  },
  bonusValueText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 1,
  },
  bonusPos: {
    color: '#059669',
  },
  bonusNeg: {
    color: '#DC2626',
  },
  finishTrophyBadge: {
    position: 'absolute',
    top: -20,
    right: -4,
  },
  finishTrophyImage: {
    width: 32,
    height: 32,
  },
  startPlankContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  startPlankImage: {
    width: '100%',
    height: '100%',
  },
  startBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  startBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF3C7',
    letterSpacing: 0.5,
  },
  playerPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  activeHalo: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  floatingShield: {
    position: 'absolute',
    top: -12,
    left: -4,
    zIndex: 10,
  },
  floatingCleanse: {
    position: 'absolute',
    top: -12,
    right: -4,
    zIndex: 10,
  },
  miniItemIcon: {
    width: 18,
    height: 18,
  },
  charSprite: {
    width: '100%',
    height: '100%',
  },
  namePill: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    maxWidth: 60,
  },
  namePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
