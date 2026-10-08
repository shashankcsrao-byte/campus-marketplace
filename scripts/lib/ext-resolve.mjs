// Node loader hook: lets Node import packages that use extensionless ESM paths
// (like @material/material-color-utilities, which targets bundlers).
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && (spec.startsWith('.') || spec.startsWith('/'))) return next(spec + '.js', ctx);
    throw e;
  }
}`));
