/* global jest */
// Native I/O adapter for registry import tests. Real lifecycle/audio is checked in CDP;
// GameAudio unit tests use their own stateful player ports.
module.exports = {
  Asset: { loadAsync: jest.fn(() => Promise.resolve([])) },
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({
    loop: false, volume: 0, playing: false,
    play: jest.fn(), pause: jest.fn(), remove: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
  })),
};
