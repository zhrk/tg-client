import { startClient } from './services/client';
import subscribe from './subscribe';
// import './server';
console.log(`🐛`);
(async () => {
  await startClient();

  const { chats } = await subscribe();

  // await scrap();
})();
