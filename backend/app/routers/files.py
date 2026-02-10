"""
File upload router - handles file uploads to MinIO.
"""
import logging
import traceback
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional
from ..utils.auth import get_current_user
from ..models.user import User
from ..services.minio_service import upload_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])

# Image MIME types for auto-classification
IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/x-icon'}


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    folder: Optional[str] = Form(None),
    project_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a file to MinIO storage.
    
    File classification:
    - If project_name is given: projects/{project_name}/{图片|文档}/{file}
    - If folder starts with 'reports': reports/{图片|文档}/{file}
    - Otherwise: uploads/{图片|文档}/{file}
    
    Returns the public URL, original filename, and file size.
    """
    try:
        file_data = await file.read()
        file_size = len(file_data)
        
        # Limit file size to 50MB
        max_size = 50 * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(
                status_code=413, 
                detail=f"文件过大，最大允许 50MB，当前 {file_size / 1024 / 1024:.1f}MB"
            )
        
        content_type = file.content_type or "application/octet-stream"
        original_name = file.filename or "unnamed"
        
        # Auto-classify file type based on content_type
        file_category = "图片" if content_type in IMAGE_TYPES else "文档"
        
        # Build folder path
        if project_name:
            # Sanitize project name for path safety
            safe_name = project_name.replace(" ", "_")
            for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
                safe_name = safe_name.replace(ch, '')
            minio_folder = f"projects/{safe_name}/{file_category}"
        elif folder and folder.startswith("reports"):
            safe_user = current_user.name.replace(" ", "_")
            for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
                safe_user = safe_user.replace(ch, '')
            minio_folder = f"reports/{safe_user}/{file_category}"
        elif folder:
            minio_folder = f"{folder}/{file_category}"
        else:
            minio_folder = f"uploads/{file_category}"
        
        logger.info(f"Upload: file={original_name}, type={content_type}, category={file_category}, folder={minio_folder}")
        
        path = upload_file(
            file_data=file_data,
            original_filename=original_name,
            content_type=content_type,
            folder=minio_folder,
        )
        
        # Construct proxy URL
        url = f"/api/files/content/{path}"
        
        logger.info(f"Upload success: path={path}, url={url}")
        return {
            "url": url,   # Proxy URL for immediate display
            "path": path, # Relative path for DB storage
            "name": original_name,
            "size": file_size,
            "content_type": content_type,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@router.get("/content/{file_path:path}")
async def get_file_content(file_path: str):
    """
    Proxy endpoint to stream file content from MinIO.
    """
    from fastapi.responses import StreamingResponse
    from ..services.minio_service import get_file_stream
    import mimetypes

    try:
        # Get generic mime type based on extension
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        file_stream = get_file_stream(file_path)
        return StreamingResponse(file_stream, media_type=mime_type)
    except Exception as e:
        logger.error(f"File proxy failed: {e}")
        raise HTTPException(status_code=404, detail="File not found")
