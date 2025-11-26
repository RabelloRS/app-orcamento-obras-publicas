from django.test import TestCase, Client
from django.urls import reverse
from .models import IDFFormula


class IDFFormulaModelTest(TestCase):
    """Test IDFFormula model."""
    
    def setUp(self):
        self.formula = IDFFormula.objects.create(
            name='Estação Teste',
            city='Porto Alegre',
            state='RS',
            k=3358.33,
            a=0.211,
            b=11.33,
            c=0.812,
            source='Teste Unitário',
            author='Autor Teste',
            year=2024
        )
    
    def test_formula_str(self):
        """Test string representation."""
        self.assertEqual(str(self.formula), 'Estação Teste - Porto Alegre/RS')
    
    def test_get_full_location(self):
        """Test full location method."""
        self.assertEqual(self.formula.get_full_location(), 'Porto Alegre - Rio Grande do Sul')
    
    def test_calculate_intensity(self):
        """Test intensity calculation."""
        # i = K * TR^a / (t + b)^c
        # i = 3358.33 * 10^0.211 / (30 + 11.33)^0.812
        intensity = self.formula.calculate_intensity(return_period=10, duration=30)
        self.assertIsInstance(intensity, float)
        self.assertGreater(intensity, 0)
    
    def test_calculate_intensity_invalid_inputs(self):
        """Test intensity calculation with invalid inputs."""
        self.assertEqual(self.formula.calculate_intensity(0, 30), 0)
        self.assertEqual(self.formula.calculate_intensity(10, 0), 0)
        self.assertEqual(self.formula.calculate_intensity(-5, 30), 0)


class BancoIDFViewsTest(TestCase):
    """Test banco_idf views."""
    
    def setUp(self):
        self.client = Client()
        self.formula = IDFFormula.objects.create(
            name='Estação Teste RS',
            city='Porto Alegre',
            state='RS',
            k=3358.33,
            a=0.211,
            b=11.33,
            c=0.812,
            is_active=True
        )
        self.inactive_formula = IDFFormula.objects.create(
            name='Estação Inativa',
            city='Teste',
            state='SP',
            k=1000,
            a=0.2,
            b=10,
            c=0.8,
            is_active=False
        )
    
    def test_consulta_view_access(self):
        """Test consultation view is accessible."""
        response = self.client.get(reverse('banco_idf:consulta'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Banco de Dados IDF')
    
    def test_consulta_view_shows_active_formulas(self):
        """Test consultation view shows only active formulas."""
        response = self.client.get(reverse('banco_idf:consulta'))
        self.assertContains(response, 'Estação Teste RS')
        self.assertNotContains(response, 'Estação Inativa')
    
    def test_consulta_view_filter_by_state(self):
        """Test filtering by state."""
        response = self.client.get(reverse('banco_idf:consulta') + '?state=RS')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Estação Teste RS')
    
    def test_consulta_view_search(self):
        """Test search functionality."""
        response = self.client.get(reverse('banco_idf:consulta') + '?q=Porto')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Estação Teste RS')
    
    def test_calculadora_view_access(self):
        """Test calculator view is accessible."""
        response = self.client.get(reverse('banco_idf:calculadora'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Calculadora IDF')
    
    def test_calculadora_has_privacy_notice(self):
        """Test calculator has privacy notice."""
        response = self.client.get(reverse('banco_idf:calculadora'))
        self.assertContains(response, 'não salva e nem armazena')
    
    def test_api_formulas(self):
        """Test API endpoint returns formulas."""
        response = self.client.get(reverse('banco_idf:api_formulas'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('formulas', data)
        self.assertEqual(data['count'], 1)  # Only active formulas
        self.assertEqual(data['formulas'][0]['name'], 'Estação Teste RS')
    
    def test_api_formulas_filter_state(self):
        """Test API filtering by state."""
        response = self.client.get(reverse('banco_idf:api_formulas') + '?state=RS')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)
    
    def test_api_calculate_with_formula_id(self):
        """Test calculation API with formula ID."""
        url = reverse('banco_idf:api_calculate') + f'?formula_id={self.formula.id}&tr=10&t=30'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('intensity', data)
        self.assertGreater(data['intensity'], 0)
    
    def test_api_calculate_with_custom_params(self):
        """Test calculation API with custom parameters."""
        url = reverse('banco_idf:api_calculate') + '?k=3358.33&a=0.211&b=11.33&c=0.812&tr=10&t=30'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('intensity', data)
        self.assertIn('precipitation', data)
    
    def test_api_calculate_invalid_formula(self):
        """Test calculation API with invalid formula ID."""
        url = reverse('banco_idf:api_calculate') + '?formula_id=99999&tr=10&t=30'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
    
    def test_api_calculate_invalid_params(self):
        """Test calculation API with invalid parameters."""
        url = reverse('banco_idf:api_calculate') + '?k=abc&tr=10&t=30'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)
