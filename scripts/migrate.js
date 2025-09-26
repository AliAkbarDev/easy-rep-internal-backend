const { supabaseAdmin } = require('../src/config/supabase');
const { logger } = require('../src/config/logger');

const migrations = [

  {
    name: 'create_profiles_table',
    sql: `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        phone TEXT,
        bio TEXT,
        avatar TEXT,
        location TEXT,
        website TEXT,
        social_links JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  },

  // Create storage bucket for uploads
  {
    name: 'create_uploads_bucket',
    sql: `
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('uploads', 'uploads', true)
      ON CONFLICT (id) DO NOTHING;
    `
  },

  // Storage policies
  {
    name: 'storage_policies',
    sql: `
      -- Users can upload files to their own folder
      CREATE POLICY "Users can upload files" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'uploads' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );

      -- Users can view files in their own folder
      CREATE POLICY "Users can view own files" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'uploads' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );

      -- Users can delete files in their own folder
      CREATE POLICY "Users can delete own files" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'uploads' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );

      -- Admins can view all files
      CREATE POLICY "Admins can view all files" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'uploads' AND
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );

      -- Admins can delete all files
      CREATE POLICY "Admins can delete all files" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'uploads' AND
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    `
  }
];

async function runMigrations() {
  logger.info('Starting database migrations...');

  for (const migration of migrations) {
    try {
      logger.info(`Running migration: ${migration.name}`);
      
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: migration.sql
      });

      if (error) {
        logger.error(`Migration ${migration.name} failed:`, error.message);
        throw error;
      }

      logger.info(`Migration ${migration.name} completed successfully`);
    } catch (error) {
      logger.error(`Migration ${migration.name} failed:`, error.message);
      process.exit(1);
    }
  }

  logger.info('All migrations completed successfully!');
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    logger.error('Migration script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runMigrations }; 