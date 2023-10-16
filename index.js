const dotenv = require('dotenv');
dotenv.config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const express = require('express');
const app = express();
const fs = require('fs');
const credentials = require('./credentials.json');
const route = require('./router/google_Meet_schedule');
const { getRecordingLinkFromMeet } = require('./controller/scheduleMeetingByGoogleMeet');
const { client_secret, client_id, redirect_uris } = credentials.installed;
const { v4: uuidv4 } = require('uuid');
const uniqueChannelId = uuidv4();
const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris);

app.use(express.json());
app.use(route);
app.get('/auth/google', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // get refresh token
        scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive'],
    });
    res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
    const { tokens } = await oAuth2Client.getToken(req.query.code);
    console.log(tokens);
    oAuth2Client.setCredentials(tokens);
    // Store tokens securely in your database
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log(oAuth2Client);
    res.send({
        msg: "'Authentication successful! Tokens stored.'",
        data: oAuth2Client,
    });
});

app.post('/google-drive-notification', async (req, res) => {
       console.log(req,"request , google-drive-notification'")
    const { body } = req;
    const fileId = body.fileId;
    console.log(fileId, 'fileID');
    await getRecordingLinkFromMeet(fileId);
});
app.listen(3000, () => {
      try{
        console.log('Server is running on port 3000');
    oAuth2Client.setCredentials({
        access_token: process.env.access_token,
        refresh_token: process.env.refresh_token,
    });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    drive.files.watch(
        {
            fileId: '1L30FBJrsbSt4sP0WtHEUjVtXJeyfeRlh', // Replace with your Google Drive folder ID
            requestBody: {
                id: uniqueChannelId, // Replace with a unique channel ID
                type: 'web_hook',
                address: 'https://google-meet-recording.onrender.com/google-drive-notification',
            },
        },
        (err, res) => {
            if (err) {
                console.error('Error setting up push notifications:', err);
            } else {
                console.log('Push notification channel created:', res.data);
            }
        }
    );
    }
    catch(err){
        console.log(err,":occured during the drive notification")
    }
});
