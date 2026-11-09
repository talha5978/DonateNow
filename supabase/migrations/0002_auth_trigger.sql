-- 1. Create the trigger function
create or replace function fn_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, phone, blood_group, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Donor'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'blood_group',
    now()
  );
  return new;
end;
$$;

-- 2. Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.fn_handle_new_user();