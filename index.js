'use strict';

const Twitter = require('twitter');
const auth = require('./auth.json');
const bole = require('bole');

const config = require('./config.json');
const messages = config.messages;

// Set up logging
const log = bole('cthun');
bole.output({
    level: config.logging,
    stream: process.stdout,
});

// Construct the filter
let users = [];
for (var i = 0; i < config.usersToFollow.length; i++) {
    let user = config.usersToFollow[i];

    users.push(user.id);
}

// Convert to a string so Twitter can process it as param.
let params = {
    follow : users.join(','),
}

// Set up the twitter client.
const client = new Twitter(auth);
client.stream('statuses/filter', params, function (stream) {
    log.info('C\'Thun started whispering');

    stream.on('data', processData);
    stream.on('error', log.error);
});

/**
 * Extract relevant info from a tweet and determine whether to whisper a
 * maddening thought.
 * @param  {object} tweet Object passed by the Twitter.stream.
 */
function processData(tweet) {
    // Check whether there is a user at all.
    if (!tweet.user) return;

    // Make sure it's a tweet from a followed user, not a retweet or something
    if (users.indexOf(tweet.user.id) === -1) {
        log.debug('This mortal is not worthy of my time...');
        return;
    }

    // Speaking of retweets, we don't want them from the followed users either
    if (tweet.retweeted_status) {
        log.debug('How original...');
        return;
    }

    // Check whether the user actually mentioned us.
    let message = tweet.text.toLowerCase();
    let shouldWhisper = false;
    for (var i = 0; i < config.queries.length; i++) {
        let query = config.queries[i];

        if (message.indexOf(query) !== -1) {
            shouldWhisper = true;
            break;
        }
    }

    if (!shouldWhisper) {
        log.debug('I should bide my time...');
        return;
    }

    // Extract relevant information.
    let user = tweet.user.screen_name;
    let tweetId = tweet.id_str;

    // Drive them mad...
    tweetWhisper(user, tweetId);
}

/**
 * Whisper a random maddening thought to a user.
 * @param  {string} user    Twitter screen name of the user to reply to.
 * @param  {string} tweetId ID of the tweet to reply to.
 */
function tweetWhisper(user, tweetId) {
    // Direct it to the lucky individual.
    let whisper = '@' + user + ': ';
    // Add a maddening whisper.
    whisper += messages[Math.floor(Math.random() * messages.length)];
    // Make sure we don't go over the 140 character limit.
    whisper.substr(0, 140);

    // Set up post object.
    let data = {
        in_reply_to_status_id: tweetId,
        status: whisper,
    }

    // Commenting code out is cumbersome.
    if (config.testing) {
        log.info(data);
        return;
    }

    // HEY, LISTEN!
    client.post('statuses/update', data, function (err, tweet, response) {
        if (err) log.error(err);
        else log.info('Whispered... ' + tweet.text);
    });
};
