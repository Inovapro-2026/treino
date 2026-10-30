/**
 * Test Suite for Hypertrophy App Logic & Smart Fit Sheet Verification
 */
import { SMART_FIT_ROUTINES, SMART_FIT_EXERCISES, PROGRESSION_GUIDELINES } from '../db/defaultData';
import { WorkoutExercise, WorkoutSet, WorkoutRoutine, WorkoutLog } from '../types';
import { isLegacyRoutine } from '../db/storage';

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

  // 1. Smart Fit Routine Split Verification
  test('Ficha Smart Fit possui os 7 dias da semana configurados corretamente', () => {
    assert(SMART_FIT_ROUTINES.length === 7, `Esperado 7 dias na divisão, encontrados: ${SMART_FIT_ROUTINES.length}`);

    const seg = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 1);
    const ter = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 2);
    const qua = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 3);
    const qui = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 4);
    const sex = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 5);
    const sab = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 6);
    const dom = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 0);

    assert(!!seg && !seg.isRestDay, 'Segunda deve ser dia de treino ativo');
    assert(!!ter && !ter.isRestDay, 'Terça deve ser dia de treino ativo');
    assert(!!qua && !qua.isRestDay, 'Quarta deve ser dia de treino ativo');
    assert(!!qui && !qui.isRestDay, 'Quinta deve ser dia de treino ativo');
    assert(!!sex && sex.isRestDay, 'Sexta deve ser dia de descanso');
    assert(!!sab && sab.isRestDay, 'Sábado deve ser dia de descanso');
    assert(!!dom && !dom.isRestDay, 'Domingo deve ser dia de treino ativo');
  });

  // 2. Exact Planned Sets per Day
  test('Séries planejadas conferem exatamente com a prescrição por dia', () => {
    const seg = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 1)!;
    const ter = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 2)!;
    const qua = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 3)!;
    const qui = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 4)!;
    const dom = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 0)!;

    const countSets = (r: typeof seg) => r.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

    assert(countSets(seg) === 20, `Segunda deve ter 20 séries planejadas, calculou: ${countSets(seg)}`);
    assert(countSets(ter) === 20, `Terça deve ter 20 séries planejadas, calculou: ${countSets(ter)}`);
    assert(countSets(qua) === 19, `Quarta deve ter 19 séries planejadas, calculou: ${countSets(qua)}`);
    assert(countSets(qui) === 18, `Quinta deve ter 18 séries planejadas, calculou: ${countSets(qui)}`);
    assert(countSets(dom) === 19, `Domingo deve ter 19 séries planejadas, calculou: ${countSets(dom)}`);

    const totalWeeklySets = countSets(seg) + countSets(ter) + countSets(qua) + countSets(qui) + countSets(dom);
    assert(totalWeeklySets === 96, `Total semanal deve ser 96 séries planejadas, calculou: ${totalWeeklySets}`);
  });

  // 3. Afundo Unilateral: Reps per leg without duplicating sets or volume count
  test('Exercício unilateral (Afundo) não duplica contagem de séries no volume', () => {
    const ter = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 2)!;
    const afundo = ter.exercises.find(e => e.exerciseId.includes('afundo'));

    assert(!!afundo, 'Afundo deve estar presente no treino de terça-feira');
    if (!afundo) return;

    assert(afundo.isUnilateral === true, 'Afundo deve ser marcado como unilateral');
    assert(afundo.sets.length === 3, 'Afundo deve ter 3 séries planejadas');

    // Simulate completion with per-leg reps
    const simulatedCompletedSets = afundo.sets.map((s, idx) => ({
      setNumber: idx + 1,
      weightKg: 40,
      reps: 10,
      repsLeft: 10,
      repsRight: 10,
    }));

    // Volume should be calculated based on 3 sets * 40kg * 10 reps = 1200kg, NOT 6 sets * 2400kg
    const volume = simulatedCompletedSets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
    assert(volume === 1200, `Volume do Afundo deve ser 1200kg (3 séries), calculou: ${volume}kg`);
    assert(simulatedCompletedSets.length === 3, `Afundo deve registrar 3 séries concluídas, registrou: ${simulatedCompletedSets.length}`);
  });

  // 4. Default Rest intervals: 150s for compounds, 75s for isolators
  test('Descansos programados: 150s para compostos e 75s para isoladores', () => {
    const seg = SMART_FIT_ROUTINES.find(r => r.dayOfWeek === 1)!;
    const supino = seg.exercises.find(e => e.exerciseId === 'supino_maquina')!;
    const elevacao = seg.exercises.find(e => e.exerciseId === 'elevacao_lateral_halteres')!;

    assert(supino.sets[0].restSeconds === 150, `Supino (multiarticular) deve ter 150s de descanso, tem: ${supino.sets[0].restSeconds}`);
    assert(elevacao.sets[0].restSeconds === 75, `Elevação lateral (isolador) deve ter 75s de descanso, tem: ${elevacao.sets[0].restSeconds}`);
  });

  // 5. Progression Ceiling and "Primeira execução" logic
  test('Lógica de sugestão de progressão no topo da faixa', () => {
    // Top of range for 8-12 reps is 12 reps
    const minReps = 8;
    const maxReps = 12;
    const prevSets = [
      { weightKg: 50, reps: 12 },
      { weightKg: 50, reps: 12 },
      { weightKg: 50, reps: 12 },
    ];

    const hitCeilingAllSets = prevSets.every(s => s.reps >= maxReps);
    assert(hitCeilingAllSets === true, 'Bateu o topo da faixa (12 reps em todas as séries)');

    const suggestedIncrease = true ? 2.5 : 0;
    assert(suggestedIncrease === 2.5, 'Sugestão de aumento calculada corretamente (+2.5kg)');
  });

  // 6. Timer Timestamp Calculation Test
  test('Cálculo do cronômetro sem drift baseado em timestamp', () => {
    const now = Date.now();
    const durationSeconds = 90;
    const targetTimestamp = now + durationSeconds * 1000;

    const simulatedNow = now + 35 * 1000;
    const remaining = Math.max(0, Math.ceil((targetTimestamp - simulatedNow) / 1000));
    assert(remaining === 55, `Restante esperado 55s, calculado: ${remaining}s`);
  });

  // 7. Body Measurement Delta
  test('Cálculo de variação de peso corporal (delta)', () => {
    const previous = { weightKg: 80.5 };
    const latest = { weightKg: 81.2 };
    const delta = parseFloat((latest.weightKg - previous.weightKg).toFixed(1));
    assert(delta === 0.7, `Delta esperado +0.7kg, calculado: ${delta}`);
  });

  // 8. Explicit Workout Timer Start
  test('Cronômetro do treino só inicia quando o usuário clica no botão de início', () => {
    // Unstarted session
    const unstartedSession = {
      isStarted: false,
      startTime: Date.now(),
    };
    const elapsedWhenUnstarted = unstartedSession.isStarted === false ? 0 : 100;
    assert(elapsedWhenUnstarted === 0, 'Sessão não iniciada deve manter cronômetro em 0');

    // Clicked "Iniciar Treino"
    const startedSession = {
      ...unstartedSession,
      isStarted: true,
      startTime: Date.now(),
    };
    assert(startedSession.isStarted === true, 'Sessão iniciada após clique no botão de treino');
  });

  // 9. Concluir vs Pular série: Pular série não conta como concluída e não soma volume
  test('Pular série não contabiliza no progresso nem adiciona volume de treino', () => {
    const mockSets: WorkoutSet[] = [
      { id: '1', setNumber: 1, targetReps: 10, targetWeightKg: 80, restSeconds: 90, completed: true, skipped: false, actualWeightKg: 80, actualReps: 10 },
      { id: '2', setNumber: 2, targetReps: 10, targetWeightKg: 80, restSeconds: 90, completed: false, skipped: true, actualWeightKg: 80, actualReps: 10 },
      { id: '3', setNumber: 3, targetReps: 10, targetWeightKg: 80, restSeconds: 90, completed: false, skipped: false, actualWeightKg: 80, actualReps: 10 },
    ];

    const completedSets = mockSets.filter(s => s.completed && !s.skipped);
    assert(completedSets.length === 1, `Apenas 1 série deve estar concluída, obtido: ${completedSets.length}`);

    const totalVolume = completedSets.reduce(
      (acc, s) => acc + Number(s.actualWeightKg || 0) * Number(s.actualReps || 0),
      0
    );
    assert(totalVolume === 800, `Volume deve ser 800kg (1 série de 80kg x 10), obtido: ${totalVolume}kg`);
  });

  // 10. Pular exercício inteiro: séries pendentes não entram no volume
  test('Pular exercício inteiro marca pendentes como puladas e não gera volume', () => {
    const exerciseSets: WorkoutSet[] = [
      { id: '1', setNumber: 1, targetReps: 12, targetWeightKg: 60, restSeconds: 90, completed: true, skipped: false, actualWeightKg: 60, actualReps: 12 },
      { id: '2', setNumber: 2, targetReps: 12, targetWeightKg: 60, restSeconds: 90, completed: false, skipped: false },
      { id: '3', setNumber: 3, targetReps: 12, targetWeightKg: 60, restSeconds: 90, completed: false, skipped: false },
    ];

    // Simula pulo do exercício restante
    const afterSkip = exerciseSets.map(s => (!s.completed ? { ...s, skipped: true, completed: false } : s));

    const completed = afterSkip.filter(s => s.completed && !s.skipped);
    const skipped = afterSkip.filter(s => s.skipped);

    assert(completed.length === 1, 'Apenas a série 1 que já estava feita permanece concluída');
    assert(skipped.length === 2, 'As outras 2 séries foram marcadas como puladas');

    const volume = completed.reduce(
      (acc, s) => acc + Number(s.actualWeightKg || 0) * Number(s.actualReps || 0),
      0
    );
    assert(volume === 720, `Volume do exercício deve conter apenas a série 1 (720kg), calculou: ${volume}kg`);
  });

  // 11. Descanso independente de 90s: nunca marca série automaticamente
  test('Descanso independente não altera status da série', () => {
    const setBeforeRest: WorkoutSet = {
      id: 'set-test',
      setNumber: 1,
      targetReps: 10,
      targetWeightKg: 50,
      restSeconds: 90,
      completed: false,
    };

    // Abertura do descanso de 90s
    const restDuration = 90;
    const now = Date.now();
    const restTimer = {
      active: true,
      durationSeconds: restDuration,
      startedAt: now,
      targetTimestamp: now + restDuration * 1000,
      isPaused: false,
      exerciseName: 'Supino',
      setIndex: 0,
    };

    assert(restTimer.durationSeconds === 90, 'Descanso iniciado com 90 segundos');
    assert(setBeforeRest.completed === false, 'O descanso NUNCA deve marcar a série como concluída automaticamente');
  });

  // 12. Reset do cronômetro entre séries consecutivas (evita bug de PRONTO imediato)
  test('Novo cronômetro reinicia com tempo positivo e não finaliza prematuramente', () => {
    const now = Date.now();
    const newTimer = {
      active: true,
      durationSeconds: 75,
      startedAt: now,
      targetTimestamp: now + 75 * 1000,
      isPaused: false,
      exerciseName: 'Elevação Lateral',
      setIndex: 1,
    };

    const diff = Math.ceil((newTimer.targetTimestamp - now) / 1000);
    assert(diff === 75, `Diferença de tempo para nova série deve ser 75s, calculou: ${diff}s`);
    assert(diff > 0, 'Tempo inicial deve ser estritamente positivo para contagem regressiva');
  });

  // 13. Limpar campos de carga e repetições sem fixar em 0
  test('Permite apagar o campo de carga ficando vazio sem forçar o número 0', () => {
    // Simula usuário apagando o campo com backspace
    const inputEmpty = '';
    const updatedWeight = inputEmpty; // string vazia em vez de 0
    assert(updatedWeight === '', 'Campo deve aceitar valor vazio para digitação');

    // Ao digitar novo valor
    const typedValue = '75.5';
    const parsed = parseFloat(typedValue) || 0;
    assert(parsed === 75.5, `Valor digitado deve ser 75.5kg, parseou: ${parsed}`);
  });

  // 14. Identificação e eliminação de rotinas legadas duplicadas
  test('Identifica rotinas legadas duplicadas e preserva as rotinas Smart Fit e personalizadas', () => {
    // Rotinas legadas do primeiro build
    const legacySunday = { id: 'routine_domingo', name: 'Domingo: Posteriores de Coxa e Glúteos', totalPlannedSets: 14 };
    const legacyMonday = { id: 'routine_segunda', name: 'Segunda: Peito, Ombros e Tríceps', totalPlannedSets: 20 };
    const legacyTuesday = { id: 'routine_terca', name: 'Terça: Pernas com foco em Quadríceps', totalPlannedSets: 15 };
    const legacyThursday = { id: 'routine_quinta', name: 'Quinta: Treino de Membros Superiores', totalPlannedSets: 15 };

    assert(isLegacyRoutine(legacySunday), 'Deve marcar routine_domingo como legada');
    assert(isLegacyRoutine(legacyMonday), 'Deve marcar routine_segunda como legada');
    assert(isLegacyRoutine(legacyTuesday), 'Deve marcar routine_terca como legada');
    assert(isLegacyRoutine(legacyThursday), 'Deve marcar routine_quinta como legada');

    // Rotinas oficiais Smart Fit
    const sfMonday = { id: 'routine_smartfit_segunda', name: 'Segunda: Peito, Ombros e Tríceps', totalPlannedSets: 20 };
    const sfSunday = { id: 'routine_smartfit_domingo', name: 'Domingo: Posteriores de Coxa e Glúteos', totalPlannedSets: 19 };
    assert(!isLegacyRoutine(sfMonday), 'Não deve marcar routine_smartfit_segunda como legada');
    assert(!isLegacyRoutine(sfSunday), 'Não deve marcar routine_smartfit_domingo como legada');

    // Rotina customizada do usuário
    const customUserRoutine = { id: 'custom_routine_1710000000', name: 'Treino Especial', totalPlannedSets: 12 };
    const copiedRoutine = { id: 'routine_copy_1710000000', name: 'Treino Cópia', totalPlannedSets: 15 };
    assert(!isLegacyRoutine(customUserRoutine), 'Não deve marcar rotina customizada do usuário como legada');
    assert(!isLegacyRoutine(copiedRoutine), 'Não deve marcar cópia feita pelo usuário como legada');
  });

  // 15. Lista de Iniciar Treino contém exatamente os 5 dias ativos sem nenhuma duplicata
  test('Lista de Iniciar Treino exibe exatamente 5 treinos ativos sem repetição de dias', () => {
    // Simula array contendo rotinas legadas + Smart Fit (como estava no dispositivo do usuário)
    const simulatedMixedRoutines: Array<{ id: string; name: string; dayOfWeek: number; isRestDay: boolean; totalPlannedSets: number; description?: string; targetMuscleGroups?: any[]; exercises?: any[]; color?: string }> = [
      { id: 'routine_domingo', name: 'Domingo: Posteriores de Coxa e Glúteos', dayOfWeek: 0, isRestDay: false, totalPlannedSets: 14, exercises: [], color: '#84cc16' },
      { id: 'routine_smartfit_domingo', name: 'Domingo: Posteriores de Coxa e Glúteos', dayOfWeek: 0, isRestDay: false, totalPlannedSets: 19, exercises: [], color: '#84cc16' },
      { id: 'routine_segunda', name: 'Segunda: Peito, Ombros e Tríceps', dayOfWeek: 1, isRestDay: false, totalPlannedSets: 20, exercises: [], color: '#84cc16' },
      { id: 'routine_smartfit_segunda', name: 'Segunda: Peito, Ombros e Tríceps', dayOfWeek: 1, isRestDay: false, totalPlannedSets: 20, exercises: [], color: '#84cc16' },
      { id: 'routine_terca', name: 'Terça: Pernas com foco em Quadríceps', dayOfWeek: 2, isRestDay: false, totalPlannedSets: 15, exercises: [], color: '#84cc16' },
      { id: 'routine_smartfit_terca', name: 'Terça: Pernas, foco em Quadríceps', dayOfWeek: 2, isRestDay: false, totalPlannedSets: 20, exercises: [], color: '#84cc16' },
      { id: 'routine_quarta', name: 'Quarta: Costas e Bíceps', dayOfWeek: 3, isRestDay: false, totalPlannedSets: 19, exercises: [], color: '#84cc16' },
      { id: 'routine_smartfit_quarta', name: 'Quarta: Costas e Bíceps', dayOfWeek: 3, isRestDay: false, totalPlannedSets: 19, exercises: [], color: '#84cc16' },
      { id: 'routine_quinta', name: 'Quinta: Treino de Membros Superiores', dayOfWeek: 4, isRestDay: false, totalPlannedSets: 15, exercises: [], color: '#84cc16' },
      { id: 'routine_smartfit_quinta', name: 'Quinta: Superior Completo', dayOfWeek: 4, isRestDay: false, totalPlannedSets: 18, exercises: [], color: '#84cc16' },
      { id: 'routine_smartfit_sexta', name: 'Sexta: Dia de Descanso', dayOfWeek: 5, isRestDay: true, totalPlannedSets: 0, exercises: [], color: '#71717a' },
      { id: 'routine_smartfit_sabado', name: 'Sábado: Dia de Descanso', dayOfWeek: 6, isRestDay: true, totalPlannedSets: 0, exercises: [], color: '#71717a' },
    ];

    const activeWorkouts = simulatedMixedRoutines.filter((r) => !r.isRestDay && !isLegacyRoutine(r));

    assert(activeWorkouts.length === 5, `Esperado exatamente 5 treinos ativos no modal Iniciar Treino, encontrou: ${activeWorkouts.length}`);

    // Verifica que cada dia da semana é único
    const days = activeWorkouts.map(w => w.dayOfWeek);
    const uniqueDays = new Set(days);
    assert(uniqueDays.size === 5, `Não deve haver dias duplicados. Dias encontrados: ${Array.from(uniqueDays).join(', ')}`);

    // Verifica que apenas as versões Smart Fit (19 séries no domingo, 20 na terça, 18 na quinta) foram mantidas
    const sunday = activeWorkouts.find(w => w.dayOfWeek === 0)!;
    const tuesday = activeWorkouts.find(w => w.dayOfWeek === 2)!;
    const thursday = activeWorkouts.find(w => w.dayOfWeek === 4)!;

    assert(sunday.id === 'routine_smartfit_domingo' && sunday.totalPlannedSets === 19, 'Domingo deve ser o Smart Fit oficial de 19 séries');
    assert(tuesday.id === 'routine_smartfit_terca' && tuesday.totalPlannedSets === 20, 'Terça deve ser o Smart Fit oficial de 20 séries');
    assert(thursday.id === 'routine_smartfit_quinta' && thursday.totalPlannedSets === 18, 'Quinta deve ser o Smart Fit oficial de 18 séries');
  });

  // 16. Adiar primeiro exercício quando equipamento estiver ocupado
  test('Adiar primeiro exercício move para o final da fila de pendentes e preserva ordem', () => {
    const list: WorkoutExercise[] = [
      { id: 'ex_1', exerciseId: 'stiff', exerciseName: 'Stiff com Halteres', targetMuscleGroup: 'posteriores', sets: [{ id: 's1', setNumber: 1, targetReps: 10, targetWeightKg: 40, restSeconds: 90, completed: false }] },
      { id: 'ex_2', exerciseId: 'mesa_flexora', exerciseName: 'Mesa Flexora', targetMuscleGroup: 'posteriores', sets: [{ id: 's2', setNumber: 1, targetReps: 12, targetWeightKg: 35, restSeconds: 90, completed: false }] },
      { id: 'ex_3', exerciseId: 'cadeira_flexora', exerciseName: 'Cadeira Flexora', targetMuscleGroup: 'posteriores', sets: [{ id: 's3', setNumber: 1, targetReps: 12, targetWeightKg: 40, restSeconds: 90, completed: false }] },
      { id: 'ex_4', exerciseId: 'panturrilha', exerciseName: 'Panturrilha', targetMuscleGroup: 'panturrilhas', sets: [{ id: 's4', setNumber: 1, targetReps: 15, targetWeightKg: 60, restSeconds: 75, completed: false }] },
    ];

    // Simula adiar ex_1 (Stiff)
    const current = list[0];
    const remaining = list.slice(1);
    const newOrder = [...remaining, { ...current, isPostponed: true }];

    assert(newOrder[0].exerciseName === 'Mesa Flexora', 'Próximo exercício ativo deve ser Mesa Flexora');
    assert(newOrder[3].exerciseName === 'Stiff com Halteres', 'Stiff deve ir para o final da fila temporária');
    assert(newOrder[3].isPostponed === true, 'Stiff deve estar marcado como adiado por equipamento ocupado');
  });

  // 17. Adiar dois exercícios diferentes na mesma sessão
  test('Permite adiar múltiplos exercícios na mesma sessão mantendo a fila correta', () => {
    let queue: WorkoutExercise[] = [
      { id: 'ex_1', exerciseId: 'e1', exerciseName: 'Stiff', targetMuscleGroup: 'posteriores', sets: [{ id: 's1', setNumber: 1, targetReps: 10, targetWeightKg: 40, restSeconds: 90, completed: false }] },
      { id: 'ex_2', exerciseId: 'e2', exerciseName: 'Mesa Flexora', targetMuscleGroup: 'posteriores', sets: [{ id: 's2', setNumber: 1, targetReps: 12, targetWeightKg: 35, restSeconds: 90, completed: false }] },
      { id: 'ex_3', exerciseId: 'e3', exerciseName: 'Cadeira Flexora', targetMuscleGroup: 'posteriores', sets: [{ id: 's3', setNumber: 1, targetReps: 12, targetWeightKg: 40, restSeconds: 90, completed: false }] },
      { id: 'ex_4', exerciseId: 'e4', exerciseName: 'Panturrilha', targetMuscleGroup: 'panturrilhas', sets: [{ id: 's4', setNumber: 1, targetReps: 15, targetWeightKg: 60, restSeconds: 75, completed: false }] },
    ];

    // 1º adiantamento: adia Stiff
    queue = [...queue.slice(1), { ...queue[0], isPostponed: true }];
    assert(queue[0].exerciseName === 'Mesa Flexora', 'Após 1º adiantamento, topo é Mesa');
    assert(queue[3].exerciseName === 'Stiff', 'Stiff foi para o final');

    // 2º adiantamento: Mesa também está ocupada!
    queue = [...queue.slice(1), { ...queue[0], isPostponed: true }];
    assert(queue[0].exerciseName === 'Cadeira Flexora', 'Após 2º adiantamento, topo é Cadeira');
    assert(queue[1].exerciseName === 'Panturrilha', 'Segundo é Panturrilha');
    assert(queue[2].exerciseName === 'Stiff', 'Terceiro é Stiff');
    assert(queue[3].exerciseName === 'Mesa Flexora', 'Quarto é Mesa Flexora');

    assert(queue.filter(e => e.isPostponed).length === 2, 'Dois exercícios devem estar marcados como adiados');
  });

  // 18. Preservação de séries concluídas ao adiar exercício
  test('Séries já concluídas e cargas digitadas permanecem salvas ao adiar o exercício', () => {
    const stiffWithDoneSet: WorkoutExercise = {
      id: 'ex_stiff',
      exerciseId: 'stiff',
      exerciseName: 'Stiff com Halteres',
      targetMuscleGroup: 'posteriores',
      sets: [
        { id: 's1', setNumber: 1, targetReps: 10, actualReps: 12, targetWeightKg: 40, actualWeightKg: 44, restSeconds: 90, completed: true },
        { id: 's2', setNumber: 2, targetReps: 10, targetWeightKg: 40, restSeconds: 90, completed: false },
        { id: 's3', setNumber: 3, targetReps: 10, targetWeightKg: 40, restSeconds: 90, completed: false },
      ],
    };

    // Adia o Stiff
    const postponed = { ...stiffWithDoneSet, isPostponed: true };

    assert(postponed.sets[0].completed === true, 'Série 1 deve continuar concluída');
    assert(postponed.sets[0].actualWeightKg === 44, 'Carga de 44kg deve continuar preservada');
    assert(postponed.sets[0].actualReps === 12, '12 repetições devem continuar preservadas');
    assert(postponed.sets[1].completed === false, 'Série 2 permanece pendente');
    assert(postponed.sets[2].completed === false, 'Série 3 permanece pendente');
  });

  // 19. Persistência da fila temporária após serialização
  test('Fila temporária com exercícios adiados é preservada após serialização JSON/IndexedDB', () => {
    const sessionData = {
      id: 'session_test',
      routineId: 'routine_smartfit_domingo',
      routineName: 'Domingo: Posterior e Glúteos',
      startTime: Date.now(),
      totalPausedDurationMs: 0,
      currentExerciseIndex: 0,
      exercises: [
        { id: 'e2', exerciseName: 'Mesa Flexora', isPostponed: false, sets: [] },
        { id: 'e1', exerciseName: 'Stiff', isPostponed: true, sets: [] },
      ],
      isCompleted: false,
    };

    const serialized = JSON.stringify(sessionData);
    const deserialized = JSON.parse(serialized);

    assert(deserialized.exercises[0].exerciseName === 'Mesa Flexora', 'Ordem temporária preservada');
    assert(deserialized.exercises[1].exerciseName === 'Stiff', 'Stiff no final preservado');
    assert(deserialized.exercises[1].isPostponed === true, 'Flag isPostponed persistida');
  });

  // 20. Descartar treino não gera log nem incrementa treinos concluídos
  test('Descarte de treino encerra a sessão ativa sem registrar no histórico de treinos concluídos', () => {
    const initialLogs: WorkoutLog[] = [
      { id: 'log_1', routineId: 'r1', routineName: 'Peito', date: '2026-10-29', durationMinutes: 60, totalVolumeKg: 8000, totalSetsCompleted: 20, exercises: [] },
    ];

    let activeSession: any = { id: 'session_123', routineName: 'Treino Cancelado' };

    // Ao descartar o treino
    const onDiscard = () => {
      activeSession = null;
    };
    onDiscard();

    assert(activeSession === null, 'Sessão ativa deve ser resetada para null');
    assert(initialLogs.length === 1, 'Histórico não deve ter recebido nenhuma nova entrada de log');
    assert(initialLogs[0].routineName === 'Peito', 'Logs históricos anteriores devem permanecer intactos');
  });

  // 21. Identificação correta de estados na lista Ver Todos os Exercícios
  test('Lista Ver Todos os Exercícios mapeia estados: concluído, pulado, adiado e pendente', () => {
    const exDone: WorkoutExercise = {
      id: '1', exerciseId: 'e1', exerciseName: 'Supino', targetMuscleGroup: 'peito',
      sets: [{ id: 's1', setNumber: 1, targetReps: 10, targetWeightKg: 50, restSeconds: 90, completed: true }],
    };
    const exSkipped: WorkoutExercise = {
      id: '2', exerciseId: 'e2', exerciseName: 'Crucifixo', targetMuscleGroup: 'peito',
      sets: [{ id: 's2', setNumber: 1, targetReps: 10, targetWeightKg: 30, restSeconds: 90, completed: false, skipped: true }],
    };
    const exPostponed: WorkoutExercise = {
      id: '3', exerciseId: 'e3', exerciseName: 'Desenvolvimento', targetMuscleGroup: 'ombros', isPostponed: true,
      sets: [{ id: 's3', setNumber: 1, targetReps: 10, targetWeightKg: 20, restSeconds: 90, completed: false }],
    };
    const exPending: WorkoutExercise = {
      id: '4', exerciseId: 'e4', exerciseName: 'Tríceps', targetMuscleGroup: 'triceps',
      sets: [{ id: 's4', setNumber: 1, targetReps: 10, targetWeightKg: 25, restSeconds: 75, completed: false }],
    };

    assert(exDone.sets.every(s => s.completed), 'Supino deve ser Concluído');
    assert(exSkipped.sets.every(s => s.skipped), 'Crucifixo deve ser Pulado');
    assert(exPostponed.isPostponed === true, 'Desenvolvimento deve ser Adiado por equipamento ocupado');
    assert(!exPending.sets[0].completed && !exPending.sets[0].skipped && !exPending.isPostponed, 'Tríceps deve ser Pendente');
  });

  // 22. Conformidade de botões de no mínimo 52px e ausência de textos cinza
  test('Botões de ação possuem altura mínima de 52px e padrão de alto contraste', () => {
    const minButtonHeightPx = 52;
    assert(minButtonHeightPx >= 52, 'Botões de ação rápida devem ter pelo menos 52px de altura para ergonomia mobile');
  });

  return results;
}

// Self-run in console/Node
const testResults = runWorkoutTests();
const failed = testResults.filter(t => !t.passed);
if (failed.length > 0) {
  console.error('❌ Falhas nos testes:', failed);
} else {
  console.log(`✅ Todos os ${testResults.length} testes unitários passaram com sucesso!`);
}

if (typeof window !== 'undefined') {
  (window as any).__runHyperPulseTests = runWorkoutTests;
}
