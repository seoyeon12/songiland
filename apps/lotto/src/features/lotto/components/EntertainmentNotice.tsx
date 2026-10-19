// 법적 검토에서 승인된 오락용 고지 문구. 글자 그대로 표시한다.
export const ENTERTAINMENT_NOTICE =
  '송이랜드의 오락용 번호 추천입니다. 실제 복권 발행·판매·당첨 확인 서비스가 아니며, 당첨을 보장하지 않습니다. 복권은 건전하게 즐겨주세요.';

export function EntertainmentNotice() {
  return (
    <p className="lotto-notice" role="note">
      {ENTERTAINMENT_NOTICE}
    </p>
  );
}
