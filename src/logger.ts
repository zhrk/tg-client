import { Logger as VanillaLogger } from 'teleproto/extensions/Logger';

export class Logger extends VanillaLogger {
  override log: VanillaLogger['log'] = (_, message) => {
    if (message.includes('reconnecting')) {
      console.log('🔄 reconnecting...');
    }

    if (message === 'Handling reconnect!') {
      console.log('✅ reconnected');
    }
  };
}
