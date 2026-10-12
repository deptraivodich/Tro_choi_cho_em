import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { Point } from '../logic/cameraGeometry';
export const CameraTracking = createContext<SharedValue<Point> | null>(null);
export const useCameraTracking = () => useContext(CameraTracking);
