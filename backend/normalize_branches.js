const { connectToDB, getDB } = require('./mongo');

async function normalizeBranches() {
  try {
    await connectToDB();
    const db = getDB();

    // Update Hyderabad to Hyderabad Branch
    const result1 = await db.collection('users').updateMany(
      { branch: 'Hyderabad' },
      { $set: { branch: 'Hyderabad Branch' } }
    );
    console.log('Updated Hyderabad users:', result1.modifiedCount);

    // Update Mumbai to Mumbai Branch
    const result2 = await db.collection('users').updateMany(
      { branch: 'Mumbai' },
      { $set: { branch: 'Mumbai Branch' } }
    );
    console.log('Updated Mumbai users:', result2.modifiedCount);

    // Update BDE to Business Development Executive
    const result3 = await db.collection('users').updateMany(
      { role: 'BDE' },
      { $set: { role: 'Business Development Executive' } }
    );
    console.log('Updated BDE roles:', result3.modifiedCount);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

normalizeBranches();