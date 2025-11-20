from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
from .models import Photo
from PIL import Image


def _get_exif_gps(img: Image.Image):
    try:
        exif = img.getexif()
        if not exif:
            return None
        from PIL.ExifTags import TAGS, GPSTAGS
        exif_data = {TAGS.get(k, k): v for k, v in exif.items()}
        gps_info = exif_data.get('GPSInfo')
        if not gps_info:
            return None
        gps = {GPSTAGS.get(k, k): v for k, v in gps_info.items()}

        def _to_deg(values):
            d, m, s = values
            def _val(x):
                return x[0] / x[1] if isinstance(x, tuple) else float(x)
            return _val(d) + _val(m) / 60.0 + _val(s) / 3600.0

        lat = _to_deg(gps.get('GPSLatitude')) if gps.get('GPSLatitude') else None
        lon = _to_deg(gps.get('GPSLongitude')) if gps.get('GPSLongitude') else None
        if lat and gps.get('GPSLatitudeRef') == 'S':
            lat = -lat
        if lon and gps.get('GPSLongitudeRef') == 'W':
            lon = -lon
        return (lat, lon)
    except Exception:
        return None


@require_http_methods(["GET", "POST"])
def upload_photos(request):
    if request.method == 'POST':
        files = request.FILES.getlist('images')
        for f in files:
            photo = Photo.objects.create(image=f)
            try:
                with Image.open(photo.image.path) as img:
                    coords = _get_exif_gps(img)
                    if coords:
                        photo.latitude, photo.longitude = coords
                        photo.save(update_fields=['latitude', 'longitude'])
            except Exception:
                pass
        return redirect('mapa_fotos:mapa')
    return render(request, 'mapa_fotos/upload.html')


def mapa(request):
    points = Photo.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True)
    return render(request, 'mapa_fotos/mapa.html', {'points': points})
