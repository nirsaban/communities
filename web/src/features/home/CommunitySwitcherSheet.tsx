import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/Avatar';
import { AppButton } from '../../components/AppButton';
import { RoleBadge, type RoleKind } from '../../components/Pill';
import { useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { t } from '../../i18n';

const ROLE_MAP: Record<string, RoleKind> = {
  admin: 'admin',
  subadmin: 'sub',
  eventManager: 'em',
  member: 'member',
};

export function CommunitySwitcherSheet({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const { data: mine } = useMyCommunities();
  const ctx = communityContext();

  function pick(id: string): void {
    ctx.setCurrent(id);
    onClose();
  }

  return (
    <>
      <div className="scrim absolute inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        className="sheet absolute bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgb(var(--surface))',
          borderRadius: '28px 28px 0 0',
          boxShadow: 'var(--shadow-high)',
          padding: '10px 20px 28px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div
          className="handle mx-auto"
          style={{ width: 40, height: 5, borderRadius: 999, background: 'rgb(var(--border-2))', margin: '2px auto 16px' }}
        />
        <div className="between mb-3.5 flex items-center justify-between">
          <h2 className="t-title-lg">{t.switcher.title}</h2>
          <button onClick={onClose} className="ic-btn soft" style={{ width: 32, height: 32 }}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {mine?.map((m) => {
            const isCurrent = ctx.currentCommunityId === m.community.id;
            const roleKey = ROLE_MAP[m.membership.role] ?? 'member';
            return (
              <button
                key={m.community.id}
                onClick={() => pick(m.community.id)}
                className="card flex items-center gap-3 text-start"
                style={{
                  padding: 12,
                  borderColor: isCurrent ? 'rgb(var(--brand))' : 'rgb(var(--border))',
                  boxShadow: isCurrent
                    ? '0 0 0 3px rgb(var(--brand-wash))'
                    : 'var(--shadow-low)',
                }}
              >
                {m.community.logoUrl ? (
                  <Avatar name={m.community.name} src={m.community.logoUrl} size={40} />
                ) : (
                  <span
                    className="grid place-items-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: isCurrent
                        ? 'rgb(var(--brand))'
                        : 'rgb(var(--surface-2))',
                      color: isCurrent ? '#fff' : 'rgb(var(--on-bg-2))',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="diversity_3" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="t-title-md truncate" style={{ fontSize: 15 }}>
                    {m.community.name}
                  </div>
                  <div className="t-body-md" style={{ margin: 0 }}>
                    {m.community.memberCount.toLocaleString(undefined)} {t.app.members}
                  </div>
                </div>
                <RoleBadge role={roleKey} />
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <AppButton variant="secondary" onClick={() => { onClose(); nav('/discover'); }}>
            <span className="msr">add</span>
            {t.switcher.discoverMore}
          </AppButton>
        </div>
      </div>
    </>
  );
}
