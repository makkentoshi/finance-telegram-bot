import { Bot, InlineKeyboard, session } from "grammy";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.BOT_TOKEN; // Telegram BotFather
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // DeepSeek API

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");

const bot = new Bot(BOT_TOKEN);

function initialSession() {
  return { lang: null };
}
bot.use(session({ initial: initialSession }));

// --- Сообщения на разных языках ---
const messages = {
  ru: "Здравствуйте! Я ваш бот по финансовой грамотности. Задайте мне вопрос.",
  en: "Hello! I am your financial literacy bot. Please ask me a question.",
  kz: "Сәлеметсіз бе! Мен сіздің қаржылық сауаттылық ботыңызбын. Сұрақ қойыңыз."
};

const waitMessages = {
  ru: "Подождите, идет обработка запроса...",
  en: "Please wait, processing your request...",
  kz: "Күте тұрыңыз, сұрауыңыз өңделуде..."
};

// --- Кнопка выбора языка ---
const langKeyboard = new InlineKeyboard()
  .text("Русский", "lang_ru").row()
  .text("English", "lang_en").row()
  .text("Қазақша", "lang_kz");

// --- Команда /start ---
bot.command("start", async (ctx) => {
  await ctx.reply("Выберите язык / Choose a language / Тілді таңдаңыз:", {
    reply_markup: langKeyboard
  });
});

// --- Обработка выбора языка ---
bot.callbackQuery(/^lang_(ru|en|kz)$/i, async (ctx) => {
  const lang = ctx.match[1];
  ctx.session.lang = lang;
  await ctx.answerCallbackQuery();
  await ctx.reply(messages[lang]);
});

// --- DeepSeek Prompt ---
function buildDeepSeekPrompt(question, lang) {
  return `You are a professional financial literacy assistant. Answer ONLY if the question is related to finance, economics, investments, personal budgeting, or money management. If the question is unrelated, politely respond in ${lang} that you can only answer financial questions. Question: ${question}`;
}

// --- Обработка входящих сообщений ---
bot.on("message:text", async (ctx) => {
  const lang = ctx.session.lang || "ru";
  const question = ctx.message.text.trim();

  await ctx.reply(waitMessages[lang]);

  try {
    const prompt = buildDeepSeekPrompt(question, lang);

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful AI assistant for financial literacy." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

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
    await ctx.reply(
      lang === "ru"
        ? "Произошла ошибка."
        : lang === "kz"
        ? "Қате пайда болды."
        : "An error occurred."
    );
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
