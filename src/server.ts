import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Convert from 'ansi-to-html';
import { html, raw } from 'hono/html';

const app = new Hono();

const convert = new Convert({
  newline: true,
  escapeXML: true,
  fg: '#CCCCCC', // Foreground Color
  bg: '#0C0C0C', // Background Color
  colors: {
    0: '#0C0C0C', // black
    1: '#C50F1F', // red
    2: '#13A10E', // green
    3: '#C19C00', // yellow
    4: '#0037DA', // blue
    5: '#881798', // purple (magenta)
    6: '#3A96DD', // cyan
    7: '#CCCCCC', // white
    8: '#767676', // brightBlack
    9: '#E74856', // brightRed
    10: '#16C60C', // brightGreen
    11: '#F9F1A5', // brightYellow
    12: '#3B78FF', // brightBlue
    13: '#B4009E', // brightPurple
    14: '#61D6D6', // brightCyan
    15: '#F2F2F2', // brightWhite
  },
});

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
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link
            href="https://fonts.googleapis.com/css2?family=Cascadia+Mono:ital,wght@0,200..700;1,200..700&display=swap"
            rel="stylesheet"
          />
          <title>Console</title>
          <style>
            html {
              color-scheme: dark;
            }

            body {
              font-size: 16px;
              background-color: #0c0c0c;
            }

            pre {
              margin: 0;
              font-family: 'Cascadia Mono';
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
