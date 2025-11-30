from django.views.generic import TemplateView
from banco_idf.models import IDFFormula
import json

class IndexView(TemplateView):
    template_name = 'hidrograma/index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Hidrograma Unitário de Projeto (HUT)'
        formulas = IDFFormula.objects.filter(is_active=True).order_by('state', 'city', 'name')
        context['idf_formulas'] = formulas
        data = []
        for f in formulas:
            data.append({
                'id': f.id,
                'name': f.name,
                'city': f.city,
                'state': f.state,
                'k': float(f.k),
                'a': float(f.a),
                'b': float(f.b),
                'c': float(f.c)
            })
        context['idf_preload'] = json.dumps(data)
        return context
