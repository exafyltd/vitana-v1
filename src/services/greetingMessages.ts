import { AutopilotAction } from '@/types/autopilot';

export type GreetingMessageType = 
  | 'welcome'
  | 'reminder'
  | 'motivation'
  | 'recommendation'
  | 'inspiration'
  | 'celebration'
  | 'ai_generated';

export interface GreetingContext {
  firstName?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  pendingActions?: AutopilotAction[];
  upcomingAppointments?: Array<{ title: string; time: string }>;
  healthScoreChange?: number;
  achievements?: string[];
  language?: string;
  suppressName?: boolean;
}

export interface GreetingMessage {
  text: string;
  type: GreetingMessageType;
  priority: 'high' | 'medium' | 'low';
}

const getTimeGreeting = (timeOfDay: string, language: string = 'en-US'): string => {
  const greetings: Record<string, Record<string, string>> = {
    'en-US': {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      default: 'Hello'
    },
    'de-DE': {
      morning: 'Guten Morgen',
      afternoon: 'Guten Tag',
      evening: 'Guten Abend',
      default: 'Hallo'
    },
    'sr-RS': {
      morning: 'Dobro jutro',
      afternoon: 'Dobar dan',
      evening: 'Dobro veče',
      default: 'Zdravo'
    },
    'es-ES': {
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches',
      default: 'Hola'
    },
    'ar-XA': {
      morning: 'صباح الخير',
      afternoon: 'مساء الخير',
      evening: 'مساء الخير',
      default: 'مرحبا'
    },
    'ru-RU': {
      morning: 'Доброе утро',
      afternoon: 'Добрый день',
      evening: 'Добрый вечер',
      default: 'Привет'
    },
    'zh-CN': {
      morning: '早上好',
      afternoon: '下午好',
      evening: '晚上好',
      default: '你好'
    },
    'fr-FR': {
      morning: 'Bonjour',
      afternoon: 'Bon après-midi',
      evening: 'Bonsoir',
      default: 'Bonjour'
    },
    'pt-BR': {
      morning: 'Bom dia',
      afternoon: 'Boa tarde',
      evening: 'Boa noite',
      default: 'Olá'
    }
  };

  const langGreetings = greetings[language] || greetings['en-US'];
  return langGreetings[timeOfDay] || langGreetings.default;
};

const getLocalizedText = (key: string, language: string = 'en-US', params?: Record<string, any>): string => {
  const texts: Record<string, Record<string, string>> = {
    'en-US': {
      appointment: `Don't forget your {title} at {time}.`,
      actions: `You have {count} health action{s} ready in your Autopilot.`,
      scoreImproved: `Your Vitana score improved by {change} points since your last visit.`,
      milestone: `Congratulations on reaching a new milestone: {achievement}.`,
      welcome: `Welcome to Vitana.`,
      action: 'action',
      actions_plural: 'actions'
    },
    'de-DE': {
      appointment: `Vergiss nicht deinen {title} um {time}.`,
      actions: `Du hast {count} Gesundheits-Aktion{s} in deinem Autopilot bereit.`,
      scoreImproved: `Dein Vitana-Score ist seit deinem letzten Besuch um {change} Punkte gestiegen.`,
      milestone: `Glückwunsch zum Erreichen eines neuen Meilensteins: {achievement}.`,
      welcome: `Willkommen bei Vitana.`,
      action: '',
      actions_plural: 'en'
    },
    'sr-RS': {
      appointment: `Ne zaboravi {title} u {time}.`,
      actions: `Imaš {count} zdravstvenu akciju{s} spremnu u svom Autopilotu.`,
      scoreImproved: `Tvoj Vitana rezultat se poboljšao za {change} poena od tvoje poslednje posete.`,
      milestone: `Čestitamo na postizanju nove prekretnice: {achievement}.`,
      welcome: `Dobrodošli u Vitana.`,
      action: '',
      actions_plural: 'e'
    },
    'es-ES': {
      appointment: `No olvides tu {title} a las {time}.`,
      actions: `Tienes {count} acción{s} de salud lista{s} en tu Autopiloto.`,
      scoreImproved: `Tu puntuación Vitana mejoró en {change} puntos desde tu última visita.`,
      milestone: `¡Felicitaciones por alcanzar un nuevo hito: {achievement}.`,
      welcome: `Bienvenido a Vitana.`,
      action: '',
      actions_plural: 'es'
    },
    'ar-XA': {
      appointment: `لا تنسى {title} الساعة {time}.`,
      actions: `لديك {count} إجراء صحي جاهز في الطيار الآلي الخاص بك.`,
      scoreImproved: `تحسنت نتيجة Vitana الخاصة بك بمقدار {change} نقطة منذ زيارتك الأخيرة.`,
      milestone: `تهانينا على الوصول إلى معلم جديد: {achievement}.`,
      welcome: `مرحبا بك في Vitana.`,
      action: '',
      actions_plural: 'ات'
    },
    'ru-RU': {
      appointment: `Не забудьте о {title} в {time}.`,
      actions: `У вас {count} действи{s} по здоровью готово в вашем Автопилоте.`,
      scoreImproved: `Ваш показатель Vitana улучшился на {change} баллов с момента вашего последнего визита.`,
      milestone: `Поздравляем с достижением новой вехи: {achievement}.`,
      welcome: `Добро пожаловать в Vitana.`,
      action: 'е',
      actions_plural: 'й'
    },
    'zh-CN': {
      appointment: `别忘了您的 {title} 在 {time}。`,
      actions: `您的自动驾驶中有 {count} 个健康操作准备就绪。`,
      scoreImproved: `自您上次访问以来，您的 Vitana 分数提高了 {change} 分。`,
      milestone: `恭喜您达到新的里程碑：{achievement}。`,
      welcome: `欢迎来到 Vitana。`,
      action: '个',
      actions_plural: '个'
    },
    'fr-FR': {
      appointment: `N'oublie pas ton {title} à {time}.`,
      actions: `Tu as {count} action{s} de santé prête{s} dans ton Autopilot.`,
      scoreImproved: `Ton score Vitana s'est amélioré de {change} points depuis ta dernière visite.`,
      milestone: `Félicitations pour avoir atteint un nouveau jalon: {achievement}.`,
      welcome: `Bienvenue chez Vitana.`,
      action: '',
      actions_plural: 's'
    },
    // pt-BR (VTID-03577). Was European tu-form: "Não te esqueças do teu",
    // "Tens", "A tua". Brazilian uses você agreement and proclisis.
    'pt-BR': {
      appointment: `Não se esqueça do seu {title} às {time}.`,
      actions: `Você tem {count} ação{s} de saúde pronta{s} no seu Autopilot.`,
      scoreImproved: `Sua pontuação Vitana melhorou {change} pontos desde a sua última visita.`,
      milestone: `Parabéns por atingir um novo marco: {achievement}.`,
      welcome: `Bem-vindo ao Vitana.`,
      action: '',
      actions_plural: 's'
    }
  };

  const langTexts = texts[language] || texts['en-US'];
  let text = langTexts[key] || texts['en-US'][key] || '';
  
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, String(value));
    });
  }
  
  return text;
};

export const generateGreetingMessage = (context: GreetingContext): GreetingMessage => {
  const { firstName, timeOfDay, pendingActions, upcomingAppointments, healthScoreChange, achievements, language = 'en-US', suppressName } = context;
  const name = firstName || '';
  const namePart = suppressName ? '' : (name ? ' ' + name : '');
  const timeGreeting = getTimeGreeting(timeOfDay, language);

  console.log('🎭 Greeting generation - language:', language, 'firstName:', firstName, 'suppressName:', suppressName);
  console.log('🔤 Language check - startsWith sr?', language.startsWith('sr'), 'startsWith en?', language.startsWith('en'));

  // Priority 1: Urgent appointments (within 24h)
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    const apt = upcomingAppointments[0];
    const appointmentText = getLocalizedText('appointment', language, { title: apt.title, time: apt.time });
    return {
      text: `${timeGreeting}${namePart}. ${appointmentText}`,
      type: 'reminder',
      priority: 'high'
    };
  }

  // Priority 2: Pending autopilot actions
  if (pendingActions && pendingActions.length > 0) {
    const count = pendingActions.length;
    const actionSuffix = count === 1 ? getLocalizedText('action', language) : getLocalizedText('actions_plural', language);
    const actionsText = getLocalizedText('actions', language, { count, s: actionSuffix });
    return {
      text: `${timeGreeting}${namePart}! ${actionsText}`,
      type: 'reminder',
      priority: 'medium'
    };
  }

  // Priority 3: Health score improvements (motivation)
  if (healthScoreChange && healthScoreChange > 0) {
    const scoreText = getLocalizedText('scoreImproved', language, { change: healthScoreChange });
    return {
      text: `${timeGreeting}${namePart}! ${scoreText}`,
      type: 'motivation',
      priority: 'medium'
    };
  }

  // Priority 4: Achievements (celebration)
  if (achievements && achievements.length > 0) {
    const milestoneText = getLocalizedText('milestone', language, { achievement: achievements[0] });
    return {
      text: `${timeGreeting}${namePart}! ${milestoneText}`,
      type: 'celebration',
      priority: 'medium'
    };
  }

  // Default: Personalized welcome variants (language-specific)
  if (language.startsWith('en')) {
    const variants = [
      'Welcome back {name},',
      'Hi {name}, what can I do for you?',
      "I'm always here {name}, just let me know what I can do for you",
      "Let's make today a special day {name}"
    ];
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    const text = suppressName ? chosen.replace(/\s?\{name\}[,]?/g, '') : chosen.replace('{name}', name);
    console.log('✅ Generated English greeting:', text);
    return { text, type: 'welcome', priority: 'low' };
  }

  if (language.startsWith('de')) {
    const variants = [
      'Willkommen zurück {name},',
      'Hallo {name}, was kann ich für dich tun?',
      'Ich bin immer für dich da {name}, sag mir einfach, wie ich helfen kann',
      'Lass uns heute zu einem besonderen Tag machen {name}'
    ];
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    const text = suppressName ? chosen.replace(/\s?\{name\}[,]?/g, '') : chosen.replace('{name}', name);
    console.log('✅ Generated German greeting:', text);
    return { text, type: 'welcome', priority: 'low' };
  }

  if (language.startsWith('fr')) {
    const variants = [
      'Bon retour {name},',
      'Bonjour {name}, que puis-je faire pour toi?',
      'Je suis toujours là {name}, dis-moi comment je peux t\'aider',
      'Faisons de cette journée une journée spéciale {name}'
    ];
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    const text = suppressName ? chosen.replace(/\s?\{name\}[,]?/g, '') : chosen.replace('{name}', name);
    console.log('✅ Generated French greeting:', text);
    return { text, type: 'welcome', priority: 'low' };
  }

  if (language.startsWith('pt')) {
    const variants = [
      'Bem-vindo de volta {name},',
      'Olá {name}, o que posso fazer por ti?',
      'Estou sempre aqui {name}, diz-me como posso ajudar',
      'Vamos fazer hoje um dia especial {name}'
    ];
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    const text = suppressName ? chosen.replace(/\s?\{name\}[,]?/g, '') : chosen.replace('{name}', name);
    console.log('✅ Generated Portuguese greeting:', text);
    return { text, type: 'welcome', priority: 'low' };
  }

  if (language.startsWith('sr')) {
    const variants = [
      'Dobrodošli nazad {name},',
      'Zdravo {name}, šta mogu za tebe da uradim?',
      'Uvek sam tu {name}, reci kako mogu da pomognem',
      'Hajde da danas bude poseban dan {name}',
      'Šta mogu za tebe da uradim {name}?'
    ];
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    const text = suppressName ? chosen.replace(/\s?\{name\}[,]?/g, '') : chosen.replace('{name}', name);
    console.log('✅ Generated Serbian greeting:', text);
    return { text, type: 'welcome', priority: 'low' };
  }

  // Fallback: localized welcome with time greeting
  const welcomeText = getLocalizedText('welcome', language);
  const fallbackText = `${timeGreeting}${namePart}! ${welcomeText}`;
  console.log('⚠️ Using fallback greeting for language:', language, '- text:', fallbackText);
  return {
    text: fallbackText,
    type: 'welcome',
    priority: 'low'
  };
};

export const getInspirationalMessage = (timeOfDay: string): string => {
  const messages = {
    morning: [
      "Every morning is a fresh start. Make today count!",
      "Rise and shine! Your health journey continues today.",
      "A healthy morning routine sets the tone for the entire day."
    ],
    afternoon: [
      "Keep your momentum going! Small steps lead to big changes.",
      "Remember to stay hydrated and take short breaks.",
      "You're halfway through the day. Keep up the great work!"
    ],
    evening: [
      "Wind down and reflect on today's achievements.",
      "Good evening! Time to relax and recharge for tomorrow.",
      "Evening is the perfect time to plan for a healthy tomorrow."
    ],
    night: [
      "Good rest is essential for good health. Sleep well!",
      "Quality sleep is the foundation of wellness.",
      "Time to recharge. Tomorrow is another opportunity."
    ]
  };

  const timeMessages = messages[timeOfDay as keyof typeof messages] || messages.morning;
  return timeMessages[Math.floor(Math.random() * timeMessages.length)];
};
