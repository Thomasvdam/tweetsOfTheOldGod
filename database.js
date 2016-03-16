const MongoClient = require('mongodb').MongoClient;
const dbUrl = require('./db.js');

const config = require('./config.json');

const bole = require('bole');
const log = bole('dataBase');
bole.output({
    level: config.logging,
    stream: process.stdout,
});

function findUser(twitterId, success) {
    MongoClient.connect(dbUrl, function (err, db) {
        if (err) {
            log.error(err);
            throw err;
        }

        // We can look at the first result since there should only ever be one entry per user
        db.collection('whispers').find({ "twitterId" : twitterId}).limit(1).next(function (err, doc) {
            if (err) {
                log.error(err);
                throw err;
            }

            // Found a user.
            success(doc);

            // Close connection.
            db.close();
        });
    });
}

function upsertUser(twitterId, success) {
    MongoClient.connect(dbUrl, function (err, db) {
        if (err) {
            log.error(err);
            throw err;
        }

        db.collection('whispers')
            .updateOne({ "twitterId" : twitterId },
                        {
                            "twitterId" : twitterId,
                            "lastTweetDate" : new Date(),
                        },
                        { upsert : true },
                        function (err, result) {
                            if (err) {
                                log.error(err);
                                throw err;
                            }

                            success();

                            db.close()
                        });
    });
}

module.exports = {
    findUser : findUser,
    upsertUser : upsertUser,
}
