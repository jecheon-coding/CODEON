import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { SubmissionStatus } from "@/types/problem";

interface Props {
  output: string;
  status: SubmissionStatus;
}

const STATUS_CONFIG = {
  correct: {
    bar:   "bg-emerald-50 border-emerald-200 text-emerald-700",
    Icon:  CheckCircle2,
    label: "정답입니다! 잘했어요.",
  },
  wrong: {
    bar:   "bg-red-50 border-red-200 text-red-600",
    Icon:  XCircle,
    label: "틀렸습니다. 다시 시도해 보세요.",
  },
  error: {
    bar:   "bg-yellow-50 border-yellow-200 text-yellow-700",
    Icon:  AlertCircle,
    label: "코드 실행 중 오류가 발생했습니다.",
  },
} as const;

export default function OutputPanel({ output, status }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 출력 창 */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-400 mb-2">출력</p>
        <pre className="text-sm text-gray-800 font-mono min-h-[2rem] whitespace-pre-wrap">
          {output || (
            <span className="text-gray-300">
              코드를 실행하면 결과가 여기에 표시됩니다.
            </span>
          )}
        </pre>
      </div>

      {/* 채점 결과 배지 */}
      {status && status in STATUS_CONFIG && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium
            ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].bar}`}
        >
          {(() => { const { Icon } = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]; return <Icon size={15} />; })()}
          <span>{STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}</span>
        </div>
      )}
    </div>
  );
}
