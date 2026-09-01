import { startClient } from './services/client';
import subscribe from './subscribe';
import './server';

(async () => {
  await startClient();

  const { chats } = await subscribe();

  // await scrap();
})();
