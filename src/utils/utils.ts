import path from 'path';
import { HTTPVerb, MiddlewareModule, RouteModule } from '../types/routes.js';

export function getFileSegments(filename: string) {
  const extname = path.extname(filename);
  const name = filename.slice(0, -extname.length);
  return { name, extname };
}

export function isValidExt(ext: string) {
  return ext === '.js' || ext === '.ts';
}

export function isValidName(name: string) {
  return (
    (name.startsWith('(') && name.endsWith(')')) ||
    (name.startsWith('[') && name.endsWith(']')) ||
    name.startsWith('@')
  );
}

export const isHTTPVerb = (str: string): str is HTTPVerb => {
  return (
    str === HTTPVerb.GET ||
    str === HTTPVerb.POST ||
    str === HTTPVerb.PUT ||
    str === HTTPVerb.DELETE ||
    str === HTTPVerb.PATCH
  );
};

export function createUrl(dirSegments: string[]) {
  return path.posix
    .join(...dirSegments)
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll('[', ':')
    .replaceAll(']', '');
}

export async function fetchRoute<T>(modulePath: string): Promise<RouteModule> {
  return await import(modulePath);
}

export async function fetchMiddleware<T>(modulePath: string): Promise<MiddlewareModule> {
  return await import(modulePath);
}

export function NotFound() {
  return new Response('Not Found', {
    status: 404,
  });
}
