import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { LoadingDots } from '../../components/LoadingDots';
import { AppButton } from '../../components/AppButton';
import { api, extractError } from '../../lib/api';
import { useUpdateEvent, useCancelEvent, useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import {
  EventForm,
  FormSubmitBar,
  eventToFormValues,
  initialFormValues,
  valuesToDraft,
  type EventFormValues,
} from './EventForm';

export function EditEventScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const [values, setValues] = useState<EventFormValues>(initialFormValues());
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Per PRD 05 §3: sub-admin must not see or edit pricing. allowPricing is
  // false → EventForm renders the locked-pricing notice for them.
  const myCid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const myRole = mine?.find((m) => m.community.id === myCid)?.membership.role;
  const canPrice = myRole !== 'subadmin';

  const update = useUpdateEvent(eid);
  const cancel = useCancelEvent(eid);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/events/${eid}`);
        if (!alive) return;
        const ev = r.data?.data ?? {};
        setValues(eventToFormValues(ev));
      } catch (err) {
        setTopError(extractError(err).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eid]);

  function validate(): boolean {
    const e: Partial<Record<keyof EventFormValues, string>> = {};
    if (!values.title || values.title.trim().length < 2) e.title = 'Title is required';
    if (!values.startLocal) e.startLocal = 'Pick a start time';
    if (!values.endLocal) e.endLocal = 'Pick an end time';
    if (values.startLocal && values.endLocal && new Date(values.endLocal) <= new Date(values.startLocal)) {
      e.endLocal = 'End must be after start';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(status: 'draft' | 'published'): Promise<void> {
    if (!validate()) return;
    setTopError(null);
    try {
      const draft = valuesToDraft(values, status);
      // Belt-and-suspenders: sub-admin can never publish paid pricing.
      // Backend already blocks via blockSubAdminFromFinancial, but stripping
      // it here keeps the request clean.
      if (!canPrice && draft.pricing) {
        draft.pricing = { type: 'free' };
      }
      await update.mutateAsync(draft);
      nav(`/events/${eid}/command`);
    } catch (err) {
      setTopError(extractError(err).message);
    }
  }

  async function doCancel(): Promise<void> {
    setTopError(null);
    try {
      await cancel.mutateAsync(undefined);
      nav('/admin/events');
    } catch (err) {
      setTopError(extractError(err).message);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppBar back title="Edit event" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Edit event" />
      <main className="flex-1 px-5 pb-6">
        {topError && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {topError}
          </div>
        )}
        <EventForm values={values} onChange={setValues} allowPricing={canPrice} errors={errors} />

        <div className="mt-6">
          {showCancelConfirm ? (
            <div
              className="card p-3.5"
              style={{ border: '1px solid rgb(var(--error))', background: 'rgb(var(--error-wash))' }}
            >
              <div className="t-label-lg mb-2">Cancel this event?</div>
              <div className="t-body-md mb-3">Attendees will be notified. This can't be undone.</div>
              <div className="grid grid-cols-2 gap-2.5">
                <AppButton variant="secondary" onClick={() => setShowCancelConfirm(false)}>
                  Back
                </AppButton>
                <AppButton variant="danger" onClick={doCancel} loading={cancel.isPending}>
                  Cancel event
                </AppButton>
              </div>
            </div>
          ) : (
            <AppButton variant="danger" onClick={() => setShowCancelConfirm(true)}>
              Cancel event
            </AppButton>
          )}
        </div>
      </main>
      <FormSubmitBar
        saving={update.isPending}
        onSaveDraft={() => submit('draft')}
        onPublish={() => submit('published')}
        publishLabel="Save changes"
      />
    </Screen>
  );
}
