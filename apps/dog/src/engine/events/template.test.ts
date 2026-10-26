import { render } from './template';

it('fills the name and picks particles by its final consonant', () => {
  expect(render('{name:이/가} 우다다 달려요.', '보리')).toBe('보리가 우다다 달려요.');
  expect(render('{name:은/는} {name}의 담요를 좋아해요.', '콩')).toBe('콩은 콩의 담요를 좋아해요.');
  expect(render('이름 없는 문장', '보리')).toBe('이름 없는 문장');
  expect(() => render('{name:에게}', '보리')).toThrow();
});

it('fills the partner of a two-dog event', () => {
  expect(render('{name:과/와} {other:이/가} 낮잠을 자요.', '보리', '콩')).toBe(
    '보리와 콩이 낮잠을 자요.',
  );
  expect(() => render('{other}의 방석', '보리')).toThrow();
});
