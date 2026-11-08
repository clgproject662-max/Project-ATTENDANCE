// backend/utils/gridFS.js
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { Readable } = require('stream');

let gfs;

// Initialise GridFS once the DB connection is open
mongoose.connection.once('open', () => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
});

/**
 * Upload a buffer to GridFS and return the generated file ObjectId.
 * @param {Buffer} buffer - File data.
 * @param {string} filename - Original file name.
 * @param {string} mimetype - MIME type of the file.
 */
function uploadFile(buffer, filename, mimetype) {
  const stream = Readable.from([buffer]);
  return new Promise((resolve, reject) => {
    const writeStream = gfs.createWriteStream({
      filename,
      content_type: mimetype,
    });
    stream.pipe(writeStream);
    writeStream.on('close', file => resolve(file._id));
    writeStream.on('error', reject);
  });
}

/** Delete a GridFS file by its ObjectId */
function deleteFile(id) {
  return new Promise((resolve, reject) => {
    gfs.remove({ _id: id, root: 'fs' }, err => (err ? reject(err) : resolve()));
  });
}

/** Get a readable stream for a stored GridFS file */
function getFileStream(id) {
  return gfs.createReadStream({ _id: id, root: 'fs' });
}

module.exports = {
  uploadFile,
  deleteFile,
  getFileStream,
};
