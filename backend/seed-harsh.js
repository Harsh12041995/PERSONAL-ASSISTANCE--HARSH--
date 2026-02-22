/**
 * seed-harsh.js
 * Run once to create Harsh's personal login credential.
 * Usage: node seed-harsh.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const seed = async () => {
    try {
        // Remove old Harsh account if exists (idempotent re-run)
        await User.deleteOne({ email: 'harsh@personal.app' });

        await User.create({
            first_name: 'Harsh',
            last_name: 'Sahu',
            email: 'harsh@personal.app',
            password: 'Harsh@2024',
            role: {
                name: 'Owner',
                permissions: ['all_access']
            },
            company: {
                name: 'Personal Space',
                code: 'HARSH'
            },
            groups: {
                solar_groups: [],
                solar_groups_ids: []
            }
        });

        console.log('');
        console.log('✅  Harsh\'s account created!');
        console.log('');
        console.log('   Email    : harsh@personal.app');
        console.log('   Password : Harsh@2024');
        console.log('');
        process.exit(0);
    } catch (err) {
        console.error('❌  Failed to seed credential:', err.message);
        process.exit(1);
    }
};

seed();
