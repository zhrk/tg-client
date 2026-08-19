import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions/Logger';
import config from '../config.json';
import { mkdirSync } from 'fs';
import path from 'path';
import { LogLevel } from 'telegram/extensions/Logger';
import { createInterface } from 'readline/promises';
import { NewMessage } from 'telegram/events';

const rl = createInterface({ input: process.stdin, output: process.stdout });

(async () => {
  const client = new TelegramClient(new StringSession(config.session), config.id, config.hash, {
    proxy: { ip: '127.0.0.1', port: 12334, socksType: 5 },
    // baseLogger: new Logger(LogLevel.NONE),
  });

  await client.start({
    phoneNumber: async () => await rl.question('phone number: '),
    password: async () => await rl.question('password: '),
    phoneCode: async () => await rl.question('phone code: '),
    onError: (error) => console.log(error),
  });

  const dialogs = await client.getDialogs();

  const noForwardsDialogs = dialogs.filter((dialog) => {
    const entity = dialog.entity;

    if (!entity) return false;
    if (entity instanceof Api.Channel) return entity.noforwards === true;
    if (entity instanceof Api.Chat) return entity.noforwards === true;

    return false;
  });

  const chats = noForwardsDialogs.map((item) => item.id?.toString() || '');

  const outputDir = path.join(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });

  client.addEventHandler(async (event) => {
    const message = event.message;

    if (message.media) {
      let userId = 'unknown';

      if (message.peerId) {
        if ('userId' in message.peerId) {
          userId = message.peerId.userId.toString();
        } else if ('channelId' in message.peerId) {
          userId = message.peerId.channelId.toString();
        } else if ('chatId' in message.peerId) {
          userId = message.peerId.chatId.toString();
        }
      }

      const mappedId = Object.entries(config.ids)
        .find(([id]) => id === userId)
        ?.at(1);

      const folder = mappedId || userId;

      const userDir = path.join(outputDir, folder);
      mkdirSync(userDir, { recursive: true });

      try {
        await client.downloadMedia(message.media, { outputFile: userDir });

        if (!mappedId) {
          console.log(`${message.id} -> ${folder}`);
        }
      } catch (error) {
        console.error(`[Media][${message.id}]:`, error);
      }
    }
  }, new NewMessage({ chats }));
})();
