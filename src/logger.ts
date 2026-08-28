import { Logger as VanillaLogger } from 'teleproto/extensions/Logger';
import EventEmitter from 'events';

export class Logger extends VanillaLogger {
  public events = new EventEmitter();

  override log: VanillaLogger['log'] = (_, message) => {
    if (message.includes('reconnecting')) {
      console.log('🔄 reconnecting...');
    }

    if (message === 'Handling reconnect!') {
      this.events.emit('reconnect');
    }
  };
}
