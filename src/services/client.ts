import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import config from '../../config.json';
import { createInterface } from 'readline/promises';
import logger from './logger';

const askInput = async (prompt: string) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
};

const client = new TelegramClient(new StringSession(config.session), config.id, config.hash, {
  proxy: { ip: '127.0.0.1', port: 12334, socksType: 5 },
  baseLogger: logger,
});

export const startClient = () =>
  client.start({
    phoneNumber: async () => await askInput('phone number: '),
    password: async () => await askInput('password: '),
    phoneCode: async () => await askInput('phone code: '),
    onError: (error) => console.log(error),
  });

export default client;
