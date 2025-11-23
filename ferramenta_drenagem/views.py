from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_http_methods
from .models import RainEquation
import json
import unicodedata

def microdrenagem(request):
    """Interactive microdrainage designer and quantity takeoff."""
    context = {
        'title': 'Microdrenagem Urbana',
    }
    return render(request, 'drenagem/microdrenagem.html', context)


def dimensionamento(request):
    """Hydraulic sizing tool."""
    equations = RainEquation.objects.all().order_by('name')
    context = {
        'title': 'Dimensionamento Hidráulico',
        'equations': equations,
    }
    return render(request, 'drenagem/dimensionamento.html', context)


def idfgeo(request):
    """Interactive Map for Rainfall Equations (IDF) in RS."""
    return render(request, 'drenagem/idfgeo.html')


@require_http_methods(["GET"])
def rain_equations_api(request):
    """API endpoint to fetch all rain equations from database.
    Returns a JSON object keyed by a slug (normalized name) with parameters.
    { "nova_petropolis_rs": { "pk": 1, "name": "Nova Petrópolis - RS", ... } }
    """
    equations = RainEquation.objects.all().values('id', 'name', 'k', 'a', 'b', 'c')
    result = {}
    for eq in equations:
        # Normaliza removendo acentos e caracteres não alfanuméricos para slug consistente
        normalized = unicodedata.normalize('NFD', eq['name'])
        normalized = ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')
        slug = normalized.lower().replace('-', ' ').replace('/', ' ').replace('(', '').replace(')', '')
        slug = '_'.join(part for part in slug.split() if part)
        result[slug] = {
            'pk': eq['id'],
            'name': eq['name'],
            'k': float(eq['k']),
            'a': float(eq['a']),
            'b': float(eq['b']),
            'c': float(eq['c']),
            'minDuration': 5,
            'maxDuration': 1440,
            'returnPeriod': 100
        }
    return JsonResponse(result)


@require_POST
def add_equation(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        k = float(data.get('k'))
        a = float(data.get('a'))
        b = float(data.get('b'))
        c = float(data.get('c'))
        
        eq = RainEquation.objects.create(
            name=name, k=k, a=a, b=b, c=c,
            user=request.user if request.user.is_authenticated else None
        )
        return JsonResponse({'status': 'success', 'id': eq.id, 'name': eq.name})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
