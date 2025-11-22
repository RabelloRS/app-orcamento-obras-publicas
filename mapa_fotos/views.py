from django.shortcuts import render, redirect


def mapa_publico(request):
    """Photo map view exposed for public access."""
    context = {
        'title': 'Mapa de Fotos',
    }
    return render(request, 'mapa_fotos/mapa.html', context)


def mapa(request):
    """Fallback route kept for backward compatibility."""
    return mapa_publico(request)


def upload_photos(request):
    """Handle photo uploads. (Legacy/Unused for client-side only version)"""
    # Redirect to the main map view since upload is now client-side
    return redirect('mapa_fotos:mapa')
