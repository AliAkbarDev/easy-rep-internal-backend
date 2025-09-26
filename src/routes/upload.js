const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');
const { authenticateToken } = require('../middleware/auth');
const { 
  successResponse, 
  errorResponse, 
  badRequestResponse 
} = require('../utils/response');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

/**
 * @route   POST /api/upload/single
 * @desc    Upload a single file
 * @access  Private
 */
router.post('/single', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return badRequestResponse(res, 'No file uploaded');
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const folder = req.body.folder || 'general';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(`${folder}/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      logger.error('File upload error:', error.message);
      return errorResponse(res, 500, 'Failed to upload file');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(`${folder}/${fileName}`);

    // Save file record to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([
        {
          id: uuidv4(),
          user_id: req.userId,
          original_name: file.originalname,
          file_name: fileName,
          file_path: `${folder}/${fileName}`,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.mimetype,
          folder: folder,
          uploaded_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      logger.error('File record creation error:', dbError.message);
      // Clean up uploaded file if database record creation fails
      await supabase.storage.from('uploads').remove([`${folder}/${fileName}`]);
      return errorResponse(res, 500, 'Failed to save file record');
    }

    logger.info(`File uploaded: ${file.originalname} by user ${req.userId}`);

    successResponse(res, 201, 'File uploaded successfully', {
      id: fileRecord.id,
      originalName: fileRecord.original_name,
      fileName: fileRecord.file_name,
      fileUrl: fileRecord.file_url,
      fileSize: fileRecord.file_size,
      mimeType: fileRecord.mime_type,
      folder: fileRecord.folder,
      uploadedAt: fileRecord.uploaded_at
    });

  } catch (error) {
    logger.error('Upload error:', error.message);
    errorResponse(res, 500, 'File upload failed');
  }
});

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post('/multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return badRequestResponse(res, 'No files uploaded');
    }

    const files = req.files;
    const folder = req.body.folder || 'general';
    const uploadedFiles = [];

    for (const file of files) {
      try {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(`${folder}/${fileName}`, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          logger.error(`File upload error for ${file.originalname}:`, error.message);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(`${folder}/${fileName}`);

        // Save file record to database
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert([
            {
              id: uuidv4(),
              user_id: req.userId,
              original_name: file.originalname,
              file_name: fileName,
              file_path: `${folder}/${fileName}`,
              file_url: urlData.publicUrl,
              file_size: file.size,
              mime_type: file.mimetype,
              folder: folder,
              uploaded_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (dbError) {
          logger.error(`File record creation error for ${file.originalname}:`, dbError.message);
          // Clean up uploaded file
          await supabase.storage.from('uploads').remove([`${folder}/${fileName}`]);
          continue;
        }

        uploadedFiles.push({
          id: fileRecord.id,
          originalName: fileRecord.original_name,
          fileName: fileRecord.file_name,
          fileUrl: fileRecord.file_url,
          fileSize: fileRecord.file_size,
          mimeType: fileRecord.mime_type,
          folder: fileRecord.folder,
          uploadedAt: fileRecord.uploaded_at
        });

      } catch (fileError) {
        logger.error(`Error processing file ${file.originalname}:`, fileError.message);
      }
    }

    logger.info(`${uploadedFiles.length} files uploaded by user ${req.userId}`);

    successResponse(res, 201, `${uploadedFiles.length} files uploaded successfully`, {
      uploadedFiles,
      totalFiles: files.length,
      successfulUploads: uploadedFiles.length
    });

  } catch (error) {
    logger.error('Multiple upload error:', error.message);
    errorResponse(res, 500, 'File upload failed');
  }
});

/**
 * @route   GET /api/upload/files
 * @desc    Get user's uploaded files
 * @access  Private
 */
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, folder } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('files')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId);

    if (folder) {
      query = query.eq('folder', folder);
    }

    query = query.order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: files, error, count } = await query;

    if (error) {
      logger.error('Get files error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve files');
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const formattedFiles = files.map(file => ({
      id: file.id,
      originalName: file.original_name,
      fileName: file.file_name,
      fileUrl: file.file_url,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      folder: file.folder,
      uploadedAt: file.uploaded_at
    }));

    successResponse(res, 200, 'Files retrieved successfully', {
      files: formattedFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get files error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve files');
  }
});

/**
 * @route   DELETE /api/upload/files/:id
 * @desc    Delete uploaded file
 * @access  Private
 */
router.delete('/files/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get file record
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchError || !file) {
      return errorResponse(res, 404, 'File not found');
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .remove([file.file_path]);

    if (storageError) {
      logger.error('Storage deletion error:', storageError.message);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (dbError) {
      logger.error('Database deletion error:', dbError.message);
      return errorResponse(res, 500, 'Failed to delete file record');
    }

    logger.info(`File deleted: ${file.original_name} by user ${req.userId}`);

    successResponse(res, 200, 'File deleted successfully');

  } catch (error) {
    logger.error('Delete file error:', error.message);
    errorResponse(res, 500, 'Failed to delete file');
  }
});

module.exports = router; 