-- Create bitbadges_tokens table
CREATE TABLE IF NOT EXISTS bitbadges_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    bitbadges_address TEXT,
    chain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS bitbadges_tokens_user_id_idx ON bitbadges_tokens(user_id);

-- Create RLS policies
ALTER TABLE bitbadges_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to only see their own tokens
CREATE POLICY "Users can view their own tokens"
    ON bitbadges_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own tokens
CREATE POLICY "Users can insert their own tokens"
    ON bitbadges_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own tokens
CREATE POLICY "Users can update their own tokens"
    ON bitbadges_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tokens
CREATE POLICY "Users can delete their own tokens"
    ON bitbadges_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bitbadges_tokens_updated_at
    BEFORE UPDATE ON bitbadges_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 