import React from 'react';

interface CurrencyCentsInputProps {
  value: number;
  onChangeValue: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export const formatCurrencyCentsDisplay = (val: number): string => {
  const safe = Math.max(0, Number(val) || 0);
  const cents = Math.round(safe * 100);
  if (cents <= 0) return '';
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const CurrencyCentsInput: React.FC<CurrencyCentsInputProps> = ({
  value,
  onChangeValue,
  placeholder = '0,00',
  className = '',
  id,
  ariaLabel,
}) => {
  const displayValue = formatCurrencyCentsDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    const cents = digitsOnly ? parseInt(digitsOnly, 10) : 0;
    const numericValue = Number((cents / 100).toFixed(2));
    onChangeValue(numericValue);

    requestAnimationFrame(() => {
      if (document.activeElement === inputEl) {
        const len = inputEl.value.length;
        inputEl.setSelectionRange(len, len);
      }
    });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    requestAnimationFrame(() => {
      if (
        document.activeElement === inputEl &&
        inputEl.selectionStart === inputEl.selectionEnd
      ) {
        const len = inputEl.value.length;
        inputEl.setSelectionRange(len, len);
      }
    });
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      value={displayValue}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      className={className}
    />
  );
};
