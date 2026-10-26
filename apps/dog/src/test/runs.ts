import { advanceUntilChoice, autoChoose, startRun, type RunState } from '../engine';

/**
 * 새 식구 이름 짓기를 기다리는 판을 찾는다. 선택은 자동 결정으로 고른다.
 * 시드를 차례로 넘겨 보며 처음 새 식구를 만난 순간의 상태를 돌려준다.
 */
export function runAwaitingNewcomer(fromSeed = 1, name = '보리'): RunState {
  for (let seed = fromSeed; seed < fromSeed + 200; seed += 1) {
    let run = startRun({ seed, name });
    while (run.status === 'running') {
      run = advanceUntilChoice(run);
      if (run.pendingMeeting) {
        return run;
      }
      if (!run.pendingChoice) {
        break;
      }
      run = autoChoose(run);
    }
  }
  throw new Error('새 식구를 만나는 판을 찾지 못했습니다.');
}
