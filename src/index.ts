import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions/Logger';
import config from '../config.json';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { LogLevel } from 'telegram/extensions/Logger';
import { createInterface } from 'readline/promises';
import { UpdateConnectionState } from 'telegram/network';

const rl = createInterface({ input: process.stdin, output: process.stdout });

const ids = Object.values(config.from).map((item) => BigInt(item));

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
    if (event instanceof UpdateConnectionState) return;

    if (ids.includes(event.message.fromId.channelId.value))
      writeFileSync(
        path.join(process.cwd(), 'output', `${new Date().getTime()}.json`),
        JSON.stringify(event, null, 2)
      );
  });
})();
