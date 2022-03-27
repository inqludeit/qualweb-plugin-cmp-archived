import path from 'path';
import fsSync, { promises as fs } from 'fs';
import puppeteer, { Page, launch } from 'puppeteer';
import http from 'http';

type LaunchOptions = Parameters<typeof launch>[0];

/**
 * Helper function to return the absolute path to a fixture.
 */
export function fixturePath(filename: string): string {
  const p = path.join(__dirname, 'fixtures', filename);

  if (fsSync.statSync(p).isFile() || fsSync.statSync(p).isDirectory() || fsSync.statSync(p).isSymbolicLink()) {
    return p;
  } else {
    throw new Error(`BAD TEST. The file ${filename} isn't present in the fixtures directory.`);
  }
}

/**
 * Reads a fixture file as text and returns its contents.
 * @param filename The file's name, in the fixtures directory.
 */
export function readFixtureFileSync(filename: string, encoding: BufferEncoding = 'utf-8'): string {
  return fsSync.readFileSync(fixturePath(filename), encoding);
}

/**
 * Reads a fixture file as text and returns its contents.
 * @param filename The file's name, in the fixtures directory.
 */
export async function readFixtureFile(filename: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  return fs.readFile(fixturePath(filename), encoding);
}

/**
 * Launches a new puppeteer instance, opens a page object, and passes the page
 * to a callback.
 * @param callback Function to call with a new page object.
 * @returns Returns whatever the callback returns.
 */
export async function withBrowserPage<T>(callback: (page: Page) => Promise<T>, launchOpts?: LaunchOptions): Promise<T> {
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();

  try {
    return await callback(page);
  } finally {
    await page?.close();
    await browser?.close();
  }
}

/**
 * Starts a static file HTTP server for loading test fixtures and JQuery. Once
 * the server is listening, a callback is called with a reference to the server.
 * @param cb Function to call once the HTTP server is running.
 */
export async function withStaticServer(cb: (host: string, server: http.Server) => Promise<unknown>): Promise<void> {
  const server = http.createServer(async (req, res) => {
    if (req.url) {
      const filePath = req.url.includes('extra/jquery.js')
        ? path.join(__dirname, '..', 'node_modules', 'jquery', 'dist', 'jquery.min.js')
        : path.join(__dirname, 'fixtures', req.url);
  
      fsSync.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify(err));
        } else {
          res.writeHead(200);
          res.end(data);
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(() => {
      const addr = server.address();
      if (addr === null)
        throw new Error('Server reported no address!');

      const host = typeof addr === 'string' ? addr : `localhost:${addr.port}`;

      // Server started.
      cb(host, server)
        .then(() => resolve())
        .catch((reason) => reject(reason))
        .finally(() => {
          server.close();
        });
    });
  });
}
