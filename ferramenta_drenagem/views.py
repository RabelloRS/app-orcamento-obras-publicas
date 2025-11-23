from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_http_methods
from .models import RainEquation
import json

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
    """API endpoint to fetch all rain equations from database."""
    equations = RainEquation.objects.all().values('id', 'name', 'k', 'a', 'b', 'c')
    result = {}
    for eq in equations:
        # Generate ID from name similar to database.js
        eq_id = eq['name'].lower().replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '')
        result[eq_id] = {
            'id': eq['id'],
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
