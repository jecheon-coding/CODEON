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
  example_input:  string | null;
  example_output: string | null;
  time_limit_ms:  number | null; // 실행 시간 제한 (ms). NULL = 제한 없음
  test_cases?: TestCase[];
  // 커뮤니티 도전 문제 전용 (nullable — 기존 문제는 이 필드 없음)
  author_user_id?:           string | null;
  is_community?:             boolean;
  like_count?:               number;
  solve_count?:              number;
  community_difficulty_avg?: number | null;
  author_name?:              string | null;
};

export type AdjacentProblem = {
  id: string;
  title: string;
} | null;

export type SubmissionStatus =
  | "correct"      // 정답
  | "wrong"        // 오답
  | "timeout"      // 시간 초과
  | "error"        // 런타임/문법 에러
  | "no_criteria"  // 채점 기준 데이터 없음
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
  weeklyHotName: string | null;
};

export type Submission = {
  user_id: string;
  problem_id: string;
  code: string;
  output: string;
  result: string;     // '정답' | '오답' | '시간초과' | '런타임 에러'
  is_correct: boolean;
};
