"""Bounded, isolated raster decode; only fresh derivatives reach storage."""

import io
import multiprocessing as mp


def _decode(conn, data, mime, limits):
    try:
        import os

        os.environ.clear()
        os.environ.update({"PATH": "/usr/local/bin:/usr/bin:/bin", "LANG": "C.UTF-8"})
        import resource

        resource.setrlimit(resource.RLIMIT_AS, (768 * 1024**2, 768 * 1024**2))
        resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
        import warnings

        from PIL import Image, ImageFile, ImageOps

        ImageFile.LOAD_TRUNCATED_IMAGES = False
        Image.MAX_IMAGE_PIXELS = limits["pixels"]
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        allowed = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
        with Image.open(io.BytesIO(data)) as im:
            if im.format not in allowed or allowed[im.format] != mime:
                raise ValueError
            if getattr(im, "is_animated", False) or getattr(im, "n_frames", 1) != 1:
                raise ValueError
            w, h = im.size
            if min(w, h) < 32 or max(w, h) > limits["edge"] or w * h > limits["pixels"]:
                raise ValueError
            im.verify()
        with Image.open(io.BytesIO(data)) as original:
            im = ImageOps.exif_transpose(original)
            im.thumbnail((limits["output"], limits["output"]), Image.Resampling.LANCZOS)
            mode = "RGBA" if "A" in im.getbands() else "RGB"
            clean = Image.new(mode, im.size)
            clean.paste(im.convert(mode))
            out = io.BytesIO()
            clean.save(out, format="WEBP", quality=85, method=4)
            result = out.getvalue()
            if len(result) > limits["bytes"]:
                raise ValueError
            conn.send((True, result, clean.width, clean.height))
    except BaseException:
        try:
            conn.send((False, b"", 0, 0))
        except (BrokenPipeError, EOFError):
            pass
    finally:
        conn.close()


def optimise(data, mime, settings):
    if not data or len(data) > settings.max_upload_bytes:
        raise ValueError("Choose an image within the upload limit.")
    if mime not in ("image/jpeg", "image/png", "image/webp"):
        raise ValueError("Choose a still JPEG, PNG or WebP photo.")
    ctx = mp.get_context("spawn")
    parent, child = ctx.Pipe(duplex=False)
    process = ctx.Process(
        target=_decode,
        args=(
            child,
            data,
            mime,
            {
                "pixels": settings.max_pixels,
                "edge": settings.max_edge,
                "output": settings.output_edge,
                "bytes": settings.max_output_bytes,
            },
        ),
    )
    process.start()
    child.close()
    try:
        if not parent.poll(settings.decoder_timeout):
            raise ValueError("Photo processing timed out. Try a smaller photo.")
        try:
            ok, result, w, h = parent.recv()
        except EOFError:
            raise ValueError("The photo could not be safely processed.") from None
        if not ok:
            raise ValueError(
                "Choose a valid, still JPEG, PNG or WebP within the dimension limits."
            )
        return result, w, h
    finally:
        parent.close()
        process.join(timeout=1)
        if process.is_alive():
            process.terminate()
            process.join(timeout=2)
        if process.is_alive():
            process.kill()
            process.join()
        process.close()
