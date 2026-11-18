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

describe('addDays et mondayOf', () => {
  test('addDays traverse les fins de mois et d\'année', () => {
    const { addDays } = require('../src/utils/date');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  test('mondayOf renvoie le lundi de la semaine', () => {
    const { mondayOf } = require('../src/utils/date');
    expect(mondayOf('2026-11-17')).toBe('2026-11-16'); // mardi
    expect(mondayOf('2026-11-16')).toBe('2026-11-16'); // lundi
    expect(mondayOf('2026-11-22')).toBe('2026-11-16'); // dimanche
  });
});

describe('isValidTimezone', () => {
  const { isValidTimezone } = require('../src/utils/date');
  test.each(['UTC', 'Europe/Paris', 'America/New_York'])('accepte %s', (tz) => {
    expect(isValidTimezone(tz)).toBe(true);
  });
  test.each(['Mars/Olympus', 'Paris', ''])('refuse %p', (tz) => {
    expect(isValidTimezone(tz)).toBe(false);
  });
});
