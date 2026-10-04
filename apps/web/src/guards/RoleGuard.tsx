/**
 * Route-level role guard from the Dispatcher prototype. It reads the user from DispatchContext, so it only
 * works inside the dispatcher module's tree. Cross-role gating for the whole app happens in src/app/routes.ts.
 */
export { RequireRole as RoleGuard } from '../features/dispatcher/components/layout/RequireRole';
