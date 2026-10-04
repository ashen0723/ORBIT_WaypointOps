/**
 * App-wide authentication. Today this is the team leader's session implementation from the Dispatcher
 * prototype, which signs in against the in-browser mock server. When the NestJS auth endpoints exist, swap
 * the implementation behind these exports (see src/api/client.ts) and every role module keeps working.
 */
export { SessionProvider as AuthProvider, useSession as useAuth } from '../../features/dispatcher/contexts/SessionContext';
