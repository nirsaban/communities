import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { useAuth } from '../../lib/auth';
import { api, extractError } from '../../lib/api';
import { useUpdateMe } from '../../lib/queries';

export function EditProfileScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const update = useUpdateMe();
  const [name, setName] = useState(auth.user?.name ?? '');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [interests, setInterests] = useState<string[]>(auth.user?.interests ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get('/auth/me');
        if (!alive) return;
        const u = r.data?.data?.user ?? r.data?.data ?? {};
        if (typeof u.bio === 'string') setBio(u.bio);
        if (typeof u.photoUrl === 'string') setPhotoUrl(u.photoUrl);
        if (Array.isArray(u.interests)) setInterests(u.interests);
      } catch {
        // optional load — silent on failure.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function save(): Promise<void> {
    setError(null);
    try {
      const r = await update.mutateAsync({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        interests,
      });
      const updated = (r as { data?: { data?: { user?: typeof auth.user } } }).data?.data?.user;
      if (updated) auth.setUser(updated);
      nav(-1);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  return (
    <Screen>
      <AppBar
        back
        title="Edit profile"
        trailing={
          <button
            onClick={save}
            disabled={!name.trim() || update.isPending}
            style={{
              color: 'rgb(var(--brand-ink))',
              fontWeight: 600,
              fontSize: 14,
              opacity: !name.trim() || update.isPending ? 0.5 : 1,
              padding: '8px 12px',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        }
      />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <div className="mt-3 mb-5 flex justify-center">
          <div className="relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Avatar name={name} size={64} />
            )}
            <div
              className="absolute -bottom-1 -right-1 grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgb(var(--brand))',
                border: '3px solid rgb(var(--surface))',
              }}
            >
              <Icon name="photo_camera" size={20} className="!text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leadingIcon="badge"
          />
          <Input
            label="Profile photo (URL)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            leadingIcon="image"
            placeholder="https://…"
            dir="ltr"
          />
          <div className="field">
            <label>About you</label>
            <div className="control" style={{ alignItems: 'stretch', padding: 12, minHeight: 100 }}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself"
                className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                rows={4}
                maxLength={1000}
              />
            </div>
            <div className="hint">{bio.length}/1000</div>
          </div>
          <button
            onClick={() => nav('/onboard/interests')}
            className="card flex w-full items-center gap-3 p-3 text-start"
          >
            <span
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'rgb(var(--brand-wash))',
                color: 'rgb(var(--brand-ink))',
              }}
            >
              <Icon name="interests" size={20} />
            </span>
            <div className="flex-1">
              <div className="t-label-lg">Interests</div>
              <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                {interests.length > 0 ? `${interests.length} selected` : 'Pick what interests you'}
              </div>
            </div>
            <Icon name="chevron_right" className="text-muted" />
          </button>
        </div>

        {error && (
          <div className="mt-3 t-body-md" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

      </main>
    </Screen>
  );
}
