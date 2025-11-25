from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.db.models import Q
from .models import IDFFormula


def consulta_idf(request):
    """
    Main view for consulting the IDF formulas database.
    Users can search and browse published IDF equations but cannot add or edit.
    Values can be temporarily stored in the browser's localStorage.
    """
    # Get filter parameters
    state_filter = request.GET.get('state', '')
    city_filter = request.GET.get('city', '')
    search_query = request.GET.get('q', '')
    
    # Base queryset - only active formulas
    formulas = IDFFormula.objects.filter(is_active=True)
    
    # Apply filters
    if state_filter:
        formulas = formulas.filter(state=state_filter)
    if city_filter:
        formulas = formulas.filter(city__icontains=city_filter)
    if search_query:
        formulas = formulas.filter(
            Q(name__icontains=search_query) |
            Q(city__icontains=search_query) |
            Q(source__icontains=search_query)
        )
    
    # Get unique states and cities for filters
    all_states = IDFFormula.STATES
    cities = IDFFormula.objects.filter(is_active=True).values_list('city', flat=True).distinct().order_by('city')
    
    context = {
        'title': 'Banco de Dados IDF',
        'formulas': formulas,
        'states': all_states,
        'cities': list(cities),
        'current_state': state_filter,
        'current_city': city_filter,
        'search_query': search_query,
    }
    return render(request, 'banco_idf/consulta.html', context)


def calculadora_idf(request):
    """
    IDF calculator view where users can input IDF parameters and calculate intensity.
    Parameters can come from the database or be entered manually.
    User values are stored temporarily in browser localStorage.
    """
    # Get all active formulas for the selector
    formulas = IDFFormula.objects.filter(is_active=True).order_by('state', 'city', 'name')
    
    # Get unique states for filter
    all_states = IDFFormula.STATES
    
    context = {
        'title': 'Calculadora IDF',
        'formulas': formulas,
        'states': all_states,
    }
    return render(request, 'banco_idf/calculadora.html', context)


@require_GET
def api_formulas(request):
    """
    API endpoint returning IDF formulas as JSON.
    Supports filtering by state and city.
    """
    state_filter = request.GET.get('state', '')
    city_filter = request.GET.get('city', '')
    search_query = request.GET.get('q', '')
    
    formulas = IDFFormula.objects.filter(is_active=True)
    
    if state_filter:
        formulas = formulas.filter(state=state_filter)
    if city_filter:
        formulas = formulas.filter(city__icontains=city_filter)
    if search_query:
        formulas = formulas.filter(
            Q(name__icontains=search_query) |
            Q(city__icontains=search_query)
        )
    
    data = []
    for formula in formulas:
        data.append({
            'id': formula.id,
            'name': formula.name,
            'city': formula.city,
            'state': formula.state,
            'state_display': formula.get_state_display(),
            'k': float(formula.k),
            'a': float(formula.a),
            'b': float(formula.b),
            'c': float(formula.c),
            'duration_min': formula.duration_min,
            'duration_max': formula.duration_max,
            'return_period_min': formula.return_period_min,
            'return_period_max': formula.return_period_max,
            'source': formula.source,
            'author': formula.author,
            'year': formula.year,
            'latitude': formula.latitude,
            'longitude': formula.longitude,
        })
    
    return JsonResponse({'formulas': data, 'count': len(data)})


@require_GET
def api_calculate(request):
    """
    API endpoint to calculate rainfall intensity.
    Parameters can come from a database formula or custom values.
    """
    formula_id = request.GET.get('formula_id')
    
    # Get parameters either from database or request
    if formula_id:
        try:
            formula = IDFFormula.objects.get(id=formula_id, is_active=True)
            k = formula.k
            a = formula.a
            b = formula.b
            c = formula.c
        except IDFFormula.DoesNotExist:
            return JsonResponse({'error': 'Fórmula não encontrada'}, status=404)
    else:
        try:
            k = float(request.GET.get('k', 0))
            a = float(request.GET.get('a', 0))
            b = float(request.GET.get('b', 0))
            c = float(request.GET.get('c', 0))
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Parâmetros inválidos'}, status=400)
    
    try:
        return_period = float(request.GET.get('tr', 10))
        duration = float(request.GET.get('t', 30))
    except (ValueError, TypeError):
        return JsonResponse({'error': 'TR ou duração inválidos'}, status=400)
    
    if duration <= 0 or return_period <= 0:
        return JsonResponse({'error': 'Duração e TR devem ser positivos'}, status=400)
    
    try:
        intensity = (k * (return_period ** a)) / ((duration + b) ** c)
        precipitation = intensity * (duration / 60)  # Convert to mm
        
        return JsonResponse({
            'intensity': round(intensity, 2),
            'precipitation': round(precipitation, 2),
            'parameters': {
                'k': k,
                'a': a,
                'b': b,
                'c': c,
                'tr': return_period,
                't': duration
            }
        })
    except (ZeroDivisionError, ValueError) as e:
        return JsonResponse({'error': f'Erro no cálculo: {str(e)}'}, status=400)
