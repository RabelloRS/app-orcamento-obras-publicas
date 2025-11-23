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
        url = reverse('ferramenta_drenagem:rain_equations_api')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Confere se slug aparece
        self.assertTrue(any('cidade_teste_rs' in key for key in data.keys()))
        # Confere parâmetros básicos
        found = [v for k, v in data.items() if k.startswith('cidade_teste_rs')]
        self.assertTrue(found)
        self.assertEqual(found[0]['k'], 3000.0)
        self.assertIn('pk', found[0])
