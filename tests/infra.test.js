// tests/infra.test.js
const { add, isEven } = require('../src/utils/infraHelper');

test('add returns sum', () => {
  expect(add(2, 3)).toBe(5);
});

test('isEven returns true for even numbers', () => {
  expect(isEven(4)).toBe(true);
});
