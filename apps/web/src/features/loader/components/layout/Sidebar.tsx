import { Logo } from './Logo';
import { RoleSidebar } from '../../../../components/shared/RoleSidebar';
import { AppPromoCard } from './AppPromoCard';
import { generalNav, menuNav } from '../../data/navigation';

export function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  return <RoleSidebar logo={<Logo collapsible />} menuNav={menuNav} generalNav={generalNav}
    onSignOut={onSignOut} footer={<AppPromoCard />} />;
}
