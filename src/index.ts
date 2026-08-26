import { Api, TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import config from '../config.json';
import { mkdirSync } from 'fs';
import path from 'path';
import { createInterface } from 'readline/promises';
import { NewMessage } from 'teleproto/events';
import { Logger } from './logger';
import sanitize from 'sanitize-filename';

const cwd = process.cwd();
const outputDir = path.join(cwd, 'output');

const askInput = async (prompt: string) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
};

(async () => {
  const client = new TelegramClient(new StringSession(config.session), config.id, config.hash, {
    proxy: { ip: '127.0.0.1', port: 12334, socksType: 5 },
    baseLogger: new Logger(),
  });

  await client.start({
    phoneNumber: async () => await askInput('phone number: '),
    password: async () => await askInput('password: '),
    phoneCode: async () => await askInput('phone code: '),
    onError: (error) => console.log(error),
  });

  const dialogs = await client.getDialogs();

  const chats = dialogs.reduce<Record<string, string>>((acc, dialog) => {
    const entity = dialog.entity;

    if (
      (entity instanceof Api.Channel || entity instanceof Api.Chat) &&
      entity.noforwards === true
    ) {
      acc[entity.id.toString()] = entity.title;
    }

    return acc;
  }, {});

  mkdirSync(outputDir, { recursive: true });

  client.addEventHandler(
    async (event) => {
      const message = event.message;

      if (message.media && !(message.media instanceof Api.MessageMediaWebPage)) {
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
          await client.downloadMedia(message.media, { outputFile: userDir });
        } catch (error) {
          console.error(`[Media][${folder}]:`, error);
        }
      }
    },
    new NewMessage({ chats: Object.keys(chats) })
  );
})();
