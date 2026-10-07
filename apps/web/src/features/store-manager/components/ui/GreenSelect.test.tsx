// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GreenSelect } from './GreenSelect';

afterEach(cleanup);
const options = [{ value: 'cases', label: 'Cases' }, { value: 'units', label: 'Units' }, { value: 'crates', label: 'Crates' }];

it('opens at the selection, navigates with the keyboard, and restores focus after choosing', () => {
  const onChange = vi.fn();
  render(<GreenSelect label="Unit" value="units" options={options} onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: 'Unit' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(screen.getByRole('option', { name: 'Units' }));
  expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('crates');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it('dismisses with Escape or an outside pointer without changing the value', () => {
  const onChange = vi.fn();
  render(<GreenSelect label="Unit" value="cases" options={options} onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: 'Unit' });
  fireEvent.click(trigger);
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

it('does not present an unavailable value as the first option or open an empty list', () => {
  const { rerender } = render(<GreenSelect label="Unit" value="missing" options={options} onChange={() => {}} />);
  expect(screen.getByRole('button').textContent).toBe('Unit');
  rerender(<GreenSelect label="Unit" value="" options={[]} onChange={() => {}} />);
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
});
