const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Role = require('./models/Role');

dotenv.config();

const defaultRoles = [
    {
        name: 'Owner',
        description: 'Systems owner with full access',
        permissions: ['tasks', 'finance', 'ai_chat', 'security', 'admin', 'marketing', 'events']
    },
    {
        name: 'Admin',
        description: 'Administrator with most management capabilities',
        permissions: ['tasks', 'finance', 'ai_chat', 'security', 'admin']
    },
    {
        name: 'User',
        description: 'Regular user with standard access',
        permissions: ['tasks', 'finance', 'ai_chat']
    },
    {
        name: 'Guest',
        description: 'Limited access guest user',
        permissions: ['tasks']
    }
];

const seedRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding roles...');

        for (const roleData of defaultRoles) {
            await Role.findOneAndUpdate(
                { name: roleData.name },
                roleData,
                { upsert: true, new: true }
            );
            console.log(`Seeded/Updated role: ${roleData.name}`);
        }

        console.log('Role seeding completed!');
        process.exit();
    } catch (error) {
        console.error('Error seeding roles:', error);
        process.exit(1);
    }
};

seedRoles();
