const { supabaseAdmin } = require('../src/config/supabase');
const { logger } = require('../src/config/logger');
const bcrypt = require('bcryptjs');



const seedData = {
  // Test users
  testUsers: [
    {
      email: 'user1@easyrep.com',
      password: 'UserPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      status: 'active'
    },
    {
      email: 'user2@easyrep.com',
      password: 'UserPassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
      status: 'active'
    },
    {
      email: 'moderator@easyrep.com',
      password: 'ModeratorPassword123!',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'moderator',
      status: 'active'
    }
  ]
};


async function createUser(userData) {
  try {
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role
      }
    });

    if (authError) {
      logger.error(`Auth creation error for ${userData.email}:`, authError.message);
      return false;
    }

    // Create user profile in database
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          status: userData.status,
          created_at: new Date().toISOString()
        }
      ]);

    if (profileError) {
      logger.error(`Profile creation error for ${userData.email}:`, profileError.message);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return false;
    }

    logger.info(`User created successfully: ${userData.email}`);
    return true;
  } catch (error) {
    logger.error(`User creation error for ${userData.email}:`, error.message);
    return false;
  }
}

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
  logger.info('Starting database seeding...');

  try {

    // Create test users
    logger.info('Creating test users...');
    for (const userData of seedData.testUsers) {
      const userCreated = await createUser(userData);
      if (!userCreated) {
        logger.error(`Failed to create user: ${userData.email}`);
      }
    }


    logger.info('Database seeding completed successfully!');

  } catch (error) {
    logger.error('Database seeding failed:', error.message);
    process.exit(1);
  }
}

async function clearSeedData() {
  logger.info('Clearing seed data...');

  try {
    // Delete all profiles (this will cascade to related tables)
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .in('email', [
        seedData.adminUser.email,
        ...seedData.testUsers.map(user => user.email)
      ]);

    if (error) {
      logger.error('Error clearing seed data:', error.message);
    } else {
      logger.info('Seed data cleared successfully');
    }
  } catch (error) {
    logger.error('Error clearing seed data:', error.message);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'clear') {
    clearSeedData().catch((error) => {
      logger.error('Clear seed data failed:', error.message);
      process.exit(1);
    });
  } else {
    seedDatabase().catch((error) => {
      logger.error('Database seeding failed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { seedDatabase, clearSeedData }; 