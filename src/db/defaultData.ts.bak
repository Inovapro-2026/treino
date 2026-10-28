import { Exercise, WorkoutRoutine, UserSettings } from '../types';

export const DEFAULT_EXERCISES: Exercise[] = [
  // PEITO
  {
    id: 'supino_reto_barra',
    name: 'Supino Reto com Barra',
    targetMuscleGroup: 'peito',
    secondaryMuscles: ['triceps', 'ombros'],
    equipment: 'barra',
    instructions: 'Deite-se no banco com os olhos alinhados à barra. Pegada um pouco mais larga que os ombros, pés firmes no chão, escápulas retraídas. Desça a barra de forma controlada até a linha média do esterno e empurre de volta sem travar bruscamente os cotovelos.',
    tips: 'Mantenha os cotovelos a ~45°-70° do tronco para proteger a cápsula articular do ombro.',
    isFavorite: true,
  },
  {
    id: 'supino_inclinado_halteres',
    name: 'Supino Inclinado com Halteres',
    targetMuscleGroup: 'peito',
    secondaryMuscles: ['ombros', 'triceps'],
    equipment: 'halteres',
    instructions: 'Ajuste o banco em uma inclinação de 30° a 45°. Com os halteres apoiados na altura dos ombros, pressione verticalmente convergindo levemente no topo sem bater os pesos. Desça com controle sentindo o alongamento da porção clavicular do peitoral.',
    tips: 'Não use uma inclinação excessiva (>45°) para não transferir o estímulo para o deltóide anterior.',
    isFavorite: true,
  },
  {
    id: 'crucifixo_cabo',
    name: 'Crossover / Crucifixo no Cabo',
    targetMuscleGroup: 'peito',
    secondaryMuscles: ['ombros'],
    equipment: 'cabo',
    instructions: 'Posicione as polias na altura média ou alta. Dê um passo à frente com base dividida. Com os cotovelos levemente flexionados, faça a adução horizontal dos braços espremendo o peitoral no centro.',
    tips: 'Mantenha a postura estável e o peito estufado durante toda a fase excêntrica.',
  },

  // OMBROS
  {
    id: 'desenvolvimento_halteres',
    name: 'Desenvolvimento com Halteres',
    targetMuscleGroup: 'ombros',
    secondaryMuscles: ['triceps', 'peito'],
    equipment: 'halteres',
    instructions: 'Sentado em banco com encosto em 80-85°, segure os halteres ao nível das orelhas com pegada pronada ou semi-neutra. Empurre os pesos acima da cabeça sem estender excessivamente a coluna lombar.',
    tips: 'Contraia o abdômen e apoie bem os pés no chão para estabilidade total da cadeia cinética.',
    isFavorite: true,
  },
  {
    id: 'elevacao_lateral_halteres',
    name: 'Elevação Lateral com Halteres',
    targetMuscleGroup: 'ombros',
    secondaryMuscles: [],
    equipment: 'halteres',
    instructions: 'Em pé ou sentado, incline o tronco ligeiramente para a frente. Eleve os braços lateralmente até a altura dos ombros, liderando o movimento com os cotovelos e mantendo o polegar ligeiramente abaixo do mindinho.',
    tips: 'Evite o impulso do quadril e o encolhimento excessivo dos trapézios.',
    isFavorite: true,
  },
  {
    id: 'crucifixo_inverso_maquina',
    name: 'Crucifixo Inverso / Peck Deck Invertido',
    targetMuscleGroup: 'ombros',
    secondaryMuscles: ['costas'],
    equipment: 'maquina',
    instructions: 'Ajuste o assento para que os braços fiquem paralelos ao chão. Segure as manoplas e abra os braços lateralmente contraindo o deltóide posterior.',
    tips: 'Foque em empurrar com a parte posterior do braço e não apenas puxar com as mãos.',
  },

  // TRÍCEPS
  {
    id: 'triceps_corda_polia',
    name: 'Tríceps Corda na Polia',
    targetMuscleGroup: 'triceps',
    secondaryMuscles: [],
    equipment: 'cabo',
    instructions: 'Polia alta com corda. Cotovelos colados ao lado do tronco. Estenda os antebraços para baixo, abrindo as extremidades da corda no final do movimento para contração máxima da cabeça lateral.',
    tips: 'Não deixe os cotovelos avançarem ou recuarem durante o movimento.',
    isFavorite: true,
  },
  {
    id: 'triceps_testa_barra_w',
    name: 'Tríceps Testa com Barra W',
    targetMuscleGroup: 'triceps',
    secondaryMuscles: [],
    equipment: 'barra',
    instructions: 'Deitado no banco reto, segure a barra W com pegada pronada. Mantenha os braços ligeiramente inclinados para trás em direção à cabeça e flexione apenas os antebraços até a linha da testa/topo da cabeça.',
    tips: 'Manter a leve inclinação dos braços para trás sustenta a tensão na cabeça longa do tríceps.',
  },

  // COSTAS
  {
    id: 'puxada_alta_frente',
    name: 'Puxada Alta Frontal na Polia',
    targetMuscleGroup: 'costas',
    secondaryMuscles: ['biceps', 'ombros'],
    equipment: 'cabo',
    instructions: 'Sente-se com as coxas bem travadas sob os roletes. Segure a barra além da largura dos ombros. Deprima e retraia as escápulas, puxando a barra em direção à clavícula superior com peito estufado.',
    tips: 'Pense em puxar com os cotovelos para baixo e para dentro em vez de tracionar com os punhos.',
    isFavorite: true,
  },
  {
    id: 'remada_curvada_barra',
    name: 'Remada Curvada com Barra',
    targetMuscleGroup: 'costas',
    secondaryMuscles: ['biceps', 'ombros'],
    equipment: 'barra',
    instructions: 'Incline o tronco à frente a ~45°, coluna neutra, joelhos levemente flexionados. Puxe a barra em direção ao umbigo mantendo os cotovelos próximos às costelas.',
    tips: 'Ative o core firmemente antes de iniciar cada repetição para preservar a integridade lombar.',
    isFavorite: true,
  },
  {
    id: 'remada_baixa_triangulo',
    name: 'Remada Baixa no Cabo com Triângulo',
    targetMuscleGroup: 'costas',
    secondaryMuscles: ['biceps'],
    equipment: 'cabo',
    instructions: 'Sentado na máquina com os pés nos apoios e joelhos ligeiramente flexionados. Puxe o triângulo contra o abdômen médio enquanto aperta as escápulas juntas.',
    tips: 'Evite hiperestender a lombar no final do movimento.',
  },

  // BÍCEPS
  {
    id: 'rosca_direta_barra_w',
    name: 'Rosca Direta com Barra W',
    targetMuscleGroup: 'biceps',
    secondaryMuscles: [],
    equipment: 'barra',
    instructions: 'Em pé, pés na largura dos ombros, segure a barra W na curvatura ergonômica. Flexione os cotovelos subindo a barra sem balançar o tronco e desça controlando a fase excêntrica.',
    tips: 'Mantenha os cotovelos fixos ao lado da cintura sem projetá-los para a frente.',
    isFavorite: true,
  },
  {
    id: 'rosca_martelo_halteres',
    name: 'Rosca Martelo com Halteres',
    targetMuscleGroup: 'biceps',
    secondaryMuscles: [],
    equipment: 'halteres',
    instructions: 'Com pegada neutra (palmas voltadas uma para a outra), eleve os halteres simultaneamente ou alternadamente até a altura do peito.',
    tips: 'Excelente ativação do braquial e braquiorradial, aumentando a densidade do braço.',
    isFavorite: true,
  },

  // QUADRÍCEPS & PERNAS
  {
    id: 'agachamento_livre_barra',
    name: 'Agachamento Livre com Barra',
    targetMuscleGroup: 'quadriceps',
    secondaryMuscles: ['gluteos', 'posteriores'],
    equipment: 'barra',
    instructions: 'Barra apoiada sobre o trapézio médio (high bar) ou espinha da escápula (low bar). Pés na largura dos ombros com pontas ligeiramente para fora. Agache quebrando quadril e joelhos simultaneamente até as coxas quebrarem o paralelo de 90°.',
    tips: 'Mantenha o peito aberto e os joelhos alinhados com a ponta dos pés durante todo o trajeto.',
    isFavorite: true,
  },
  {
    id: 'leg_press_45',
    name: 'Leg Press 45°',
    targetMuscleGroup: 'quadriceps',
    secondaryMuscles: ['gluteos'],
    equipment: 'maquina',
    instructions: 'Pés na plataforma na largura dos ombros, altura média. Destrave o aparelho e desça controladamente até os joelhos formarem um ângulo de ~90° sem arredondar a lombar do encosto.',
    tips: 'Nunca estenda totalmente as pernas a ponto de travar (hiperextender) os joelhos no topo.',
    isFavorite: true,
  },
  {
    id: 'cadeira_extensora',
    name: 'Cadeira Extensora',
    targetMuscleGroup: 'quadriceps',
    secondaryMuscles: [],
    equipment: 'maquina',
    instructions: 'Ajuste o encosto para alinhar o eixo do joelho com o ponto de rotação da máquina. Estenda as pernas até a contração total dos quadríceps e pause por 1 segundo no pico.',
    tips: 'Desça de forma lenta e controlada, sem deixar os pesos colidirem.',
    isFavorite: true,
  },

  // POSTERIORES & GLÚTEOS
  {
    id: 'levantamento_terra_romeno',
    name: 'Stiff / RDL (Levantamento Terra Romeno)',
    targetMuscleGroup: 'posteriores',
    secondaryMuscles: ['gluteos'],
    equipment: 'barra',
    instructions: 'Em pé com barra rente às coxas. Inicie o movimento empurrando o quadril para trás enquanto mantém os joelhos em micro-flexão fixa. Desça a barra rente à canela até sentir alongamento nos posteriores.',
    tips: 'A coluna deve permanecer reta durante todo o arco; o movimento é puramente de bisagra de quadril (hip hinge).',
    isFavorite: true,
  },
  {
    id: 'mesa_flexora',
    name: 'Mesa Flexora',
    targetMuscleGroup: 'posteriores',
    secondaryMuscles: ['panturrilhas'],
    equipment: 'maquina',
    instructions: 'Deitado de bruços, almofada logo abaixo das panturrilhas. Flexione as pernas trazendo os calcanhares em direção aos glúteos e controle o retorno.',
    tips: 'Mantenha a pelve firmemente pressionada contra o banco durante a flexão.',
    isFavorite: true,
  },
  {
    id: 'elevacao_pelvica_barra',
    name: 'Elevação Pélvica com Barra / Hip Thrust',
    targetMuscleGroup: 'gluteos',
    secondaryMuscles: ['posteriores'],
    equipment: 'barra',
    instructions: 'Costas apoiadas no banco na altura da escápula. Barra acolchoada sobre a linha do quadril. Empurre os pés no chão e estenda o quadril até formar uma ponte alinhada, contraindo ao máximo os glúteos.',
    tips: 'Mantenha o queixo apontado para o peito no topo para evitar hiperextensão da coluna lombar.',
    isFavorite: true,
  },
  {
    id: 'panturrilha_em_pe',
    name: 'Gêmeos / Panturrilha em Pé',
    targetMuscleGroup: 'panturrilhas',
    secondaryMuscles: [],
    equipment: 'maquina',
    instructions: 'Apoie as pontas dos pés no degrau. Desça os calcanhares sentindo o alongamento da fáscia e empurre vigorosamente até a ponta dos pés, sustentando 1 segundo na contração concêntrica máxima.',
    tips: 'Alongar totalmente no final da descida é fundamental para recrutamento do gastrocnêmio.',
  },
];

// Split programado pelo usuário:
// Segunda: Peito, Ombros e Tríceps
// Terça: Pernas com foco em Quadríceps
// Quarta: Costas e Bíceps
// Quinta: Treino de Membros Superiores
// Sexta: Descanso
// Sábado: Descanso
// Domingo: Posteriores de Coxa e Glúteos

export const DEFAULT_ROUTINES: WorkoutRoutine[] = [
  // 0: Domingo
  {
    id: 'routine_domingo',
    name: 'Domingo: Posteriores de Coxa e Glúteos',
    description: 'Foco em hipertrofia de cadeia posterior, glúteos e bíceps femoral.',
    dayOfWeek: 0,
    isRestDay: false,
    color: '#84cc16',
    targetMuscleGroups: ['posteriores', 'gluteos', 'panturrilhas'],
    exercises: [
      {
        id: 'dom_ex_1',
        exerciseId: 'levantamento_terra_romeno',
        exerciseName: 'Stiff / RDL (Levantamento Terra Romeno)',
        targetMuscleGroup: 'posteriores',
        notes: 'Foco no alongamento profundo dos isquiotibiais.',
        sets: [
          { id: 'dom_1_1', setNumber: 1, targetReps: 10, targetWeightKg: 50, restSeconds: 90, completed: false },
          { id: 'dom_1_2', setNumber: 2, targetReps: 10, targetWeightKg: 60, restSeconds: 90, completed: false },
          { id: 'dom_1_3', setNumber: 3, targetReps: 8, targetWeightKg: 70, restSeconds: 90, completed: false },
          { id: 'dom_1_4', setNumber: 4, targetReps: 8, targetWeightKg: 70, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'dom_ex_2',
        exerciseId: 'elevacao_pelvica_barra',
        exerciseName: 'Elevação Pélvica com Barra / Hip Thrust',
        targetMuscleGroup: 'gluteos',
        notes: 'Pausa de 2s na contração máxima de cada repetição.',
        sets: [
          { id: 'dom_2_1', setNumber: 1, targetReps: 12, targetWeightKg: 70, restSeconds: 90, completed: false },
          { id: 'dom_2_2', setNumber: 2, targetReps: 10, targetWeightKg: 80, restSeconds: 90, completed: false },
          { id: 'dom_2_3', setNumber: 3, targetReps: 10, targetWeightKg: 90, restSeconds: 90, completed: false },
          { id: 'dom_2_4', setNumber: 4, targetReps: 8, targetWeightKg: 100, restSeconds: 120, completed: false },
        ],
      },
      {
        id: 'dom_ex_3',
        exerciseId: 'mesa_flexora',
        exerciseName: 'Mesa Flexora',
        targetMuscleGroup: 'posteriores',
        notes: 'Cadência excêntrica de 3 segundos.',
        sets: [
          { id: 'dom_3_1', setNumber: 1, targetReps: 12, targetWeightKg: 35, restSeconds: 60, completed: false },
          { id: 'dom_3_2', setNumber: 2, targetReps: 12, targetWeightKg: 40, restSeconds: 60, completed: false },
          { id: 'dom_3_3', setNumber: 3, targetReps: 10, targetWeightKg: 45, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'dom_ex_4',
        exerciseId: 'panturrilha_em_pe',
        exerciseName: 'Gêmeos / Panturrilha em Pé',
        targetMuscleGroup: 'panturrilhas',
        notes: 'Pico de contração de 1s no topo.',
        sets: [
          { id: 'dom_4_1', setNumber: 1, targetReps: 15, targetWeightKg: 50, restSeconds: 60, completed: false },
          { id: 'dom_4_2', setNumber: 2, targetReps: 15, targetWeightKg: 60, restSeconds: 60, completed: false },
          { id: 'dom_4_3', setNumber: 3, targetReps: 12, targetWeightKg: 70, restSeconds: 60, completed: false },
        ],
      },
    ],
  },

  // 1: Segunda-feira
  {
    id: 'routine_segunda',
    name: 'Segunda: Peito, Ombros e Tríceps',
    description: 'Treino de empurrar com foco no desenvolvimento torácico, deltóides e tríceps.',
    dayOfWeek: 1,
    isRestDay: false,
    color: '#84cc16',
    targetMuscleGroups: ['peito', 'ombros', 'triceps'],
    exercises: [
      {
        id: 'seg_ex_1',
        exerciseId: 'supino_reto_barra',
        exerciseName: 'Supino Reto com Barra',
        targetMuscleGroup: 'peito',
        notes: 'Aquecimento progressivo antes das séries válidas.',
        sets: [
          { id: 'seg_1_1', setNumber: 1, targetReps: 10, targetWeightKg: 60, restSeconds: 90, completed: false },
          { id: 'seg_1_2', setNumber: 2, targetReps: 10, targetWeightKg: 70, restSeconds: 90, completed: false },
          { id: 'seg_1_3', setNumber: 3, targetReps: 8, targetWeightKg: 80, restSeconds: 120, completed: false },
          { id: 'seg_1_4', setNumber: 4, targetReps: 6, targetWeightKg: 85, restSeconds: 120, completed: false },
        ],
      },
      {
        id: 'seg_ex_2',
        exerciseId: 'supino_inclinado_halteres',
        exerciseName: 'Supino Inclinado com Halteres',
        targetMuscleGroup: 'peito',
        notes: 'Ângulo de 30° no banco para máxima porção clavicular.',
        sets: [
          { id: 'seg_2_1', setNumber: 1, targetReps: 10, targetWeightKg: 24, restSeconds: 90, completed: false },
          { id: 'seg_2_2', setNumber: 2, targetReps: 10, targetWeightKg: 26, restSeconds: 90, completed: false },
          { id: 'seg_2_3', setNumber: 3, targetReps: 8, targetWeightKg: 28, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'seg_ex_3',
        exerciseId: 'desenvolvimento_halteres',
        exerciseName: 'Desenvolvimento com Halteres',
        targetMuscleGroup: 'ombros',
        notes: 'Controle na descida, sem rebote.',
        sets: [
          { id: 'seg_3_1', setNumber: 1, targetReps: 10, targetWeightKg: 18, restSeconds: 90, completed: false },
          { id: 'seg_3_2', setNumber: 2, targetReps: 10, targetWeightKg: 20, restSeconds: 90, completed: false },
          { id: 'seg_3_3', setNumber: 3, targetReps: 8, targetWeightKg: 22, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'seg_ex_4',
        exerciseId: 'elevacao_lateral_halteres',
        exerciseName: 'Elevação Lateral com Halteres',
        targetMuscleGroup: 'ombros',
        notes: 'Sustente o ápice por 0.5s.',
        sets: [
          { id: 'seg_4_1', setNumber: 1, targetReps: 15, targetWeightKg: 10, restSeconds: 60, completed: false },
          { id: 'seg_4_2', setNumber: 2, targetReps: 12, targetWeightKg: 12, restSeconds: 60, completed: false },
          { id: 'seg_4_3', setNumber: 3, targetReps: 12, targetWeightKg: 12, restSeconds: 60, completed: false },
          { id: 'seg_4_4', setNumber: 4, targetReps: 10, targetWeightKg: 14, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'seg_ex_5',
        exerciseId: 'triceps_corda_polia',
        exerciseName: 'Tríceps Corda na Polia',
        targetMuscleGroup: 'triceps',
        notes: 'Abertura final da corda no ponto de contração.',
        sets: [
          { id: 'seg_5_1', setNumber: 1, targetReps: 12, targetWeightKg: 25, restSeconds: 60, completed: false },
          { id: 'seg_5_2', setNumber: 2, targetReps: 12, targetWeightKg: 30, restSeconds: 60, completed: false },
          { id: 'seg_5_3', setNumber: 3, targetReps: 10, targetWeightKg: 35, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'seg_ex_6',
        exerciseId: 'triceps_testa_barra_w',
        exerciseName: 'Tríceps Testa com Barra W',
        targetMuscleGroup: 'triceps',
        notes: 'Braços levemente inclinados para trás.',
        sets: [
          { id: 'seg_6_1', setNumber: 1, targetReps: 10, targetWeightKg: 24, restSeconds: 60, completed: false },
          { id: 'seg_6_2', setNumber: 2, targetReps: 10, targetWeightKg: 28, restSeconds: 60, completed: false },
          { id: 'seg_6_3', setNumber: 3, targetReps: 8, targetWeightKg: 32, restSeconds: 90, completed: false },
        ],
      },
    ],
  },

  // 2: Terça-feira
  {
    id: 'routine_terca',
    name: 'Terça: Pernas com foco em Quadríceps',
    description: 'Volume e intensidade dedicados aos extensores de joelho e membros inferiores.',
    dayOfWeek: 2,
    isRestDay: false,
    color: '#84cc16',
    targetMuscleGroups: ['quadriceps', 'gluteos', 'panturrilhas'],
    exercises: [
      {
        id: 'ter_ex_1',
        exerciseId: 'agachamento_livre_barra',
        exerciseName: 'Agachamento Livre com Barra',
        targetMuscleGroup: 'quadriceps',
        notes: 'Profundidade controlada, quebrando 90° com estabilidade.',
        sets: [
          { id: 'ter_1_1', setNumber: 1, targetReps: 10, targetWeightKg: 60, restSeconds: 120, completed: false },
          { id: 'ter_1_2', setNumber: 2, targetReps: 8, targetWeightKg: 80, restSeconds: 120, completed: false },
          { id: 'ter_1_3', setNumber: 3, targetReps: 8, targetWeightKg: 90, restSeconds: 120, completed: false },
          { id: 'ter_1_4', setNumber: 4, targetReps: 6, targetWeightKg: 100, restSeconds: 150, completed: false },
        ],
      },
      {
        id: 'ter_ex_2',
        exerciseId: 'leg_press_45',
        exerciseName: 'Leg Press 45°',
        targetMuscleGroup: 'quadriceps',
        notes: 'Sem desencostar a lombar do apoio.',
        sets: [
          { id: 'ter_2_1', setNumber: 1, targetReps: 12, targetWeightKg: 160, restSeconds: 90, completed: false },
          { id: 'ter_2_2', setNumber: 2, targetReps: 10, targetWeightKg: 200, restSeconds: 90, completed: false },
          { id: 'ter_2_3', setNumber: 3, targetReps: 10, targetWeightKg: 220, restSeconds: 90, completed: false },
          { id: 'ter_2_4', setNumber: 4, targetReps: 8, targetWeightKg: 240, restSeconds: 120, completed: false },
        ],
      },
      {
        id: 'ter_ex_3',
        exerciseId: 'cadeira_extensora',
        exerciseName: 'Cadeira Extensora',
        targetMuscleGroup: 'quadriceps',
        notes: 'Sustente 1 segundo no pico de contração.',
        sets: [
          { id: 'ter_3_1', setNumber: 1, targetReps: 15, targetWeightKg: 40, restSeconds: 60, completed: false },
          { id: 'ter_3_2', setNumber: 2, targetReps: 12, targetWeightKg: 50, restSeconds: 60, completed: false },
          { id: 'ter_3_3', setNumber: 3, targetReps: 12, targetWeightKg: 55, restSeconds: 60, completed: false },
          { id: 'ter_3_4', setNumber: 4, targetReps: 10, targetWeightKg: 60, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'ter_ex_4',
        exerciseId: 'panturrilha_em_pe',
        exerciseName: 'Gêmeos / Panturrilha em Pé',
        targetMuscleGroup: 'panturrilhas',
        notes: 'Descida bem profunda.',
        sets: [
          { id: 'ter_4_1', setNumber: 1, targetReps: 15, targetWeightKg: 55, restSeconds: 60, completed: false },
          { id: 'ter_4_2', setNumber: 2, targetReps: 15, targetWeightKg: 65, restSeconds: 60, completed: false },
          { id: 'ter_4_3', setNumber: 3, targetReps: 12, targetWeightKg: 75, restSeconds: 60, completed: false },
        ],
      },
    ],
  },

  // 3: Quarta-feira
  {
    id: 'routine_quarta',
    name: 'Quarta: Costas e Bíceps',
    description: 'Treino de puxar com ênfase na largura do dorsal, espessura e bíceps.',
    dayOfWeek: 3,
    isRestDay: false,
    color: '#84cc16',
    targetMuscleGroups: ['costas', 'biceps', 'ombros'],
    exercises: [
      {
        id: 'qua_ex_1',
        exerciseId: 'puxada_alta_frente',
        exerciseName: 'Puxada Alta Frontal na Polia',
        targetMuscleGroup: 'costas',
        notes: 'Foco na depressão escapular antes de flexionar os cotovelos.',
        sets: [
          { id: 'qua_1_1', setNumber: 1, targetReps: 12, targetWeightKg: 45, restSeconds: 90, completed: false },
          { id: 'qua_1_2', setNumber: 2, targetReps: 10, targetWeightKg: 55, restSeconds: 90, completed: false },
          { id: 'qua_1_3', setNumber: 3, targetReps: 8, targetWeightKg: 65, restSeconds: 90, completed: false },
          { id: 'qua_1_4', setNumber: 4, targetReps: 8, targetWeightKg: 65, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'qua_ex_2',
        exerciseId: 'remada_curvada_barra',
        exerciseName: 'Remada Curvada com Barra',
        targetMuscleGroup: 'costas',
        notes: 'Puxando em direção ao umbigo para máxima ativação dorsal.',
        sets: [
          { id: 'qua_2_1', setNumber: 1, targetReps: 10, targetWeightKg: 50, restSeconds: 90, completed: false },
          { id: 'qua_2_2', setNumber: 2, targetReps: 10, targetWeightKg: 60, restSeconds: 90, completed: false },
          { id: 'qua_2_3', setNumber: 3, targetReps: 8, targetWeightKg: 70, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'qua_ex_3',
        exerciseId: 'remada_baixa_triangulo',
        exerciseName: 'Remada Baixa no Cabo com Triângulo',
        targetMuscleGroup: 'costas',
        notes: 'Aperte as escápulas no final.',
        sets: [
          { id: 'qua_3_1', setNumber: 1, targetReps: 12, targetWeightKg: 45, restSeconds: 60, completed: false },
          { id: 'qua_3_2', setNumber: 2, targetReps: 10, targetWeightKg: 55, restSeconds: 60, completed: false },
          { id: 'qua_3_3', setNumber: 3, targetReps: 10, targetWeightKg: 60, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'qua_ex_4',
        exerciseId: 'crucifixo_inverso_maquina',
        exerciseName: 'Crucifixo Inverso / Peck Deck Invertido',
        targetMuscleGroup: 'ombros',
        notes: 'Deltóide posterior e rombóides.',
        sets: [
          { id: 'qua_4_1', setNumber: 1, targetReps: 15, targetWeightKg: 30, restSeconds: 60, completed: false },
          { id: 'qua_4_2', setNumber: 2, targetReps: 12, targetWeightKg: 35, restSeconds: 60, completed: false },
          { id: 'qua_4_3', setNumber: 3, targetReps: 12, targetWeightKg: 40, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'qua_ex_5',
        exerciseId: 'rosca_direta_barra_w',
        exerciseName: 'Rosca Direta com Barra W',
        targetMuscleGroup: 'biceps',
        notes: 'Sem balançar o corpo.',
        sets: [
          { id: 'qua_5_1', setNumber: 1, targetReps: 10, targetWeightKg: 24, restSeconds: 60, completed: false },
          { id: 'qua_5_2', setNumber: 2, targetReps: 10, targetWeightKg: 28, restSeconds: 60, completed: false },
          { id: 'qua_5_3', setNumber: 3, targetReps: 8, targetWeightKg: 32, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'qua_ex_6',
        exerciseId: 'rosca_martelo_halteres',
        exerciseName: 'Rosca Martelo com Halteres',
        targetMuscleGroup: 'biceps',
        notes: 'Foco no braquial.',
        sets: [
          { id: 'qua_6_1', setNumber: 1, targetReps: 12, targetWeightKg: 12, restSeconds: 60, completed: false },
          { id: 'qua_6_2', setNumber: 2, targetReps: 10, targetWeightKg: 14, restSeconds: 60, completed: false },
          { id: 'qua_6_3', setNumber: 3, targetReps: 10, targetWeightKg: 16, restSeconds: 60, completed: false },
        ],
      },
    ],
  },

  // 4: Quinta-feira
  {
    id: 'routine_quinta',
    name: 'Quinta: Treino de Membros Superiores',
    description: 'Treino completo de Upper Body estimulando peito, costas, ombros e braços de forma harmônica.',
    dayOfWeek: 4,
    isRestDay: false,
    color: '#84cc16',
    targetMuscleGroups: ['peito', 'costas', 'ombros', 'biceps', 'triceps'],
    exercises: [
      {
        id: 'qui_ex_1',
        exerciseId: 'supino_inclinado_halteres',
        exerciseName: 'Supino Inclinado com Halteres',
        targetMuscleGroup: 'peito',
        notes: 'Ativação torácica superior.',
        sets: [
          { id: 'qui_1_1', setNumber: 1, targetReps: 10, targetWeightKg: 26, restSeconds: 90, completed: false },
          { id: 'qui_1_2', setNumber: 2, targetReps: 10, targetWeightKg: 28, restSeconds: 90, completed: false },
          { id: 'qui_1_3', setNumber: 3, targetReps: 8, targetWeightKg: 30, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'qui_ex_2',
        exerciseId: 'puxada_alta_frente',
        exerciseName: 'Puxada Alta Frontal na Polia',
        targetMuscleGroup: 'costas',
        notes: 'Amplitude completa com estiramento dorsal.',
        sets: [
          { id: 'qui_2_1', setNumber: 1, targetReps: 10, targetWeightKg: 55, restSeconds: 90, completed: false },
          { id: 'qui_2_2', setNumber: 2, targetReps: 10, targetWeightKg: 60, restSeconds: 90, completed: false },
          { id: 'qui_2_3', setNumber: 3, targetReps: 8, targetWeightKg: 65, restSeconds: 90, completed: false },
        ],
      },
      {
        id: 'qui_ex_3',
        exerciseId: 'elevacao_lateral_halteres',
        exerciseName: 'Elevação Lateral com Halteres',
        targetMuscleGroup: 'ombros',
        notes: 'Densidade do deltóide lateral.',
        sets: [
          { id: 'qui_3_1', setNumber: 1, targetReps: 15, targetWeightKg: 10, restSeconds: 60, completed: false },
          { id: 'qui_3_2', setNumber: 2, targetReps: 12, targetWeightKg: 12, restSeconds: 60, completed: false },
          { id: 'qui_3_3', setNumber: 3, targetReps: 12, targetWeightKg: 12, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'qui_ex_4',
        exerciseId: 'triceps_corda_polia',
        exerciseName: 'Tríceps Corda na Polia',
        targetMuscleGroup: 'triceps',
        notes: 'Série conjugada opcional.',
        sets: [
          { id: 'qui_4_1', setNumber: 1, targetReps: 12, targetWeightKg: 30, restSeconds: 60, completed: false },
          { id: 'qui_4_2', setNumber: 2, targetReps: 10, targetWeightKg: 35, restSeconds: 60, completed: false },
          { id: 'qui_4_3', setNumber: 3, targetReps: 10, targetWeightKg: 35, restSeconds: 60, completed: false },
        ],
      },
      {
        id: 'qui_ex_5',
        exerciseId: 'rosca_direta_barra_w',
        exerciseName: 'Rosca Direta com Barra W',
        targetMuscleGroup: 'biceps',
        notes: 'Pico de contração no topo.',
        sets: [
          { id: 'qui_5_1', setNumber: 1, targetReps: 12, targetWeightKg: 24, restSeconds: 60, completed: false },
          { id: 'qui_5_2', setNumber: 2, targetReps: 10, targetWeightKg: 28, restSeconds: 60, completed: false },
          { id: 'qui_5_3', setNumber: 3, targetReps: 8, targetWeightKg: 32, restSeconds: 60, completed: false },
        ],
      },
    ],
  },

  // 5: Sexta-feira
  {
    id: 'routine_sexta',
    name: 'Sexta: Descanso e Recuperação Ativa',
    description: 'Dia de descanso programado. Hidratação, síntese protéica e descanso muscular.',
    dayOfWeek: 5,
    isRestDay: true,
    color: '#71717a',
    targetMuscleGroups: [],
    exercises: [],
  },

  // 6: Sábado
  {
    id: 'routine_sabado',
    name: 'Sábado: Descanso e Regeneração',
    description: 'Dia de descanso programado. Sono reparador e nutrição anabólica.',
    dayOfWeek: 6,
    isRestDay: true,
    color: '#71717a',
    targetMuscleGroups: [],
    exercises: [],
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  accentColor: 'lime',
  defaultRestSeconds: 90,
  soundEnabled: true,
  vibrationEnabled: true,
  weightUnit: 'kg',
  autoStartRest: true,
  weeklyWorkoutGoal: 5,
  userName: 'Atleta',
  motivationalMessage: 'Constância vence o talento. Mais uma série concluída com perfeição.',
  syncStatus: 'local',
};
