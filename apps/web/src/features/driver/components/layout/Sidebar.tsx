import { RoleSidebar } from '../../../../components/shared/RoleSidebar';
import { AppPromoCard } from './AppPromoCard';
import { generalNav, menuNav } from '../../data/navigation';

export function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  return <RoleSidebar menuNav={menuNav} generalNav={generalNav}
    onSignOut={onSignOut} footer={<AppPromoCard />} />;
}
