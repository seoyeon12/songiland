import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { useLottoControls } from './useLottoControls';

function ControlHarness({
  canAct,
  onPrimaryAction,
  pawMode = false,
}: {
  canAct: boolean;
  onPrimaryAction: () => void;
  pawMode?: boolean;
}) {
  const controls = useLottoControls({ canAct, onPrimaryAction, pawMode });
  return (
    <section data-testid="lotto-stage" tabIndex={0} {...controls.stageProps}>
      <button data-lotto-control type="button">
        기록 모두 지우기
      </button>
    </section>
  );
}

it('uses Space once on an active stage and prevents scrolling', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} />);
  const preventDefault = vi.fn();
  fireEvent.keyDown(screen.getByTestId('lotto-stage'), {
    key: ' ',
    preventDefault,
  });
  expect(onPrimaryAction).toHaveBeenCalledOnce();
});

it('does not reveal when Space comes from the history clear button', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} />);
  fireEvent.keyDown(screen.getByRole('button', { name: '기록 모두 지우기' }), {
    key: ' ',
  });
  expect(onPrimaryAction).not.toHaveBeenCalled();
});

it('ignores Space while the stage cannot act', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct={false} onPrimaryAction={onPrimaryAction} />);
  fireEvent.keyDown(screen.getByTestId('lotto-stage'), { key: ' ' });
  expect(onPrimaryAction).not.toHaveBeenCalled();
});

it('ignores non-Space keys', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} />);
  fireEvent.keyDown(screen.getByTestId('lotto-stage'), { key: 'Enter' });
  expect(onPrimaryAction).not.toHaveBeenCalled();
});

it('reveals one ball for an empty-stage touch only when paw mode is on', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} pawMode />);
  fireEvent.pointerUp(screen.getByTestId('lotto-stage'), {
    pointerType: 'touch',
  });
  expect(onPrimaryAction).toHaveBeenCalledOnce();
});

it('ignores empty-stage touches while paw mode is off', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} />);
  fireEvent.pointerUp(screen.getByTestId('lotto-stage'), {
    pointerType: 'touch',
  });
  expect(onPrimaryAction).not.toHaveBeenCalled();
});

it('ignores paw touches that start on a control', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} pawMode />);
  fireEvent.pointerUp(screen.getByRole('button', { name: '기록 모두 지우기' }), {
    pointerType: 'touch',
  });
  expect(onPrimaryAction).not.toHaveBeenCalled();
});
