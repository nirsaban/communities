import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';
import { communityContext } from '../../lib/community-context';
import { useMyCommunities, useUpdateCommunity } from '../../lib/queries';

// Preset swatches per design.
const PRESETS = ['#FF5C35', '#0057FF', '#1E8E50', '#5B3D9E', '#C77A00'];

export function BrandingCustomizerScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const update = useUpdateCommunity(cid);
  const community = mine?.find((m) => m.community.id === cid)?.community;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [primary, setPrimary] = useState('#FF5C35');
  const [accent, setAccent] = useState('#FFB199');
  const [logoUrl, setLogoUrl] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!cid) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/communities/${cid}`);
        if (!alive) return;
        const c = r.data?.data ?? {};
        setLogoUrl(String(c.logoUrl ?? ''));
        const branding =
          (c.settings as { branding?: { primaryColor?: string; accentColor?: string } })?.branding ?? {};
        if (branding.primaryColor) setPrimary(branding.primaryColor);
        if (branding.accentColor) setAccent(branding.accentColor);
      } catch (err) {
        setError(extractError(err).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cid]);

  async function save(): Promise<void> {
    setError(null);
    try {
      await update.mutateAsync({
        logoUrl: logoUrl.trim() || undefined,
        settings: { branding: { primaryColor: primary, accentColor: accent } },
      });
      nav(-1);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppBar back title="Branding" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        back
        title="Branding"
        trailing={
          <button
            onClick={save}
            disabled={update.isPending}
            style={{
              color: 'rgb(var(--brand-ink))',
              fontWeight: 600,
              fontSize: 14,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: '0 12px',
            }}
          >
            Save
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6 overflow-y-auto">
        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {/* Logo block */}
        <div className="flex items-center gap-3.5 mb-4">
          {logoUrl ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', flex: '0 0 64px' }}
            />
          ) : (
            <div
              className="imgph grid place-items-center"
              style={{ width: 64, height: 64, borderRadius: 16, flex: '0 0 64px' }}
            >
              <Icon name="add_photo_alternate" style={{ color: 'rgb(var(--muted))' }} />
            </div>
          )}
          <div>
            <div className="t-title-md" style={{ fontSize: 15 }}>
              Logo
            </div>
            <div className="t-body-md" style={{ margin: '2px 0 0' }}>
              Square · 512px or larger
            </div>
          </div>
        </div>

        <Input
          label="Logo URL"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          leadingIcon="image"
          placeholder="https://…"
          dir="ltr"
        />

        {/* Brand color picker */}
        <label className="t-label-sm" style={{ display: 'block', margin: '6px 0 10px' }}>
          Brand color
        </label>
        <div className="flex flex-wrap gap-2.5 mb-4">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPrimary(c)}
              aria-label={`Pick ${c}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: c,
                border: 'none',
                cursor: 'pointer',
                boxShadow:
                  primary === c
                    ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}`
                    : 'none',
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            aria-label="Custom color"
            className="grid place-items-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '1.5px dashed rgb(var(--border-2))',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <Icon name="colorize" size={18} style={{ color: 'rgb(var(--muted))' }} />
          </button>
        </div>

        {showCustom && (
          <div className="space-y-3 mb-4">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Primary color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  style={{ width: 44, height: 44, border: 0, padding: 0, borderRadius: 8 }}
                />
                <Input
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  dir="ltr"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Accent color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  style={{ width: 44, height: 44, border: 0, padding: 0, borderRadius: 8 }}
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  dir="ltr"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live preview */}
        <label className="t-label-sm" style={{ display: 'block', margin: '6px 0 10px' }}>
          Live preview
        </label>
        <div
          className="card preview-skin"
          style={
            {
              padding: 14,
              background: 'rgb(var(--surface-2))',
              border: 'none',
              ['--brand' as never]: primary,
            } as React.CSSProperties
          }
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="grid place-items-center"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: primary,
              }}
            >
              <Icon name="menu_book" size={16} style={{ color: '#fff' }} />
            </span>
            <b style={{ fontSize: 14 }}>{community?.name ?? 'Your community'}</b>
          </div>
          <div
            className="announce mb-2.5"
            style={{
              background: `color-mix(in srgb, ${primary} 12%, white)`,
            }}
          >
            <div className="t-label-lg" style={{ fontSize: 13 }}>
              Announcement preview
            </div>
          </div>
          <button
            className="btn"
            style={{
              background: primary,
              color: '#fff',
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: 0,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            RSVP · I'm going
          </button>
        </div>
        <p className="t-body-md text-center mt-3">
          Your color re-skins every member screen.
        </p>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton
          variant="primary"
          onClick={save}
          loading={update.isPending}
          disabled={update.isPending}
        >
          Save branding
        </AppButton>
      </footer>
    </Screen>
  );
}
