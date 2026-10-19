// tsconfig `types`에 "@songiland/test-config"를 넣으면 jest-dom 매처 타입도 함께 적용된다.
import '@testing-library/jest-dom/vitest';
import type { InlineConfig } from 'vitest/node';

export declare const songilandTestConfig: InlineConfig;
