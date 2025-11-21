from django.shortcuts import render


def mapa_fotos(request):
    """Photo mapping visualizer tool."""
    context = {
        'title': 'Mapeamento de Fotos Georreferenciadas',
    }
    return render(request, 'mapa/mapa_fotos.html', context)
