import { AppBar } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { t } from '../../i18n';

export function EventsScreen() {
  return (
    <>
      <AppBar title={t.home.tabEvents} />
      <main className="px-5 pb-6">
        <EmptyState
          icon="event_busy"
          title="No events yet"
          body="Once you RSVP to your first event, it will show up here."
        />
      </main>
    </>
  );
}
