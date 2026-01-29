require('dotenv').config({ path: './backend/.env' });

const { connectToDB, getDB } = require('./mongo');
const bcrypt = require('bcryptjs');

// User data matching the login credentials
const USERS_DATA = [
  {
    name: 'HikeVP',
    email: 'HikeVP',
    role: 'Admin',
    branch: 'Hyderabad Branch',
    password: 'Hike@Akash'
  },
  {
    name: 'HikeManagerMUM',
    email: 'HikeManagerMUM',
    role: 'Deputy Branch Manager',
    branch: 'Mumbai Branch',
    password: 'Hike@MUM'
  },
  {
    name: 'HikeOP',
    email: 'HikeOP',
    role: 'Operations',
    branch: 'Hyderabad Branch',
    password: 'Hike@Kiran'
  },
  {
    name: 'HikeDev',
    email: 'HikeDev',
    role: 'Admin',
    branch: 'Hyderabad Branch',
    password: 'Hike@Aditya'
  },
  {
    name: 'Hike@ManagerHyd',
    email: 'Hike@ManagerHyd',
    role: 'Deputy Branch Manager',
    branch: 'Hyderabad Branch',
    password: 'Hike@Pratik'
  },
  {
    name: 'HikeSanju',
    email: 'HikeSanju',
    role: 'Team Leader',
    branch: 'Mumbai Branch',
    password: 'Hike@Sanjana'
  },
  {
    name: 'HikeWolf',
    email: 'HikeWolf',
    role: 'Business Development Executive',
    branch: 'Mumbai Branch',
    password: 'Hike@Shashank'
  },
  {
    name: 'HikeVaibhav',
    email: 'Vaibhav.goud@hikeeducation.in',
    role: 'Admin',
    branch: 'Hyderabad Branch',
    password: 'Vaibhav123'
  }
];

async function setupUsers() {
  try {
    await connectToDB();
    const db = getDB();
    const usersCollection = db.collection('users');

    console.log('Setting up database users with hashed passwords...');

    for (const userData of USERS_DATA) {
        // Check if user already exists
        const existingUser = await usersCollection.findOne({ name: userData.name });

        if (!existingUser) {
            // Create new user
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(userData.password, salt);

            const result = await usersCollection.insertOne({
                name: userData.name,
                email: userData.email,
                role: userData.role,
                branch: userData.branch,
                password: hashedPassword,
                inactive: false
            });

            console.log(`✓ Created user: ${userData.name}`);
        } else {
            // User exists - only update if they don't have a password (incomplete setup)
            if (!existingUser.password) {
                const salt = bcrypt.genSaltSync(10);
                const hashedPassword = bcrypt.hashSync(userData.password, salt);

                await usersCollection.updateOne(
                    { name: userData.name },
                    {
                        $set: {
                            email: userData.email,
                            password: hashedPassword,
                            inactive: false
                        }
                    }
                );
                console.log(`✓ Completed setup for user: ${userData.name}`);
            } else {
                console.log(`✓ User ${userData.name} already exists with complete setup. Skipping.`);
            }
        }
    }

    console.log('\n🎯 Default users are now stored in the database with hashed passwords.');
    console.log('The credentials.json file is no longer used for authentication.');

  } catch (error) {
    console.error('Error setting up users:', error);
  }
  process.exit(0);
}

setupUsers();
