import { Outlet } from 'react-router-dom';
import { BottomNav } from '../../components/BottomNav';

export function HomeShell() {
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <div className="flex-1 pb-2">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
