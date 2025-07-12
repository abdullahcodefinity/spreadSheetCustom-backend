import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
  } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  
  // Uncomment to enable private CloudFront URL signing:
  // import { Signer } from '@aws-sdk/cloudfront-signer';
  
  import fs from 'fs';
  
  // Create S3 client instance
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESSKEYID,
      secretAccessKey: process.env.AWS_SECRETACCESSKEY,
    },
  });
  
  // Define reusable folder names
  const awsFolderNames = {
    sub1: 'sub1',
    sub2: 'sub2',
  };
  
  /**
   * Server-side upload to S3 (fallback)
   * @param {string} fileName - S3 key for the upload
   * @param {string|Buffer} fileSource - Local filesystem path to the file OR Buffer
   */
  export async function uploadFileToAws(fileName, fileSource) {
    try {
      let body;
      if (Buffer.isBuffer(fileSource)) {
        body = fileSource;
      } else {
        const fs = require('fs');
        body = fs.createReadStream(fileSource);
      }
  
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: body,
      }));
  
      // Cleanup local file if fileSource is a path
      if (typeof fileSource === 'string' && require('fs').existsSync(fileSource)) {
        require('fs').unlink(fileSource, err => err
          ? console.error('Error deleting local file:', err)
          : console.log('Temporary file deleted successfully.')
        );
      }
  
      // Return the CloudFront URL
      return getCloudFrontDownloadUrl(fileName);
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      return 'error';
    }
  }
  
  /**
   * Generate a pre-signed S3 PUT URL for client-side uploads
   * @param {string} fileName - Desired S3 key for upload
   * @param {number} expiresIn - Seconds until URL expiration
   * @returns {Promise<string>} - Pre-signed URL or 'error'
   */
  export async function generateUploadUrl(fileName, expiresIn = 3600) {
    try {
      const putCommand = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
      });
      return await getSignedUrl(s3Client, putCommand, { expiresIn });
    } catch (err) {
      console.error('Error generating upload URL:', err);
      return 'error';
    }
  }
  
  /**
   * Check if a file exists in the S3 bucket
   * @param {string} fileName
   * @returns {Promise<boolean>}
   */
  export async function isFileAvailableInAwsBucket(fileName) {
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
      }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound') return false;
      console.error('Error checking file existence:', err);
      return false;
    }
  }
  
  /**
   * Delete a file from the S3 bucket
   * @param {string} fileName
   */
  export async function deleteFileFromAws(fileName) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
      }));
    } catch (err) {
      console.error('Error deleting file from S3:', err);
      return 'error';
    }
  }
  
  /**
   * Get a CloudFront URL for a public distribution
   * @param {string} fileName
   * @returns {string}
   */
  export function getCloudFrontDownloadUrl(fileName) {
    return `${process.env.CLOUDFRONT_DOMAIN}/${fileName}`;
  }
  
  /**
   * Get a signed CloudFront URL for a private distribution
   * Uncomment usage and ensure CF_KEY_PAIR_ID & CF_PRIVATE_KEY are set
   *
   * @param {string} fileName
   * @param {number} expiresSeconds
   * @returns {string}
   */
  // function getSignedCloudFrontUrl(fileName, expiresSeconds = 3600) {
  //   const url = `https://${process.env.CLOUDFRONT_DOMAIN}/${fileName}`;
  //   return Signer.getSignedUrl({
  //     url,
  //     expires: Math.floor(Date.now() / 1000) + expiresSeconds,
  //   });
  // }
  
  