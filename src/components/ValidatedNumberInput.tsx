import { useState } from 'react';
import type { ComponentProps } from 'react';

type NativeNumberInputProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
>;

export function ValidatedNumberInput({
  value,
  min,
  max,
  normalize,
  onValueChange,
  ...inputProps
}: NativeNumberInputProps & {
  value: number;
  min: number;
  max: number;
  normalize?: (value: number) => number;
  onValueChange: (value: number) => void;
}) {
  const [editor, setEditor] = useState({
    sourceValue: value,
    draft: String(value),
  });
  const draft = editor.sourceValue === value ? editor.draft : String(value);

  const commit = () => {
    const parsed = Number(draft);
    const finiteValue = Number.isFinite(parsed) ? parsed : value;
    const boundedValue = Math.max(min, Math.min(max, finiteValue));
    const normalizedValue = Math.max(
      min,
      Math.min(max, normalize ? normalize(boundedValue) : boundedValue),
    );

    setEditor({
      sourceValue: normalizedValue,
      draft: String(normalizedValue),
    });
    onValueChange(normalizedValue);
  };

  return (
    <input
      {...inputProps}
      type='number'
      min={min}
      max={max}
      value={draft}
      onChange={event =>
        setEditor({ sourceValue: value, draft: event.currentTarget.value })
      }
      onBlur={commit}
      onKeyDown={event => {
        inputProps.onKeyDown?.(event);
        if (!event.defaultPrevented && event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}
