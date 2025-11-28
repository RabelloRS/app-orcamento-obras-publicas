from django.views.generic import TemplateView


class IndexView(TemplateView):
    template_name = 'bacia_retencao/index.html'
