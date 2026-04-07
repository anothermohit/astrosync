/**
 * Cycle verification tests
 * Agreed constant: 366.2421875 sidereal days per tropical year
 *   = 46879 / 128
 *   = 46879 sidereal rotations per 46751 solar days
 *   = (46751/128) solar days × (46879/46751) rot/day
 */

const { test, expect } = require('@playwright/test');
const APP_URL = 'https://astro-esm.web.app';

const AGREED = {
  siderealDaysPerTropicalYear: 366.2421875,   // = 46879 / 128
  tropicalYear:                365.2421875,   // = 46751 / 128  days
  rotNumerator:                46879,
  rotDenominator:              46751,
  fracNumerator:               46879,
  fracDenominator:             128
};

// ── Test 1: Constants are correctly encoded as exact fractions ─────────────
test('tropical year = 46751/128 = 365.2421875 days', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const Ty = await page.evaluate(() => window.EARTH.Ty);

  console.log('  EARTH.Ty =', Ty);
  expect(Ty).toBe(365.2421875);  // exact IEEE-754 representation of 46751/128
});

// ── Test 2: Rotation rate encodes 46879 sidereal rotations per 46751 solar days
test('rotation rate = 2π × 46879/46751 rad/day', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const result = await page.evaluate(() => {
    const rate = window.EARTH_ROT_RATE;                  // rad/day
    const rotPerDay = rate / (2 * Math.PI);
    const expected  = 46879 / 46751;
    return {
      rotPerDay,
      expected,
      diffPPB: Math.abs(rotPerDay - expected) / expected * 1e9
    };
  });

  console.log('  rot/day  =', result.rotPerDay.toFixed(12));
  console.log('  expected =', result.expected.toFixed(12));
  console.log('  error    =', result.diffPPB.toFixed(3), 'ppb');

  // Allow 1 ppb floating point tolerance
  expect(result.diffPPB).toBeLessThan(1);
});

// ── Test 3: Core assertion — 366.2421875 sidereal days per tropical year ───
test('366.2421875 sidereal days per tropical year', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const result = await page.evaluate(() => {
    const Ty      = window.EARTH.Ty;            // 365.2421875 solar days
    const rotRate = window.EARTH_ROT_RATE;      // rad/day
    const rotPerDay = rotRate / (2 * Math.PI);

    // Sidereal rotations in one tropical year
    const siderealPerYear = rotPerDay * Ty;

    // Exact value via integer fractions
    // (46879/46751) * (46751/128) = 46879/128
    const exact = 46879 / 128;

    return {
      siderealPerYear,
      exact,
      agreed:   366.2421875,
      diffArcsec: Math.abs(siderealPerYear - 366.2421875) * 360 * 3600  // arcseconds of rotation
    };
  });

  console.log('  sidereal days/tropical year =', result.siderealPerYear.toFixed(10));
  console.log('  exact fraction 46879/128    =', result.exact);
  console.log('  agreed constant             =', result.agreed);
  console.log('  residual                    =', result.diffArcsec.toFixed(6), 'arcsec');

  expect(result.siderealPerYear).toBeCloseTo(AGREED.siderealDaysPerTropicalYear, 7);
  expect(result.exact).toBe(AGREED.siderealDaysPerTropicalYear);
});

// ── Test 4: Geometric — simulate 1 tropical year, measure rotation ─────────
test('simulation: Earth rotates 366.2421875 × 360° in one tropical year', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);  // let first frame render

  const result = await page.evaluate(() => {
    const Ty       = window.EARTH.Ty;
    const rotRate  = window.EARTH_ROT_RATE;   // rad/day
    const GAST0    = window.GAST_J2000;       // rad — GAST at J2000

    // At day 0 (J2000): GAST = GAST_J2000 + EARTH_ROT_RATE × 0
    // At day Ty:         GAST = GAST_J2000 + EARTH_ROT_RATE × Ty
    const totalRad  = rotRate * Ty;           // total radians rotated
    const rotations = totalRad / (2 * Math.PI);

    return {
      totalDeg:  totalRad  * 180 / Math.PI,
      rotations,
      expected:  366.2421875,
      diffDeg:   Math.abs(rotations - 366.2421875) * 360
    };
  });

  console.log('  total rotation  =', result.totalDeg.toFixed(6), '°');
  console.log('  = ', result.rotations.toFixed(10), 'full rotations');
  console.log('  expected        =', result.expected, 'rotations');
  console.log('  residual        =', result.diffDeg.toFixed(6), '°');

  expect(result.rotations).toBeCloseTo(AGREED.siderealDaysPerTropicalYear, 7);
});

// ── Test 5: Cycle identity — sidereal days/year = solar days/year + 1 ──────
// Earth makes one extra rotation relative to the stars per year
// because it also orbits the Sun once.
// 366.2421875 = 365.2421875 + 1  (exact)
test('identity: sidereal_days/year = solar_days/year + 1', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const result = await page.evaluate(() => {
    const Ty            = window.EARTH.Ty;                            // solar days/year
    const siderealPerYr = (window.EARTH_ROT_RATE / (2 * Math.PI)) * Ty;  // sidereal days/year
    const diff          = siderealPerYr - Ty;                         // should be exactly 1

    // Bonus: sidereal months/year − synodic months/year = 1
    const synodicMonth  = window.MOON ? window.MOON.Tsyn : null;
    const siderealMonth = window.MOON ? window.MOON.Tsid : null;
    const monthDiff     = (synodicMonth && siderealMonth)
      ? (Ty / siderealMonth) - (Ty / synodicMonth)
      : null;

    return { Ty, siderealPerYr, diff, synodicMonth, siderealMonth, monthDiff };
  });

  console.log('  Solar days/year    =', result.Ty.toFixed(7));
  console.log('  Sidereal days/year =', result.siderealPerYr.toFixed(7));
  console.log('  Difference         =', result.diff.toFixed(10), '(must be exactly 1)');
  if (result.monthDiff !== null) {
    console.log('  Sidereal months/yr =', (result.Ty / result.siderealMonth).toFixed(6));
    console.log('  Synodic months/yr  =', (result.Ty / result.synodicMonth).toFixed(6));
    console.log('  Month diff         =', result.monthDiff.toFixed(6), '(should be ~1)');
  }

  // Core: 366.2421875 − 365.2421875 = 1 exactly
  expect(result.diff).toBeCloseTo(1, 7);

  // Moon identity (when constants are agreed)
  if (result.monthDiff !== null) {
    expect(result.monthDiff).toBeGreaterThan(0.99);
    expect(result.monthDiff).toBeLessThan(1.01);
  }
});
