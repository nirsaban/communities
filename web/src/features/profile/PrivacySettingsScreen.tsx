import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import {
  usePrivacy,
  useUpdatePrivacy,
  type PrivacyPrefs,
  type ProfileVisibility,
} from '../../lib/queries';

const OPTIONS: Array<{ id: ProfileVisibility; label: string; icon: string }> = [
  { id: 'members_only', label: 'Members of my communities', icon: 'groups' },
  { id: 'public', label: 'Everyone', icon: 'public' },
  { id: 'private', label: 'Only me', icon: 'lock' },
];

export function PrivacySettingsScreen() {
  const { data: prefs, isLoading } = usePrivacy();
  const updateMut = useUpdatePrivacy();

  function update(patch: Partial<PrivacyPrefs>): void {
    updateMut.mutate(patch);
  }

  if (isLoading || !prefs) {
    return (
      <Screen>
        <AppBar back title="Privacy" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Privacy" />
      <main className="flex-1 px-5 pb-6">
        <div className="t-label-sm mb-2.5">Who can see my profile</div>
        <div className="flex flex-col gap-2.5 mb-5">
          {OPTIONS.map((o) => {
            const active = prefs.profileVisibility === o.id;
            return (
              <button
                key={o.id}
                onClick={() => update({ profileVisibility: o.id })}
                className="card flex w-full items-center gap-3 text-start"
                style={{
                  padding: 14,
                  borderColor: active ? 'rgb(var(--brand))' : 'rgb(var(--border))',
                  boxShadow: active ? '0 0 0 3px rgb(var(--brand-wash))' : undefined,
                }}
              >
                <Icon
                  name={o.icon}
                  className={active ? 'text-brand' : 'text-muted'}
                />
                <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                  {o.label}
                </span>
                <Icon
                  name={active ? 'radio_button_checked' : 'radio_button_unchecked'}
                  className={active ? 'text-brand' : 'text-muted'}
                />
              </button>
            );
          })}
        </div>

        <div className="t-label-sm mb-1.5">Visibility</div>
        <ToggleRow
          label="Show my RSVPs to others"
          value={prefs.showAttendedEvents}
          onChange={(v) => update({ showAttendedEvents: v })}
        />
        <ToggleRow
          label="List me in member directory"
          value={prefs.showInitiativesSupported}
          onChange={(v) => update({ showInitiativesSupported: v })}
        />
        <ToggleRow
          label="Allow direct messages"
          value={prefs.allowMentions}
          onChange={(v) => update({ allowMentions: v })}
        />

        <button className="list-row w-full text-start" style={{ borderBottom: 'none' }}>
          <Icon name="block" className="text-muted" />
          <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
            Blocked members
          </span>
          <span className="t-body-md" style={{ margin: 0 }}>
            0
          </span>
          <Icon name="chevron_right" className="text-muted" />
        </button>
      </main>
    </Screen>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center border-b border-border py-3">
      <span className="t-label-lg flex-1">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`toggle ${value ? 'on' : 'off'}`}
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          position: 'relative',
          background: value ? 'rgb(var(--brand))' : 'rgb(var(--border-2))',
          border: 0,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            [value ? 'right' : 'left']: 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
          }}
        />
      </button>
    </div>
  );
}
