import React from 'react';
import { useRouter } from 'expo-router';
import { TrainingGamesHome } from '../features/training-games/TrainingGamesHome';
import { GameId } from '../features/training-games/types';

export default function HomeScreen() {
  const router = useRouter();

  const handleSelectGame = (gameId: GameId) => {
    router.push(`/games/${gameId}`);
  };

  return <TrainingGamesHome onSelectGame={handleSelectGame} />;
}
