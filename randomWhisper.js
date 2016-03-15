'use strict';

const Twitter = require('twitter');
const auth = require('./auth.json');
const bole = require('bole');

const dbHelper = require('./database.js');

const config = require('./config.json');
const messages = config.messages;
let users = config.usersToHaunt;
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

// We should spread our madness, don't want arouse suspicion in our targets.
getFreshRandomUser(function (user) {
    // Set up the twitter client.
    const client = new Twitter(auth);

    // Get the twitter handle for the account id first.
    client.get('users/show', { user_id : user.id }, function (err, user, response) {
        tweetWhisper(user.screen_name);

        // I do not forget...
        dbHelper.upsertUser(user.id, function () {
            log.debug('Hey you, I remember you...');
        });
    });
});

/**
 * Get a random user that has not been tweeted in the previous timeframe and pass
 * it to the callback.
 * @param  {Function} callback What to do with the random user.
 */
function getFreshRandomUser(callback) {
    // Randomly select one of the haunted users.
    let randomIndex = Math.floor(Math.random() * users.length);
    let user = users[randomIndex];

    // Verify that this user has not been tweeted recently.
    dbHelper.findUser(user.id, function (userDoc) {
        // No userdoc means the user has not yet been tweeted.
        if (!userDoc) {
            callback(user);
            return;
        }

        // Calculate difference in hours and see if it is in range.
        let now = new Date();
        let difference = Math.abs(now - userDoc.lastTweetDate) / 3.6e6

        // It has been 12 hours, good to go.
        if (difference > config.hoursDelay) {
            callback(user);
        }

        // Remove the selected user from the array. Since this script reruns
        // every time we don't need to worry about putting it back
        users.splice(randomIndex, 1);

        // Recursively find a new user.
        getFreshRandomUser(callback);
    });
}

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
