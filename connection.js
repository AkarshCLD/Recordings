const AWS = require('aws-sdk');
const dotenv=require("dotenv")
dotenv.config()
var credential = new AWS.Credentials(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_ACCESS_KEY, null);

AWS.config.update({ credentials: credential });

const s3 = new AWS.S3({
	apiVersion: process.env.AWS_S3_API_VERSION,
	endpoint: process.env.AWS_S3_ENDPOINT,
	signatureVersion: process.env.AWS_S3_SIGNATURE_VERSION,
	region: process.env.AWS_S3_REGION
});

module.exports = s3;