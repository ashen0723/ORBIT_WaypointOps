/** Real API authentication; sessions are isolated per browser tab. */
export { SessionProvider as AuthProvider, useSession as useAuth } from '../../features/dispatcher/contexts/SessionContext';
