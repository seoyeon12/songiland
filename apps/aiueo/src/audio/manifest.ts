/**
 * 음원 파일이 준비된 문자 id 목록. `public/audio/<id>.mp3`가 있어야 한다.
 *
 * 음원 생성은 8단계로 미뤘다(기획서 5.2·15장). 그때 생성 스크립트가 이 목록을 다시 쓴다.
 * 목록에 없는 문자는 임시로 브라우저 내장 음성이 읽는다.
 */
export const AUDIO_FILE_IDS: ReadonlySet<string> = new Set<string>([]);
