-- 학부모 강사 상담 신청
create table if not exists consult_requests (
  id          uuid        primary key default gen_random_uuid(),
  parent_id   uuid        references users(id) on delete cascade,
  parent_name text        not null,
  student_name text,                         -- 연결된 학생 이름 (있으면)
  message     text        not null,
  status      text        not null default 'pending',  -- 'pending' | 'resolved'
  admin_memo  text,                          -- 관리자 메모
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists consult_requests_status_idx on consult_requests(status);
create index if not exists consult_requests_parent_idx on consult_requests(parent_id);
