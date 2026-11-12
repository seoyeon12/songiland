import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StartScreen } from './StartScreen';

describe('StartScreen', () => {
  it("shows today's best and the ghost hint", () => {
    render(
      <StartScreen
        day="2026-11-08"
        dailyBest={{ day: '2026-11-08', score: 1840, bestStreak: 4, recordedAt: 0 }}
        ownBest={900}
        points={320}
        persistence="local"
        tutorialDone
        tutorialFinished={false}
        onTutorial={() => {}}
        onStart={() => {}}
        onShop={() => {}}
      />,
    );
    expect(screen.getByText('1,840점')).toBeInTheDocument();
    expect(screen.getByText(/고스트와 함께/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /내 가게 영업 · 최고 900점/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /상점 · 320P/ })).toBeInTheDocument();
  });

  it('warns when records cannot be kept', () => {
    render(
      <StartScreen
        day="2026-11-08"
        dailyBest={null}
        ownBest={null}
        points={0}
        persistence="memory"
        tutorialDone
        tutorialFinished={false}
        onTutorial={() => {}}
        onStart={() => {}}
        onShop={() => {}}
      />,
    );
    expect(screen.getByText('아직 없음')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('기록이 유지되지 않을 수');
  });

  it('puts the tutorial first for a newcomer', () => {
    render(
      <StartScreen
        day="2026-11-08"
        dailyBest={null}
        ownBest={null}
        points={0}
        persistence="local"
        tutorialDone={false}
        tutorialFinished={false}
        onTutorial={() => {}}
        onStart={() => {}}
        onShop={() => {}}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('튜토리얼부터');
    expect(screen.queryByRole('button', { name: /튜토리얼 다시 보기/ })).not.toBeInTheDocument();
  });
});
