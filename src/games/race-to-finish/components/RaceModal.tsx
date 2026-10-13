import React, { createContext, useContext } from 'react';
import { Modal, ModalProps, View, StyleSheet } from 'react-native';
export const EmbeddedRaceModal = createContext(false);
// Keep question inputs and reel progress mounted beneath Pause, inside one native window.
export function RaceModal({ visible = true, children, ...props }: ModalProps) {
  const embedded = useContext(EmbeddedRaceModal);
  if (!visible) return null;
  return embedded ? <View style={StyleSheet.absoluteFill}>{children}</View>
    : <Modal {...props} visible supportedOrientations={['landscape-left', 'landscape-right', 'portrait']}>{children}</Modal>;
}
