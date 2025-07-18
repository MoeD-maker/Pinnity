-- Migration: Create profiles table and user management triggers
-- This migration creates a unified user management system using Supabase Auth + profiles table

-- Create profiles table that references auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    address TEXT,
    user_type TEXT NOT NULL DEFAULT 'individual' CHECK (user_type IN ('individual', 'business', 'admin')),
    phone_verified BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create businesses table that references profiles
CREATE TABLE IF NOT EXISTS public.businesses (
    id SERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_category TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    government_id TEXT,
    proof_of_address TEXT,
    proof_of_business TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        phone,
        address,
        user_type,
        phone_verified,
        marketing_consent,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.user_metadata->>'firstName', NEW.user_metadata->>'first_name'),
        COALESCE(NEW.user_metadata->>'lastName', NEW.user_metadata->>'last_name'),
        NEW.phone,
        NEW.user_metadata->>'address',
        COALESCE(NEW.user_metadata->>'userType', 'individual'),
        COALESCE((NEW.user_metadata->>'phoneVerified')::boolean, false),
        COALESCE((NEW.user_metadata->>'marketingConsent')::boolean, false),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles SET
        email = NEW.email,
        first_name = COALESCE(NEW.user_metadata->>'firstName', NEW.user_metadata->>'first_name'),
        last_name = COALESCE(NEW.user_metadata->>'lastName', NEW.user_metadata->>'last_name'),
        phone = NEW.phone,
        address = NEW.user_metadata->>'address',
        user_type = COALESCE(NEW.user_metadata->>'userType', user_type),
        phone_verified = COALESCE((NEW.user_metadata->>'phoneVerified')::boolean, phone_verified),
        marketing_consent = COALESCE((NEW.user_metadata->>'marketingConsent')::boolean, marketing_consent),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();

-- Create RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Enable read access for service role (for admin functions)
CREATE POLICY "Service role can read all profiles" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can read their own business
CREATE POLICY "Business owners can read own business" ON public.businesses
    FOR SELECT USING (profile_id = auth.uid());

-- Policy: Business owners can update their own business
CREATE POLICY "Business owners can update own business" ON public.businesses
    FOR UPDATE USING (profile_id = auth.uid());

-- Policy: Enable full access for service role (for admin functions)
CREATE POLICY "Service role can manage all businesses" ON public.businesses
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_businesses_profile_id ON public.businesses(profile_id);
CREATE INDEX IF NOT EXISTS idx_businesses_verification_status ON public.businesses(verification_status);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();