import useParams from './src/packages/hooks/useParams.js';
import useRequest from './src/packages/hooks/useRequest.js';
import { useSchema } from './src/packages/hooks/useSchema.js';
import useZod from './src/packages/hooks/useZod.js';
import { bootstrap, install } from './src/server.js';

const Cerelynn = {
  bootstrap,
  install,
  useParams,
  useRequest,
  useZod,
  useSchema
};


export { bootstrap, install, useParams, useRequest, useZod, useSchema };
export type { Handler } from './src/types/routes.js';
export type { BootstrapConfig, PluginConfig } from './src/types/server.js';

export default Cerelynn;
