"""
MinIO Object Storage Service
Handles file upload, download URL generation, and deletion.
"""
import uuid
import logging
from io import BytesIO
from minio import Minio
from minio.error import S3Error
from ..config import settings

logger = logging.getLogger(__name__)

_client: Minio | None = None


def get_minio_client() -> Minio:
    """Get or create a MinIO client singleton."""
    global _client
    if _client is None:
        endpoint = settings.MINIO_ENDPOINT
        logger.info(f"Creating MinIO client with endpoint: {endpoint}")
        _client = Minio(
            endpoint,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def ensure_bucket():
    """Ensure the configured bucket exists. Create it if not."""
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f"✓ MinIO bucket '{bucket}' created")
        else:
            logger.info(f"✓ MinIO bucket '{bucket}' already exists")

        # Set bucket policy to allow public read
        import json
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"],
                }
            ],
        }
        client.set_bucket_policy(bucket, json.dumps(policy))
        logger.info(f"✓ MinIO bucket '{bucket}' public read policy set")
    except S3Error as e:
        logger.error(f"✗ MinIO bucket setup failed: {e}")
        raise


def upload_file(
    file_data: bytes,
    original_filename: str,
    content_type: str = "application/octet-stream",
    folder: str = "uploads",
) -> str:
    """
    Upload a file to MinIO and return its public URL.

    Args:
        file_data: Raw file bytes
        original_filename: Original filename for naming
        content_type: MIME type of the file
        folder: Folder/prefix within the bucket

    Returns:
        Public URL string to access the file
    """
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET

    # Generate unique object name: folder/uuid_originalname
    file_uuid = uuid.uuid4().hex[:12]
    # Sanitize filename
    safe_name = original_filename.replace(" ", "_")
    object_name = f"{folder}/{file_uuid}_{safe_name}"

    # Upload
    data_stream = BytesIO(file_data)
    client.put_object(
        bucket,
        object_name,
        data_stream,
        length=len(file_data),
        content_type=content_type,
    )

    logger.info(f"✓ Uploaded '{original_filename}' -> {object_name}")
    # Return relative path (object_name) instead of full URL
    return object_name


def get_file_stream(object_name: str):
    """
    Get a file stream from MinIO.
    
    Returns:
        MinIO response object (which is a stream)
    """
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET
    try:
        response = client.get_object(bucket, object_name)
        return response
    except S3Error as e:
        logger.error(f"✗ Failed to get '{object_name}': {e}")
        raise


def delete_file(object_name: str):
    """Delete a file from MinIO by its object name."""
    client = get_minio_client()
    bucket = settings.MINIO_BUCKET
    try:
        client.remove_object(bucket, object_name)
        logger.info(f"✓ Deleted '{object_name}'")
    except S3Error as e:
        logger.error(f"✗ Failed to delete '{object_name}': {e}")
        raise
