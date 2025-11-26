from django.db import models


class IDFFormula(models.Model):
    """
    Model for IDF (Intensity-Duration-Frequency) rainfall equations published in Brazil.
    Based on the standard IDF equation format: i = K * TR^a / (t + b)^c
    where:
        i = rainfall intensity (mm/h)
        TR = return period (years)
        t = duration (min)
        K, a, b, c = equation parameters
    """
    
    # States of Brazil
    STATES = [
        ('AC', 'Acre'),
        ('AL', 'Alagoas'),
        ('AP', 'Amapá'),
        ('AM', 'Amazonas'),
        ('BA', 'Bahia'),
        ('CE', 'Ceará'),
        ('DF', 'Distrito Federal'),
        ('ES', 'Espírito Santo'),
        ('GO', 'Goiás'),
        ('MA', 'Maranhão'),
        ('MT', 'Mato Grosso'),
        ('MS', 'Mato Grosso do Sul'),
        ('MG', 'Minas Gerais'),
        ('PA', 'Pará'),
        ('PB', 'Paraíba'),
        ('PR', 'Paraná'),
        ('PE', 'Pernambuco'),
        ('PI', 'Piauí'),
        ('RJ', 'Rio de Janeiro'),
        ('RN', 'Rio Grande do Norte'),
        ('RS', 'Rio Grande do Sul'),
        ('RO', 'Rondônia'),
        ('RR', 'Roraima'),
        ('SC', 'Santa Catarina'),
        ('SP', 'São Paulo'),
        ('SE', 'Sergipe'),
        ('TO', 'Tocantins'),
    ]
    
    # Location info
    name = models.CharField(
        max_length=200,
        verbose_name="Nome da Estação/Local",
        help_text="Nome da estação pluviométrica ou localidade"
    )
    city = models.CharField(
        max_length=100,
        verbose_name="Cidade",
        help_text="Cidade onde está localizada a estação"
    )
    state = models.CharField(
        max_length=2,
        choices=STATES,
        verbose_name="Estado",
        help_text="Estado brasileiro (UF)"
    )
    
    # Equation parameters (i = K * TR^a / (t + b)^c)
    k = models.FloatField(
        verbose_name="K",
        help_text="Parâmetro K da equação IDF"
    )
    a = models.FloatField(
        verbose_name="a",
        help_text="Expoente do tempo de retorno (TR)"
    )
    b = models.FloatField(
        verbose_name="b",
        help_text="Parâmetro b da equação IDF"
    )
    c = models.FloatField(
        verbose_name="c",
        help_text="Expoente da duração (t + b)"
    )
    
    # Validity constraints
    duration_min = models.PositiveIntegerField(
        default=5,
        verbose_name="Duração mínima",
        help_text="Duração mínima válida (minutos)"
    )
    duration_max = models.PositiveIntegerField(
        default=1440,
        verbose_name="Duração máxima",
        help_text="Duração máxima válida (minutos)"
    )
    return_period_min = models.PositiveIntegerField(
        default=2,
        verbose_name="TR mínimo",
        help_text="Tempo de retorno mínimo válido (anos)"
    )
    return_period_max = models.PositiveIntegerField(
        default=100,
        verbose_name="TR máximo",
        help_text="Tempo de retorno máximo válido (anos)"
    )
    
    # Source/Reference info
    source = models.CharField(
        max_length=300,
        verbose_name="Fonte",
        help_text="Referência bibliográfica ou fonte dos dados",
        blank=True
    )
    author = models.CharField(
        max_length=200,
        verbose_name="Autor(es)",
        help_text="Autor(es) do estudo",
        blank=True
    )
    year = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Ano de publicação",
        help_text="Ano de publicação do estudo"
    )
    
    # Geographic coordinates (optional, for map display)
    latitude = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Latitude",
        help_text="Latitude em graus decimais"
    )
    longitude = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Longitude",
        help_text="Longitude em graus decimais"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Indica se a fórmula está disponível para consulta"
    )
    
    class Meta:
        verbose_name = "Fórmula IDF"
        verbose_name_plural = "Fórmulas IDF"
        ordering = ['state', 'city', 'name']
        indexes = [
            models.Index(fields=['state', 'city']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.city}/{self.state}"
    
    def get_full_location(self):
        """Returns full location string."""
        return f"{self.city} - {self.get_state_display()}"
    
    def calculate_intensity(self, return_period, duration):
        """
        Calculate rainfall intensity using the IDF equation.
        
        Args:
            return_period: Return period in years
            duration: Duration in minutes
            
        Returns:
            Rainfall intensity in mm/h
        """
        if duration <= 0 or return_period <= 0:
            return 0
        try:
            intensity = (self.k * (return_period ** self.a)) / ((duration + self.b) ** self.c)
            return round(intensity, 2)
        except (ZeroDivisionError, ValueError):
            return 0
