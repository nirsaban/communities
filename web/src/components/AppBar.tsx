import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

type Props = {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  showTitle?: boolean;
  transparent?: boolean;
};

export function AppBar({ title, back, onBack, leading, trailing, showTitle = true, transparent }: Props) {
  const nav = useNavigate();
  return (
    <header
      className={`safe-top sticky top-0 z-20 flex items-center gap-2 px-4 py-3 ${
        transparent ? 'bg-transparent' : 'bg-bg/85 backdrop-blur'
      }`}
    >
      {back && (
        <button
          onClick={onBack ?? (() => nav(-1))}
          className="-ms-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface2"
          aria-label="Back"
        >
          <Icon name="arrow_back" />
        </button>
      )}
      {leading}
      {showTitle && title && (
        <h1 className="flex-1 truncate text-base font-semibold text-ink">{title}</h1>
      )}
      {!showTitle && <div className="flex-1" />}
      {trailing}
    </header>
  );
}

type ScreenProps = {
  children: React.ReactNode;
  className?: string;
};
export function Screen({ children, className = '' }: ScreenProps) {
  return <div className={`min-h-full flex flex-col bg-bg ${className}`}>{children}</div>;
}
