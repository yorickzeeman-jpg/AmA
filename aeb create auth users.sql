insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  (gen_random_uuid(), 'yorick@x',    crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Yorick"}'),
  (gen_random_uuid(), 'leandre@x',   crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Leandre"}'),
  (gen_random_uuid(), 'nokulunga@x', crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Nokulunga"}'),
  (gen_random_uuid(), 'tevin@x',     crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Tevin"}'),
  (gen_random_uuid(), 'sesi@x',      crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Sesi"}'),
  (gen_random_uuid(), 'daleen@x',    crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Daleen"}'),
  (gen_random_uuid(), 'mahlatse@x',  crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Mahlatse"}'),
  (gen_random_uuid(), 'ithasia@x',   crypt('Yorick2017', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{"name":"Ithasia"}');
