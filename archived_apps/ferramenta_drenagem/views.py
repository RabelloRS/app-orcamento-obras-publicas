from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required


def index(request):
    return redirect('ferramenta_drenagem:calculo_volume')


@login_required
def calculo_volume(request):
    # Renders the template that runs calculations client-side with Vue.js
    return render(request, 'drenagem/calculo_volume.html')
