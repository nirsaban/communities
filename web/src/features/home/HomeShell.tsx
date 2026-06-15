import { Outlet } from 'react-router-dom';
import { BottomNav, SideNav } from '../../components/BottomNav';

// Desktop (≥1024) gets a left side-nav; mobile keeps the bottom-nav. Both are
// role-aware and surface the same destinations — only the chrome differs.
export function HomeShell() {
  return (
    <div className="flex min-h-full bg-bg">
      <SideNav />
      <div className="flex min-h-full flex-1 flex-col">
        <div className="flex-1 pb-20 lg:pb-2">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
