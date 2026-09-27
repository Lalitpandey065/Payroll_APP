const SRC = '/sessions/nifty-charming-euler/mnt/Payroll_System/src';
const NM  = '/tmp/react_test/node_modules';

module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  roots: ['/tmp/react_test'],
  modulePaths: [NM],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
    '^lucide-react$':             '<rootDir>/__mocks__/lucide-react.js',
    // Force single React/Router/Zustand instance
    '^react$':                    `${NM}/react/index.js`,
    '^react/jsx-runtime$':        `${NM}/react/jsx-runtime.js`,
    '^react-dom$':                `${NM}/react-dom/index.js`,
    '^react-dom/client$':         `${NM}/react-dom/client.js`,
    '^react-router-dom$':         `${NM}/react-router-dom/dist/index.js`,
    '^zustand$':                  `${NM}/zustand/index.js`,
    '^zustand/(.*)$':             `${NM}/zustand/$1`,
    // App source aliases
    '^../../utils/validators$':   `${SRC}/utils/validators.js`,
    '^../../utils/formatters$':   `${SRC}/utils/formatters.js`,
    '^../../utils/constants$':    `${SRC}/utils/constants.js`,
    '^../utils/validators$':      `${SRC}/utils/validators.js`,
    '^../utils/formatters$':      `${SRC}/utils/formatters.js`,
    '^../utils/constants$':       `${SRC}/utils/constants.js`,
    '^../../store/(.*)$':         `${SRC}/store/$1`,
    '^../store/(.*)$':            `${SRC}/store/$1`,
    '^../../components/(.*)$':    `${SRC}/components/$1`,
    '^../components/(.*)$':       `${SRC}/components/$1`,
  },
  transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
  transformIgnorePatterns: ['node_modules/(?!(zustand)/)'],
  testMatch: ['**/*.test.js']
};
