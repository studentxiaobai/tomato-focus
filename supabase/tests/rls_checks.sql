begin;
select plan(8);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'tasks', 'tasks exists');
select has_table('public', 'music_tracks', 'music tracks exists');
select has_table('public', 'study_sessions', 'study sessions exists');
select has_function('public', 'complete_focus_session', 'completion RPC exists');
select has_function('public', 'get_study_stats', 'statistics RPC exists');
select policies_are('public', 'tasks', array['Users can view own tasks', 'Users can create own tasks', 'Users can update own tasks', 'Users can delete own tasks'], 'task policies exist');
select policies_are('public', 'study_sessions', array['Users can view own sessions', 'Users can create own sessions', 'Users can delete own sessions'], 'session policies exist');

select * from finish();
rollback;
