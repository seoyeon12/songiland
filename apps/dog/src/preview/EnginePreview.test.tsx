import { fireEvent, render, screen } from '@testing-library/react';
import { previewMeeting } from '../engine';
import { EnginePreview } from './EnginePreview';

it('shows a meeting card and plays a whole life for the given seed', () => {
  const meeting = previewMeeting(2026);
  render(<EnginePreview initialSeed={2026} />);
  expect(screen.getByText('오늘 만난 아이 · 시드 2026')).toBeVisible();
  expect(screen.getByText(meeting.intro[0])).toBeVisible();

  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '보리' } });
  fireEvent.click(screen.getByRole('button', { name: '견생 끝까지 보기' }));

  expect(screen.getByRole('heading', { name: '보리의 견생' })).toBeVisible();
  expect(screen.getByText('보리와 가족이 됐어요.')).toBeVisible();
  expect(screen.getByRole('list', { name: '견생 지도 (한 칸이 한 달)' })).toBeVisible();
});
