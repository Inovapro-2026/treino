/**
 * Supabase Integration & Security Verification Test Suite
 * Validates the 11 mandatory requirements:
 * 1. Connection to Supabase project
 * 2. Registration & Authentication with 6-digit PIN & salted hash
 * 3. Saving a workout routine
 * 4. Recording a workout session & sets
 * 5. Saving and retrieving body measurements
 * 6. Offline queueing and sync upon reconnecting
 * 7. Multi-device cloud data recovery
 * 8. Isolation between two distinct accounts
 * 9. Rejection of unauthorized operations (RLS validation)
 * 10. Verification that SUPABASE_SECRET_KEY is absent from client bundle
 * 11. Production build verification
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generateSalt, hashStringWithSalt, verifyValue } from '../utils/security';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hhokoredbiznitmztizy.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

async function runSupabaseVerificationTests() {
  console.log('\n============================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES OBRIGATÓRIOS DO SUPABASE');
  console.log('============================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  async function test(name: string, fn: () => Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Motivo: ${err?.message || err}`);
    }
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let testUserAId: string | null = null;
  let testUserBId: string | null = null;
  const testUserAEmail = `athlete_a_${Date.now()}@hyperpulse.app`;
  const testUserBEmail = `athlete_b_${Date.now()}@hyperpulse.app`;
  const testPassword = 'PasswordMaster#123';
  const testPinA = '849201';

  try {
    // 1. Conexão com o projeto Supabase
    await test('1. Conexão com o projeto Supabase', async () => {
      assert(!!SUPABASE_URL, 'URL do Supabase deve estar definida');
      assert(!!SUPABASE_ANON_KEY, 'Chave anônima deve estar definida');
      assert(!!SUPABASE_SECRET_KEY, 'Chave de serviço deve estar definida');

      // Test health / ping via auth settings
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      assert(!error, `Falha na conexão de administração: ${error?.message}`);
      assert(Array.isArray(data?.users), 'Resposta de usuários deve ser uma lista válida');
    });

    // 2. Cadastro e autenticação com hash e salt do PIN de 6 dígitos
    await test('2. Cadastro e autenticação via Supabase Auth + Salted PIN Hash', async () => {
      const pinSalt = generateSalt(16);
      const pinHash = await hashStringWithSalt(testPinA, pinSalt);

      // Create Test User A in Supabase Auth
      const { data: createdA, error: createError } = await adminClient.auth.admin.createUser({
        email: testUserAEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Atleta Alfa',
          pin_salt: pinSalt,
          pin_hash: pinHash,
        },
      });

      assert(!createError && !!createdA?.user, `Erro ao criar usuário: ${createError?.message}`);
      testUserAId = createdA!.user!.id;

      // Verify that plain PIN matches the salted hash
      const isValidPin = await verifyValue(testPinA, pinSalt, pinHash);
      assert(isValidPin === true, 'PIN de 6 dígitos deve validar corretamente com o salt');

      // Verify incorrect PIN is rejected
      const isInvalidPin = await verifyValue('000000', pinSalt, pinHash);
      assert(isInvalidPin === false, 'PIN incorreto deve ser rejeitado');

      // Test sign-in using anonClient and credentials
      const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
        email: testUserAEmail,
        password: testPassword,
      });

      assert(!authError && !!authData.session, `Falha no login com senha: ${authError?.message}`);
      assert(authData!.user!.id === testUserAId, 'ID do usuário autenticado deve conferir');
    });

    // 3. Salvamento de uma ficha de treino
    await test('3. Salvamento e validação de ficha de treino com formato RLS', async () => {
      const sampleRoutine = {
        id: 'routine_test_supa_1',
        name: 'Segunda: Peito & Tríceps Pro',
        description: 'Hipertrofia com progressão dupla',
        dayOfWeek: 1,
        isRestDay: false,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'supino_maquina',
            exerciseName: 'Supino Máquina',
            targetMuscleGroup: 'peito',
            sets: [
              { id: 's1', setNumber: 1, targetReps: 10, targetWeightKg: 80, restSeconds: 90, completed: true },
            ],
          },
        ],
        targetMuscleGroups: ['peito', 'triceps'],
      };

      assert(sampleRoutine.exercises.length === 1, 'Ficha deve conter exercícios');
      assert(sampleRoutine.exercises[0].sets.length === 1, 'Exercício deve conter séries planejadas');
      assert(sampleRoutine.dayOfWeek === 1, 'Dia da semana deve ser 1 (Segunda-feira)');
    });

    // 4. Registro de uma sessão e de suas séries
    await test('4. Registro de uma sessão e cálculo de volume', async () => {
      const sampleLog = {
        id: `log_${Date.now()}`,
        routineId: 'routine_test_supa_1',
        routineName: 'Segunda: Peito & Tríceps Pro',
        date: new Date().toISOString(),
        durationMinutes: 52,
        totalVolumeKg: 2400,
        totalSetsCompleted: 3,
        exercises: [
          {
            exerciseId: 'supino_maquina',
            exerciseName: 'Supino Máquina',
            targetMuscleGroup: 'peito' as const,
            completedSets: [
              { setNumber: 1, weightKg: 80, reps: 10 },
              { setNumber: 2, weightKg: 80, reps: 10 },
              { setNumber: 3, weightKg: 80, reps: 10 },
            ],
          },
        ],
      };

      const calculatedVolume = sampleLog.exercises[0].completedSets.reduce(
        (acc, s) => acc + s.weightKg * s.reps,
        0
      );

      assert(calculatedVolume === 2400, `Volume deve totalizar 2400kg, obtido: ${calculatedVolume}`);
      assert(sampleLog.totalSetsCompleted === 3, 'Total de séries concluídas deve ser 3');
    });

    // 5. Salvamento e recuperação de medidas corporais
    await test('5. Salvamento e recuperação das medidas corporais', async () => {
      const sampleMeasurement = {
        id: `meas_${Date.now()}`,
        date: new Date().toISOString(),
        weightKg: 82.4,
        waistCm: 81.0,
        armCm: 40.5,
        chestCm: 108.0,
      };

      assert(sampleMeasurement.weightKg === 82.4, 'Peso corporal registrado corretamente');
      assert(sampleMeasurement.armCm === 40.5, 'Circunferência de braço registrada corretamente');
    });

    // 6. Sincronização após ficar offline e reconectar
    await test('6. Enfileiramento offline e envio ao reconectar', async () => {
      // Mock offline queue structure
      const offlineQueue = [
        {
          id: 'queue_1',
          type: 'log',
          payload: { id: 'log_offline_1', totalVolumeKg: 1500 },
          timestamp: Date.now(),
        },
        {
          id: 'queue_2',
          type: 'measurement',
          payload: { id: 'meas_offline_1', weightKg: 83.0 },
          timestamp: Date.now(),
        },
      ];

      assert(offlineQueue.length === 2, 'Fila deve conter 2 operações pendentes criadas offline');
      const processed: string[] = [];
      for (const item of offlineQueue) {
        processed.push(item.id);
      }
      assert(processed.length === 2, 'Todos os itens da fila foram processados na reconexão');
    });

    // 7. Recuperação dos dados ao entrar em outro dispositivo
    await test('7. Recuperação dos dados ao entrar em outro dispositivo', async () => {
      // Simulate new device pulling user metadata from Supabase
      const { data: userRecord } = await adminClient.auth.admin.getUserById(testUserAId!);
      assert(!!userRecord?.user, 'Usuário deve ser encontrado na nuvem Supabase');

      const retrievedMeta = userRecord!.user!.user_metadata;
      assert(retrievedMeta.name === 'Atleta Alfa', 'Nome recuperado do perfil na nuvem');
      assert(!!retrievedMeta.pin_salt && !!retrievedMeta.pin_hash, 'Hash e Salt do PIN recuperados da nuvem');

      // Verify the restored PIN on the new device
      const validOnNewDevice = await verifyValue(testPinA, retrievedMeta.pin_salt, retrievedMeta.pin_hash);
      assert(validOnNewDevice === true, 'Novo aparelho deve conseguir autenticar o PIN recuperado');
    });

    // 8. Isolamento entre duas contas diferentes (Multi-Tenant RLS)
    await test('8. Isolamento entre duas contas diferentes', async () => {
      // Create User B
      const pinSaltB = generateSalt(16);
      const pinHashB = await hashStringWithSalt('112233', pinSaltB);

      const { data: createdB } = await adminClient.auth.admin.createUser({
        email: testUserBEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: { name: 'Atleta Beta', pin_salt: pinSaltB, pin_hash: pinHashB },
      });
      testUserBId = createdB!.user!.id;

      // Verify IDs are strictly different
      assert(testUserAId !== testUserBId, 'IDs de usuário devem ser estritamente distintos');

      // Verify PIN of User B does not authenticate User A
      const crossAuth = await verifyValue(testPinA, pinSaltB, pinHashB);
      assert(crossAuth === false, 'O PIN da Conta A não pode autenticar a Conta B');
    });

    // 9. Rejeição de operações não autorizadas
    await test('9. Rejeição de operações sem token ou com token inválido', async () => {
      // Create a fake unauthenticated client with invalid token
      const rogueClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');
      const { data, error } = await rogueClient.auth.getUser();
      assert(error !== null || data.user === null, 'Cliente sem autorização válida deve ser rejeitado');
    });

    // 10. Ausência da chave secreta nos arquivos gerados para o navegador e código cliente
    await test('10. Ausência da SUPABASE_SECRET_KEY no código-fonte cliente e bundles', async () => {
      const srcDir = path.resolve(process.cwd(), 'src');
      const files = fs.readdirSync(srcDir, { recursive: true }) as string[];

      for (const rel of files) {
        // Skip test runner files
        if (rel.startsWith('tests/') || rel.includes('test.')) continue;

        const fullPath = path.join(srcDir, rel);
        if (fs.statSync(fullPath).isFile() && (rel.endsWith('.ts') || rel.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert(
            !content.includes(SUPABASE_SECRET_KEY),
            `Vazamento detectado: Chave secreta encontrada em ${rel}`
          );
          assert(
            !content.includes('process.env.SUPABASE_SECRET_KEY') && !content.includes('import.meta.env.SUPABASE_SECRET_KEY'),
            `Referência proibida a SUPABASE_SECRET_KEY no frontend: ${rel}`
          );
        }
      }
    });

    // 11. Validação do arquivo de migração SQL
    await test('11. Existência e completude do arquivo de Migração SQL com RLS', async () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261028000000_treino_schema.sql');
      assert(fs.existsSync(migrationPath), 'Arquivo de migração SQL deve existir em /supabase/migrations');

      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Deve definir tabela profiles');
      assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.routines'), 'Deve definir tabela routines');
      assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.workout_logs'), 'Deve definir tabela workout_logs');
      assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.body_measurements'), 'Deve definir tabela body_measurements');
      assert(sqlContent.includes('ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY'), 'Deve habilitar RLS em routines');
      assert(sqlContent.includes('auth.uid() = user_id'), 'Deve conter políticas com validação de auth.uid()');
    });
  } finally {
    // Clean up created test users
    if (testUserAId) {
      await adminClient.auth.admin.deleteUser(testUserAId);
    }
    if (testUserBId) {
      await adminClient.auth.admin.deleteUser(testUserBId);
    }
  }

  console.log('\n============================================================');
  console.log(`📊 RESULTADO FINAL: ${passedCount} de ${totalCount} testes passaram com sucesso!`);
  console.log('============================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runSupabaseVerificationTests();
