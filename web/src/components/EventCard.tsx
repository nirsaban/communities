import { Icon } from './Icon';
import { PriceTag, type PriceKind, RoleBadge } from './Pill';

type Props = {
  title: string;
  when: string;
  location?: string;
  priceKind: PriceKind;
  priceAmount?: string;
  rsvpLabel?: string;
  onClick?: () => void;
};

export function EventCard({ title, when, location, priceKind, priceAmount, rsvpLabel, onClick }: Props) {
  return (
    <button type="button" onClick={onClick} className="event-card text-start w-full">
      <div className="cover imgph">
        <span className="lbl">cover</span>
      </div>
      <div className="body">
        <span className="when">{when}</span>
        <span className="ttl">{title}</span>
        {location && (
          <span className="meta">
            <Icon name="place" size={14} />
            {location}
          </span>
        )}
        <div className="foot">
          <PriceTag kind={priceKind} amount={priceAmount} />
          {rsvpLabel && <RoleBadge role="member" label={rsvpLabel} />}
        </div>
      </div>
    </button>
  );
}
