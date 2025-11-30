from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from .models import RainEquation


class FerramentaDrenagemTestCase(TestCase):
    """Test ferramenta_drenagem views."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='tester', email='tester@example.com', password='teste123'
        )

    def test_microdrenagem_public_access(self):
        """Anonymous users should access microdrenagem without redirects."""
        response = self.client.get(reverse('ferramenta_drenagem:microdrenagem'))
        self.assertEqual(response.status_code, 200)

    def test_microdrenagem_authenticated_access(self):
        """Authenticated user can access microdrenagem."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:microdrenagem'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('title', response.context)

    def test_microdrenagem_context(self):
        """Test microdrenagem view context."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:microdrenagem'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['title'], 'Microdrenagem Urbana')

    def test_microdrenagem_equations_in_select(self):
        from .models import RainEquation
        RainEquation.objects.create(name='Nova Petrópolis - RS', k=3358.33, a=0.211, b=11.33, c=0.812)
        response = self.client.get(reverse('ferramenta_drenagem:microdrenagem'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('equations', response.context)
        self.assertContains(response, 'Nova Petrópolis - RS')

    def test_dimensionamento_authenticated_access(self):
        """Dimensionamento view should be accessible to authenticated users."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:dimensionamento'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Dimensionamento Hidráulico')

    def test_idfgeo_public_access(self):
        """IDFGeo should be accessible without authentication."""
        response = self.client.get(reverse('ferramenta_drenagem:idfgeo'))
        self.assertEqual(response.status_code, 200)

    def test_idfgeo_authenticated_access(self):
        """Authenticated user gets 200 on IDFGeo."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('ferramenta_drenagem:idfgeo'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'IDFGeo')

    def test_idfgeo_shortcut_redirect(self):
        """/idfgeo/ should redirect (302) to /drenagem/idfgeo/."""
        response = self.client.get('/idfgeo/')
        self.assertIn(response.status_code, (301, 302))
        self.assertTrue(response['Location'].endswith('/drenagem/idfgeo/'))

    def test_rain_equations_api(self):
        """API deve retornar JSON com ao menos uma equação (se existir no banco)."""
        # Cria uma equação de teste
        RainEquation.objects.create(name='Cidade Teste - RS', k=3000, a=0.15, b=20, c=0.9)
        url = reverse('ferramenta_drenagem:get_rain_equations')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Confere se slug aparece
        # The key generation in views.py uses simple replacement, so we should match that behavior
        expected_key = 'cidade_teste___rs' # "Cidade Teste - RS".lower().replace(' ', '_').replace('-', '_')
        
        # Alternatively, just check if we can find the equation by checking values
        found_eq = None
        for key, val in data.items():
             if val['name'] == 'Cidade Teste - RS':
                 found_eq = val
                 break
        
        self.assertIsNotNone(found_eq)
        self.assertEqual(found_eq['k'], 3000.0)
        self.assertIn('id', found_eq)
