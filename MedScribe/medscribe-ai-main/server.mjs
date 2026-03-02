import { createServer } from 'https';
import { readFileSync } from 'fs';
import { parse } from 'url';
import next from 'next';

const dev = true;
const hostname = '0.0.0.0';
const port = 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync('./key.pem'),
  cert: readFileSync('./cert.pem'),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Ready on https://${hostname}:${port}`);
  });
});
