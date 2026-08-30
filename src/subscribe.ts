import { Api } from 'teleproto';
import { mkdirSync } from 'fs';
import path from 'path';
import { NewMessage, NewMessageEvent } from 'teleproto/events';
import logger from './services/logger';
import sanitize from 'sanitize-filename';
import { Chats } from './types';
import { outputDir } from './paths';
import client from './services/client';

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

  const handler = async (event: NewMessageEvent) => {
    const message = event.message;

    if (
      message.media &&
      !(
        message.media instanceof Api.MessageMediaPoll ||
        message.media instanceof Api.MessageMediaWebPage
      )
    ) {
      let entityId = 'unknown';

      if (message.peerId) {
        if ('channelId' in message.peerId) {
          entityId = message.peerId.channelId.toString();
        } else if ('chatId' in message.peerId) {
          entityId = message.peerId.chatId.toString();
        } else if ('userId' in message.peerId) {
          entityId = message.peerId.userId.toString();
        }
      }

      const folder = sanitize(chats[entityId] || entityId);

      const userDir = path.join(outputDir, folder);
      mkdirSync(userDir, { recursive: true });

      try {
        await client.downloadMedia(message, { outputFile: userDir });
      } catch (error) {
        console.error(`[Media][${folder}]:`, error);
      }
    }
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
