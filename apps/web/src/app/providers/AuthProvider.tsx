/** One shared JWT auth/session provider for every role. Mock business sessions remain isolated inside it. */
export { SessionProvider as AuthProvider, useSession as useAuth } from '../../features/dispatcher/contexts/SessionContext';
