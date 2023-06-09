import path from 'path';
import fs from 'fs/promises';
import { Handler, Route, RouteModule, Routes } from '../../types/routes.js';
import {
  createUrl,
  fetchMiddleware,
  fetchRoute,
  getFileSegments,
  isHTTPVerb,
  isValidExt,
  isValidName,
} from '../../utils/utils.js';
import chokidar from 'chokidar';
function refineRoutes(routes: Routes) {
  for (const url in routes) {
    if (url.includes('@')) {
      const segments = url.split('/');
      if (segments.at(-1)?.startsWith('@')) {
        delete routes[url];
        continue;
      }
      const filteredSegments = segments.filter((segment) => !segment.startsWith('@'));
      const finalSegments = filteredSegments.map((segment) =>
        segment.replace(/^.*?([^@/]+).*?$/, '$1')
      );

      const newUrl = `/${path.posix.join(...finalSegments)}`;

      routes[newUrl] = routes[url];
      delete routes[url];
    }
  }
  return routes;
}
function createPathResolver(baseUrl: string) {
  return (...pathSegments: string[]) => {
    return path.join(process.cwd(), baseUrl, ...pathSegments);
  };
}

export async function FSRouter(baseUrl: string) {
  let routes: Routes = await FSRouterGenerator(baseUrl);
  return routes;
}

export async function FSRouterGenerator(baseUrl: string) {
  const routes: Routes = {};
  const middlewares: Handler[] = [];
  const routesResolver = createPathResolver(baseUrl);

  async function readDir(dirModules: string[]) {
    const dirPath = routesResolver(...dirModules);
    const url = createUrl(dirModules);
    const route: Route = (routes[url] = {});

    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
    const pendingDirReads: string[] = [];
    let shouldPopMiddleware = false;
    for (const dirEntry of dirEntries) {
      if (dirEntry.isDirectory() && isValidName(dirEntry.name))
        pendingDirReads.push(dirEntry.name);
      if (!dirEntry.isFile()) continue;
      const { name, extname } = getFileSegments(dirEntry.name);
      if (!isValidName(name) || !isValidExt(extname)) continue;

      const verb = name.slice(1, -1);

      if (isHTTPVerb(verb)) {
        const modulePath = path.join(dirPath, dirEntry.name);
        const module = await fetchRoute(modulePath);
        const verbHandler: RouteModule = (route[verb] = {});

        if (typeof module.default === 'function') verbHandler.default = module.default;
        if (Array.isArray(module.middlewares))
          verbHandler.middlewares = module.middlewares;
        if (typeof module.body === 'string') verbHandler.body = module.body;
      }

      if (verb === 'middleware') {
        const modulePath = path.join(dirPath, dirEntry.name);
        const module = await fetchMiddleware(modulePath);
        if (typeof module.default === 'function') {
          middlewares.push(module.default);
          shouldPopMiddleware = true;
        }
      }
    }

    if (middlewares.length > 0) route.middlewares = [...middlewares];

    for (const pendingDirRead of pendingDirReads) {
      await readDir([...dirModules, pendingDirRead]);
    }

    return shouldPopMiddleware && middlewares.pop();
  }
  await readDir(['/']);

  return refineRoutes(routes);
}
