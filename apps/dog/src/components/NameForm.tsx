import { useId, useState, type ReactNode } from 'react';
import { josa } from '../engine';

export type NameFormProps = {
  suggestions: readonly string[];
  /** 가족 중에 이미 있는 이름. 같은 이름으로는 가족이 될 수 없다. */
  taken?: readonly string[];
  /** 이름을 입력하거나 고를 때마다 부른다(자동 결정을 멈추는 데 쓴다). */
  onEdit?: () => void;
  onSubmit: (name: string) => void;
  /** 가족이 되기 버튼 옆에 둘 버튼들 */
  children?: ReactNode;
};

const MAX_NAME_LENGTH = 12;

/** 이름 짓기: 직접 입력하거나 추천 이름을 고른다. 비워 두면 첫 추천 이름이 된다. */
export function NameForm({ suggestions, taken = [], onEdit, onSubmit, children }: NameFormProps) {
  const [name, setName] = useState('');
  const inputId = useId();
  const hintId = useId();
  const trimmed = name.trim();
  const duplicate = taken.includes(trimmed);
  const finalName = trimmed || suggestions[0];

  function change(next: string) {
    setName(next);
    onEdit?.();
  }

  return (
    <form
      className="meeting__name"
      onSubmit={(event) => {
        event.preventDefault();
        if (!duplicate) {
          onSubmit(finalName);
        }
      }}
    >
      <label htmlFor={inputId}>이름을 지어 주세요</label>
      <input
        id={inputId}
        value={name}
        maxLength={MAX_NAME_LENGTH}
        onChange={(event) => change(event.target.value)}
        placeholder={suggestions[0]}
        autoComplete="off"
        aria-invalid={duplicate || undefined}
        aria-describedby={duplicate ? hintId : undefined}
      />
      {duplicate && (
        <p id={hintId} className="meeting__hint">
          가족 중에 같은 이름이 있어요.
        </p>
      )}
      <div className="chips" aria-label="추천 이름">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="chip"
            aria-pressed={name === suggestion}
            onClick={() => change(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="meeting__actions">
        <button type="submit" className="btn btn--primary btn--large" disabled={duplicate}>
          {josa(finalName, '과/와')} 가족이 되기
        </button>
        {children}
      </div>
    </form>
  );
}
