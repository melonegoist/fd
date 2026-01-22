const { sum } = require('../../src/utils/sum.cjs');

test('sum util adds numbers', () => {
  expect(sum(2, 3)).toBe(5);
});
