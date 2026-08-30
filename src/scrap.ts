import client from './services/client';
import downloadMedia from './downloadMedia';
import getEntityId from './getEntityId';

const scrap = async () => {
  const dialogs = await client.getDialogs();

  const test = dialogs.map((dialog, index) => ({ index, title: dialog.title }));

  console.log(test);

  const messages = await client.getMessages(dialogs[0].entity);

  for (const message of messages) {
    const entityId = getEntityId(message);

    await downloadMedia(message, entityId);
  }
};

export default scrap;
