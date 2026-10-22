-- Local-only assertions for the disposable Supabase database.
-- Run after the migrations on the local stack; never run against a remote target.
\set ON_ERROR_STOP on

create temporary table test_ids (name text primary key, id uuid not null) on commit drop;
insert into test_ids values
  ('owner', '00000000-0000-0000-0000-000000000001'),
  ('admin', '00000000-0000-0000-0000-000000000002'),
  ('other', '00000000-0000-0000-0000-000000000003');

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

select assert_true(to_regclass('public.admin_memberships') is not null, 'admin_memberships exists');
select assert_true(to_regclass('public.deposit_requests') is not null, 'deposit_requests exists');
select assert_true(to_regclass('public.account_ledger') is not null, 'account_ledger exists');
select assert_true((select relrowsecurity from pg_class where oid = 'public.admin_memberships'::regclass), 'admin memberships RLS');
select assert_true((select relrowsecurity from pg_class where oid = 'public.deposit_requests'::regclass), 'deposit requests RLS');
select assert_true((select relrowsecurity from pg_class where oid = 'public.account_ledger'::regclass), 'ledger RLS');
select assert_true(to_regprocedure('public.review_deposit_request(uuid,text,text)') is not null, 'review RPC exists');

select assert_true((select count(*) = 4 from information_schema.columns where table_schema = 'public' and table_name = 'deposit_requests' and column_name in ('id','user_id','asset','network','requested_usd','status')), 'deposit columns');
select assert_true((select data_type = 'numeric' from information_schema.columns where table_schema = 'public' and table_name = 'deposit_requests' and column_name = 'requested_usd'), 'requested_usd numeric');
select assert_true((select count(*) = 3 from pg_indexes where schemaname = 'public' and indexname in ('deposit_requests_user_created_idx','deposit_requests_status_created_idx','account_ledger_user_created_idx')), 'accounting indexes');
select assert_true((select count(*) >= 7 from pg_constraint where conrelid = 'public.deposit_requests'::regclass and contype = 'c'), 'deposit checks');
select assert_true((select count(*) >= 2 from pg_trigger where tgrelid = 'public.deposit_requests'::regclass and not tgisinternal), 'deposit triggers');
select assert_true((select count(*) >= 2 from pg_trigger where tgrelid = 'public.account_ledger'::regclass and not tgisinternal), 'ledger triggers');
select assert_true(has_table_privilege('authenticated', 'public.deposit_requests', 'SELECT,INSERT'), 'owner table grants');
select assert_true(not has_table_privilege('authenticated', 'public.account_ledger', 'INSERT'), 'ledger insert revoked');
select assert_true(has_function_privilege('authenticated', 'public.review_deposit_request(uuid,text,text)', 'EXECUTE'), 'review execute granted');
select assert_true(not has_function_privilege('anon', 'public.review_deposit_request(uuid,text,text)', 'EXECUTE'), 'anon review execute revoked');

-- Auth fixtures are synthetic and inserted only by the local database runner.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
select id, 'authenticated', 'authenticated', name || '@local.test', crypt('local-test-only', gen_salt('bf')), now()
from test_ids;
insert into public.admin_memberships(user_id) select id from test_ids where name = 'admin';

-- Each authorization assertion starts its own transaction so SET LOCAL is effective.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', (select id::text from test_ids where name = 'owner'), true);
  select assert_true(current_user = 'authenticated', 'effective authenticated role');
  select assert_true(auth.uid() = (select id from test_ids where name = 'owner'), 'owner JWT identity');
  insert into public.deposit_requests (user_id, asset, network, requested_usd, estimated_token_amount, destination_wallet)
  select id, 'SOL', 'Solana', 100, 1.25, 'HxDWxdDWoMUErQ3Y3JdiVd9xi23UU9V8fjvbqwkEaurT' from test_ids where name = 'owner';
commit;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', (select id::text from test_ids where name = 'other'), true);
  select assert_true((select count(*) from public.deposit_requests) = 0, 'other cannot read owner request');
  select assert_true((select count(*) from public.account_ledger) = 0, 'other cannot read owner ledger');
rollback;

-- Invalid writes and caller-controlled accounting/review fields must fail and roll back.
do $$
begin
  begin
    insert into public.deposit_requests (user_id, asset, network, requested_usd, destination_wallet)
    values ('00000000-0000-0000-0000-000000000001', 'ETH', 'Solana', 100, '0x41eb9c5dcaaf1090bc371b5a462bc5cc66c21d62');
    raise exception 'invalid asset/network accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.deposit_requests (user_id, asset, network, requested_usd, status, reviewed_by, reviewed_at, destination_wallet)
    values ('00000000-0000-0000-0000-000000000001', 'SOL', 'Solana', 100, 'approved', '00000000-0000-0000-0000-000000000002', now(), 'HxDWxdDWoMUErQ3Y3JdiVd9xi23UU9V8fjvbqwkEaurT');
    raise exception 'caller-controlled approval accepted';
  exception when check_violation or insufficient_privilege then null;
  end;
end $$;

-- Non-admin review is rejected; admin reviewing another user's pending request succeeds.
begin
  set local role authenticated;
  select set_config('request.jwt.claim.sub', (select id::text from test_ids where name = 'owner'), true);
  do $$ begin
    begin perform public.review_deposit_request((select id from public.deposit_requests limit 1), 'approved', null); raise exception 'non-admin review accepted';
    exception when insufficient_privilege then null; end;
  end $$;
commit;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', (select id::text from test_ids where name = 'admin'), true);
  select assert_true(auth.uid() = (select id from test_ids where name = 'admin'), 'admin JWT identity');
  select public.review_deposit_request((select id from public.deposit_requests limit 1), 'approved', 'local approval');
  select assert_true((select count(*) from public.account_ledger) = 1, 'exactly one approved credit');
  select assert_true((select l.amount_usd = d.requested_usd and l.user_id = d.user_id and l.created_by = d.reviewed_by from public.account_ledger l join public.deposit_requests d on d.id = l.deposit_request_id), 'credit matches approved request');
commit;

-- Repeat review uses the migration's documented 40001 contract and cannot duplicate credit.
do $$ begin
  begin perform public.review_deposit_request((select id from public.deposit_requests limit 1), 'approved', null); raise exception 'repeat review accepted';
  exception when serialization_failure then null; end;
end $$;
select assert_true((select count(*) from public.account_ledger) = 1, 'repeat review did not duplicate credit');

-- Trigger protections use the migration's documented 42501 contract.
do $$ begin
  begin update public.account_ledger set amount_usd = 999; raise exception 'ledger update accepted'; exception when insufficient_privilege then null; end;
  begin delete from public.account_ledger; raise exception 'ledger delete accepted'; exception when insufficient_privilege then null; end;
end $$;

select assert_true((select count(*) = 1 from pg_trigger where tgname = 'deposit_requests_credit_consistency' and tgrelid = 'public.deposit_requests'::regclass and tgdeferrable and tginitdeferred), 'deferred consistency trigger');
select assert_true((select count(*) = 1 from pg_trigger where tgname = 'account_ledger_append_only' and tgrelid = 'public.account_ledger'::regclass), 'append-only trigger attached');
select 'local deposit-accounting assertions passed; genuine concurrency requires a separate two-session harness' as result;
