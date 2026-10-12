// Node/SSR tests exercise markup and pure engine/camera geometry. UI animation is verified by CDP separately.
const React = require('react');
const RN = require('react-native-web');
const useSharedValue = value => React.useRef({ value, set(next) { this.value = next; } }).current;
module.exports = {
  __esModule: true, default: RN.Animated, useSharedValue,
  useAnimatedStyle: fn => fn(), useAnimatedReaction: () => {}, useFrameCallback: () => ({ setActive: () => {} }),
  withTiming: value => value, cancelAnimation: () => {}, runOnJS: fn => fn, Easing: RN.Easing,
  useIsFocused: () => true, useFocusEffect: () => {}, usePreventRemove: () => {},
  SafeAreaView: RN.View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  StatusBar: () => null,
  GestureHandlerRootView: RN.View, GestureDetector: ({ children }) => children,
  Gesture: { Pan: () => ({ minDistance() { return this; }, enabled() { return this; },
    onStart() { return this; }, onUpdate() { return this; } }) },
};
