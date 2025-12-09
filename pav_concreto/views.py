from django.shortcuts import render

def index(request):
    """Main view for concrete pavement design application"""
    return render(request, 'pav_concreto/index.html')
