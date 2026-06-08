import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { useCreateInitiative, useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { extractError } from '../../lib/api';

export function NewInitiativeScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const create = useCreateInitiative(cid);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Community');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    if (!title.trim() || !description.trim()) return;
    try {
      await create.mutateAsync({ title, description, category });
      nav('/initiatives');
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  return (
    <Screen>
      <AppBar
        title="New initiative"
        leading={
          <button
            onClick={() => nav(-1)}
            className="ic-btn"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        }
      />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <label className="t-label-sm mb-2 block">Cover image</label>
        <div className="imgph mb-4" style={{ height: 96, borderRadius: 12 }}>
          <span className="lbl">Add an image · optional</span>
        </div>

        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} leadingIcon="category" />
        <div className="field">
          <label>What's your proposal?</label>
          <div className="control" style={{ height: 'auto', alignItems: 'flex-start', padding: '14px 16px' }}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the initiative…"
              rows={5}
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              style={{ resize: 'none', minHeight: 100 }}
            />
          </div>
        </div>

        {error && <div className="mb-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>}

        <div className="mt-auto pt-4">
          <AppButton onClick={submit} loading={create.isPending} disabled={!title.trim() || !description.trim()}>
            Publish initiative
          </AppButton>
          <p className="t-body-md center mt-2.5 text-center">
            Your proposal is sent to community admins for approval.
          </p>
        </div>
      </main>
    </Screen>
  );
}
