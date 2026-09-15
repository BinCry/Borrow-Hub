const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const { registerCSS, setupAllComponents } = require('react-native-css-interop/test');
const { cssToReactNativeRuntimeOptions } = require('nativewind/dist/metro/common');

let compiledCSS;

beforeAll(async () => {
  process.env.NATIVEWIND_OS = 'ios';
  const config = require('../tailwind.config');
  const result = await postcss([
    tailwind({
      ...config,
      content: [path.resolve(__dirname, '../src/**/*.{js,jsx,ts,tsx}').replace(/\\/g, '/')],
    }),
  ]).process(fs.readFileSync(path.resolve(__dirname, '../src/global.css'), 'utf8'), {
    from: undefined,
  });
  compiledCSS = result.css;
});

beforeEach(() => {
  setupAllComponents();
  registerCSS(compiledCSS, cssToReactNativeRuntimeOptions);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
