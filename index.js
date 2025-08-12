import { Bot, InlineKeyboard, Keyboard, session } from "grammy";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.BOT_TOKEN; // Telegram BotFather // NEW 
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // DeepSeek API

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");

const bot = new Bot(BOT_TOKEN);

function initialSession() {
  return { lang: null, currency: null };
}
bot.use(session({ initial: initialSession }));

// --- Сообщения на разных языках ---
const messages = {
  ru: "Здравствуйте! Я ваш бот по финансовой грамотности с фокусом на Казахстан. Задайте вопрос о личных финансах, вкладах, инвестициях, налогах, кредитах и банковских услугах.",
  en: "Hello! I am your financial literacy bot focused on Kazakhstan. Ask about personal finance, deposits, investments, taxes, loans, and banking services.",
  kz: "Сәлеметсіз бе! Мен Қазақстанға бағытталған қаржылық сауаттылық ботымын. Жеке қаржы, депозиттер, инвестициялар, салықтар, несиелер және банктік қызметтер туралы сұраңыз.",
};

const waitMessages = {
  ru: "Подождите, идет обработка запроса...",
  en: "Please wait, processing your request...",
  kz: "Күте тұрыңыз, сұрауыңыз өңделуде...",
};

// --- UI ярлыки ---
const ui = {
  ru: {
    chooseLang: "Выберите язык / Choose a language / Тілді таңдаңыз:",
    chooseCurrency: "Выберите валюту:",
    setCurrencyOk: (c) =>
      `Валюта установлена: ${c}. Можете задать вопрос или выбрать действие ниже.`,
    main: "На главную",
    popular: "Популярные вопросы",
    changeLang: "Сменить язык",
    changeCurrency: "Выбрать валюту",
    askPopular: "Выберите один из популярных вопросов:",
    menuHint: "Вы можете использовать кнопки ниже для быстрого доступа.",
  },
  en: {
    chooseLang: "Choose a language:",
    chooseCurrency: "Choose a currency:",
    setCurrencyOk: (c) =>
      `Currency set: ${c}. You can ask a question or use the menu below.`,
    main: "Home",
    popular: "Popular questions",
    changeLang: "Change language",
    changeCurrency: "Choose currency",
    askPopular: "Pick one of the popular questions:",
    menuHint: "Use the buttons below for quick access.",
  },
  kz: {
    chooseLang: "Тілді таңдаңыз:",
    chooseCurrency: "Валютаны таңдаңыз:",
    setCurrencyOk: (c) =>
      `Валюта орнатылды: ${c}. Сұрақ қойыңыз немесе төмендегі мәзірді қолданыңыз.`,
    main: "Басты бет",
    popular: "Танымал сұрақтар",
    changeLang: "Тілді өзгерту",
    changeCurrency: "Валютаны таңдау",
    askPopular: "Танымал сұрақтардың бірін таңдаңыз:",
    menuHint: "Жылдам әрекет үшін төмендегі түймелерді қолданыңыз.",
  },
};

// --- Популярные вопросы с эмодзи ---
const popularQuestions = {
  ru: [
    "🏦 Какой банк Казахстана предлагает лучшие депозиты сейчас?",
    "💱 Как выгодно обменять валюту и какие комиссии обычно берут?",
    "📈 С чего начать инвестировать на KASE и что такое брокерский счет?",
    "💳 Как выбрать кредитную карту в Казахстане и на что смотреть?",
    "🧾 Как рассчитать налоги (ИПН/СО/ОПВ) для самозанятых и ИП?",
    "💰 Как эффективно вести семейный бюджет и копить в тенге?",
  ],
  en: [
    "🏦 Which bank in Kazakhstan offers the best deposits now?",
    "💱 How to exchange currency with low fees in Kazakhstan?",
    "📈 How to start investing on KASE and open a brokerage account?",
    "💳 How to choose a credit card in Kazakhstan?",
    "🧾 How to estimate taxes for self-employed/IE in Kazakhstan?",
    "💰 How to manage a family budget and save in KZT?",
  ],
  kz: [
    "🏦 Қазір қай қазақстандық банкте ең тиімді депозиттер бар?",
    "💱 Валютаны тиімді қалай айырбастауға болады және комиссиялар қандай?",
    "📈 KASE-де инвестицияны қалай бастауға болады және брокерлік шот деген не?",
    "💳 Қазақстанда кредиттік картаны қалай таңдау керек?",
    "🧾 Өзін-өзі жұмыспен қамтығандар/ЖК үшін салықты қалай есептеуге болады?",
    "💰 Отбасылық бюджетті қалай тиімді жүргізіп, теңгеде жинауға болады?",
  ],
};

// --- Кнопка выбора языка ---

// --- Кнопка выбора языка ---
const langKeyboard = new InlineKeyboard()
  .text("Русский", "lang_ru")
  .row()
  .text("English", "lang_en")
  .row()
  .text("Қазақша", "lang_kz");

// --- Кнопки выбора валюты ---
const currencyKeyboard = new InlineKeyboard()
  .text("₸ KZT", "cur_kzt")
  .text("$ USD", "cur_usd")
  .row()
  .text("€ EUR", "cur_eur")
  .text("₽ RUB", "cur_rub");

function getCurrencyCodeFromCallback(data) {
  if (data === "cur_kzt") return "KZT";
  if (data === "cur_usd") return "USD";
  if (data === "cur_eur") return "EUR";
  if (data === "cur_rub") return "RUB";
  return "KZT";
}

// --- Главное меню (reply keyboard) ---
function getMainMenuKeyboard(lang) {
  const t = ui[lang] || ui.ru;
  return new Keyboard()
    .text(t.main)
    .text(t.popular)
    .row()
    .text(t.changeLang)
    .text(t.changeCurrency)
    .resized();
}

async function sendMainMenu(ctx) {
  const lang = ctx.session.lang || "ru";
  await ctx.reply(messages[lang], { reply_markup: getMainMenuKeyboard(lang) });
  const hint = ui[lang]?.menuHint || ui.ru.menuHint;
  await ctx.reply(hint);
}

async function sendPopularQuestions(ctx) {
  const lang = ctx.session.lang || "ru";
  const list = popularQuestions[lang] || popularQuestions.ru;
  const kb = new InlineKeyboard();
  list.forEach((q, idx) => {
    kb.text(q, `faq_${idx}`).row();
  });
  const label = ui[lang]?.askPopular || ui.ru.askPopular;
  await ctx.reply(label, { reply_markup: kb });
}

// --- Команда /start ---
bot.command("start", async (ctx) => {
  const lang = ctx.session.lang || "ru";
  await ctx.reply(ui[lang]?.chooseLang || ui.ru.chooseLang, {
    reply_markup: langKeyboard,
  });
});

// --- Обработка выбора языка ---
bot.callbackQuery(/^lang_(ru|en|kz)$/i, async (ctx) => {
  const lang = ctx.match[1];
  ctx.session.lang = lang;
  await ctx.answerCallbackQuery();
  await ctx.reply(messages[lang], { reply_markup: getMainMenuKeyboard(lang) });
  await ctx.reply(ui[lang]?.chooseCurrency || ui.ru.chooseCurrency, {
    reply_markup: currencyKeyboard,
  });
});

// --- Обработка выбора валюты ---
bot.callbackQuery(/^cur_(kzt|usd|eur|rub)$/i, async (ctx) => {
  const data = ctx.match[0];
  const code =
    data === "cur_kzt"
      ? "KZT"
      : data === "cur_usd"
      ? "USD"
      : data === "cur_eur"
      ? "EUR"
      : "RUB";
  const lang = ctx.session.lang || "ru";
  ctx.session.currency = code;
  await ctx.answerCallbackQuery();
  const ok = (ui[lang]?.setCurrencyOk || ui.ru.setCurrencyOk)(code);
  await ctx.reply(ok, { reply_markup: getMainMenuKeyboard(lang) });
});

// --- DeepSeek Prompt ---
function buildDeepSeekPrompt(question, lang, currency) {
  const languageName =
    lang === "ru" ? "Russian" : lang === "kz" ? "Kazakh" : "English";
  const countryContext = "Kazakhstan";
  const selectedCurrency = currency || "KZT";
  return (
    `You are a professional financial literacy assistant focused on ${countryContext}. ` +
    `Primary language for responses: ${languageName}. If user asks in another language, still respond in ${languageName}. ` +
    `Assume prices, salaries, taxes, and rates are in ${selectedCurrency} unless the user specifies otherwise. ` +
    `Prioritize relevance to Kazakhstan: banks (e.g., Halyk Bank, Kaspi, Jusan, Freedom), KASE, NBK/ARDFM regulations, cards, deposits, loans, transfers, taxes (IPN, OPV, SO), and local fintech. ` +
    `If a question is not about finance/economics/investing/budgeting, politely refuse in ${languageName} saying you only answer finance-related questions. ` +
    `If the answer depends on the latest events or rates, clearly mention date assumptions and suggest checking official sources (NBK, KASE, banks). ` +
    `Be concise, structured, and practical. Use bullet points when helpful. ` +
    `User question: ${question}`
  );
}

async function answerQuestion(ctx, question) {
  const lang = ctx.session.lang || "ru";
  const currency = ctx.session.currency || "KZT";
  await ctx.reply(waitMessages[lang]);
  try {
    const prompt = buildDeepSeekPrompt(question, lang, currency);
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful financial assistant focused on Kazakhstan. Provide accurate, practical, and safe advice.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      await ctx.reply(data.choices[0].message.content);
    } else {
      await ctx.reply(
        lang === "ru"
          ? "Ошибка при получении ответа."
          : lang === "kz"
          ? "Жауап алу кезінде қате."
          : "Error retrieving the answer."
      );
    }
  } catch (err) {
    console.error(err);
    const lang = ctx.session.lang || "ru";
    await ctx.reply(
      lang === "ru"
        ? "Произошла ошибка."
        : lang === "kz"
        ? "Қате пайда болды."
        : "An error occurred."
    );
  }
}

// --- Обработка входящих сообщений ---
bot.on("message:text", async (ctx) => {
  const lang = ctx.session.lang || "ru";
  const text = ctx.message.text.trim();

  const t = ui[lang] || ui.ru;
  if (text === t.main) {
    return sendMainMenu(ctx);
  }
  if (text === t.popular) {
    return sendPopularQuestions(ctx);
  }
  if (text === t.changeLang) {
    return ctx.reply(ui[lang]?.chooseLang || ui.ru.chooseLang, {
      reply_markup: langKeyboard,
    });
  }
  if (text === t.changeCurrency) {
    return ctx.reply(ui[lang]?.chooseCurrency || ui.ru.chooseCurrency, {
      reply_markup: currencyKeyboard,
    });
  }

  return answerQuestion(ctx, text);
});

// Выбор популярного вопроса (callback)
bot.callbackQuery(/^faq_(\d+)$/i, async (ctx) => {
  const lang = ctx.session.lang || "ru";
  const list = popularQuestions[lang] || popularQuestions.ru;
  const idx = Number(ctx.match[1]);
  const question = list[idx];
  await ctx.answerCallbackQuery();
  if (question) {
    await answerQuestion(ctx, question);
  }
});

// --- Vercel ---
let isBotInited = false;

export default async function handler(req, res) {
  if (!isBotInited) {
    await bot.init();
    isBotInited = true;
  }

  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (err) {
      console.error(err);
      return res.status(500).send("Error");
    }
  }

  return res.status(200).send("Bot is running");
}
