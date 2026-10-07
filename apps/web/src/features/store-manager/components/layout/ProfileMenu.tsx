import { useGreenDropdown } from '../../hooks/useGreenDropdown';
import { useAuth } from '../../../../app/providers/AuthProvider';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AnimatedGreenDropdownPanel } from '../ui/GreenDropdown';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';


export function ProfileMenu({ onSignOut }: {onSignOut: () => void;}) {
  const { user } = useAuth();
  const MANAGER = { name: user?.name ?? 'Store Manager', email: user?.email ?? '', avatar: undefined };
  const { open, setOpen, root, trigger, panelId, onBlur } = useGreenDropdown();

  return (
    <div ref={root} onBlur={onBlur} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        ref={trigger}
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-label={`Account menu for ${MANAGER.name}`}
        className="flex items-center gap-3 rounded-full p-0.5 text-left transition-colors duration-150 hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:pr-4">
        
        <Avatar name={MANAGER.name} src={MANAGER.avatar} />
        <span className="hidden lg:block">
          <span className="block text-sm font-semibold text-ink">{MANAGER.name}</span>
          <span className="block text-xs text-subtle">{MANAGER.email}</span>
        </span>
      </button>
      <AnimatePresence>
        {open &&
        <AnimatedGreenDropdownPanel id={panelId}
          className="right-0 w-64 p-2">
          
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-ink">{MANAGER.name}</p>
              <p className="text-xs text-subtle">{MANAGER.email}</p>
            </div>
            <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink transition-colors duration-150 hover:bg-surface">
            
              <UserIcon aria-hidden="true" className="h-4 w-4 text-subtle" />
              Profile & settings
            </Link>
            <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex h-10 w-full items-center gap-2 rounded-full px-3 text-sm text-danger-ink transition-colors duration-150 hover:bg-danger-pale">
            
              <LogOutIcon aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </AnimatedGreenDropdownPanel>
        }
      </AnimatePresence>
    </div>);

}
