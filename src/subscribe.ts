import { Api } from 'teleproto';
import { NewMessage, NewMessageEvent } from 'teleproto/events';
import logger from './services/logger';
import { Chats } from './types';
import client from './services/client';
import downloadMedia from './downloadMedia';
import getEntityId from './getEntityId';
import { writeFileSync, mkdirSync } from 'fs';
import { outputDir } from './paths';
import path from 'path';

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

  let refreshing = false;

  const refreshSubscriptions = async (type: 'init' | 'reconnect' | 'update') => {
    if (!refreshing) {
      refreshing = true;

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

      refreshing = false;
    }
  };

  await refreshSubscriptions('init');

  logger.events.on('reconnect', () => refreshSubscriptions('reconnect'));

  client.addEventHandler((event) => {
    if (event instanceof Api.UpdateChannel || event instanceof Api.UpdateChat) {
      refreshSubscriptions('update');
    }

    if (event instanceof Api.UpdateStory) {
      const { story, peer } = event;

      if (story instanceof Api.StoryItem) {
        const userId = peer instanceof Api.PeerUser ? peer.userId.toString() : 'unknown';
        const folderName = `stories_${userId}_${new Date().getTime()}`;

        const userDir = path.join(outputDir, folderName);
        mkdirSync(userDir, { recursive: true });

        const json = JSON.stringify(
          event,
          (_, value) => (typeof value === 'bigint' ? value.toString() : value),
          2
        );

        const logPath = path.join(userDir, `${story.id}.json`);
        writeFileSync(logPath, json, 'utf-8');

        downloadMedia(story, folderName);

        console.log(`🐛`);
      }
    }
  });

  return { chats };
};

export default subscribe;
