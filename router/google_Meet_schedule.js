const fetchRecordingFromS3 = require('../controller/fetchRecordingFromS3');
const { scheduleMeetingByGoogleMeet, getRecordingLinkFromMeet } = require('../controller/scheduleMeetingByGoogleMeet');
const router = require('express').Router();
router.post('/api/scheduleMeetingByGoogleMeet', scheduleMeetingByGoogleMeet);
router.get("/getRecordings",getRecordingLinkFromMeet)
router.get("/fetchRecordingFromS3",fetchRecordingFromS3)
module.exports = router;
