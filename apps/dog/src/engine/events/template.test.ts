import { render } from './template';

it('fills the name and picks particles by its final consonant', () => {
  expect(render('{name:이/가} 우다다 달려요.', '보리')).toBe('보리가 우다다 달려요.');
  expect(render('{name:은/는} {name}의 담요를 좋아해요.', '콩')).toBe('콩은 콩의 담요를 좋아해요.');
  expect(render('이름 없는 문장', '보리')).toBe('이름 없는 문장');
  expect(() => render('{name:에게}', '보리')).toThrow();
});
