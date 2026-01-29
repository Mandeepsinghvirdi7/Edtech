
require('dotenv').config();
console.log('--- Environment Check ---');
console.log('Current Working Directory:', process.cwd());
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('--- End Check ---');
