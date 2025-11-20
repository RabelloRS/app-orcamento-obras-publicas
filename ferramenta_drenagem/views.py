from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required
def calculo_volume(request):
    """Drainage volume calculation tool."""
    context = {
        'title': 'Cálculo de Volume - Drenagem Urbana',
    }
    return render(request, 'drenagem/calculo_volume.html', context)
