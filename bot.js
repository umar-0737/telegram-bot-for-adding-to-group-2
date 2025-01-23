
const { Telegraf } = require('telegraf');
const express = require('express');

const BOT_TOKEN = '7756432870:AAFKIuwvjZ9koygjGKI_3yyBHitl0b5TyB8'; // Укажите ваш токен
const WEBHOOK_URL = 'https://telegram-bot-for-adding-to-group-2.onrender.com'; // Укажите домен вашего приложения

const bot = new Telegraf(BOT_TOKEN);

// Массив с именами каналов
const requiredChannels = ['@kakmigovorili'];

// Функция для проверки подписки
async function isUserSubscribedToAnyChannel(ctx, userId) {
  for (const channel of requiredChannels) {
    try {
      const member = await ctx.telegram.getChatMember(channel, userId);
      if (['member', 'administrator', 'creator'].includes(member.status)) {
        return true; // Пользователь подписан хотя бы на один канал
      }
    } catch (error) {
      console.error(`Ошибка проверки подписки на канал ${channel}:`, error);
    }
  }
  return false; // Пользователь не подписан ни на один канал
}

// Обработка добавления бота в группу
bot.on('my_chat_member', async (ctx) => {
  try {
    const { new_chat_member, chat } = ctx.myChatMember;

    if (new_chat_member.user.id === ctx.botInfo.id && new_chat_member.status === 'member') {
      // Бот добавлен без прав администратора
      await ctx.telegram.sendMessage(
        chat.id,
        'Привет! Чтобы я мог полноценно работать, дайте мне права администратора.',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Как дать права администратора?',
                  url: 'https://telegram.org/blog/admin-rights',
                },
              ],
            ],
          },
        }
      );
    } else if (new_chat_member.status === 'administrator') {
      // Бот добавлен с правами администратора
      await ctx.telegram.sendMessage(chat.id, 'Спасибо за добавление! Теперь я готов к работе!');
    }
  } catch (error) {
    console.error('Ошибка при обработке события my_chat_member:', error);
  }
});

// Обработка сообщений в группе
bot.on('message', async (ctx) => {
  try {
    const { chat, from, message_id } = ctx.message;

    // Проверяем, если это группа
    if (chat.type === 'supergroup' || chat.type === 'group') {
      // Проверяем подписку пользователя
      const subscribed = await isUserSubscribedToAnyChannel(ctx, from.id);

      if (!subscribed) {
        // Удаляем сообщение пользователя
        await ctx.deleteMessage(message_id);

        // Сообщение с кнопками для подписки на все каналы
        const buttons = requiredChannels.map((channel) => [
          {
            text: `Подписаться на ${channel}`,
            url: `https://t.me/${channel.replace('@', '')}`,
          },
        ]);

        await ctx.telegram.sendMessage(
          chat.id,
          `Привет, ${from.first_name}! Для того чтобы писать сообщения в этой группе, подпишись хотя бы на один из следующих каналов:`,
          {
            reply_markup: {
              inline_keyboard: buttons,
            },
          }
        );
      }
    }
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
  }
});

// Настройка Express для вебхуков
const app = express();

// Настройка пути вебхука
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));

// Установите вебхук
bot.telegram.setWebhook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);

// Запуск Express-сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
