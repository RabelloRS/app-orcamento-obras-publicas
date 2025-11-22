from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .models import RainEquation
import json

def calculo_volume(request):
    """Drainage volume calculation tool."""
    context = {
        'title': 'Cálculo de Volume - Drenagem Urbana',
    }
    return render(request, 'drenagem/calculo_volume.html', context)


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
