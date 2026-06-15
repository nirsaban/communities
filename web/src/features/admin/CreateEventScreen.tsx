import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { useMyCommunities, useCreateEvent } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { extractError } from '../../lib/api';
import {
  EventForm,
  initialFormValues,
  valuesToDraft,
  type EventFormValues,
} from './EventForm';

export function CreateEventScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const role = mine?.find((m) => m.community.id === cid)?.membership.role;
  const isSubAdmin = role === 'subadmin';

  const [values, setValues] = useState<EventFormValues>(initialFormValues());
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const create = useCreateEvent(cid);

  function validate(): boolean {
    const e: Partial<Record<keyof EventFormValues, string>> = {};
    if (!values.title || values.title.trim().length < 2)
      e.title = 'Title must be at least 2 characters';
    if (!values.startLocal) e.startLocal = 'Pick a start time';
    if (!values.endLocal) e.endLocal = 'Pick an end time';
    if (values.startLocal && values.endLocal && new Date(values.endLocal) <= new Date(values.startLocal)) {
      e.endLocal = 'End must be after start';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(status: 'draft' | 'published'): Promise<void> {
    if (status === 'published' && !validate()) return;
    setTopError(null);
    setSaving(true);
    try {
      const draft = valuesToDraft(values, status);
      if (isSubAdmin) draft.pricing = { type: 'free', priceCents: 0, currency: 'ILS' };
      const ev = await create.mutateAsync(draft);
      nav(`/events/${String(ev.id)}/command`);
    } catch (err) {
      setTopError(extractError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppBar
        leading={
          <button onClick={() => nav(-1)} className="ic-btn" aria-label="Close">
            <Icon name="close" />
          </button>
        }
        title={isSubAdmin ? 'New free event' : 'New event'}
        trailing={
          <button
            onClick={() => submit('draft')}
            disabled={saving}
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
            Draft
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6 overflow-y-auto content-sm lg:px-8">
        {topError && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {topError}
          </div>
        )}
        <EventForm
          values={values}
          onChange={setValues}
          allowPricing={!isSubAdmin}
          errors={errors}
        />
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton
          variant="primary"
          onClick={() => submit('published')}
          loading={saving}
          disabled={saving}
        >
          Publish event
        </AppButton>
      </footer>
    </Screen>
  );
}
