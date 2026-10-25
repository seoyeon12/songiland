import type { EventCard } from './types';

/**
 * 견생극장 사건 카드. 문장은 초안이며 개발자 검수를 거친다.
 *
 * 쓰는 원칙
 * - 모든 선택지는 "이 아이에게 무엇이 더 좋을까" 사이의 고민이다. 파양·유기·학대·방치는 없다.
 * - 아픔·이별은 결과만 짧게 쓰고 과정은 묘사하지 않는다.
 * - 견종 고정관념을 부정적으로 쓰지 않는다.
 * - 강아지가 주어다. 견주는 부르지 않고, 선택 카드의 질문만 견주에게 말을 건다.
 */
export const EVENTS: readonly EventCard[] = [
  // ─── 첫 만남 직후 ─────────────────────────────────────────────
  {
    id: 'first-night',
    category: 'growth',
    tones: ['calm', 'touching'],
    stages: ['puppy'],
    when: { maxTogether: 1 },
    urgent: { chance: 1 },
    memorable: true,
    text: ['첫날밤, {name:이/가} 낯선 집이 무서운지 작게 낑낑거려요.'],
    choices: [
      {
        id: 'sleep-together',
        label: '곁에서 같이 자 주기',
        outcomes: [
          {
            weight: 1,
            text: '손을 살짝 대 주자 {name:이/가} 금세 새근새근 잠들었어요.',
            effects: { bond: 6, happiness: 2 },
          },
        ],
      },
      {
        id: 'ticking-doll',
        label: '째깍째깍 시계 소리 나는 인형 넣어 주기',
        outcomes: [
          {
            weight: 1,
            text: '엄마 심장 소리 같았는지 {name:이/가} 인형을 꼭 끌어안고 잠들었어요.',
            effects: { bond: 3, happiness: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'rescue-adjust',
    category: 'growth',
    tones: ['touching'],
    stages: ['puppy', 'young', 'adult', 'senior', 'elderly'],
    when: { routes: ['shelter', 'rescue'], maxTogether: 2 },
    urgent: { chance: 1 },
    memorable: true,
    text: ['{name:은/는} 처음 며칠 동안 방 구석에서만 지냈어요. 아직 모든 게 낯선가 봐요.'],
    choices: [
      {
        id: 'wait',
        label: '억지로 다가가지 않고 기다려 주기',
        outcomes: [
          {
            weight: 3,
            favoredBy: 'bond',
            text: '일주일째 되던 날, {name:이/가} 먼저 다가와 손등에 코를 댔어요.',
            effects: { bond: 10, happiness: 4 },
            memorable: true,
          },
          {
            weight: 1,
            text: '시간이 조금 걸렸지만 {name:은/는} 매일 한 걸음씩 가까워졌어요.',
            effects: { bond: 6, happiness: 2 },
          },
        ],
      },
      {
        id: 'treats',
        label: '좋아하는 간식으로 천천히 마음 열기',
        outcomes: [
          {
            weight: 1,
            text: '간식 하나에 한 걸음. {name:은/는} 어느새 무릎 옆에서 잠들어 있었어요.',
            effects: { bond: 7, happiness: 3, health: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'vaccination',
    category: 'growth',
    tones: ['cheerful', 'calm'],
    stages: ['puppy'],
    when: { minTogether: 1, maxTogether: 4 },
    urgent: { chance: 0.5 },
    once: true,
    text: ['예방접종을 모두 마쳤어요. 이제 바깥 산책을 나갈 수 있어요!'],
    effects: { health: 5, happiness: 3 },
  },

  // ─── 아기·청년기 ───────────────────────────────────────────────
  {
    id: 'potty-training',
    category: 'growth',
    tones: ['cheerful'],
    stages: ['puppy'],
    when: { minTogether: 2, maxTogether: 6 },
    urgent: { chance: 0.35 },
    text: ['배변 패드 앞에서 {name:이/가} 진지하게 고민하는 얼굴이에요.'],
    choices: [
      {
        id: 'praise',
        label: '칭찬 간식으로 천천히 가르치기',
        outcomes: [
          {
            weight: 3,
            favoredBy: 'bond',
            text: '사흘 만에 패드 마스터! 칭찬 간식의 힘은 위대해요.',
            effects: { bond: 4, happiness: 2 },
          },
          {
            weight: 1,
            text: '조금 오래 걸렸지만 {name:은/는} 결국 해냈어요. 이불 빨래는 추억으로.',
            effects: { bond: 2 },
          },
        ],
      },
      {
        id: 'class',
        label: '강아지 훈련 교실에 다녀 보기',
        outcomes: [
          {
            weight: 1,
            text: '훈련 교실에서 배변도 배우고 친구도 사귀었어요.',
            effects: { sociability: 5, bond: 2, ease: -5 },
          },
        ],
      },
    ],
  },
  {
    id: 'socialization',
    category: 'growth',
    tones: ['cheerful', 'calm'],
    stages: ['puppy'],
    when: { minTogether: 1 },
    text: ['세상이 궁금한 시기예요. {name}에게 무엇을 보여 줄까요?'],
    choices: [
      {
        id: 'playground',
        label: '강아지 놀이터에서 친구 사귀기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'sociability',
            text: '{name:은/는} 놀이터의 인기 스타가 됐어요. 집에 와서 기절하듯 잠들었어요.',
            effects: { sociability: 8, happiness: 3 },
          },
          {
            weight: 1,
            hinderedBy: 'sociability',
            text: '큰 친구들이 조금 무서웠나 봐요. 다음엔 한적한 시간에 가 보기로 했어요.',
            effects: { sociability: 2, bond: 2 },
          },
        ],
      },
      {
        id: 'quiet-walk',
        label: '동네 산책로를 천천히 걸어 보기',
        outcomes: [
          {
            weight: 1,
            text: '자동차 소리, 낙엽 소리, 새소리. {name:은/는} 오늘 세상을 조금 더 알게 됐어요.',
            effects: { sociability: 4, happiness: 3 },
          },
        ],
      },
      {
        id: 'home-sounds',
        label: '집에서 여러 소리에 익숙해지기',
        outcomes: [
          {
            weight: 1,
            text: '청소기 소리에도 이제 덤덤해요. 대신 청소기를 쫓아다녀요.',
            effects: { sociability: 2, bond: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'neuter',
    category: 'health',
    tones: ['calm'],
    stages: ['young'],
    when: { excludes: ['neutered'] },
    text: ['병원에서 중성화 이야기를 들었어요. 언제 하는 게 좋을까요?'],
    choices: [
      {
        id: 'now',
        label: '수의사와 상의해서 지금 하기',
        outcomes: [
          {
            weight: 1,
            text: '수술은 잘 끝났어요. {name:은/는} 넥카라를 쓰고 며칠 동안 시무룩했어요.',
            effects: { health: 4, happiness: -3, lifespan: 2, flags: ['neutered'] },
          },
        ],
      },
      {
        id: 'wait-a-year',
        label: '1년 더 지켜보고 결정하기',
        outcomes: [
          {
            weight: 1,
            text: '조금 더 자란 뒤에 다시 이야기해 보기로 했어요.',
            follow: { event: 'neuter-again', inMonths: 12 },
          },
        ],
      },
      {
        id: 'second-opinion',
        label: '다른 병원 의견도 들어 보기',
        outcomes: [
          {
            weight: 1,
            text: '두 병원의 이야기를 들으니 마음이 정리됐어요. 다음 달에 수술하기로 했어요.',
            effects: { ease: -2 },
            follow: { event: 'neuter-again', inMonths: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'neuter-again',
    category: 'health',
    tones: ['calm'],
    stages: ['young', 'adult'],
    when: { excludes: ['neutered'] },
    weight: 0,
    text: ['다시 중성화를 이야기할 때가 됐어요.'],
    choices: [
      {
        id: 'do-it',
        label: '이번에 하기',
        outcomes: [
          {
            weight: 1,
            text: '수술은 잘 끝났어요. {name:은/는} 회복 기간 동안 간식을 두 배로 받았어요.',
            effects: { health: 3, happiness: -1, lifespan: 2, flags: ['neutered'] },
          },
        ],
      },
      {
        id: 'skip',
        label: '{name}에게 맞지 않는 것 같아 하지 않기로 하기',
        outcomes: [
          {
            weight: 1,
            text: '수의사 선생님과 상의해 정기 검진을 꼼꼼히 받기로 했어요.',
            effects: { ease: -2, flags: ['neutered'] },
          },
        ],
      },
    ],
  },
  {
    id: 'teen-rebellion',
    category: 'growth',
    tones: ['cheerful'],
    stages: ['young'],
    boostTraits: ['stubborn', 'mischief'],
    text: ['{name:이/가} 요즘 불러도 못 들은 척을 해요. 사춘기인가 봐요.'],
    choices: [
      {
        id: 'train',
        label: '간식을 들고 기본 훈련 다시 하기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'bond',
            text: '"앉아" 한 마디에 엉덩이가 바닥에 착. 사춘기 끝!',
            effects: { bond: 4, happiness: 1 },
          },
          {
            weight: 1,
            hinderedBy: 'bond',
            text: '간식만 받아먹고 도망갔어요. 그래도 조금씩 나아지고 있어요.',
            effects: { bond: 1, happiness: 2 },
          },
        ],
      },
      {
        id: 'patience',
        label: '그럴 때도 있지, 기다려 주기',
        outcomes: [
          {
            weight: 1,
            text: '몇 달 뒤, {name:은/는} 언제 그랬냐는 듯 다시 껌딱지가 됐어요.',
            effects: { happiness: 3, bond: 2 },
          },
        ],
      },
    ],
  },

  // ─── 일상 (선택 없음) ─────────────────────────────────────────
  {
    id: 'zoomies',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['puppy', 'young', 'adult'],
    text: [
      '{name:이/가} 밤 10시만 되면 거실을 우다다 질주해요.',
      '목욕을 마친 {name:이/가} 소파와 침대 사이를 열 바퀴 왕복했어요.',
    ],
    effects: { happiness: 3 },
  },
  {
    id: 'snack-thief',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    boostTraits: ['foodie'],
    text: [
      '식탁 위 고구마가 사라졌어요. 범인은 입가에 노란 흔적을 묻힌 {name}.',
      '{name:이/가} 장바구니에 머리를 넣고 한참을 나오지 않았어요.',
    ],
    effects: { happiness: 2, health: -1 },
  },
  {
    id: 'first-snow',
    category: 'daily',
    tones: ['cheerful', 'calm'],
    stages: ['puppy', 'young', 'adult', 'senior'],
    cooldown: 12,
    text: [
      '첫눈이 왔어요. {name:은/는} 눈밭에 얼굴을 파묻고 한참을 놀았어요.',
      '눈 오는 날, {name}의 발자국이 마당에 꽃잎처럼 찍혔어요.',
    ],
    effects: { happiness: 4, bond: 1 },
  },
  {
    id: 'delivery',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    text: ['{name:은/는} 오늘도 택배 기사님께 우렁차게 인사했어요. 기사님은 오늘도 놀라셨어요.'],
    effects: { happiness: 1, sociability: -1 },
  },
  {
    id: 'sunbath',
    category: 'daily',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior', 'elderly'],
    text: [
      '창가 햇살 아래에서 {name:이/가} 배를 드러내고 낮잠을 자요.',
      '빨래 바구니 위가 {name}의 새 낮잠 자리가 됐어요.',
    ],
    effects: { happiness: 2 },
  },
  {
    id: 'walk-friend',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult'],
    when: { min: { sociability: 50 } },
    text: ['산책길에서 단짝 친구가 생겼어요. 만나기만 하면 꼬리가 프로펠러가 돼요.'],
    effects: { sociability: 3, happiness: 3 },
  },
  {
    id: 'tail-chase',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['puppy', 'young'],
    text: ['{name:이/가} 자기 꼬리를 잡으려고 열 바퀴를 돌았어요. 결국 못 잡았어요.'],
    effects: { happiness: 2 },
  },
  {
    id: 'sock-collector',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['puppy', 'young', 'adult'],
    boostTraits: ['mischief'],
    text: ['짝 잃은 양말들이 {name}의 방석 밑에서 발견됐어요.'],
    effects: { happiness: 2, bond: 1 },
  },
  {
    id: 'waiting-door',
    category: 'daily',
    tones: ['calm', 'touching'],
    stages: ['young', 'adult', 'senior', 'elderly'],
    boostTraits: ['clingy'],
    text: ['늦게 들어온 날, {name:이/가} 현관 앞에서 꼬리를 흔들며 기다리고 있었어요.'],
    effects: { bond: 3 },
  },
  {
    id: 'bath-day',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['puppy', 'young', 'adult', 'senior'],
    text: ['목욕하는 날. {name:은/는} 욕실 앞에서 갑자기 다리가 풀린 척을 했어요.'],
    effects: { happiness: -1, health: 1 },
  },
  {
    id: 'grooming',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    when: { coatTypes: ['long', 'curly'] },
    text: ['미용을 마친 {name:이/가} 거울 앞에서 멈칫했어요. 그래도 귀여워!'],
    effects: { happiness: 1, health: 1 },
  },
  {
    id: 'thunder',
    category: 'daily',
    tones: ['calm', 'touching'],
    stages: ['young', 'adult', 'senior', 'elderly'],
    boostTraits: ['timid'],
    text: ['천둥 치는 밤, {name:이/가} 이불 속으로 파고들었어요. 꼭 안아 주니 금세 잠들었어요.'],
    effects: { bond: 3, happiness: -1 },
  },
  {
    id: 'yard-patrol',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    when: { household: ['yard'] },
    text: [
      '{name:은/는} 오늘도 마당을 순찰했어요. 참새들이 긴장하는 게 느껴져요.',
      '마당 한구석에 {name:이/가} 판 구덩이가 하나 더 늘었어요.',
    ],
    effects: { happiness: 3 },
  },
  {
    id: 'sigor-pride',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    when: { nicknames: ['시고르자브종'] },
    text: ['동네 강아지들이 모두 {name:을/를} 알아요. 시고르자브종의 위엄이란.'],
    effects: { happiness: 2, sociability: 2 },
  },
  {
    id: 'jindo-guard',
    category: 'daily',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior'],
    when: { nicknames: ['진도믹스'] },
    text: ['{name:은/는} 가족이 모두 들어올 때까지 현관을 지켰어요.'],
    effects: { bond: 3 },
  },
  {
    id: 'jindo-guard-pure',
    category: 'daily',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior'],
    when: { breeds: ['jindo'] },
    text: ['{name:은/는} 가족이 모두 들어올 때까지 현관을 지켰어요. 든든한 우리 집 진돗개.'],
    effects: { bond: 3 },
  },
  {
    id: 'golden-friend',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    when: { nicknames: ['골댕이'] },
    text: ['{name:은/는} 공원에서 처음 본 사람에게도 공을 가져다줬어요. 역시 골댕이.'],
    effects: { sociability: 3, happiness: 2 },
  },
  {
    id: 'holiday',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    cooldown: 12,
    text: ['명절에 친척들이 모였어요. {name:은/는} 용돈 대신 간식을 잔뜩 받았어요.'],
    effects: { happiness: 3, sociability: 2, health: -1 },
  },
  {
    id: 'owner-sick',
    category: 'daily',
    tones: ['touching', 'calm'],
    stages: ['young', 'adult', 'senior'],
    text: ['감기로 며칠을 앓아누웠어요. 그동안 {name:이/가} 침대 옆을 한 번도 떠나지 않았어요.'],
    effects: { bond: 4 },
    memorable: true,
  },
  {
    id: 'rainy-week',
    category: 'daily',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior'],
    cooldown: 12,
    text: ['장마가 일주일째예요. {name:은/는} 현관만 바라보며 한숨을 쉬어요.'],
    effects: { happiness: -6 },
  },
  {
    id: 'upset-tummy',
    category: 'daily',
    tones: ['calm', 'cheerful'],
    stages: ['puppy', 'young', 'adult', 'senior'],
    boostTraits: ['foodie'],
    text: ['{name:이/가} 산책길에서 뭘 주워 먹었는지 배탈이 났어요. 하루 종일 기운이 없었어요.'],
    effects: { happiness: -6, health: -3 },
  },
  {
    id: 'vet-visit',
    category: 'daily',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior', 'elderly'],
    text: ['병원 가는 날. {name:은/는} 병원 문 앞에서 갑자기 다리에 힘을 풀었어요.'],
    effects: { happiness: -4, health: 2 },
  },
  {
    id: 'noisy-neighbor',
    category: 'daily',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior', 'elderly'],
    boostTraits: ['timid'],
    text: ['옆집 공사 소리에 {name:이/가} 며칠째 예민해요. 방석을 조용한 방으로 옮겨 줬어요.'],
    effects: { happiness: -5 },
  },
  {
    id: 'busy-week',
    category: 'daily',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior'],
    text: ['정신없이 바쁜 한 주였어요. 산책이 짧았던 만큼 주말엔 꼭 공원에 가기로 {name}에게 약속했어요.'],
    effects: { happiness: -5, ease: -3 },
  },
  {
    id: 'friend-moved',
    category: 'daily',
    tones: ['touching'],
    stages: ['young', 'adult', 'senior'],
    when: { min: { sociability: 50 } },
    once: true,
    text: ['단짝 산책 친구가 멀리 이사를 갔어요. {name:은/는} 그 골목에서 한참 동안 냄새를 맡았어요.'],
    effects: { happiness: -7 },
  },
  {
    id: 'gray-muzzle',
    category: 'daily',
    tones: ['calm', 'touching'],
    stages: ['senior'],
    once: true,
    text: ['{name}의 주둥이가 하얗게 셌어요. 그래도 눈빛은 처음 만난 날 그대로예요.'],
    effects: { bond: 2 },
  },
  {
    id: 'slow-walk',
    category: 'daily',
    tones: ['calm', 'touching'],
    stages: ['elderly'],
    text: [
      '{name}의 걸음이 느려졌어요. 대신 산책길 꽃 냄새를 오래오래 맡아요.',
      '짧아진 산책. 그래도 {name:은/는} 매일 같은 벤치에서 한참 바람을 쐬요.',
    ],
    effects: { happiness: 2 },
  },
  {
    id: 'photo-album',
    category: 'senior',
    tones: ['touching'],
    stages: ['elderly'],
    once: true,
    memorable: true,
    text: ['오래된 사진첩을 꺼냈어요. 처음 만난 날의 {name:은/는} 이렇게 작았네요.'],
    effects: { bond: 4, happiness: 2 },
  },

  // ─── 건강 (견종 경향) ─────────────────────────────────────────
  {
    id: 'patella',
    category: 'health',
    tones: ['calm'],
    stages: ['adult', 'senior'],
    when: { health: ['patella'] },
    text: ['{name:이/가} 산책 중에 가끔 뒷다리를 들고 깡총 뛰어요. 슬개골이 안 좋대요.'],
    choices: [
      {
        id: 'surgery',
        label: '수술하기',
        outcomes: [
          {
            weight: 3,
            favoredBy: 'health',
            text: '수술과 재활을 잘 마쳤어요. {name:은/는} 다시 신나게 뛰어다녀요.',
            effects: { health: 6, happiness: -2, ease: -10, lifespan: 3 },
            memorable: true,
          },
          {
            weight: 1,
            text: '회복이 조금 더디지만 {name:은/는} 매일 조금씩 나아지고 있어요.',
            effects: { health: 3, happiness: -4, ease: -10, lifespan: 1 },
          },
        ],
      },
      {
        id: 'muscle',
        label: '체중 관리와 근육 운동부터 해 보기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'bond',
            text: '꾸준한 운동 덕분에 다리가 튼튼해졌어요. 수술 없이 지나갔어요.',
            effects: { health: 4, happiness: -4, bond: 2 },
          },
          {
            weight: 1,
            text: '운동만으로는 부족해서 결국 수술을 받았어요. 지금은 잘 지내요.',
            effects: { health: 3, happiness: -4, ease: -10 },
          },
        ],
      },
      {
        id: 'ramp',
        label: '집에 경사로와 미끄럼 방지 매트 깔기',
        outcomes: [
          {
            weight: 1,
            text: '집 안이 {name} 맞춤형으로 바뀌었어요. 다리 부담이 훨씬 줄었어요.',
            effects: { health: 2, happiness: -2, ease: -4, lifespan: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'dental',
    category: 'health',
    tones: ['calm', 'cheerful'],
    stages: ['adult', 'senior'],
    when: { health: ['dental'] },
    text: ['{name}의 입냄새가 심해졌어요. 치석이 많이 쌓였대요.'],
    choices: [
      {
        id: 'scaling',
        label: '스케일링 받기',
        outcomes: [
          {
            weight: 1,
            text: '반짝반짝 새 이빨! {name:은/는} 딱딱한 간식도 다시 잘 먹어요.',
            effects: { health: 4, ease: -6, lifespan: 2 },
          },
        ],
      },
      {
        id: 'brushing',
        label: '매일 양치 습관 들이기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'bond',
            text: '치약 맛에 반했는지 {name:이/가} 양치 시간만 되면 먼저 와서 앉아요.',
            effects: { health: 3, bond: 2, lifespan: 1 },
          },
          {
            weight: 1,
            hinderedBy: 'bond',
            text: '칫솔만 보면 도망가서 결국 스케일링도 함께 받았어요.',
            effects: { health: 3, ease: -6 },
          },
        ],
      },
    ],
  },
  {
    id: 'skin',
    category: 'health',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior'],
    when: { health: ['skin'] },
    text: ['{name:이/가} 자꾸 몸을 긁어요. 피부 알레르기가 있대요.'],
    choices: [
      {
        id: 'food',
        label: '알레르기 검사 후 사료 바꾸기',
        outcomes: [
          {
            weight: 2,
            text: '닭고기가 범인이었어요. 사료를 바꾸니 긁는 횟수가 확 줄었어요.',
            effects: { health: 4, happiness: -1, ease: -4 },
          },
          {
            weight: 1,
            text: '원인을 찾는 데 시간이 걸렸지만, 이제 맞는 사료를 찾았어요.',
            effects: { health: 2, happiness: -4, ease: -5 },
          },
        ],
      },
      {
        id: 'care',
        label: '약욕과 약으로 꾸준히 관리하기',
        outcomes: [
          {
            weight: 1,
            text: '일주일에 두 번 약욕. {name:은/는} 욕실 앞 연기가 점점 늘었어요.',
            effects: { health: 3, happiness: -5, ease: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'disc',
    category: 'health',
    tones: ['calm'],
    stages: ['adult', 'senior'],
    when: { health: ['disc'] },
    text: ['소파에서 뛰어내린 뒤로 {name:이/가} 허리를 아파해요. 디스크 초기래요.'],
    choices: [
      {
        id: 'rest',
        label: '약 먹으며 한동안 쉬게 하기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'health',
            text: '한 달 동안 푹 쉬었더니 {name:이/가} 다시 꼬리를 힘차게 흔들어요.',
            effects: { health: 3, happiness: -5, ease: -3 },
          },
          {
            weight: 1,
            text: '쉬어도 나아지지 않아 수술을 받았어요. 지금은 조심조심 잘 걸어요.',
            effects: { health: 3, happiness: -4, ease: -12 },
          },
        ],
      },
      {
        id: 'home',
        label: '계단을 막고 소파에 경사로 놓기',
        outcomes: [
          {
            weight: 1,
            text: '{name:은/는} 경사로를 자기 전용 미끄럼틀처럼 써요.',
            effects: { health: 2, happiness: -2, ease: -4, lifespan: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'diet',
    category: 'health',
    tones: ['cheerful'],
    stages: ['adult', 'senior'],
    when: { health: ['obesity'] },
    boostTraits: ['foodie'],
    text: ['{name}의 허리가 사라졌어요. 수의사 선생님이 다이어트를 권했어요.'],
    choices: [
      {
        id: 'walk-more',
        label: '간식은 줄이고 산책은 늘리기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'bond',
            text: '석 달 만에 허리 라인 복귀! 산책 덕분에 둘 다 건강해졌어요.',
            effects: { health: 5, bond: 2, happiness: -1, lifespan: 2 },
          },
          {
            weight: 1,
            hinderedBy: 'bond',
            text: '간식 앞에서 짓는 표정에 자꾸 져서 다이어트는 천천히 가는 중이에요.',
            effects: { health: 2, happiness: 2 },
          },
        ],
      },
      {
        id: 'diet-food',
        label: '체중 관리 사료로 바꾸기',
        outcomes: [
          {
            weight: 1,
            text: '새 사료가 마음에 드는지 {name:은/는} 그릇까지 핥아 먹어요.',
            effects: { health: 3, ease: -3, lifespan: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'eye',
    category: 'health',
    tones: ['calm'],
    stages: ['senior', 'elderly'],
    when: { health: ['eye'] },
    text: ['{name}의 눈이 조금 뿌옇게 보여요. 백내장 초기래요.'],
    choices: [
      {
        id: 'surgery',
        label: '수술하기',
        outcomes: [
          {
            weight: 1,
            text: '수술 뒤 {name:이/가} 공을 다시 정확하게 물어 와요.',
            effects: { health: 3, ease: -10 },
          },
        ],
      },
      {
        id: 'drops',
        label: '안약으로 진행을 늦추기',
        outcomes: [
          {
            weight: 1,
            text: '매일 안약 넣는 시간. {name:은/는} 끝나면 간식이 나온다는 걸 알아요.',
            effects: { health: 1, happiness: -4, bond: 2, ease: -2 },
          },
        ],
      },
    ],
  },
  {
    id: 'heart',
    category: 'health',
    tones: ['calm', 'touching'],
    stages: ['senior', 'elderly'],
    when: { health: ['heart'] },
    text: ['정기 검진에서 {name}의 심장 소리가 조금 다르대요.'],
    choices: [
      {
        id: 'medicine',
        label: '심장약을 꾸준히 먹이기',
        outcomes: [
          {
            weight: 1,
            text: '하루 두 번 약 먹는 시간이 생겼어요. {name:은/는} 약을 간식 속에 숨겨도 다 알아요.',
            effects: { health: 2, ease: -4, lifespan: 4 },
          },
        ],
      },
      {
        id: 'gentle',
        label: '산책을 짧고 천천히 바꾸기',
        outcomes: [
          {
            weight: 1,
            text: '천천히 걷는 산책도 좋아요. 같이 걷는 시간이 오히려 길어졌어요.',
            effects: { happiness: 1, bond: 2, lifespan: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'checkup',
    category: 'health',
    tones: ['calm'],
    stages: ['senior'],
    text: ['{name}도 이제 시니어예요. 건강 검진을 받아 볼까요?'],
    choices: [
      {
        id: 'full',
        label: '종합 검진 받기',
        outcomes: [
          {
            weight: 3,
            text: '검진 결과 모두 양호! 선생님이 관리를 잘했다고 칭찬해 주셨어요.',
            effects: { health: 3, ease: -5, lifespan: 3 },
          },
          {
            weight: 1,
            text: '작은 문제를 일찍 찾아서 금방 치료했어요. 검진받길 정말 잘했어요.',
            effects: { health: 4, ease: -7, lifespan: 4 },
          },
        ],
      },
      {
        id: 'basic',
        label: '기본 검진만 받고 집에서 잘 지켜보기',
        outcomes: [
          {
            weight: 1,
            text: '기본 검진은 모두 괜찮았어요. 집에서 체중과 식사량을 꼼꼼히 적기로 했어요.',
            effects: { health: 1, ease: -2, lifespan: 1 },
          },
        ],
      },
    ],
  },

  // ─── 가족 ─────────────────────────────────────────────────────
  {
    id: 'move-house',
    category: 'family',
    tones: ['calm', 'cheerful'],
    stages: ['adult'],
    when: { householdExcludes: ['yard', 'stayed'] },
    text: ['이사를 가게 됐어요. 어떤 집이 {name}에게 좋을까요?'],
    choices: [
      {
        id: 'yard',
        label: '마당 있는 시골집으로 가기',
        outcomes: [
          {
            weight: 1,
            text: '마당에 발을 디딘 {name:이/가} 세상 다 가진 얼굴로 뛰어다녔어요.',
            effects: { happiness: 6, sociability: -2, householdFlags: ['yard'] },
            memorable: true,
          },
        ],
      },
      {
        id: 'stay',
        label: '산책 친구가 있는 익숙한 동네에 남기',
        outcomes: [
          {
            weight: 1,
            text: '같은 동네 다른 집으로. {name:은/는} 단골 산책길을 그대로 지켰어요.',
            effects: { bond: 3, sociability: 2, householdFlags: ['stayed'] },
          },
        ],
      },
    ],
  },
  {
    id: 'new-job',
    category: 'family',
    tones: ['calm'],
    stages: ['young', 'adult', 'senior'],
    text: ['새 일을 시작하게 됐어요. 집을 비우는 시간이 길어져요.'],
    choices: [
      {
        id: 'daycare',
        label: '강아지 유치원에 보내기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'sociability',
            text: '{name:은/는} 유치원에서 반장이 됐대요. 알림장이 매일 자랑으로 가득해요.',
            effects: { sociability: 5, happiness: 2, ease: -6 },
          },
          {
            weight: 1,
            hinderedBy: 'sociability',
            text: '유치원은 조금 시끄러웠나 봐요. 대신 펫시터 선생님과 단둘이 산책하기로 했어요.',
            effects: { happiness: 1, ease: -6 },
          },
        ],
      },
      {
        id: 'dawn-walk',
        label: '출근 전 새벽 산책을 길게 하기',
        outcomes: [
          {
            weight: 1,
            text: '새벽 공기를 함께 마시는 시간이 생겼어요. 해 뜨는 걸 같이 본 날도 많아요.',
            effects: { bond: 4, health: 2, ease: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'new-baby',
    category: 'family',
    tones: ['cheerful', 'touching'],
    stages: ['adult', 'senior'],
    text: ['집에 아기가 태어났어요! {name:은/는} 낯선 울음소리에 귀를 쫑긋 세웠어요.'],
    choices: [
      {
        id: 'introduce',
        label: '아기 냄새부터 천천히 맡게 해 주기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'sociability',
            text: '{name:은/는} 아기 침대 옆을 지키는 든든한 보디가드가 됐어요.',
            effects: { happiness: 3, bond: 3 },
            memorable: true,
          },
          {
            weight: 1,
            hinderedBy: 'sociability',
            text: '처음엔 살짝 질투했지만, 아기가 웃자 {name}도 꼬리를 흔들었어요.',
            effects: { happiness: 1, bond: 2 },
          },
        ],
      },
      {
        id: 'own-time',
        label: '{name}만을 위한 시간을 꼭 지켜 주기',
        outcomes: [
          {
            weight: 1,
            text: '매일 저녁 30분은 {name}만의 시간. 덕분에 질투 없이 아기와도 친해졌어요.',
            effects: { bond: 5, happiness: 2, ease: -3 },
          },
        ],
      },
    ],
  },
  {
    id: 'trip',
    category: 'family',
    tones: ['cheerful'],
    stages: ['young', 'adult', 'senior'],
    when: { min: { ease: 45 } },
    text: ['연휴에 여행을 가기로 했어요. {name:과/와}는 어떻게 할까요?'],
    choices: [
      {
        id: 'together',
        label: '반려견 동반 숙소로 함께 가기',
        outcomes: [
          {
            weight: 2,
            favoredBy: 'sociability',
            text: '{name}의 첫 바다! 파도를 쫓다가 파도에 쫓겨 왔어요.',
            effects: { happiness: 6, bond: 3, ease: -6 },
            memorable: true,
          },
          {
            weight: 1,
            hinderedBy: 'sociability',
            text: '낯선 곳이 조금 무서웠지만, 숙소 침대만큼은 금방 자기 자리로 만들었어요.',
            effects: { happiness: 2, bond: 3, ease: -6 },
          },
        ],
      },
      {
        id: 'day-trip',
        label: '가까운 계곡으로 당일치기 하기',
        outcomes: [
          {
            weight: 1,
            text: '계곡물에 발만 담그고도 {name:은/는} 하루 종일 신이 났어요.',
            effects: { happiness: 4, ease: -2 },
          },
        ],
      },
    ],
  },

  // ─── 노견 ─────────────────────────────────────────────────────
  {
    id: 'sofa-climb',
    category: 'senior',
    tones: ['calm'],
    stages: ['elderly'],
    text: ['{name:이/가} 소파에 오르는 걸 힘들어해요.'],
    choices: [
      {
        id: 'ramp',
        label: '소파 옆에 경사로 만들어 주기',
        outcomes: [
          {
            weight: 1,
            text: '경사로를 천천히 걸어 올라온 {name:이/가} 자랑스러운 얼굴로 자리를 잡았어요.',
            effects: { happiness: 3, health: 1, ease: -3 },
          },
        ],
      },
      {
        id: 'cushion',
        label: '바닥에 폭신한 방석 자리 만들어 주기',
        outcomes: [
          {
            weight: 1,
            text: '새 방석이 마음에 들었나 봐요. 거기서 하루 대부분을 보내요.',
            effects: { happiness: 2, bond: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'night-wander',
    category: 'senior',
    tones: ['calm', 'touching'],
    stages: ['elderly'],
    text: ['{name:이/가} 밤에 집 안을 천천히 빙빙 돌아요. 나이가 들면 흔한 일이래요.'],
    choices: [
      {
        id: 'day-walks',
        label: '낮에 짧은 산책을 자주 하기',
        outcomes: [
          {
            weight: 1,
            text: '낮에 햇볕을 많이 쬐니 밤에 푹 자는 날이 늘었어요.',
            effects: { happiness: 2, health: 1 },
          },
        ],
      },
      {
        id: 'night-light',
        label: '밤에 은은한 불을 켜 두고 곁에 있기',
        outcomes: [
          {
            weight: 1,
            text: '작은 불빛 아래에서 {name:은/는} 다시 편안하게 잠들어요.',
            effects: { happiness: 1, bond: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'sight-fading',
    category: 'senior',
    tones: ['calm', 'touching'],
    stages: ['elderly'],
    once: true,
    text: ['{name:이/가} 가끔 벽에 부딪혀요. 가구 자리를 그대로 두기로 했어요.'],
    effects: { health: -1, bond: 2 },
  },
  {
    id: 'terminal-illness',
    category: 'senior',
    tones: ['touching'],
    stages: ['elderly'],
    when: { minTogether: 24, max: { health: 55 } },
    // 무작위 사건 풀에 넣으면 노년 사건이 적어 거의 매번 뽑힌다. 노견기에 달마다 낮은 확률로만 온다.
    urgent: { chance: 0.006 },
    once: true,
    memorable: true,
    text: ['{name:이/가} 큰 병을 진단받았어요. 치료하기 어려운 병이래요. 남은 시간을 더 소중히 보내기로 했어요.'],
    effects: { health: -8, bond: 3, terminal: [4, 12] },
  },
  {
    id: 'farewell',
    category: 'senior',
    tones: ['touching'],
    stages: ['elderly'],
    when: { requires: ['terminal-illness'], max: { health: 35 } },
    urgent: { chance: 0.5 },
    once: true,
    alwaysAsk: true,
    text: ['{name:이/가} 많이 힘들어해요. 수의사 선생님과 오래 이야기를 나눴어요.'],
    choices: [
      {
        id: 'peaceful',
        label: '수의사와 상의해 편안하게 보내 주기',
        tags: ['euthanasia'],
        autoWeight: 0,
        outcomes: [
          {
            weight: 1,
            text: '{name:은/는} 가족 품에 안겨 편안하게 잠들었어요.',
            effects: { pass: true },
            memorable: true,
          },
        ],
      },
      {
        id: 'home-care',
        label: '남은 시간을 집에서 함께 돌보기',
        outcomes: [
          {
            weight: 1,
            text: '{name:은/는} 좋아하는 담요 위에서 가족과 함께 남은 시간을 보내고 있어요.',
            effects: { bond: 4, happiness: 3 },
            memorable: true,
          },
        ],
      },
    ],
  },
];
