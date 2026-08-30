import { Api } from 'teleproto';

const getEntityId = (message: Api.Message) => {
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

  return entityId;
};

export default getEntityId;
