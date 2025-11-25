from django.test import TestCase, Client
from django.urls import reverse

class PavimentacaoTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_index_view_status_code(self):
        url = reverse('pavimentacao:index')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_index_view_template(self):
        url = reverse('pavimentacao:index')
        response = self.client.get(url)
        self.assertTemplateUsed(response, 'pavimentacao/index.html')
