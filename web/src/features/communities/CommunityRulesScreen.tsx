import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { useCommunity } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { t } from '../../i18n';

const RULES = [
  { title: 'Be kind & respectful', body: 'Disagree generously. No harassment.' },
  { title: 'Keep it relevant', body: 'No spam, ads, or off-topic selling.' },
  { title: 'Show up for RSVPs', body: 'If plans change, release your spot.' },
  { title: 'Respect privacy', body: "Don't photograph or post about members without permission." },
];

export function CommunityRulesScreen() {
  const { cid } = useParams<{ cid: string }>();
  const nav = useNavigate();
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const setCurrent = communityContext((s) => s.setCurrent);
  const { data: community } = useCommunity(cid);

  async function onAccept(): Promise<void> {
    if (!cid) return;
    setLoading(true);
    try {
      await api.post(`/communities/${cid}/rules/ack`);
      setCurrent(cid);
      nav('/home', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppBar back />
      <main className="flex flex-1 flex-col px-5 pb-10 content-sm lg:px-8">
        <h1 className="t-display-md mb-1 mt-1">Community guidelines</h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))', margin: 0 }}>
          {community?.name}
        </p>

        <p className="t-body-lg mt-2" style={{ color: 'rgb(var(--muted))', margin: 0 }}>
          A few things keep the community a good place to be. Please read before you join in.
        </p>

        <ol className="mt-6 space-y-3.5">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center text-sm font-semibold"
                style={{
                  borderRadius: 8,
                  background: 'rgb(var(--brand-wash))',
                  color: 'rgb(var(--brand-ink))',
                }}
              >
                {i + 1}
              </span>
              <div>
                <div className="t-title-md" style={{ fontSize: 15 }}>{r.title}</div>
                <p className="t-body-md" style={{ margin: '2px 0 0' }}>{r.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <label className="mt-6 flex items-start gap-2.5">
          <button
            type="button"
            onClick={() => setAck((a) => !a)}
            className="mt-0.5 grid h-[22px] w-[22px] flex-shrink-0 place-items-center"
            style={{
              borderRadius: 6,
              background: ack ? 'rgb(var(--brand))' : 'transparent',
              border: ack ? 'none' : '1.5px solid rgb(var(--border-2))',
            }}
          >
            {ack && <Icon name="check" size={16} className="!text-white" />}
          </button>
          <span className="t-body-md">{t.community.acceptRules}</span>
        </label>

        <div className="mt-auto pt-6">
          <AppButton disabled={!ack} loading={loading} onClick={onAccept}>
            Agree & continue
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}
