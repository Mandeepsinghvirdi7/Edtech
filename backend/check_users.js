const { connectToDB, getDB } = require('./mongo');

async function checkUsers() {
  try {
    await connectToDB();
    const db = getDB();
    const users = await db.collection('users').find({}).toArray();
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Branch: ${user.branch}, Has Password: ${!!user.password}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkUsers();
