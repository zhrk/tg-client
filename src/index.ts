import { startClient } from './services/client';
import subscribe from './subscribe';

(async () => {
  await startClient();

  const { chats } = await subscribe();

  // await scrap();
})();
