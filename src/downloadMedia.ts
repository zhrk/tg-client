import { Api } from 'teleproto';
import { mkdirSync } from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import { outputDir } from './paths';
import client from './services/client';

const downloadMedia = async (entity: Api.Message | Api.StoryItem, folder: string) => {
  if (
    entity.media &&
    !(
      entity.media instanceof Api.MessageMediaPoll ||
      entity.media instanceof Api.MessageMediaWebPage ||
      entity.media instanceof Api.MessageMediaPaidMedia ||
      entity.media instanceof Api.MessageMediaUnsupported
    )
  ) {
    folder = sanitize(folder);

    const userDir = path.join(outputDir, folder);
    mkdirSync(userDir, { recursive: true });

    try {
      await client.downloadMedia(entity.media, { outputFile: userDir });
    } catch (error) {
      console.error(`[Media][${folder}]:`, error);
    }
  }
};

export default downloadMedia;
