export function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`sk ${className}`} style={style} />;
}

export function EventCardSkeleton() {
  return (
    <div className="event-card">
      <Shimmer className="cover" style={{ width: 76, flex: '0 0 76px' }} />
      <div className="body flex-1">
        <Shimmer style={{ height: 11, width: 90 }} />
        <Shimmer style={{ height: 16, width: '85%', marginTop: 6 }} />
        <Shimmer style={{ height: 11, width: 110, marginTop: 6 }} />
      </div>
    </div>
  );
}
