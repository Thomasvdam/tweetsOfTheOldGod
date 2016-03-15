'use strict';

const Twitter = require('twitter');
const auth = require('./auth.json');
const bole = require('bole');

const config = require('./config.json');
const messages = config.messages;
const users = config.usersToHaunt;
const chance = 1 / config.chance;

// Set up logging
const log = bole('cthunWhisper');
bole.output({
    level: config.logging,
    stream: process.stdout,
});

// We may be mad, but we don't want to spam.
let random = Math.random();
if (random > chance) {
    log.info('Maybe some other time...');
    return;
}

// Randomly select one of the haunted users.
let user = users[Math.floor(Math.random() * users.length)];

// Set up the twitter client.
const client = new Twitter(auth);

// Get the twitter handle for the account id first.
client.get('users/show', { user_id : user.id }, function (err, user, response) {
    tweetWhisper(user.screen_name);
});

/**
 * Whisper a tweet to a user.
 * @param  {string} userName Twitter handle of the user to tweet.
 */
function tweetWhisper(userName) {
    // Direct it to the lucky individual.
    let whisper = '@' + userName + ': ';
    // Add a maddening whisper.
    whisper += messages[Math.floor(Math.random() * messages.length)];
    // Make sure we don't go over the 140 character limit.
    whisper.substr(0, 140);

    // Set up post object.
    let data = {
        status: whisper,
    }

    // Commenting code out is cumbersome.
    if (config.testing) {
        log.info(data);
        return;
    }

    // Hey... Listen...
    client.post('statuses/update', data, function (err, tweet, response) {
        if (err) log.error(err);
        else log.info('Whispered... ' + tweet.text);
    });
};
