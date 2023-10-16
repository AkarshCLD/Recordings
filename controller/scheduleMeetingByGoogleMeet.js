const credentials = require('../credentials.json');
const { client_secret, client_id, redirect_uris } = credentials.installed;
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const AWS = require('aws-sdk');
const fs = require('fs');
const db = require('../db');
const s3 = require('../connection');
const getRecordingDetails = require('./utils');
const { googleMeetRecording } = require('../bucket');
const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);
console.log(googleMeetRecording,"googleMeetRecordinggoogleMeetRecording")
const scheduleMeetingByGoogleMeet = (req, res) => {
    const { batchId, startTime, endTime, attendees, summary } = req.body;
    const BatchID = `elevation-academy-mern-stack-web-development-career_${batchId}`;
    console.log(BatchID, 'batchID');
    const MeetingDetails = db.find((item) => {
        if (item.batchID == BatchID) {
            console.log(item);
            return item;
        }
    });
    const meetingID = MeetingDetails.meetingID;
    console.log(meetingID, 'mm');
    oAuth2Client.setCredentials({
        access_token: process.env.access_token,
        refresh_token: process.env.refresh_token,
    });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const event = {
        summary: `session detail: ${summary}`,
        description: `Google Meet joining Link: https://meet.google.com/${meetingID}`, 
        start: {
            dateTime: startTime,
            timeZone: 'IST',
        },
        end: {
            dateTime: endTime,
            timeZone: 'IST',
        },
        conferenceData: {
            createRequest: {
                requestId: `${BatchID}`,
            },
        },
        attendees: attendees,
    };
    calendar.events.insert(
        {
            calendarId: 'primary',
            resource: event,
        },
        (err, response) => {
            if (err) {
                console.error('Error scheduling event:', err);
                return;
            }
            const hangoutLink = response.data;
            return res.send(hangoutLink.description);
        }
    );
};

const getRecordingLinkFromMeet = async (request, response) => {
    const { batchID } = request.body;
    const BatchID = `elevation-academy-mern-stack-web-development-career_${batchID}`;
    const MeetingDetails = db.find((item) => {
        if (item.batchID == BatchID) {
            return item;
        }
    });
    const meetingID = MeetingDetails.meetingID;

    oAuth2Client.setCredentials({
        access_token: process.env.access_token,
        refresh_token: process.env.refresh_token,
    });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const folderName = 'Meet Recordings';
    drive.files.list(
        {
            q: `mimeType='application/vnd.google-apps.folder' and name contains '${folderName}'`,
        },
        (err, res) => {
            if (err) {
                console.error('Error searching for folder:', err);
                return;
            }
            const folders = res.data.files;
            if (folders.length > 0) {
                const folderId = folders[0].id;
                drive.files.list(
                    {
                        q: `'${folderId}' in parents`, // name will be scheduled meeting link last param
                        fields: 'files(id, name, mimeType)',
                    },
                    async (fileErr, fileRes) => {
                        if (fileErr) {
                            console.error('Error searching for file:', fileErr);
                            return;
                        }
                        const files = fileRes.data.files;
                        if (files.length > 0) {
                            const fileList = files.map((file) => ({
                                id: file.id,
                                name: file.name,
                                mimeType: file.mimeType,
                            }));
                            const jsonData = JSON.stringify(fileList, null, 2);
                            const fetchedFilesByBAtchID = await getRecordingDetails(jsonData, meetingID);
                            const fileId = fetchedFilesByBAtchID[0].id;
                            console.log('Found file with ID:', fileId);
                            const localFilePath = 'video.mp4';
                            drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' }, (err, res) => {
                                if (err) {
                                    console.error('Error downloading file:', err);
                                    console.error('Error message:', err.message);
                                    console.error('Error stack:', err.stack);

                                    return;
                                }
                                const dest = fs.createWriteStream(localFilePath);
                                res.data
                                    .on('end', async () => {
                                        console.log('File downloaded successfully.');
                                        const fileIds = fileId.toString();
                                        console.log(fileIds);
                                        const params = {
                                            Bucket: googleMeetRecording,
                                            Key: `googleMeet_${batchID}/${fileIds}`, // Specify the desired path in S3
                                            Body: fs.createReadStream(localFilePath),
                                        };
                                        console.log(params, 'params');
                                        s3.upload(params, (s3Err, s3Data) => {
                                            if (s3Err) {
                                                console.error('Error uploading file to S3:', s3Err);
                                            } else {
                                                console.log('File uploaded to S3 successfully:', s3Data.Location);
                                                return response.send(s3Data.Location);
                                            }
                                            fs.unlinkSync(localFilePath);
                                        });
                                    })
                                    .on('error', (err) => {
                                        console.error('Error downloading file:', err);
                                    })
                                    .pipe(dest);
                            });
                        } else {
                            console.log('File not found.');
                        }
                    }
                );
            } else {
                console.log('Folder not found.');
            }
        }
    );
};

module.exports = { scheduleMeetingByGoogleMeet, getRecordingLinkFromMeet };
