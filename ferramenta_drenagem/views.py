from django.shortcuts import render
import unicodedata
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from .models import RainEquation
import json

def microdrenagem(request):
    """Interactive microdrainage designer and quantity takeoff."""
    equations = RainEquation.objects.all().order_by('name')
    eq_list = []
    eq_dict = {}
    for eq in equations:
        key = eq.name.lower().replace(' ', '_').replace('-', '_').replace(',', '').replace('/', '_')
        item = {
            'key': key,
            'name': eq.name,
            'k': float(eq.k),
            'a': float(eq.a),
            'b': float(eq.b),
            'c': float(eq.c),
            'minDuration': 5,
            'maxDuration': 1440,
            'returnPeriod': 100,
        }
        eq_list.append(item)
        eq_dict[key] = {
            'id': key,
            'name': eq.name,
            'k': float(eq.k),
            'a': float(eq.a),
            'b': float(eq.b),
            'c': float(eq.c),
            'minDuration': 5,
            'maxDuration': 1440,
            'returnPeriod': 100,
        }
    context = {
        'title': 'Microdrenagem Urbana',
        'equations': eq_list,
        'equations_json': eq_dict,
    }
    return render(request, 'drenagem/microdrenagem.html', context)


def dimensionamento(request):
    """Hydraulic sizing tool."""
    equations = RainEquation.objects.all().order_by('name')
    def normalize(s: str) -> str:
        return unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode('ascii').lower().strip()
    target = normalize('Nova Petrópolis - RS')
    default_eq = None
    for eq in equations:
        if normalize(eq.name) == target:
            default_eq = eq
            break
    if default_eq is None:
        try:
            default_eq = equations[0]
        except Exception:
            default_eq = None
    context = {
        'title': 'Dimensionamento Hidráulico',
        'equations': equations,
        'default_city': 'Nova Petrópolis - RS',
        'default_eq': default_eq,
    }
    return render(request, 'drenagem/dimensionamento.html', context)


def idfgeo(request):
    """Interactive Map for Rainfall Equations (IDF) in RS."""
    return render(request, 'drenagem/idfgeo.html')


@require_GET
def get_rain_equations(request):
    """API endpoint to get all rainfall equations (IDF) as JSON."""
    equations = RainEquation.objects.all().order_by('name')
    data = {}
    for eq in equations:
        # Create unique key from name (lowercase, replace spaces/special chars with underscore)
        key = eq.name.lower().replace(' ', '_').replace('-', '_').replace(',', '').replace('/', '_')
        data[key] = {
            'id': eq.id,
            'name': eq.name,
            'k': float(eq.k),
            'a': float(eq.a),
            'b': float(eq.b),
            'c': float(eq.c),
            'minDuration': 5,
            'maxDuration': 1440,
            'returnPeriod': 100
        }
    return JsonResponse(data)


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
