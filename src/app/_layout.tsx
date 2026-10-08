import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Trò chơi rèn luyện cho em' }} />
        <Stack.Screen name="games/[gameId]" options={{ title: 'Chi tiết trò chơi' }} />
      </Stack>
    </>
  );
}
