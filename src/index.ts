import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions/Logger';
import config from '../config.json';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { LogLevel } from 'telegram/extensions/Logger';
import { createInterface } from 'readline/promises';
import { NewMessage } from 'telegram/events';

const chats = Object.values(config.channels_ids);

const rl = createInterface({ input: process.stdin, output: process.stdout });

(async () => {
  const client = new TelegramClient(new StringSession(config.session), config.id, config.hash, {
    proxy: { ip: '127.0.0.1', port: 12334, socksType: 5 },
    baseLogger: new Logger(LogLevel.NONE),
  });

  await client.start({
    phoneNumber: async () => await rl.question('phone number: '),
    password: async () => await rl.question('password: '),
    phoneCode: async () => await rl.question('phone code: '),
    onError: (error) => console.log(error),
  });

  mkdirSync(path.join(process.cwd(), 'output'), { recursive: true });

  client.addEventHandler(async (event) => {
    writeFileSync(
      path.join(process.cwd(), 'output', `${new Date().getTime()}.json`),
      JSON.stringify(event.message, null, 2)
    );
  }, new NewMessage({ chats }));
})();
