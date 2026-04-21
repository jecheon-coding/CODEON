export type Difficulty = "하" | "중" | "상";

export type TestCase = {
  id: string;
  problem_id: string;
  input: string | null;
  expected_output: string;
  is_hidden: boolean;
  display_order: number;
  created_at?: string;
};

export type Problem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  topic: string | null;
  content: string;               // 문제 설명
  input_description: string | null;
  output_description: string | null;
  constraints: string | null;    // 제한조건
  initial_code: string;          // 에디터 초기 코드
  correct_answer: string | null; // 단순 정답 비교용
  hint: string | null;           // 선생님 정적 힌트
  example_input:  string | null; // 문제 직접 입력 예시 (DB 확장 시 사용)
  example_output: string | null; // 문제 직접 출력 예시 (DB 확장 시 사용)
  test_cases?: TestCase[];       // 테스트케이스 (별도 조회 후 병합)
  // 커뮤니티 도전 문제 전용 (nullable — 기존 문제는 이 필드 없음)
  author_user_id?:           string | null;
  is_community?:             boolean;
  like_count?:               number;
  solve_count?:              number;
  community_difficulty_avg?: number | null;
  author_name?:              string | null; // 쿼리 후 client에서 join해서 채움
};

export type AdjacentProblem = {
  id: string;
  title: string;
} | null;

export type SubmissionStatus =
  | "correct"      // 정답
  | "wrong"        // 오답
  | "error"        // 런타임/문법 에러
  | "no_criteria"  // 채점 기준 데이터 없음 (시스템 오류 아님)
  | "";            // 미제출

export type ReactionType = '재밌어요' | '설명이 좋아요' | '창의적이에요' | '헷갈려요';
export type ReactionCount = Record<ReactionType, number>;

export const REACTION_TYPES: ReactionType[] = [
  '재밌어요', '설명이 좋아요', '창의적이에요', '헷갈려요',
];

export type MyCommunityStats = {
  createdCount:  number;
  solvedCount:   number;
  likesReceived: number;
  weeklyHot:     number;
};

export type Submission = {
  user_id: string;    // DB users.id (UUID) — Google·credentials 모두 동일
  problem_id: string;
  code: string;
  output: string;
  result: string;     // '정답' | '오답' | '런타임 에러'
  is_correct: boolean;
};
