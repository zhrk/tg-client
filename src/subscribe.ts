import { Api } from 'teleproto';
import { NewMessage, NewMessageEvent } from 'teleproto/events';
import logger from './services/logger';
import { Chats } from './types';
import client from './services/client';
import downloadMedia from './downloadMedia';
import getEntityId from './getEntityId';
import { outputDir } from './paths';
import path from 'path';
import config from '../config.json';

const dirs: Record<string, string> = config.dirs;

const subscribe = async () => {
  let chats: Chats = {};
  let eventType: NewMessage | null = null;

  const getChats = async () => {
    const acc: Chats = {};

    const dialogs = await client.getDialogs();

    for (const dialog of dialogs) {
      const entity = dialog.entity;

      if (
        (entity instanceof Api.Channel || entity instanceof Api.Chat) &&
        entity.noforwards === true
      ) {
        acc[entity.id.toString()] = entity.title;
      }
    }

    const contacts = await client.invoke(
      new Api.contacts.GetContacts({ hash: 0 as unknown as any })
    );

    if (contacts instanceof Api.contacts.Contacts) {
      for (const contact of contacts.users) {
        if (contact instanceof Api.User) {
          const name = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}`;

          acc[contact.id.toString()] = name;
        }
      }
    }

    return acc;
  };

  const handler = (event: NewMessageEvent) => {
    const { message } = event;

    const entityId = getEntityId(message);

    downloadMedia(message, chats[entityId] || entityId, dirs[entityId]);
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

      console.log(`${emoji[type]} ${chatIds.length}`);

      refreshing = false;
    }
  };

  await refreshSubscriptions('init');

  logger.events.on('reconnect', () => refreshSubscriptions('reconnect'));

  client.addEventHandler((event) => {
    if (
      event instanceof Api.UpdateChannel ||
      event instanceof Api.UpdateChat ||
      event instanceof Api.UpdatePeerSettings
    ) {
      refreshSubscriptions('update');
    }

    if (event instanceof Api.UpdateStory) {
      const { story, peer } = event;

      if (story instanceof Api.StoryItem) {
        const entityId = getEntityId(peer);

        const storiesDir = path.join(outputDir, '_stories');

        downloadMedia(story, chats[entityId], storiesDir);
      }
    }
  });

  return { chats };
};

export default subscribe;
