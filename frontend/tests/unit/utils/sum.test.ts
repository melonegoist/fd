import { sum } from '../../../src/utils/sum';

describe('sum utility', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });

  test('adds negative numbers correctly', () => {
    expect(sum(-1, -2)).toBe(-3);
  });

  test('adds zero correctly', () => {
    expect(sum(5, 0)).toBe(5);
  });

  test('adds decimal numbers correctly', () => {
    expect(sum(1.5, 2.5)).toBe(4);
  });
});

