import React, { useState, useCallback, useEffect, useRef } from 'react';
import styles from './styles.module.css';

// --- Mock Data and Types ---
type SubmissionStatus = 'unsubmitted' | 'in-progress' | 'correct' | 'incorrect' | 'error';

const problemData = {
  id: 'P001',
  title: '두 수의 합',
  type: '알고리즘',
  difficulty: 2, // 1 to 5
  course: '코딩 테스트 입문',
  description: '정수 배열 `nums`와 정수 `target`이 주어집니다. `nums`의 두 원소를 더해 `target`을 만들 수 있는 인덱스를 찾아 반환하세요. 각 입력에 정확히 하나의 솔루션이 있다고 가정하며, 동일한 요소를 두 번 사용할 수 없습니다. 순서는 상관없습니다.',
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    '-10^9 <= target <= 10^9',
    '정답은 유일하게 존재합니다.',
  ],
  ioExamples: [
    {
      input: 'nums = [2, 7, 11, 15], target = 9',
      output: '[0, 1]',
      explanation: 'nums[0] + nums[1] == 9 이므로, [0, 1]을 반환합니다.',
    },
    {
      input: 'nums = [3, 2, 4], target = 6',
      output: '[1, 2]',
      explanation: '',
    },
  ],
  hint: '해시 테이블(객체 또는 Map)을 사용하여 각 숫자의 값과 인덱스를 저장해두면, 순회하면서 `target`과의 차이가 해시 테이블에 있는지 O(1) 시간 복잡도로 확인할 수 있습니다.',
  initialCode: `function solution(nums, target) {\n  // 여기에 코드를 작성하세요.\n  \n}`,
};

const submissionResultData = {
  correct: {
    status: 'correct' as SubmissionStatus,
    message: '정답입니다!',
    details: [
      { case: 1, passed: true, time: '0.01ms' },
      { case: 2, passed: true, time: '0.02ms' },
      { case: 3, passed: true, time: '0.05ms' },
      { case: 4, passed: true, time: '0.03ms' },
      { case: 5, passed: true, time: '0.08ms' },
    ],
  },
  incorrect: {
    status: 'incorrect' as SubmissionStatus,
    message: '오답입니다. 다시 시도해보세요.',
    details: [
      { case: 1, passed: true, time: '0.01ms' },
      { case: 2, passed: true, time: '0.02ms' },
      { case: 3, passed: false, time: '0.05ms', expected: '[1, 2]', got: '[0, 2]' },
      { case: 4, passed: true, time: '0.03ms' },
      { case: 5, passed: false, time: '0.08ms', expected: '[0, 1]', got: '[1, 0]' },
    ],
  },
};

// --- Helper Components ---

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <i className={`${styles.icon} ${className}`}>{name}</i>
);

const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className={styles.copyButton} title="복사하기">
      <Icon name={copied ? 'check' : 'content_copy'} />
    </button>
  );
};

const StatusBadge = ({ status }: { status: SubmissionStatus }) => {
  const badgeInfo = {
    unsubmitted: { text: '미제출', className: styles.badgeDefault },
    'in-progress': { text: '시도 중', className: styles.badgeInProgress },
    correct: { text: '정답', className: styles.badgeCorrect },
    incorrect: { text: '오답', className: styles.badgeIncorrect },
    error: { text: '에러', className: styles.badgeError },
  };
  const { text, className } = badgeInfo[status];
  return <span className={`${styles.statusBadge} ${className}`}>{text}</span>;
};

const DifficultyStars = ({ level }: { level: number }) => (
  <div className={styles.difficulty}>
    {[...Array(5)].map((_, i) => (
      <span key={i} className={i < level ? styles.starFilled : styles.starEmpty}>★</span>
    ))}
  </div>
);

// --- Main Component ---

export default function ProblemSolvingPage() {
  const [code, setCode] = useState(problemData.initialCode);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('unsubmitted');
  const [activeTab, setActiveTab] = useState<'output' | 'result'>('output');
  const [runOutput, setRunOutput] = useState('실행 결과가 여기에 표시됩니다.');
  const [submissionResult, setSubmissionResult] = useState(submissionResultData.incorrect);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save simulation
  const [saveStatus, setSaveStatus] = useState('Saved');
  useEffect(() => {
    setSaveStatus('Saving...');
    const handler = setTimeout(() => {
      setSaveStatus('Saved');
    }, 1000);
    return () => clearTimeout(handler);
  }, [code]);

  // Resizable panel logic
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(300);

  const handleMouseDown = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (rightPanelRef.current) {
        const newHeight = rightPanelRef.current.getBoundingClientRect().bottom - e.clientY;
        if (newHeight > 100 && newHeight < window.innerHeight - 200) {
          setPanelHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleRun = () => {
    setRunOutput('코드를 실행 중입니다...');
    setActiveTab('output');
    setTimeout(() => {
      setRunOutput(`실행 결과:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]`);
    }, 1000);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setActiveTab('result');
    setTimeout(() => {
      const isCorrect = Math.random() > 0.5;
      setSubmissionStatus(isCorrect ? 'correct' : 'incorrect');
      setSubmissionResult(isCorrect ? submissionResultData.correct : submissionResultData.incorrect);
      setIsSubmitting(false);
    }, 2000);
  };

  const handleResetCode = () => {
    if (window.confirm('작성한 코드를 초기화하시겠습니까?')) {
      setCode(problemData.initialCode);
    }
  };

  const handleRestoreCode = () => {
    alert('마지막 제출 코드를 복원했습니다.');
    // 실제 구현: setCode(lastSubmittedCode);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Navigation & Breadcrumb */}
      <header className={styles.pageHeader}>
        <button className={styles.backButton}>
          <span className={styles.backArrow}>←</span>
          <span>목록으로</span>
        </button>
        <div className={styles.breadcrumb}>
          <span>{problemData.course}</span>
          <Icon name="chevron_right" />
          <span>{problemData.type}</span>
          <Icon name="chevron_right" />
          <span>{problemData.id}</span>
        </div>
      </header>

      <main className={styles.mainLayout}>
        {/* Left: Problem Description Panel */}
        <div className={styles.problemPanel}>
          <div className={styles.problemBadges}>
            <span className={styles.problemType}>{problemData.type}</span>
            <DifficultyStars level={problemData.difficulty} />
            <StatusBadge status={submissionStatus} />
          </div>

          <h1 className={styles.problemTitle}>{problemData.title}</h1>
          
          <div className={styles.submissionInfo}>
            <span>제출 횟수: 5회</span>
            <span>마지막 제출: 2024-05-21 14:30</span>
          </div>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>문제 설명</h2>
            <p className={styles.cardBody}>{problemData.description}</p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>제한사항</h2>
            <ul className={`${styles.cardBody} ${styles.list}`}>
              {problemData.constraints.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>입출력 예시</h2>
            {problemData.ioExamples.map((ex, i) => (
              <div key={i} className={styles.ioExample}>
                <div className={styles.ioPair}>
                  <div className={styles.ioBox}>
                    <div className={styles.ioHeader}>
                      <span>입력</span>
                      <CopyButton textToCopy={ex.input} />
                    </div>
                    <pre><code>{ex.input}</code></pre>
                  </div>
                  <div className={styles.ioBox}>
                    <div className={styles.ioHeader}>
                      <span>출력</span>
                      <CopyButton textToCopy={ex.output} />
                    </div>
                    <pre><code>{ex.output}</code></pre>
                  </div>
                </div>
                {ex.explanation && <p className={styles.ioExplanation}><strong>설명:</strong> {ex.explanation}</p>}
              </div>
            ))}
          </section>

          <section className={`${styles.card} ${styles.hintCard}`}>
            <h2 className={styles.cardTitle}>
              <Icon name="lightbulb" /> 힌트
            </h2>
            <p className={styles.cardBody}>{problemData.hint}</p>
          </section>
        </div>

        {/* Right: Code Workspace Panel */}
        <div className={styles.workspacePanel} ref={rightPanelRef}>
          <div className={styles.editorContainer}>
            <header className={styles.editorHeader}>
              <div className={styles.fileInfo}>
                <Icon name="description" />
                <span>solution.js</span>
              </div>
              <div className={styles.editorActions}>
                <span className={styles.saveStatus}>{saveStatus}</span>
                <select className={styles.languageSelector}>
                  <option>JavaScript</option>
                  <option>Python</option>
                  <option>Java</option>
                </select>
                <button onClick={handleRestoreCode} className={styles.headerButton} title="마지막 제출 코드 복원">
                  <Icon name="history" />
                </button>
                <button onClick={handleResetCode} className={styles.headerButton} title="코드 초기화">
                  <Icon name="refresh" />
                </button>
                <div className={styles.problemNav}>
                  <button className={styles.headerButton} title="이전 문제">
                    <Icon name="chevron_left" />
                  </button>
                  <button className={styles.headerButton} title="다음 문제">
                    <Icon name="chevron_right" />
                  </button>
                </div>
              </div>
            </header>
            <div className={styles.editor}>
              {/* Monaco Editor가 렌더링될 위치 */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.mockEditor}
                spellCheck="false"
              />
            </div>
          </div>

          <div className={styles.resizer} ref={resizerRef} onMouseDown={handleMouseDown}></div>

          <div className={styles.resultPanel} style={{ height: `${panelHeight}px` }}>
            <div className={styles.resultTabs}>
              <button
                className={`${styles.tabButton} ${activeTab === 'output' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('output')}
              >
                실행 결과
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'result' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('result')}
              >
                제출 결과
                {submissionStatus !== 'unsubmitted' && (
                  <span className={`${styles.tabIndicator} ${styles[submissionStatus]}`}></span>
                )}
              </button>
            </div>
            <div className={styles.resultContent}>
              {activeTab === 'output' && (
                <div className={styles.outputTab}>
                  <details open>
                    <summary className={styles.collapsibleSummary}>테스트 입력</summary>
                    <textarea className={styles.testInput} placeholder="테스트에 사용할 입력을 여기에 넣으세요."></textarea>
                  </details>
                  <pre className={styles.runOutput}>{runOutput}</pre>
                </div>
              )}
              {activeTab === 'result' && (
                <div className={styles.submissionTab}>
                  {isSubmitting ? (
                    <div className={styles.loading}>
                      <div className={styles.spinner}></div>
                      <p>채점 중입니다... 숨겨진 테스트 케이스를 포함하여 검사합니다.</p>
                    </div>
                  ) : submissionStatus === 'unsubmitted' ? (
                    <div className={styles.placeholder}>
                      <Icon name="assignment_turned_in" />
                      <p>코드를 제출하여 결과를 확인하세요.</p>
                    </div>
                  ) : (
                    <div className={styles.submissionResult}>
                      <div className={`${styles.resultHeader} ${styles[submissionResult.status]}`}>
                        <Icon name={submissionResult.status === 'correct' ? 'check_circle' : 'cancel'} />
                        <h3>{submissionResult.message}</h3>
                      </div>
                      <div className={styles.resultDetails}>
                        {submissionResult.details.map((item) => (
                          <div key={item.case} className={styles.testCase}>
                            <div className={styles.caseStatus}>
                              {item.passed ? (
                                <Icon name="check" className={styles.caseCorrect} />
                              ) : (
                                <Icon name="close" className={styles.caseIncorrect} />
                              )}
                              <span>테스트 {item.case}</span>
                            </div>
                            <div className={styles.caseResult}>
                              {item.passed ? (
                                <span className={styles.caseCorrect}>통과</span>
                              ) : (
                                <span className={styles.caseIncorrect}>실패</span>
                              )}
                            </div>
                            <div className={styles.caseTime}>{item.time}</div>
                            {!item.passed && (
                              <div className={styles.caseDiff}>
                                <div><strong>기대값:</strong> <code>{item.expected}</code></div>
                                <div><strong>실행결과:</strong> <code>{item.got}</code></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {submissionStatus === 'correct' && (
                        <div className={styles.nextAction}>
                          <p>훌륭합니다! 다음 문제에 도전해보세요.</p>
                          <button className={styles.nextProblemButton}>
                            다음 문제로 <Icon name="arrow_forward" />
                          </button>
                        </div>
                      )}
                       {submissionStatus === 'incorrect' && (
                        <div className={styles.nextAction}>
                          <p>아쉽네요. 힌트를 확인하거나 코드를 수정하여 다시 시도해보세요.</p>
                          <div>
                            <button className={styles.viewHintButton}>
                              <Icon name="lightbulb" /> 힌트 보기
                            </button>
                            <button className={styles.submitButton} onClick={handleSubmit}>
                              <Icon name="redo" /> 다시 제출
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button className={styles.runButton} onClick={handleRun}>
              <Icon name="play_arrow" />
              <span>실행</span>
            </button>
            <button className={styles.submitButton} onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '채점 중...' : '제출 후 채점'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}