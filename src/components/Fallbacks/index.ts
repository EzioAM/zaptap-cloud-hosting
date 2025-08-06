export { ErrorFallback } from './ErrorFallback';
export { NetworkErrorFallback } from './NetworkErrorFallback';

export default {
  ErrorFallback: require('./ErrorFallback').ErrorFallback,
  NetworkErrorFallback: require('./NetworkErrorFallback').NetworkErrorFallback,
};