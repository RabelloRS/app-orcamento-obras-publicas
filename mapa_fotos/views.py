from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required


@login_required
def mapa(request):
    """Display photo map view."""
    context = {
        'title': 'Mapa de Fotos Local',
    }
    return render(request, 'mapa_fotos/mapa.html', context)


@login_required
def upload_photos(request):
    """Handle photo uploads. (Legacy/Unused for client-side only version)"""
    # Redirect to the main map view since upload is now client-side
    return redirect('mapa_fotos:mapa')
