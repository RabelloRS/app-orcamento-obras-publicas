from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required


@login_required
def mapa(request):
    """Display photo map view."""
    context = {
        'title': 'Mapa de Fotos',
        'points': []  # Placeholder for future photo data
    }
    return render(request, 'mapa_fotos/mapa.html', context)


@login_required
def upload_photos(request):
    """Handle photo uploads."""
    if request.method == 'POST':
        # Placeholder for file handling
        return redirect('mapa_fotos:mapa')
    context = {'title': 'Enviar Fotos'}
    return render(request, 'mapa_fotos/upload.html', context)
