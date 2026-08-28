import { Api, TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import config from '../config.json';
import { mkdirSync } from 'fs';
import path from 'path';
import { createInterface } from 'readline/promises';
import { NewMessage, NewMessageEvent } from 'teleproto/events';
import { Logger } from './logger';
import sanitize from 'sanitize-filename';

const cwd = process.cwd();
const outputDir = path.join(cwd, 'output');

mkdirSync(outputDir, { recursive: true });

const askInput = async (prompt: string) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
};

(async () => {
  const logger = new Logger();

  const client = new TelegramClient(new StringSession(config.session), config.id, config.hash, {
    proxy: { ip: '127.0.0.1', port: 12334, socksType: 5 },
    baseLogger: logger,
  });

  await client.start({
    phoneNumber: async () => await askInput('phone number: '),
    password: async () => await askInput('password: '),
    phoneCode: async () => await askInput('phone code: '),
    onError: (error) => console.log(error),
  });

  let chats: Record<string, string> = {};
  let eventType: NewMessage | null = null;

  const getChats = async () => {
    const dialogs = await client.getDialogs();

    return dialogs.reduce<Record<string, string>>((acc, dialog) => {
      const entity = dialog.entity;

      if (
        (entity instanceof Api.Channel || entity instanceof Api.Chat) &&
        entity.noforwards === true
      ) {
        acc[entity.id.toString()] = entity.title;
      }

      return acc;
    }, {});
  };

  const handler = async (event: NewMessageEvent) => {
    const message = event.message;

    if (
      message.media &&
      !(
        message.media instanceof Api.MessageMediaPoll ||
        message.media instanceof Api.MessageMediaWebPage
      )
    ) {
      let entityId = 'unknown';

      if (message.peerId) {
        if ('channelId' in message.peerId) {
          entityId = message.peerId.channelId.toString();
        } else if ('chatId' in message.peerId) {
          entityId = message.peerId.chatId.toString();
        } else if ('userId' in message.peerId) {
          entityId = message.peerId.userId.toString();
        }
      }

      const folder = sanitize(chats[entityId] || entityId);

      const userDir = path.join(outputDir, folder);
      mkdirSync(userDir, { recursive: true });

      try {
        await client.downloadMedia(message, { outputFile: userDir });
      } catch (error) {
        console.error(`[Media][${folder}]:`, error);
      }
    }
  };

  const refreshSubscriptions = async (type: 'init' | 'reconnect' | 'update') => {
    if (eventType) {
      client.removeEventHandler(handler, eventType);
    }

    chats = await getChats();

    const chatIds = Object.keys(chats);

    eventType = new NewMessage({ chats: chatIds });

    client.addEventHandler(handler, eventType);

    const emoji: Record<typeof type, string> = {
      init: '✅',
      reconnect: '🔄',
      update: '🔔',
    };

    console.log(`${emoji[type]} [${type}] ${chatIds.length} chats`);
  };

  await refreshSubscriptions('init');

  logger.events.on('reconnect', () => refreshSubscriptions('reconnect'));

  client.addEventHandler((event) => {
    if (event instanceof Api.UpdateChannel || event instanceof Api.UpdateChat) {
      refreshSubscriptions('update');
    }
  });
})();
