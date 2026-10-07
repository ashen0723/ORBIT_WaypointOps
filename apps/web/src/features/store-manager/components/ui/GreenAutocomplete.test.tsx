// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GreenAutocomplete } from './GreenAutocomplete';

afterEach(cleanup);
function Example() {
  const [value, setValue] = useState('');
  return <GreenAutocomplete label="Item name" value={value} onChange={setValue}
    options={['Whole milk 2L', 'Greek yogurt 500g', 'Whole milk 2L']} />;
}

it('filters catalog suggestions and selects by keyboard while keeping input focus', () => {
  render(<Example />);
  const input = screen.getByRole('combobox') as HTMLInputElement;
  input.focus();
  fireEvent.change(input, { target: { value: 'milk' } });
  expect(screen.getAllByRole('option')).toHaveLength(1);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option').id);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input.value).toBe('Whole milk 2L');
  expect(document.activeElement).toBe(input);
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('preserves free text and dismisses suggestions on Escape and blur', () => {
  render(<Example />);
  const input = screen.getByRole('combobox') as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  fireEvent.change(input, { target: { value: 'Custom item' } });
  expect(input.value).toBe('Custom item');
  expect(screen.queryByRole('listbox')).toBeNull();
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(screen.queryByRole('listbox')).toBeNull();
});
