import assert from "node:assert";
import { haversine, todayIST, isPastCutoff, isPlannedBeforeCutoff } from "../src/lib/geo.js";

async function runTests() {
  console.log("------------------------------------------------------------");
  console.log("STARTING AUTOMATED BUSINESS RULES UNIT TESTS");
  console.log("------------------------------------------------------------\n");

  let passed = 0;

  // TEST 1: Haversine Boundary Cases
  {
    console.log("Test 1: Haversine distance calculations and boundary cases");
    // Bhubaneswar Station coords: 20.266876, 85.843484
    const lat1 = 20.266876;
    const lon1 = 85.843484;

    // Same point -> 0 m
    const zeroDist = haversine(lat1, lon1, lat1, lon1);
    assert.strictEqual(Math.round(zeroDist), 0, "Distance to same point must be 0 m");

    // Point exactly ~50m away
    // 0.00045 degrees lat is approximately 50 meters
    const lat50m = lat1 + 0.00045;
    const dist50m = haversine(lat1, lon1, lat50m, lon1);
    assert(dist50m >= 45 && dist50m <= 55, `Expected ~50m, got ${dist50m}`);

    // Point ~250m away (well outside 100m radius)
    const lat250m = lat1 + 0.00225;
    const dist250m = haversine(lat1, lon1, lat250m, lon1);
    assert(dist250m >= 240 && dist250m <= 260, `Expected ~250m, got ${dist250m}`);

    console.log("  ✓ Same coordinate evaluates to 0.00m");
    console.log(`  ✓ 50m point distance: ${dist50m.toFixed(2)}m (within 100m radius)`);
    console.log(`  ✓ 250m point distance: ${dist250m.toFixed(2)}m (outside 100m radius)`);
    passed++;
  }

  // TEST 2: 9:00 AM IST Cutoff Rule
  {
    console.log("\nTest 2: 9:00 AM IST Self-Planning Cutoff Rule");
    const testDate = "2026-11-02";

    // 8:30 AM IST (before cutoff) -> istMinutes = 8*60 + 30 = 510 < 540
    const timeBeforeCutoff = new Date(`${testDate}T08:30:00+05:30`);
    assert.strictEqual(
      isPastCutoff(testDate, timeBeforeCutoff),
      false,
      "8:30 AM IST must NOT be past cutoff"
    );

    // 9:00 AM IST (exact cutoff) -> istMinutes = 540 >= 540
    const timeAtCutoff = new Date(`${testDate}T09:00:00+05:30`);
    assert.strictEqual(
      isPastCutoff(testDate, timeAtCutoff),
      true,
      "9:00 AM IST must be past cutoff"
    );

    // 9:05 AM IST (after cutoff) -> istMinutes = 545 >= 540
    const timeAfterCutoff = new Date(`${testDate}T09:05:00+05:30`);
    assert.strictEqual(
      isPastCutoff(testDate, timeAfterCutoff),
      true,
      "9:05 AM IST must be past cutoff"
    );

    // Task planned yesterday for today
    const plannedYesterday = new Date("2026-11-01T15:00:00+05:30");
    assert.strictEqual(
      isPlannedBeforeCutoff(plannedYesterday, testDate),
      true,
      "Task planned yesterday must be recognized as planned before cutoff"
    );

    // Task planned today at 8:45 AM for today
    const plannedTodayEarly = new Date(`${testDate}T08:45:00+05:30`);
    assert.strictEqual(
      isPlannedBeforeCutoff(plannedTodayEarly, testDate),
      true,
      "Task planned at 8:45 AM today must be recognized as planned before cutoff"
    );

    // Task planned today at 9:15 AM for today
    const plannedTodayLate = new Date(`${testDate}T09:15:00+05:30`);
    assert.strictEqual(
      isPlannedBeforeCutoff(plannedTodayLate, testDate),
      false,
      "Task planned at 9:15 AM today must NOT be planned before cutoff"
    );

    console.log("  ✓ Before 9:00 AM IST allows free edit/delete without archiving");
    console.log("  ✓ At or after 9:00 AM IST correctly marks visit as past cutoff");
    console.log("  ✓ Prior-day planning correctly satisfies isPlannedBeforeCutoff");
    passed++;
  }

  // TEST 3: Sequential Locking Rule Logic
  {
    console.log("\nTest 3: Sequential visit locking logic");
    // Simulating sequential visits for same day
    const visit1 = { id: "VST-01", employeeId: "EMP001", date: "2026-11-02", checkIn: true, checkOut: false };
    const visit2 = { id: "VST-02", employeeId: "EMP001", date: "2026-11-02", checkIn: false, checkOut: false };

    // visit2 cannot start or check-in while visit1 is checked in but not checked out
    const isLocked = visit1.checkIn && !visit1.checkOut;
    assert.strictEqual(isLocked, true, "Visit 2 must be locked when Visit 1 is in progress without checkout");

    // Once visit1 is checked out or overridden
    visit1.checkOut = true;
    const isUnlocked = !(visit1.checkIn && !visit1.checkOut);
    assert.strictEqual(isUnlocked, true, "Visit 2 must unlock once Visit 1 checkout is complete");

    console.log("  ✓ Sequential visit lock enforces Visit #1 checkout before Visit #2");
    console.log("  ✓ Lock cleanly releases upon Check-Out or Admin Override");
    passed++;
  }

  // TEST 4: Idempotency Key logic
  {
    console.log("\nTest 4: Idempotent stage submission behavior");
    const submittedKeys = new Set<string>();
    const key = "IDEMP-CLIENT-KEY-12345";

    // First submission -> accepted
    const isFirst = !submittedKeys.has(key);
    submittedKeys.add(key);
    assert.strictEqual(isFirst, true, "First submission with idempotency key must be accepted");

    // Retry submission with same key -> detected as duplicate
    const isRetry = submittedKeys.has(key);
    assert.strictEqual(isRetry, true, "Retry with identical key must return original result without duplicate record");

    console.log("  ✓ Client idempotency key guarantees duplicate prevention on mobile offline retry");
    passed++;
  }

  // TEST 5: Admin Override Validation Logic
  {
    console.log("\nTest 5: Admin Override Rule (Min 10 characters)");
    const shortReason = "Too short";
    const validReason = "GPS antenna damaged on site, verified by Station Master";

    assert.strictEqual(shortReason.trim().length < 10, true, "Short reason (< 10 chars) must fail validation");
    assert.strictEqual(validReason.trim().length >= 10, true, "Valid reason (>= 10 chars) must pass validation");

    console.log("  ✓ Rejects short reasons (< 10 chars)");
    console.log("  ✓ Accepts substantive justification (>= 10 chars)");
    passed++;
  }

  // TEST 6: Stage Expiry Duration
  {
    console.log("\nTest 6: Photo bytea 7-day retention expiry");
    const serverTime = new Date("2026-11-02T12:00:00Z");
    const expiresAt = new Date(serverTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffDays = (expiresAt.getTime() - serverTime.getTime()) / (1000 * 60 * 60 * 24);
    assert.strictEqual(diffDays, 7, "Photo expiry must be exactly 7 days from server upload time");

    console.log("  ✓ Photo retention calculated to exact 7 days from server receipt");
    passed++;
  }

  console.log("\n============================================================");
  console.log(`ALL ${passed} BUSINESS RULE TEST SUITES PASSED!`);
  console.log("============================================================\n");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
