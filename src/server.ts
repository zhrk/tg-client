import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Convert from 'ansi-to-html';
import { html, raw } from 'hono/html';

const app = new Hono();

const convert = new Convert({ newline: true, escapeXML: true });

const logs: string[] = [];

const interceptStream = (stream: NodeJS.WriteStream) => {
  stream.write = new Proxy(stream.write, {
    apply(target, thisArg, args: Parameters<typeof stream.write>) {
      const chunk = args[0];
      const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');

      logs.push(convert.toHtml(text));

      return Reflect.apply(target, thisArg, args);
    },
  });
};

interceptStream(process.stdout);
interceptStream(process.stderr);

app.get('/', (c) => {
  const renderedLogs = logs.join('');

  return c.html(
    html`<!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>Console</title>
          <style>
            html {
              color-scheme: dark;
            }

            body {
              font-size: 16px;
            }

            pre {
              margin: 0;
            }
          </style>
        </head>
        <body>
          <pre>${raw(renderedLogs)}</pre>
        </body>
      </html>`
  );
});

serve({ fetch: app.fetch, port: 8642, hostname: '0.0.0.0' });
