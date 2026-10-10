import React from 'react';
import { useRouter } from 'expo-router';
import { TrainingGamesHome } from '../screens/TrainingGamesHome';
import { GameId } from '../shared/types/index';

export default function HomeScreen() {
  const router = useRouter();

  const handleSelectGame = (gameId: GameId) => {
    router.push(`/games/${gameId}`);
  };

  return <TrainingGamesHome onSelectGame={handleSelectGame} />;
}
