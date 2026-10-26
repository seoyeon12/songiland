import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { simulateToEnd, startRun, summarize, type RunState } from '../engine';
import { canShareImages, createShareImage, saveImage, shareImage } from '../share/image';
import { EndingScreen } from './EndingScreen';

// jsdom에는 캔버스가 없어 이미지 만들기·저장·공유는 가짜로 바꾼다.
vi.mock('../share/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../share/image')>()),
  createShareImage: vi.fn(),
  saveImage: vi.fn(),
  canShareImages: vi.fn(),
  shareImage: vi.fn(),
}));

const png = new Blob(['png'], { type: 'image/png' });

beforeEach(() => {
  vi.mocked(createShareImage).mockReset().mockResolvedValue(png);
  vi.mocked(saveImage).mockReset();
  vi.mocked(canShareImages).mockReset().mockReturnValue(false);
  vi.mocked(shareImage).mockReset().mockResolvedValue('shared');
});

it('shows the life record with the arc title, moments and map', () => {
  const run = simulateToEnd(startRun({ seed: 2024, name: '두부' }));
  const record = summarize(run);
  const onAgain = vi.fn();
  render(<EndingScreen run={run} onAgain={onAgain} />);

  expect(screen.getByText(`이번 상영작 · ${record.arcTitle}`)).toBeVisible();
  expect(screen.getByRole('heading', { name: '두부의 견생' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '기억에 남는 순간' })).toBeVisible();
  expect(screen.getByRole('list', { name: /견생 지도/ })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: '이야기 전체 보기' }));
  expect(screen.getByText('두부와 가족이 됐어요.')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: '한 번 더 상영하기' }));
  expect(onAgain).toHaveBeenCalledOnce();
});

/** 첫째를 보낸 뒤에도 남은 아이가 있는 판 */
function runWithSurvivor(): RunState {
  for (let seed = 3000; seed < 3400; seed += 1) {
    const run = simulateToEnd(startRun({ seed, name: '두부' }));
    if (run.epilogue) {
      return run;
    }
  }
  throw new Error('남은 아이가 있는 판을 찾지 못했습니다.');
}

it("keeps a card for each other dog and tells the rest of the survivors' lives", () => {
  const run = runWithSurvivor();
  const survivor = run.epilogue!.dogs[0];
  render(<EndingScreen run={run} onAgain={() => {}} />);

  expect(screen.getByRole('heading', { name: '함께한 가족' })).toBeVisible();
  const card = screen.getByRole('article', { name: `${survivor.name}의 견생` });
  expect(card).toHaveTextContent('남은 아이의 이야기');
  expect(card).toHaveTextContent(/두부를 보낸 뒤에도 .+ 더 함께했어요\./);

  fireEvent.click(screen.getByRole('button', { name: '이야기 전체 보기' }));
  expect(screen.getByRole('heading', { name: '남은 아이들의 이야기' })).toBeVisible();
});

describe('share image', () => {
  const run = simulateToEnd(startRun({ seed: 2024, name: '두부' }));

  it('saves the record card as an image', async () => {
    render(<EndingScreen run={run} onAgain={() => {}} />);
    const save = screen.getByRole('button', { name: '이미지로 저장' });
    await vi.waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    expect(saveImage).toHaveBeenCalledWith(png, '견생극장-두부.png');
    expect(screen.getByRole('status')).toHaveTextContent('이미지를 저장했어요.');
    // 공유 카드는 결말 화면의 강아지 그림을 그대로 쓴다.
    expect(vi.mocked(createShareImage).mock.calls[0][1]).toBe(
      screen.getByRole('img', { name: /^두부, / }),
    );
    expect(screen.queryByRole('button', { name: '공유' })).toBeNull();
  });

  it('opens the share sheet on devices that can share images', async () => {
    vi.mocked(canShareImages).mockReturnValue(true);
    render(<EndingScreen run={run} onAgain={() => {}} />);
    const share = await screen.findByRole('button', { name: '공유' });
    await vi.waitFor(() => expect(share).toBeEnabled());
    fireEvent.click(share);
    expect(shareImage).toHaveBeenCalledWith(png, '견생극장-두부.png', expect.stringContaining('두부의 견생'));
  });

  it('says so when the image cannot be made', async () => {
    vi.mocked(createShareImage).mockRejectedValue(new Error('no canvas'));
    render(<EndingScreen run={run} onAgain={() => {}} />);
    expect(await screen.findByText('이 브라우저에서는 공유 이미지를 만들 수 없어요.')).toBeVisible();
    expect(screen.getByRole('button', { name: '이미지로 저장' })).toBeDisabled();
  });
});

it('opens a past life with its date and a way back to the list', () => {
  const run = simulateToEnd(startRun({ seed: 2024, name: '두부' }));
  const onAgain = vi.fn();
  render(<EndingScreen run={run} onAgain={onAgain} endedAt={new Date(2026, 9, 26).getTime()} />);
  expect(screen.getByText(/^지난 상영작 · /)).toBeVisible();
  expect(screen.getByText('2026년 10월 26일 상영')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '목록으로 돌아가기' }));
  expect(onAgain).toHaveBeenCalledOnce();
});
