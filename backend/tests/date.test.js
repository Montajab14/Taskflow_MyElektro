const { isValidDateString } = require('../src/utils/date');

describe('isValidDateString', () => {
  test.each(['2026-01-01', '2026-12-31', '2024-02-29', '2000-02-29'])('accepte %s', (s) => {
    expect(isValidDateString(s)).toBe(true);
  });

  test.each([
    '2026-02-29', '1900-02-29', '2026-04-31', '2026-00-10', '2026-13-01', '2026-01-00',
    '2026-1-01', '26-01-01', '2026/01/01', '2026-01-01T00:00:00Z', '', null, 20260101,
  ])('refuse %p', (s) => {
    expect(isValidDateString(s)).toBe(false);
  });
});
