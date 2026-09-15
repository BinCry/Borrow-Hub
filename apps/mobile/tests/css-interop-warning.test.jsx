import { render } from '@testing-library/react-native';
import { NavigationStateContext } from 'expo-router/build/react-navigation/core/NavigationStateContext';
import { useContext } from 'react';
import { View } from 'react-native';
import { renderComponent, UpgradeState } from 'react-native-css-interop/dist/runtime/native/render-component';

function emitUpgradeWarning(originalProps) {
  return renderComponent(View, {
    canUpgradeWarn: true,
    pressable: UpgradeState.NONE,
    animated: UpgradeState.NONE,
    variables: UpgradeState.SHOULD_UPGRADE,
    containers: UpgradeState.NONE,
    originalProps,
  }, {}, {}, {});
}

test('upgrade warnings do not invoke the real navigation context getters', () => {
  let context;
  function CaptureContext() {
    context = useContext(NavigationStateContext);
    return null;
  }
  render(<CaptureContext />);
  const getter = jest.spyOn(context, 'getKey', 'get');
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});

  expect(() => emitUpgradeWarning({ navigation: context })).not.toThrow();
  expect(getter).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(expect.stringContaining('[Getter/Setter]'));
});

test('warnings stay bounded for cyclic, deeply shared React-like trees', () => {
  const props = { className: 'shadow-sm' };
  props.self = props;
  let tree = props;
  for (let depth = 0; depth < 30; depth += 1) {
    tree = { child: tree, sibling: tree, parent: props };
  }
  props.children = tree;
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});

  expect(() => emitUpgradeWarning(props)).not.toThrow();
  expect(log.mock.calls[0][0]).toContain('[MaxDepth]');
  expect(log.mock.calls[0][0].length).toBeLessThan(5000);
});

test('warnings handle toJSON accessors and values JSON cannot serialize', () => {
  const getter = jest.fn(() => { throw new Error('toJSON getter invoked'); });
  const props = { id: 1n };
  Object.defineProperty(props, 'toJSON', { enumerable: true, get: getter });
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});

  expect(() => emitUpgradeWarning(props)).not.toThrow();
  expect(getter).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(expect.stringContaining('1n'));
});
