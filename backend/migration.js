
const { connectToDB, getDB } = require('./mongo');

const hardcodedTeamData = {
    "Hyderabad Branch": {
        "drives": {
            "2025 Performance": {
                "type": "team-based",
                "bdes": {
                    "Pratik T": {
                        "designation": "Deputy Branch Manager"
                    },
                    "T Rajesh": {
                        "designation": "Team Leader"
                    },
                    "Priyanka Rai": {
                        "designation": "Business Development Executive",
                        "inactive": true
                    },
                    "Phanindra": {
                        "designation": "Business Development Executive"
                    },
                    "Bayana Rakesh": {
                        "designation": "Business Development Executive"
                    },
                    "Zohra Baig": {
                        "designation": "Business Development Executive"
                    },
                    "Ishtiyaque": {
                        "designation": "Team Leader"
                    },
                    "Preksha Shukla": {
                        "designation": "Business Development Executive"
                    },
                    "Shubham Kashyap": {
                        "designation": "Business Development Executive"
                    },
                    "Gulafsha": {
                        "designation": "Business Development Executive"
                    },
                    "Harshavardhan": {
                        "designation": "Business Development Executive"
                    },
                    "Abhishek B": {
                        "designation": "Deputy Branch Manager"
                    },
                    "Hema": {
                        "designation": "Business Development Executive"
                    },
                    "Varun K": {
                        "designation": "Business Development Executive"
                    },
                    "Siddharth": {
                        "designation": "Business Development Executive"
                    },
                    "Ankita": {
                        "designation": "Business Development Executive"
                    },
                    "Abhinav": {
                        "designation": "Business Development Executive"
                    },
                    "Ranadeep": {
                        "designation": "Business Development Executive"
                    },
                    "A Soumya": {
                        "designation": "Business Development Executive"
                    },
                    "Shreya Singh": {
                        "designation": "Business Development Executive"
                    },
                    "Meda Rosaiah": {
                        "designation": "Business Development Executive"
                    },
                    "Gaganam Mohan": {
                        "designation": "Business Development Executive"
                    },
                    "Kukati Reethu": {
                        "designation": "Business Development Executive"
                    },
                    "Nitya Garg": {
                        "designation": "Business Development Executive"
                    },
                     "HikeVP": {
                        "designation": "Admin",
                        "inactive": false
                    },
                },
                "teams": {
                    "Marcos": {
                        "DBM" : "Pratik T",
                        "leader": "T Rajesh",
                        "members": ["Priyanka", "Priyanka Rai", "Phanindra", "Bayana Rakesh", "Shreya Singh", "Meda Rosaiah", "Abhinav", "Ranadeep", "A Soumya", "Ankita" ]
                    },
                    "Team B": {
                        "DBM" : "Pratik T",
                        "leader": "Ishtiyaque",
                        "members": ["Preksha Shukla", "Shubham Kashyap", "Gulafsha", "Harshavardhan", "Hema", "Varun K", "Siddharth", "Gaganam Mohan", "Kukati Reethu", "Nitya Garg" ]
                    }
                }
            }
        }
    },
    "Mumbai Branch": {
        "drives": {
            "2025 Performance": {
                "type": "team-based",
                "bdes": {
                    "Shashank T": {
                        "designation": "Deputy Branch Manager"
                    },
                    "Abhishek": {
                        "designation": "Deputy Branch Manager"
                    },
                    "Lakhan": {
                        "designation": "Team Leader",
                        "inactive": true
                    },
                    "Atharv": {
                        "designation": "Team Leader"
                    },
                    "Mahesh": {
                        "designation": "Team Leader"
                    },
                    "Vishal": {
                        "designation": "Team Leader"
                    },
                    "Harsh": {
                        "designation": "Team Leader"
                    },
                    "Aryan": {
                        "designation": "Business Development Executive"
                    },
                    "Vatsh": {
                        "designation": "Business Development Executive"
                    },
                    "Yash B": {
                        "designation": "Business Development Executive"
                    },
                    "Sakshi": {
                        "designation": "Business Development Executive"
                    },
                    "Aniket": {
                        "designation": "Business Development Executive"
                    },
                    "Siddesh": {
                        "designation": "Business Development Executive"
                    },
                    "Prajakta": {
                        "designation": "Business Development Executive"
                    },
                    "Reva": {
                        "designation": "Business Development Executive"
                    },
                    "Adarsh": {
                        "designation": "Business Development Executive"
                    },
                    "Chandan": {
                        "designation": "Business Development Executive"
                    },
                    "Shaheen": {
                        "designation": "Business Development Executive"
                    },
                    "Shruti": {
                        "designation": "Business Development Executive"
                    },
                    "Jeswin": {
                        "designation": "Business Development Executive"
                    },
                    "Mohit": {
                        "designation": "Business Development Executive"
                    },
                    "Parshvi": {
                        "designation": "Business Development Executive"
                    },
                    "Akshata": {
                        "designation": "Business Development Executive"
                    },
                    "Sahil": {
                        "designation": "Business Development Executive"
                    },
                    "Parshva": {
                        "designation": "Business Development Executive"
                    },
                    "Yashpreet": {
                        "designation": "Business Development Executive"
                    },
                    "Pranali": {
                        "designation": "Business Development Executive"
                    },
                    "Yash S": {
                        "designation": "Business Development Executive"
                    },
				  
				    "Abbas": {
				      "designation": "Business Development Executive"
				 },
                },
                "teams": {
                    "Team Virat": {
                        "DBM" : "Shashank T",
                        "leader": "Lakhan",
                        "members": ["Aryan", "Vatsh", "Yash B", "Sakshi", "Aniket"]
                    },
                    "Mini Wolf": {
                        "DBM" : "Shashank T",
                        "leader": "Atharv",
                        "members": ["Siddesh", "Prajakta", "Reva", "Adarsh", "Chandan", "Shaheen"]
                    },
                    "Mahesh ki Mandali": {
                        "DBM" : "Abhishek",
                        "leader": "Mahesh",
                        "members": ["Shruti", "Jeswin", "Mohit"]
                    },
                    "Team Astras": {
                        "DBM" : "Abhishek",
                        "leader": "Vishal",
                        "members": ["Parshvi", "Akshata", "Sahil", "Parshva", "Yashpreet"]
                    },
                    "Team Velocity": {
                        "DBM" : "Abhishek",
                        "leader": "Harsh",
                        "members": ["Pranali", "Yash S", "Abbas" ]
                    }
                }
            }
        }
    }
};

async function migrate() {
    await connectToDB();
    const db = getDB();
    const usersCollection = db.collection('users');

    // Check if migration has already been run
    const migrationDoc = await db.collection('migrations').findOne({ name: 'initial_user_migration' });
    if (migrationDoc) {
        console.log('Migration has already been run. Skipping...');
        return;
    }

    const users = [];
    for (const branch in hardcodedTeamData) {
        const bdes = hardcodedTeamData[branch].drives['2025 Performance'].bdes;
        for (const name in bdes) {
            users.push({
                name,
                role: bdes[name].designation,
                branch,
                inactive: bdes[name].inactive || false,
            });
        }
    }

    try {
        await usersCollection.deleteMany({});
        await usersCollection.insertMany(users);

        // Mark migration as completed
        await db.collection('migrations').insertOne({
            name: 'initial_user_migration',
            completedAt: new Date(),
            description: 'Initial migration of users from hardcoded team data'
        });

        console.log('Successfully migrated users to the users collection.');
    } catch (error) {
        console.error('Error migrating users:', error);
    } finally {
        // The script will exit, and the connection will close.
        // If you had a persistent connection, you'd close it here.
    }
}

migrate();

module.exports = { migrate };
