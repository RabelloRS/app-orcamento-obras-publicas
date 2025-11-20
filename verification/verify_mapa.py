from playwright.sync_api import sync_playwright

def verify_mapa(page):
    # Login
    # The login URL is /contas/login/ inside usuarios app which is included at root, so /contas/login/
    # Wait, urls.py says path('', include('usuarios.urls')), so /contas/login/ should be correct.
    # But wait, usuarios/urls.py defines 'contas/login/' so the full path is '/contas/login/'

    page.goto('http://localhost:8000/contas/login/')
    page.fill('input[name="username"]', 'testuser')
    page.fill('input[name="password"]', 'testpass123')
    page.click('button[type="submit"]')

    # Navigate to Mapa de Fotos
    page.goto('http://localhost:8000/fotos/')

    # Verify elements
    page.wait_for_selector('#map')
    page.wait_for_selector('text=Mapa de Fotos Local')
    page.wait_for_selector('button:has-text("Selecionar Fotos")')

    # Take screenshot
    page.screenshot(path='verification/mapa_fotos_ui.png')

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_mapa(page)
        finally:
            browser.close()
