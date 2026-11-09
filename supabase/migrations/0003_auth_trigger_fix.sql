-- Make phone and blood_group nullable (they will be filled in the profile completion step)
ALTER TABLE public.profiles
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN blood_group DROP NOT NULL;

-- 1. Drop the old broken trigger + function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.fn_handle_new_user();

-- 2. Create a clean trigger function that only inserts the id
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email, -- Automatically grabs the email from auth.users
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Donor'
    ),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 3. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_new_user();