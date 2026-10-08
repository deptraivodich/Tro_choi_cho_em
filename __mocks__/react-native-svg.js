const React = require('react');

const mockComponent = (name) => {
  return function MockSvgComponent(props) {
    return React.createElement(name, props, props.children);
  };
};

module.exports = {
  __esModule: true,
  default: mockComponent('Svg'),
  Svg: mockComponent('Svg'),
  Rect: mockComponent('Rect'),
  Circle: mockComponent('Circle'),
  Path: mockComponent('Path'),
  Line: mockComponent('Line'),
  Polygon: mockComponent('Polygon'),
  G: mockComponent('G'),
  Defs: mockComponent('Defs'),
  LinearGradient: mockComponent('LinearGradient'),
  Stop: mockComponent('Stop'),
  Text: mockComponent('Text'),
};
