/**
 * App-wide session. VITE_AUTH_SOURCE=api uses NestJS login; mock remains available for role prototypes.
 */
export { SessionProvider as AuthProvider, useSession as useAuth } from '../../features/dispatcher/contexts/SessionContext';
