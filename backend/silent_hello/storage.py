from pathlib import Path


class MemoryStorage:
    """Test double only; never selected in production."""

    def __init__(self):
        self.objects = {}

    def put(self, key, data):
        self.objects[key] = data

    def get(self, key):
        if key not in self.objects:
            raise FileNotFoundError
        return self.objects[key]

    def delete(self, key):
        self.objects.pop(key, None)


class LocalStorage:
    """Local development only, outside the publicly served repository."""

    def __init__(self, path):
        self.root = Path(path)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key):
        if (
            not key.startswith("media/")
            or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-/." for c in key)
            or ".." in key
        ):
            raise ValueError("Invalid internal object key")
        return self.root / key

    def put(self, key, data):
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def get(self, key):
        return self._path(key).read_bytes()

    def delete(self, key):
        self._path(key).unlink(missing_ok=True)


class R2Storage:
    def __init__(self, settings):
        import boto3
        from botocore.config import Config

        self.bucket = settings.r2_bucket
        self.limit = settings.max_output_bytes
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key,
            aws_secret_access_key=settings.r2_secret_key,
            region_name="auto",
            config=Config(
                signature_version="s3v4",
                connect_timeout=4,
                read_timeout=10,
                retries={"max_attempts": 2, "mode": "standard"},
            ),
        )

    def put(self, key, data):
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType="image/webp",
            CacheControl="private, no-store",
        )

    def get(self, key):
        from botocore.exceptions import ClientError

        try:
            r = self.client.get_object(Bucket=self.bucket, Key=key)
            try:
                data = r["Body"].read(self.limit + 1)
                if len(data) > self.limit:
                    raise OSError("Oversize private derivative")
                return data
            finally:
                r["Body"].close()
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                raise FileNotFoundError from None
            raise

    def delete(self, key):
        self.client.delete_object(Bucket=self.bucket, Key=key)
