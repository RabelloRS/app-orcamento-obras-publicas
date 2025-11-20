from django.shortcuts import render
from django.contrib.auth.decorators import login_required


# O decorator @login_required impede acesso de quem nao esta logado
# Se tentar acessar, o Django manda para a tela de login automaticamente
@login_required
def home(request):
	return render(request, 'usuarios/home.html')
