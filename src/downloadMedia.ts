import { Api } from 'teleproto';
import { mkdirSync } from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import { outputDir } from './paths';
import client from './services/client';

const downloadMedia = async (message: Api.Message, folder: string) => {
  if (
    message.media &&
    !(
      message.media instanceof Api.MessageMediaPoll ||
      message.media instanceof Api.MessageMediaWebPage ||
      message.media instanceof Api.MessageMediaPaidMedia ||
      message.media instanceof Api.MessageMediaUnsupported
    )
  ) {
    folder = sanitize(folder);

    const userDir = path.join(outputDir, folder);
    mkdirSync(userDir, { recursive: true });

    try {
      await client.downloadMedia(message, { outputFile: userDir });
    } catch (error) {
      console.error(`[Media][${folder}]:`, error);
    }
  }
};

export default downloadMedia;
