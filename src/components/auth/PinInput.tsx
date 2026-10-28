import React, { useRef, useEffect } from 'react';

interface PinInputProps {
  value: string[];
  onChange: (newValue: string[]) => void;
  onComplete?: (pinString: string) => void;
  showPin: boolean;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  value,
  onChange,
  onComplete,
  showPin,
  disabled = false,
  hasError = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize or auto-focus first empty box on mount
  useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmptyIndex = value.findIndex((val) => val === '');
      const targetIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : 0;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawChar = e.target.value;
    // Extract only the latest numeric digit entered
    const numericChars = rawChar.replace(/\D/g, '');

    if (!numericChars) {
      const updated = [...value];
      updated[index] = '';
      onChange(updated);
      return;
    }

    const digit = numericChars.slice(-1);
    const updated = [...value];
    updated[index] = digit;
    onChange(updated);

    // If a digit was entered, auto-advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if full 6 digits are entered
    const fullPin = updated.join('');
    if (fullPin.length === 6 && onComplete) {
      onComplete(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[index] === '' && index > 0) {
        // Move to previous box and clear it
        e.preventDefault();
        const updated = [...value];
        updated[index - 1] = '';
        onChange(updated);
        inputRefs.current[index - 1]?.focus();
      } else if (value[index] !== '') {
        const updated = [...value];
        updated[index] = '';
        onChange(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digitsOnly = pastedText.replace(/\D/g, '').slice(0, 6);

    if (digitsOnly.length > 0) {
      const updated = Array(6).fill('');
      for (let i = 0; i < digitsOnly.length; i++) {
        updated[i] = digitsOnly[i];
      }
      onChange(updated);

      if (digitsOnly.length === 6) {
        inputRefs.current[5]?.focus();
        if (onComplete) {
          onComplete(digitsOnly);
        }
      } else {
        const nextIndex = Math.min(digitsOnly.length, 5);
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-2.5 sm:gap-3.5 my-4 transition-transform duration-200 ${
        hasError ? 'animate-shake' : ''
      }`}
    >
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const char = value[index] || '';
        const isFilled = char !== '';

        return (
          <div key={index} className="relative flex flex-col items-center">
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={char}
              disabled={disabled}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              aria-label={`Dígito ${index + 1} do código de acesso`}
              className={`h-13 w-11 sm:h-16 sm:w-13 text-center text-2xl sm:text-3xl font-extrabold rounded-2xl border transition-all duration-150 outline-hidden select-none ${
                disabled
                  ? 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : hasError
                  ? 'bg-red-950/20 border-red-500/80 text-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-500/30'
                  : isFilled
                  ? 'bg-zinc-900 border-lime-400 text-lime-400 shadow-md shadow-lime-950/20'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-100 hover:border-zinc-700 focus:border-lime-400 focus:bg-zinc-900 focus:ring-2 focus:ring-lime-400/40'
              }`}
            />
            {/* Visual small indicator bar at bottom of each box */}
            <div
              className={`h-1 w-5 rounded-full mt-1.5 transition-all duration-200 ${
                hasError
                  ? 'bg-red-500/60'
                  : isFilled
                  ? 'bg-lime-400'
                  : 'bg-zinc-800'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
