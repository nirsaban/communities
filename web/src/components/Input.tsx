import React, { useId, useState } from 'react';
import { Icon } from './Icon';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingClick?: () => void;
};

// Uses the design-system .field / .control classes — pixel-aligned with assets/app.css.
export const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, leadingIcon, trailingIcon, onTrailingClick, className = '', id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={`field ${error ? 'error' : ''} ${className}`}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className="control">
        {leadingIcon && <Icon name={leadingIcon} />}
        <input ref={ref} id={inputId} {...rest} />
        {trailingIcon && (
          <button type="button" onClick={onTrailingClick} className="grid place-items-center" tabIndex={-1}>
            <Icon name={trailingIcon} size={21} />
          </button>
        )}
      </div>
      {(hint || error) && <div className="hint">{error ?? hint}</div>}
    </div>
  );
});

type PasswordProps = Omit<Props, 'type' | 'trailingIcon' | 'onTrailingClick'>;
export function PasswordInput(props: PasswordProps) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      trailingIcon={show ? 'visibility_off' : 'visibility'}
      onTrailingClick={() => setShow((v) => !v)}
    />
  );
}
