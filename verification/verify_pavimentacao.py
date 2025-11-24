from playwright.sync_api import sync_playwright

def verify_pavimentacao():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Visit Homepage
        print("Visiting Homepage...")
        page.goto("http://localhost:8000/inicio/")
        page.wait_for_selector("text=Pavimentação.br")
        page.screenshot(path="verification/homepage_pav.png")
        print("Homepage screenshot taken.")

        # 2. Click Access
        print("Clicking Access...")
        # We have multiple "Usar agora" buttons. Need to be specific.
        # The card has "Pavimentação.br" title.
        # We can find the article with text "Pavimentação.br" and then find the link inside it.
        card = page.locator("article").filter(has_text="Pavimentação.br")
        card.locator("text=Usar agora").click()

        # 3. Verify App Loads
        print("Verifying App...")
        page.wait_for_selector("text=Pavimentação.br") # Sidebar title
        page.wait_for_selector("text=Projeto Atual")
        page.screenshot(path="verification/pavimentacao_app.png")
        print("App screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_pavimentacao()
