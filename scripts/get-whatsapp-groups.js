#!/usr/bin/env node

/**
 * Script untuk mendapatkan daftar grup WhatsApp dari Fontte API
 */

import { config } from '../src/config.js';
import axios from 'axios';

async function getWhatsAppGroups() {
    console.log('🔍 Getting WhatsApp Groups from Fontte API...\n');

    if (!config.fontteToken) {
        console.log('❌ FONTTE_TOKEN is required!');
        console.log('💡 Add your token to .env file: FONTTE_TOKEN=your_token_here');
        console.log('   Get token from: https://fontte.com/');
        return;
    }

    try {
        console.log('📡 Fetching device info...');

        // Get device info and groups
        const response = await axios.post('https://api.fonnte.com/get-devices', {}, {
            headers: {
                'Authorization': config.fontteToken
            }
        });

        if (response.data && response.data.length > 0) {
            console.log(`✅ Found ${response.data.length} device(s)\n`);

            response.data.forEach((device, index) => {
                console.log(`📱 Device ${index + 1}: ${device.device || 'Unknown'}`);
                console.log(`   Status: ${device.status || 'Unknown'}`);
                console.log(`   Phone: ${device.phone || 'Unknown'}`);

                if (device.groups && device.groups.length > 0) {
                    console.log(`   👥 Groups (${device.groups.length}):`);

                    device.groups.forEach((group, groupIndex) => {
                        console.log(`      ${groupIndex + 1}. ${group.name || 'Unnamed Group'}`);
                        console.log(`         ID: ${group.id}`);
                        console.log(`         Participants: ${group.participants || 'Unknown'}`);
                        console.log('');
                    });
                } else {
                    console.log('   👥 No groups found for this device\n');
                }
            });

            // Generate .env format
            const allGroups = response.data.flatMap(device => device.groups || []);
            if (allGroups.length > 0) {
                console.log('📋 .env Configuration:');
                console.log('─'.repeat(50));

                const groupIds = allGroups.map(group => group.id).join(',');
                console.log(`WHATSAPP_GROUPS=${groupIds}`);
                console.log('');

                console.log('📝 Individual Group IDs:');
                allGroups.forEach((group, index) => {
                    console.log(`   ${index + 1}. ${group.name}: ${group.id}`);
                });
            }

        } else {
            console.log('❌ No devices found or invalid response');
            console.log('💡 Make sure your device is connected to Fontte');
        }

    } catch (error) {
        console.error('❌ Error fetching groups:', error.message);

        if (error.response) {
            console.log('\n📋 Response Details:');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        console.log('\n💡 Troubleshooting:');
        console.log('   1. Check if FONTTE_TOKEN is correct');
        console.log('   2. Make sure device is connected to Fontte');
        console.log('   3. Verify API endpoint is accessible');
    }
}

// Alternative method using different API endpoint
async function getGroupsAlternative() {
    console.log('\n🔄 Trying alternative method...\n');

    try {
        // Try to get groups using send API with invalid target to see available groups
        const response = await axios.post('https://api.fontte.com/send', {
            target: 'test',
            message: 'test'
        }, {
            headers: {
                'Authorization': config.fontteToken
            }
        });

        console.log('Response:', response.data);

    } catch (error) {
        if (error.response && error.response.data) {
            console.log('📋 API Response:', JSON.stringify(error.response.data, null, 2));

            // Sometimes error response contains available targets/groups
            if (error.response.data.available_targets) {
                console.log('\n👥 Available Groups:');
                error.response.data.available_targets
                    .filter(target => target.includes('@g.us'))
                    .forEach((group, index) => {
                        console.log(`   ${index + 1}. ${group}`);
                    });
            }
        }
    }
}

async function main() {
    await getWhatsAppGroups();

    // If first method doesn't work, try alternative
    console.log('\n' + '='.repeat(60));
    await getGroupsAlternative();
}

main().catch(console.error);