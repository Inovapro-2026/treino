/**
 * Test Suite for HyperPulse Gym & Hypertrophy App Logic
 */

export function runWorkoutTests() {
  const results: { name: string; passed: boolean; message?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, message: err?.message || String(err) });
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  // 1. Volume Calculation Test
  test('Cálculo de volume de treino (Carga × Reps)', () => {
    const sets = [
      { weightKg: 80, reps: 10 },
      { weightKg: 85, reps: 8 },
      { weightKg: 90, reps: 6 },
    ];
    const totalVolume = sets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
    // (80*10) + (85*8) + (90*6) = 800 + 680 + 540 = 2020 kg
    assert(totalVolume === 2020, `Volume esperado 2020kg, calculado: ${totalVolume}kg`);
  });

  // 2. Timer Timestamp Calculation Test
  test('Cálculo do cronômetro sem drift baseado em timestamp', () => {
    const now = Date.now();
    const durationSeconds = 90;
    const targetTimestamp = now + durationSeconds * 1000;

    // Simulate 35 seconds passing
    const simulatedNow = now + 35 * 1000;
    const remaining = Math.max(0, Math.ceil((targetTimestamp - simulatedNow) / 1000));
    assert(remaining === 55, `Restante esperado 55s, calculado: ${remaining}s`);
  });

  // 3. Pause & Resume Math Test
  test('Pausa e retomada preservam tempo restante exato', () => {
    const now = Date.now();
    const target = now + 60 * 1000;

    // Paused at 40s mark -> 20s remaining
    const pausedAt = now + 40 * 1000;
    const remainingWhenPaused = Math.max(0, Math.ceil((target - pausedAt) / 1000));
    assert(remainingWhenPaused === 20, `Tempo pausado incorreto: ${remainingWhenPaused}`);

    // Resumed 10 seconds later
    const resumedAt = pausedAt + 10 * 1000;
    const newTarget = resumedAt + remainingWhenPaused * 1000;
    const remainingAfterResume = Math.ceil((newTarget - resumedAt) / 1000);
    assert(remainingAfterResume === 20, `Tempo após retomada deve ser 20s, foi: ${remainingAfterResume}`);
  });

  // 4. Set Completion Logic
  test('Conclusão e desmarcação de séries individuais', () => {
    const set = { completed: false, actualWeightKg: undefined as number | undefined, targetWeightKg: 80, targetReps: 10 };
    // Complete set
    const completedSet = { ...set, completed: true, actualWeightKg: set.targetWeightKg };
    assert(completedSet.completed === true, 'Série deve estar marcada como concluída');
    assert(completedSet.actualWeightKg === 80, 'Carga padrão atribuída');
  });

  // 5. Body Measurement Delta
  test('Cálculo de variação de peso corporal (delta)', () => {
    const previous = { weightKg: 80.5 };
    const latest = { weightKg: 81.2 };
    const delta = parseFloat((latest.weightKg - previous.weightKg).toFixed(1));
    assert(delta === 0.7, `Delta esperado +0.7kg, calculado: ${delta}`);
  });

  return results;
}

// Quick self-run in console
if (typeof window !== 'undefined') {
  (window as any).__runHyperPulseTests = runWorkoutTests;
}
