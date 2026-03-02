import { createServer } from "https";
import { readFileSync } from "fs";
import next from "next";
import { parse } from "url";

const dev = true;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3001");

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync("/Users/bot/.openclaw/workspace/certs/key.pem"),
  cert: readFileSync("/Users/bot/.openclaw/workspace/certs/cert.pem"),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> HTTPS MedScribe ready on https://10.211.55.3:${port}`);
  });
});
