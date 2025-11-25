from django.views.generic import TemplateView

class IndexView(TemplateView):
    template_name = 'hidrograma/index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Hidrograma Unitário de Projeto (HUT)'
        return context
