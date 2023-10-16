const { googleMeetRecording } = require('../bucket');
const s3 = require('../connection');
const fetchRecordingFromS3 = (req, res) => {
    const {batchID} = req.body;
    console.log(batchID)
    const batchId = `googleMeet_${batchID}`;
    const params = {
        Bucket: googleMeetRecording,
        Prefix: batchId, 
        };
    // return res.send(params)
    console.log(params, 'params');
    s3.listObjectsV2(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching videos');
        }
        console.log(data, 'fetchrecording');

        const videoUrls = data.Contents.map((video) => {
            return `https://${googleMeetRecording}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${video.Key}`;
        });

        res.json(videoUrls);
    });
};

module.exports = fetchRecordingFromS3;
