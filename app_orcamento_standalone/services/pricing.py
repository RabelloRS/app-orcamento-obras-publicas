from decimal import Decimal
from models import BDIConfiguration

def calculate_bdi_rate(config: BDIConfiguration) -> Decimal:
    """
    Calculates BDI rate based on standard formula.
    Formula:
    NUM = (1 + AC + S + R) * (1 + DF) * (1 + L)
    DEN = (1 - I)
    BDI = (NUM / DEN) - 1
    
    All rates in DB are stored as Decimals (e.g. 0.0300 for 3%).
    """
    ac = config.administration_rate
    s = config.insurance_rate
    r = config.risk_rate
    df = config.financial_expenses_rate
    l = config.profit_rate
    
    # Taxes
    i = config.pis_rate + config.cofins_rate + config.iss_rate + config.cprb_rate
    
    # Check for invalid inputs (I >= 1 case)
    if i >= Decimal('1.0'):
        return Decimal('0')

    numerator = (Decimal('1') + ac + s + r) * (Decimal('1') + df) * (Decimal('1') + l)
    denominator = (Decimal('1') - i)
    
    bdi = (numerator / denominator) - Decimal('1')
    
    return bdi
