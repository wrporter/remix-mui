/**
 * Code pulled and simplified from https://github.com/epicweb-dev/epic-stack
 */
import path from 'node:path';

import { createRequestHandler } from '@remix-run/express';
import { type ServerBuild, installGlobals } from '@remix-run/node';
import { Server, type Options as ServerOptions } from '@wesp-up/express';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? undefined
    : // eslint-disable-next-line import-x/no-extraneous-dependencies
    await import('vite').then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
      }),
    );

async function getBuild() {
  const build = viteDevServer
    ? await viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : // @ts-ignore this should exist before running the server
      // but it may not exist just yet.
    await import('../build/server/index.js');
  // not sure how to make this happy 🤷‍♂️
  return build as unknown as ServerBuild;
}

/**
 * Remix options.
 */
export interface RemixOptions {
  /**
   * The build path for the backend server.
   * @default `${PWD}/build`
   */
  serverBuildPath: string;
  /**
   * The root folder for public assets.
   * @default `public`
   */
  assetsRoot: string;
  /**
   * The build directory for remix assets, should be a child of `assetsRoot`.
   * @default `public/build`
   */
  assetsBuildDirectory: string;
  /**
   * The route path for public assets.
   * @default `/build/`
   */
  publicPath: string;
}

/**
 * Smart defaults for Remix. You normally shouldn't have to change these.
 */
export const defaultRemixOptions: RemixOptions = {
  serverBuildPath: path.join(process.cwd(), 'build'),
  assetsBuildDirectory: 'build/client/assets',
  publicPath: '/assets',
  assetsRoot: 'build/client',
};

/**
 * Creates an Express server integrated with Remix and ready for production.
 */
export function createRemixServer(options: Partial<RemixOptions & ServerOptions> = {}) {
  const server = new RemixServer(options);
  server.init();
  return server;
}

/**
 * An Express server integrated with Remix. Inherits from the server from
 * \@wesp-up/express.
 */
export class RemixServer extends Server {
  private readonly remixOptions: RemixOptions;

  constructor(options?: Partial<RemixOptions & ServerOptions>) {
    super(options as ServerOptions);
    this.remixOptions = {
      ...defaultRemixOptions,
      ...options,
    };

    const skipMetricsAndLogs = (req: Request) =>
      (viteDevServer?.config.base && req.path.startsWith(viteDevServer?.config.base)) ||
      req.path.startsWith(this.remixOptions.publicPath);

    this.options.accessLogs = {
      skip: this.options?.accessLogs?.skip ? this.options?.accessLogs.skip : skipMetricsAndLogs,
    };
    this.options.metricsOptions = {
      bypass: this.options.metricsOptions?.bypass
        ? this.options.metricsOptions?.bypass
        : skipMetricsAndLogs,
      formatStatusCode: (res: Response) => {
        if (res.statusCode < 300) {
          return '2xx';
        }
        if (res.statusCode < 400) {
          return '3xx';
        }
        return res.statusCode;
      },
    };
  }

  /**
   * Apply Remix middleware and assets to an Express application. This should be
   * applied towards the end of an application since control will be given to
   * Remix at this point. Any custom Express routes and middleware should be
   * applied previous to using this.
   * @param app - Express app to apply Remix middleware to.
   */
  protected postMountApp(app: Application) {
    installGlobals();

    const { publicPath, assetsBuildDirectory, assetsRoot } = this.remixOptions;

    // Do not allow trailing slashes in URLs
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.endsWith('/') && req.path.length > 1) {
        const query = req.url.slice(req.path.length);
        const safePath = req.path.slice(0, -1).replace(/\/+/g, '/');
        res.redirect(302, safePath + query);
      }
      next();
    });

    // Static assets
    if (viteDevServer) {
      app.use(viteDevServer.middlewares);
    } else {
      // Vite fingerprints its assets so we can cache forever.
      app.use(publicPath, express.static(assetsBuildDirectory, { immutable: true, maxAge: '1y' }));

      // Everything else (like favicon.ico) is cached for an hour. You may want to be
      // more aggressive with this caching.
      app.use(express.static(assetsRoot, { maxAge: '1h' }));
    }

    // Remix routes
    app.all(
      '*',
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      createRequestHandler({
        getLoadContext: (req: Request) => ({
          serverBuild: getBuild(),
          ...req.context,
        }),
        mode: process.env.NODE_ENV,
        build: getBuild,
      }),
    );
  }
}

function main() {
  const server = createRemixServer();
  server.start(3000);
}

main();
