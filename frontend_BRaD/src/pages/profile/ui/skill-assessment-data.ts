import type { Locale } from '@shared/lib/ui-settings';

export type SkillAssessmentKind =
  | 'technical'
  | 'design'
  | 'communication'
  | 'english';

export interface SkillAssessmentOption {
  id: string;
  label: string;
}

export interface SkillAssessmentQuestion {
  id: string;
  prompt: string;
  correctOptionId: string;
  options: SkillAssessmentOption[];
}

export interface SkillAssessmentDefinition {
  skill: string;
  kind: SkillAssessmentKind;
  title: string;
  version: string;
  passingScore: number;
  questionCount: number;
  questions: SkillAssessmentQuestion[];
}

type LocalizedText = Record<Locale, string>;

type QuestionTemplate = {
  prompt: LocalizedText;
  options: Array<{
    id: string;
    label: LocalizedText;
    correct: boolean;
  }>;
};

const assessmentVersion = 'local-preview-v1';

const designSkills = new Set(['figma', 'ui/ux', 'ui ux']);
const communicationSkills = new Set(['communication']);
const englishSkills = new Set(['english']);

const interpolateSkill = (template: string, skill: string): string => {
  return template.split('{skill}').join(skill);
};

const resolveAssessmentKind = (skill: string): SkillAssessmentKind => {
  const normalized = skill.trim().toLowerCase();

  if (designSkills.has(normalized)) {
    return 'design';
  }

  if (communicationSkills.has(normalized)) {
    return 'communication';
  }

  if (englishSkills.has(normalized)) {
    return 'english';
  }

  return 'technical';
};

const assessmentTitles: Record<SkillAssessmentKind, LocalizedText> = {
  technical: {
    en: '{skill} quick verification',
    ru: 'Быстрая проверка навыка {skill}',
    kk: '{skill} дағдысын жедел тексеру',
  },
  design: {
    en: '{skill} design verification',
    ru: 'Проверка design-навыка {skill}',
    kk: '{skill} дизайн дағдысын тексеру',
  },
  communication: {
    en: '{skill} communication verification',
    ru: 'Проверка навыка коммуникации {skill}',
    kk: '{skill} коммуникация дағдысын тексеру',
  },
  english: {
    en: '{skill} language verification',
    ru: 'Проверка языкового навыка {skill}',
    kk: '{skill} тіл дағдысын тексеру',
  },
};

const questionTemplates: Record<SkillAssessmentKind, QuestionTemplate[]> = {
  technical: [
    {
      prompt: {
        en: 'Before starting a task with {skill}, what is the strongest first step?',
        ru: 'Перед началом задачи с {skill} какой первый шаг самый правильный?',
        kk: '{skill} қолданылатын тапсырманы бастар алдында ең дұрыс алғашқы қадам қандай?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Clarify requirements, constraints, and expected result',
            ru: 'Уточнить требования, ограничения и ожидаемый результат',
            kk: 'Талаптарды, шектеулерді және күтілетін нәтижені нақтылау',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Start coding immediately to save time',
            ru: 'Сразу начать писать код, чтобы сэкономить время',
            kk: 'Уақыт үнемдеу үшін бірден код жаза бастау',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Copy the first example you find',
            ru: 'Скопировать первый попавшийся пример',
            kk: 'Кездескен алғашқы мысалды көшіру',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Skip planning and rely on later fixes',
            ru: 'Пропустить планирование и рассчитывать на правки потом',
            kk: 'Жоспарлауды өткізіп, кейін түзетемін деп сену',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'What best demonstrates real confidence in {skill}?',
        ru: 'Что лучше всего показывает реенное владение {skill}?',
        kk: '{skill} бойынша шынайы сенімділікті не жақсы көрсетеді?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Choosing patterns deliberately and explaining tradeoffs',
            ru: 'Осознанный выбор подходов и объяснение компромиссов',
            kk: 'Тәсілдерді саналы таңдау және олардың айырбасын түсіндіру',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Using the most complex solution every time',
            ru: 'Каждый раз использовать самое сложное решение',
            kk: 'Әр жолы ең күрделі шешімді қолдану',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Avoiding feedback from the team',
            ru: 'Избегать обратной связи от команды',
            kk: 'Командадан кері байланысты болдырмау',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Memorizing syntax without understanding behavior',
            ru: 'Запоминать синтаксис без понимания поведения',
            kk: 'Мінез-құлықты түсінбей синтаксисті жаттау',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'A bug appears in a {skill} task. What is the best debugging move?',
        ru: 'В задаче на {skill} появился баг. Какой шаг для отладки лучший?',
        kk: '{skill} тапсырмасында қате шықты. Диагностика үшін ең дұрыс қадам қандай?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Reproduce it, isolate the cause, and inspect inputs and outputs',
            ru: 'Повторить баг, изолировать причину и проверить входы и выходы',
            kk: 'Қатені қайталап, себебін оқшаулап, кіріс пен шығысты тексеру',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Rewrite everything from scratch immediately',
            ru: 'Сразу переписать всё с нуля',
            kk: 'Бірден бәрін нөлден қайта жазу',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Assume the environment is wrong without checking',
            ru: 'Сразу считать, что проблема во внешней среде',
            kk: 'Тексермей тұрып, мәселе ортада деп болжау',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Hide the issue until a deadline passes',
            ru: 'Скрыть проблему до дедлайна',
            kk: 'Deadline өткенше мәселені жасыру',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'Which habit usually improves long-term quality in {skill} work?',
        ru: 'Какая привычка обычно повышает долгосрочное качество работы с {skill}?',
        kk: '{skill} бойынша жұмыстың ұзақ мерзімді сапасын қай әдет жақсартады?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Small composable changes, clear naming, and reviewable structure',
            ru: 'Небольшие композиционные изменения, понятные названия и удобная структура',
            kk: 'Шағын құрастырмалы өзгерістер, түсінікті атаулар және шолуға ыңғайлы құрылым',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Large hidden changes with no explanation',
            ru: 'Большие скрытые изменения без объяснений',
            kk: 'Түсіндірмесіз үлкен жасырын өзгерістер',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Skipping comments and naming entirely',
            ru: 'Полностью игнорировать комментарии и именование',
            kk: 'Түсіндірме мен атауды мүлде елемеу',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Changing several concerns in one step without validation',
            ru: 'Менять несколько аспектов сразу без проверки',
            kk: 'Бірден бірнеше нәрсені тексерусіз өзгерту',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'Before marking a {skill} task done, what should be checked?',
        ru: 'Что нужно проверить перед завершением задачи по {skill}?',
        kk: '{skill} тапсырмасын аяқталды деп белгілемес бұрын нені тексеру керек?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Happy path, edge cases, and failure handling',
            ru: 'Основной сценарий, крайние случаи и обработку ошибок',
            kk: 'Негізгі сценарийді, шеткі жағдайларды және қателерді өңдеуді',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Only whether it works once on your machine',
            ru: 'Только то, что один раз сработало на твоём компьютере',
            kk: 'Тек өз құрылғыңда бір рет жұмыс істегенін',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Whether the code looks long enough',
            ru: 'Достаточно ли длинным выглядит код',
            kk: 'Кодтың жеткілікті ұзын көрінетінін',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Only visual styling and nothing else',
            ru: 'Только внешний вид и больше ничего',
            kk: 'Тек сыртқы көріністі ғана',
          },
          correct: false,
        },
      ],
    },
  ],
  design: [
    {
      prompt: {
        en: 'When starting a {skill} task, what should guide the first decisions?',
        ru: 'Что должно направлять первые решения в задаче по {skill}?',
        kk: '{skill} тапсырмасында алғашқы шешімдерге не бағыт беруі керек?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'User goal, context, and the main flow to complete',
            ru: 'Цель пользователя, контекст и основной сценарий',
            kk: 'Пайдаланушы мақсаты, контекст және негізгі сценарий',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Random visual trends from social media',
            ru: 'Случайные визуальные тренды из соцсетей',
            kk: 'Әлеуметтік желідегі кездейсоқ визуал трендтер',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Maximum decoration before structure',
            ru: 'Максимум декора до продумывания структуры',
            kk: 'Құрылымды ойламай тұрып, алдымен барынша сәндеу',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Ignoring accessibility and states',
            ru: 'Игнорирование доступности и состояний',
            kk: 'Қолжетімділік пен күйлерді елемеу',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'What is the strongest sign of a thoughtful {skill} decision?',
        ru: 'Что лучше всего показывает продуманное решение в {skill}?',
        kk: '{skill} бойынша ойластырылған шешімді не жақсы көрсетеді?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Clear hierarchy, consistency, and accessible interaction',
            ru: 'Ясная иерархия, консистентность и доступное взаимодействие',
            kk: 'Айқын иерархия, бірізділік және қолжетімді өзара әрекет',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Using the most colors possible',
            ru: 'Использование максимально большого числа цветов',
            kk: 'Мүмкін болғанша көп түсті қолдану',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Making every block visually unique',
            ru: 'Делать каждый блок визуально уникальным',
            kk: 'Әр блокты визуалды түрде мүлде бөлек жасау',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Skipping feedback because the mockup looks nice',
            ru: 'Пропускать фидбек, потому что макет уже красивый',
            kk: 'Макет әдемі көрінеді деп кері байланысты өткізіп жіберу',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'How should a {skill} concept be validated quickly?',
        ru: 'Как быстро проверить концепт в {skill}?',
        kk: '{skill} идеясын қалай тез тексеруге болады?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Run through realistic scenarios and observe friction points',
            ru: 'Прогнать реалистичные сценарии и заметить точки трения',
            kk: 'Шынайы сценарийлерден өткізіп, қиындық нүктелерін байқау',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Judge only by the hero screen',
            ru: 'Оценивать только по первому экрану',
            kk: 'Тек алғашқы экран бойынша бағалау',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Hide empty and error states',
            ru: 'Скрыть пустые и ошибочные состояния',
            kk: 'Бос және қате күйлерді жасыру',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Avoid documenting decisions',
            ru: 'Не документировать решения',
            kk: 'Шешімдерді құжаттамау',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'What improves handoff quality in {skill} work?',
        ru: 'Что улучшает качество handoff в работе по {skill}?',
        kk: '{skill} жұмысында handoff сапасын не жақсартады?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Document components, spacing, states, and rationale',
            ru: 'Документировать компоненты, отступы, состояния и логику',
            kk: 'Компоненттерді, аралықтарды, күйлерді және шешім логикасын құжаттау',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Send only one screenshot',
            ru: 'Отправить только один скриншот',
            kk: 'Тек бір скриншот жіберу',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Rename layers randomly',
            ru: 'Называть слои случайным образом',
            kk: 'Қабаттарды кездейсоқ атау',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Leave interactive states undefined',
            ru: 'Оставить интерактивные состояния неопределёнными',
            kk: 'Интерактивті күйлерді анықтамай қалдыру',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'Before approving a {skill} task, what should be true?',
        ru: 'Что должно быть верно перед одобрением задачи по {skill}?',
        kk: '{skill} тапсырмасын бекітпес бұрын не орындалуы керек?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'The design supports key flow, edge states, and implementation clarity',
            ru: 'Дизайн покрывает основной сценарий, крайние состояния и понятен в реализации',
            kk: 'Дизайн негізгі сценарийді, шеткі күйлерді қамтиды және іске асыруға түсінікті',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Only the main happy-path frame is ready',
            ru: 'Готов только основной happy-path экран',
            kk: 'Тек негізгі happy-path экраны дайын',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'The layout looks unusual but untested',
            ru: 'Макет выглядит необычно, но не проверен',
            kk: 'Макет ерекше көрінеді, бірақ тексерілмеген',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Colors are final even if the flow is confusing',
            ru: 'Цвета финальные, даже если сценарий запутан',
            kk: 'Түстер дайын, бірақ сценарий түсініксіз болса да',
          },
          correct: false,
        },
      ],
    },
  ],
  communication: [
    {
      prompt: {
        en: 'What best shows strong {skill} at the start of collaboration?',
        ru: 'Что лучше всего показывает сильную {skill} в начале сотрудничества?',
        kk: 'Ынтымақтастық басында мықты {skill} нені көрсетеді?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Clarifying goals, constraints, and expected outcome',
            ru: 'Уточнение целей, ограничений и ожидаемого результата',
            kk: 'Мақсатты, шектеулерді және күтілетін нәтижені нақтылау',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Speaking first and longest in every discussion',
            ru: 'Говорить первым и дольше всех в каждом обсуждении',
            kk: 'Әр талқылауда бірінші және ең ұзақ сөйлеу',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Avoiding written follow-up',
            ru: 'Избегание письменного follow-up',
            kk: 'Жазбаша follow-up жасамау',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Assuming everyone interpreted the message the same way',
            ru: 'Предполагать, что все одинаково поняли сообщение',
            kk: 'Барлығы хабарды бірдей түсінді деп болжау',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'During disagreement, what is the most constructive move?',
        ru: 'Во время разногласий какой шаг самый конструктивный?',
        kk: 'Келіспеушілік кезінде ең конструктивті қадам қандай?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Summarize positions, align on facts, and define the next step',
            ru: 'Подытожить позиции, сверить факты и определить следующий шаг',
            kk: 'Позицияларды қорытындылап, фактілерді нақтылап, келесі қадамды белгілеу',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Raise your voice to make the point clearer',
            ru: 'Повысить голос, чтобы лучше донести мысль',
            kk: 'Ойды анық жеткізу үшін дауысты көтеру',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Stop listening and repeat your view only',
            ru: 'Перестать слушать и повторять только свою позицию',
            kk: 'Тыңдауды тоқтатып, тек өз пікіріңді қайталау',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Leave the conversation without follow-up',
            ru: 'Уйти из разговора без follow-up',
            kk: 'Әңгімеден follow-upсыз кетіп қалу',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'If feedback is vague, what should you do?',
        ru: 'Если обратная связь расплывчатая, что нужно сделать?',
        kk: 'Кері байланыс нақты емес болса, не істеу керек?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Ask for examples, priority, and desired outcome',
            ru: 'Попросить примеры, приоритет и желаемый результат',
            kk: 'Мысалдарды, басымдықты және күтілетін нәтижені сұрау',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Assume the harshest possible interpretation',
            ru: 'Считать самым жёстким возможное толкование',
            kk: 'Ең қатаң мағынада түсіну',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Ignore the feedback entirely',
            ru: 'Полностью проигнорировать обратную связь',
            kk: 'Кері байланысты толық елемеу',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Respond defensively before clarifying',
            ru: 'Сразу защищаться, не уточняя',
            kk: 'Нақтыламай тұрып бірден қорғанысқа көшу',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'What makes an async project update effective?',
        ru: 'Что делает асинхронный апдейт по проекту эффективным?',
        kk: 'Жобадағы асинхронды жаңартуды не тиімді етеді?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Context, progress, blockers, and the next step',
            ru: 'Контекст, прогресс, блокеры и следующий шаг',
            kk: 'Контекст, прогресс, блокерлер және келесі қадам',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'A long message without structure',
            ru: 'Длинное сообщение без структуры',
            kk: 'Құрылымсыз ұзақ хабарлама',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Only a screenshot with no explanation',
            ru: 'Только скриншот без объяснений',
            kk: 'Түсіндірмесіз тек скриншот',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Hiding blockers to look faster',
            ru: 'Скрывать блокеры, чтобы казаться быстрее',
            kk: 'Жылдам көріну үшін блокерлерді жасыру',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'Before sending an important message, what matters most?',
        ru: 'Что важнее всего перед отправкой важного сообщения?',
        kk: 'Маңызды хабарламаны жіберер алдында не ең маңызды?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'It is clear, respectful, and actionable',
            ru: 'Оно ясное, уважительное и даёт понятное действие',
            kk: 'Ол анық, сыпайы және әрекетке түсінікті болуы',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'It sounds urgent even if details are missing',
            ru: 'Оно звучит срочно, даже если деталей не хватает',
            kk: 'Деталь жетпесе де, тек шұғыл естілуі',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'It includes as many buzzwords as possible',
            ru: 'В нём как можно больше модных слов',
            kk: 'Онда барынша көп сәнді сөз болуы',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'It avoids any direct request',
            ru: 'В нём нет прямого запроса',
            kk: 'Онда нақты сұрау мүлде болмауы',
          },
          correct: false,
        },
      ],
    },
  ],
  english: [
    {
      prompt: {
        en: 'What best shows practical strength in English at work?',
        ru: 'Что лучше всего показывает практическое владение английским в работе?',
        kk: 'Жұмыста ағылшын тілін практикалық түрде жақсы меңгеруді не көрсетеді?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Clear and simple wording that preserves the meaning',
            ru: 'Ясная и простая формулировка без потери смысла',
            kk: 'Мағынаны жоғалтпайтын анық және қарапайым тұжырым',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Using difficult words whenever possible',
            ru: 'Использовать сложные слова при любой возможности',
            kk: 'Мүмкін болған сайын қиын сөздерді қолдану',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Speaking quickly instead of accurately',
            ru: 'Говорить быстро вместо точности',
            kk: 'Дәлдіктің орнына жылдам сөйлеу',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Avoiding questions when something is unclear',
            ru: 'Не задавать вопросы, если что-то непонятно',
            kk: 'Бірнәрсе түсініксіз болса да сұрақ қоймау',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'If you do not know the exact word, what is the best move?',
        ru: 'Если ты не знаешь точное слово, какой шаг лучший?',
        kk: 'Нақты сөзді білмесең, ең дұрыс қадам қандай?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Rephrase the idea with simpler words',
            ru: 'Переформулировать мысль более простыми словами',
            kk: 'Ойды қарапайым сөздермен қайта жеткізу',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Stop the conversation immediately',
            ru: 'Сразу прекратить разговор',
            kk: 'Әңгімені бірден тоқтату',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Switch to random jargon',
            ru: 'Перейти на случайный жаргон',
            kk: 'Кездейсоқ жаргонға көшу',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Pretend you understood everything',
            ru: 'Сделать вид, что всё понял',
            kk: 'Бәрін түсінгендей көріну',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'How should you respond to an unclear message in English?',
        ru: 'Как лучше ответить на неясное сообщение на английском?',
        kk: 'Ағылшын тіліндегі түсініксіз хабарламаға қалай дұрыс жауап беру керек?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Ask a short clarifying question politely',
            ru: 'Вежливо задать короткий уточняющий вопрос',
            kk: 'Сыпайы түрде қысқа нақтылаушы сұрақ қою',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Ignore it and continue with assumptions',
            ru: 'Игнорировать и продолжать с догадками',
            kk: 'Елемей, болжаммен жалғастыру',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Answer with a much longer unrelated text',
            ru: 'Ответить гораздо более длинным несвязанным текстом',
            kk: 'Мүлде қатысы жоқ ұзын мәтінмен жауап беру',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Translate word by word without context',
            ru: 'Переводить слово в слово без контекста',
            kk: 'Контекстсіз сөзбе-сөз аудару',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'What makes written English more professional?',
        ru: 'Что делает письменный английский более профессиональным?',
        kk: 'Жазбаша ағылшын тілін не кәсіби етеді?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Short sentences, concrete verbs, and clear structure',
            ru: 'Короткие предложения, конкретные глаголы и ясная структура',
            kk: 'Қысқа сөйлемдер, нақты етістіктер және түсінікті құрылым',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Very long sentences with many side points',
            ru: 'Очень длинные предложения с множеством отступлений',
            kk: 'Көп ауытқуы бар өте ұзын сөйлемдер',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Heavy slang in every update',
            ru: 'Большое количество сленга в каждом апдейте',
            kk: 'Әр жаңартуда көп сленг қолдану',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Avoiding punctuation completely',
            ru: 'Полностью избегать пунктуации',
            kk: 'Тыныс белгілерін мүлде қолданбау',
          },
          correct: false,
        },
      ],
    },
    {
      prompt: {
        en: 'Before sending an English message, what should you check?',
        ru: 'Что стоит проверить перед отправкой сообщения на английском?',
        kk: 'Ағылшын тіліндегі хабарламаны жіберер алдында нені тексеру керек?',
      },
      options: [
        {
          id: 'a',
          label: {
            en: 'Meaning, tone, and key grammar that affects clarity',
            ru: 'Смысл, тон и ключевую грамматику, влияющую на ясность',
            kk: 'Мағына, тон және түсініктілікке әсер ететін негізгі грамматиканы',
          },
          correct: true,
        },
        {
          id: 'b',
          label: {
            en: 'Only whether it sounds complicated',
            ru: 'Только то, звучит ли оно сложно',
            kk: 'Тек күрделі естілетінін ғана',
          },
          correct: false,
        },
        {
          id: 'c',
          label: {
            en: 'Only whether every sentence is long',
            ru: 'Только то, что каждое предложение длинное',
            kk: 'Тек әр сөйлем ұзын екенін ғана',
          },
          correct: false,
        },
        {
          id: 'd',
          label: {
            en: 'Nothing if autocorrect is enabled',
            ru: 'Ничего, если включён autocorrect',
            kk: 'Autocorrect қосулы болса, ештеңені тексермеу',
          },
          correct: false,
        },
      ],
    },
  ],
};

export const buildSkillAssessment = (
  skill: string,
  locale: Locale,
): SkillAssessmentDefinition => {
  const normalizedSkill = skill.trim() || 'Skill';
  const kind = resolveAssessmentKind(normalizedSkill);
  const templates = questionTemplates[kind];

  return {
    skill: normalizedSkill,
    kind,
    title: interpolateSkill(assessmentTitles[kind][locale], normalizedSkill),
    version: assessmentVersion,
    passingScore: 4,
    questionCount: templates.length,
    questions: templates.map((template, index) => ({
      id: `${kind}-${index + 1}`,
      prompt: interpolateSkill(template.prompt[locale], normalizedSkill),
      correctOptionId:
        template.options.find((option) => option.correct)?.id || template.options[0].id,
      options: template.options.map((option) => ({
        id: option.id,
        label: interpolateSkill(option.label[locale], normalizedSkill),
      })),
    })),
  };
};
