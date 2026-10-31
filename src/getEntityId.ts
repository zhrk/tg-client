import { Api } from 'teleproto';

const getEntityId = (source: Api.Message | Api.TypePeer) => {
  let entityId = 'unknown';

  const peer = 'peerId' in source ? source.peerId : source;

  if (peer) {
    if ('channelId' in peer && peer.channelId) {
      entityId = peer.channelId.toString();
    } else if ('chatId' in peer && peer.chatId) {
      entityId = peer.chatId.toString();
    } else if ('userId' in peer && peer.userId) {
      entityId = peer.userId.toString();
    }
  }

  return entityId;
};

export default getEntityId;
