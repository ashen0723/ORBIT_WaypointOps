/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.ts$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // The generated Prisma client imports './x.js'; under ts-jest those resolve to the .ts sources.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testEnvironment: 'node',
};
