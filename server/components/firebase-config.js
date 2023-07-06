var admin = require("firebase-admin");

var serviceAccount = require("../../creds/veranus-firebase-admin-credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://veranus-5bd2c.firebaseio.com'
});

module.exports.admin = admin;