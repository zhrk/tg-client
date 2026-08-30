import { startClient } from './services/client';
import scrap from './scrap';
import subscribe from './subscribe';

(async () => {
  await startClient();

  const { chats } = await subscribe();

  await scrap(chats);
})();
