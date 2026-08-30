import { Api } from 'teleproto';
import { NewMessage, NewMessageEvent } from 'teleproto/events';
import logger from './services/logger';
import { Chats } from './types';
import client from './services/client';
import downloadMedia from './downloadMedia';
import getEntityId from './getEntityId';

const subscribe = async () => {
  let chats: Chats = {};
  let eventType: NewMessage | null = null;

  const getChats = async () => {
    const dialogs = await client.getDialogs();

    return dialogs.reduce<Chats>((acc, dialog) => {
      const entity = dialog.entity;

      if (
        (entity instanceof Api.Channel || entity instanceof Api.Chat) &&
        entity.noforwards === true
      ) {
        acc[entity.id.toString()] = entity.title;
      }

      return acc;
    }, {});
  };

  const handler = (event: NewMessageEvent) => {
    const { message } = event;

    const entityId = getEntityId(message);

    downloadMedia(message, chats[entityId] || entityId);
  };

  let refresing = false;

  const refreshSubscriptions = async (type: 'init' | 'reconnect' | 'update') => {
    if (!refresing) {
      refresing = true;

      if (eventType) {
        client.removeEventHandler(handler, eventType);
      }

      chats = await getChats();

      const chatIds = Object.keys(chats);

      eventType = new NewMessage({ chats: chatIds });

      client.addEventHandler(handler, eventType);

      const emoji: Record<typeof type, string> = {
        init: '✅',
        reconnect: '✅',
        update: '🔔',
      };

      console.log(`${emoji[type]} ${chatIds.length} chats`);

      refresing = false;
    }
  };

  await refreshSubscriptions('init');

  logger.events.on('reconnect', () => refreshSubscriptions('reconnect'));

  client.addEventHandler((event) => {
    if (event instanceof Api.UpdateChannel || event instanceof Api.UpdateChat) {
      refreshSubscriptions('update');
    }
  });

  return { chats };
};

export default subscribe;
