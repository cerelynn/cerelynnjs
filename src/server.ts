import { parseBody } from './packages/router/body-parser.js';
import { matchRoute } from './packages/router/matcher.js';
import { runInterceptors, runMiddlewares } from './packages/router/middlewares.js';
import { HTTPVerb, Interceptor } from './types/routes.js';
import { BootstrapConfig, GlobalContext, PluginConfig } from './types/server.js';
import { NotFound } from './utils/utils.js';

export const globalContext: GlobalContext = {
  request: null,
  requestParams: {},
};

const reqInterceptors: Interceptor<Request>[] = [];
const resInterceptors: Interceptor<Response>[] = [];

export function install(pluginFn: () => PluginConfig) {
  const config = pluginFn();
  if (config.onRequest) reqInterceptors.push(config.onRequest);
  if (config.onResponse) resInterceptors.push(config.onResponse);
}

export async function bootstrap(config: BootstrapConfig) {
  const { port = 8080, router } = config;
  const routes = await router();
  async function handler(request: Request): Promise<Response> {
    try {
      await runInterceptors(reqInterceptors, request);

      globalContext.request = request;
      const pathname = new URL(request.url).pathname;
      const verb = request.method.toLowerCase() as HTTPVerb;
      const routeObject = matchRoute(routes, pathname);
      if (pathname === '/debug') return new Response(JSON.stringify(routes));
      if (!routeObject) return new Response('Implement static assets');

      const { route, params } = routeObject;
      const verbModule = route[verb];

      if (!verbModule || !verbModule.default) return NotFound();
      const handler = verbModule.default;
      globalContext.requestParams = params;

      let response;
      try {
        response =
          (await parseBody(request, verbModule.body)) ||
          (await runMiddlewares(request, route)) ||
          (await handler(request)) ||
          NotFound();
      } catch (error) {
        // @ts-ignore
        response = new Response(`Oops, internal server error ${error.message}`, {
          status: 500,
        });
        if (error instanceof Response) response = error;
      }

      await runInterceptors(resInterceptors, response);

      return response;
    } finally {
      globalContext.request = null;
    }
  }
  Bun.serve({
    fetch(request) {
      return handler(request);
    },
    port,
  });
  console.log('Listening on localhost:' + port + '');
}
