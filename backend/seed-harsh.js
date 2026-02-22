/**
 * seed-harsh.js
 * Run once to create Harsh's personal login on Atlas.
 * Usage: node seed-harsh.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅  Connected to Atlas\n');

        // Remove old account if exists (idempotent)
        await User.deleteOne({ email: 'harsh@personal.app' });

        await User.create({
            name: 'Harsh Sahu',
            email: 'harsh@personal.app',
            password: 'Harsh@123',       // will be hashed by pre-save hook
            role: 'owner',
        });

        console.log('✅  Harsh\'s account created on Atlas!');
        console.log('   Email    : harsh@personal.app');
        console.log('   Password : Harsh@123');
        console.log('   DB       : harsh_personal\n');
        process.exit(0);
    } catch (err) {
        console.error('❌  Seed failed:', err.message);
        process.exit(1);
    }
};

seed();
