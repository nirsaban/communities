import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { useAuth } from '../../lib/auth';
import { api, extractError } from '../../lib/api';
import { useUpdateMe } from '../../lib/queries';

type RelationshipStatus = 'single' | 'in_relationship' | 'married' | 'other';

const RELATIONSHIP_LABEL: Record<RelationshipStatus, string> = {
  single: 'Single',
  in_relationship: 'In a relationship',
  married: 'Married',
  other: 'Prefer not to say',
};

type Profile = {
  jobTitle?: string;
  profession?: string;
  company?: string;
  livingLocation?: string;
  relationshipStatus?: RelationshipStatus;
  socials?: {
    instagram?: string;
    x?: string;
    linkedin?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
};

export function EditProfileScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const update = useUpdateMe();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(auth.user?.name ?? '');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [interests, setInterests] = useState<string[]>(auth.user?.interests ?? []);
  const [profile, setProfile] = useState<Profile>({});
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
        if (u.profile && typeof u.profile === 'object') setProfile(u.profile);
      } catch {
        // optional load — silent on failure.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function patchProfile(p: Partial<Profile>): void {
    setProfile((cur) => ({ ...cur, ...p }));
  }
  function patchSocials(p: Partial<NonNullable<Profile['socials']>>): void {
    setProfile((cur) => ({ ...cur, socials: { ...(cur.socials ?? {}), ...p } }));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // Direct axios call — useUpdateMe is JSON-only; the multipart upload
      // sets photoUrl on the backend in a single round-trip.
      const r = await api.post('/auth/me/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = r.data?.data?.user;
      const url: string | undefined = updated?.photoUrl ?? r.data?.data?.photo?.url;
      if (url) setPhotoUrl(url);
      if (updated) auth.setUser(updated);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save(): Promise<void> {
    setError(null);
    try {
      const r = await update.mutateAsync({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        interests,
        profile,
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
      <main className="flex flex-1 flex-col px-5 pb-6 content-md lg:px-8">
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
              <Avatar name={name} size={96} />
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgb(var(--brand))',
                border: '3px solid rgb(var(--surface))',
                cursor: 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
              disabled={uploading}
            >
              <Icon
                name={uploading ? 'progress_activity' : 'photo_camera'}
                size={20}
                className="!text-white"
              />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <Section title="About">
          <Input
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leadingIcon="badge"
          />
          <div className="field">
            <label>Bio</label>
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
        </Section>

        <Section title="Work & networking">
          <Input
            label="Job title"
            value={profile.jobTitle ?? ''}
            onChange={(e) => patchProfile({ jobTitle: e.target.value })}
            leadingIcon="work"
            placeholder="Founder, designer, engineer…"
          />
          <Input
            label="Profession"
            value={profile.profession ?? ''}
            onChange={(e) => patchProfile({ profession: e.target.value })}
            leadingIcon="apartment"
            placeholder="Industry / field"
          />
          <Input
            label="Company or business"
            value={profile.company ?? ''}
            onChange={(e) => patchProfile({ company: e.target.value })}
            leadingIcon="domain"
            placeholder="Where you work / your business"
          />
        </Section>

        <Section title="Personal">
          <Input
            label="Where you live"
            value={profile.livingLocation ?? ''}
            onChange={(e) => patchProfile({ livingLocation: e.target.value })}
            leadingIcon="home_pin"
            placeholder="City, neighborhood"
          />
          <div className="field">
            <label>Relationship status</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(Object.keys(RELATIONSHIP_LABEL) as RelationshipStatus[]).map((opt) => {
                const on = profile.relationshipStatus === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patchProfile({ relationshipStatus: on ? undefined : opt })}
                    className="chip"
                    style={{
                      background: on ? 'rgb(var(--brand))' : 'rgb(var(--surface-2))',
                      color: on ? '#fff' : 'rgb(var(--on-bg))',
                      borderColor: 'transparent',
                      height: 34,
                      padding: '0 12px',
                      fontSize: 13,
                    }}
                  >
                    {RELATIONSHIP_LABEL[opt]}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="Social handles">
          <Input
            label="Instagram"
            value={profile.socials?.instagram ?? ''}
            onChange={(e) => patchSocials({ instagram: e.target.value })}
            leadingIcon="photo_camera"
            placeholder="@yourhandle"
            dir="ltr"
          />
          <Input
            label="X / Twitter"
            value={profile.socials?.x ?? ''}
            onChange={(e) => patchSocials({ x: e.target.value })}
            leadingIcon="alternate_email"
            placeholder="@yourhandle"
            dir="ltr"
          />
          <Input
            label="LinkedIn"
            value={profile.socials?.linkedin ?? ''}
            onChange={(e) => patchSocials({ linkedin: e.target.value })}
            leadingIcon="work"
            placeholder="linkedin.com/in/…"
            dir="ltr"
          />
          <Input
            label="Website"
            value={profile.socials?.website ?? ''}
            onChange={(e) => patchSocials({ website: e.target.value })}
            leadingIcon="link"
            placeholder="https://…"
            dir="ltr"
          />
        </Section>

        <button
          onClick={() => nav('/onboard/interests')}
          className="card flex w-full items-center gap-3 p-3 text-start mt-2"
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
              {interests.length > 0
                ? `${interests.length} selected`
                : 'Pick what interests you'}
            </div>
          </div>
          <Icon name="chevron_right" className="text-muted" />
        </button>

        {error && (
          <div className="mt-3 t-body-md" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        <div className="mt-6">
          <AppButton
            onClick={save}
            loading={update.isPending}
            disabled={!name.trim() || update.isPending}
          >
            Save profile
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="t-label-lg" style={{ fontSize: 13, marginBottom: 8 }}>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
