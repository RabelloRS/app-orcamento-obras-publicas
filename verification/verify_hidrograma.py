from playwright.sync_api import sync_playwright

def verify_hidrograma():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Visit Homepage
        print("Visiting Homepage...")
        page.goto("http://localhost:8000/inicio/")
        page.screenshot(path="verification/homepage_before.png")
        page.wait_for_selector("text=HidroCalc Pro")
        page.screenshot(path="verification/homepage.png")
        print("Homepage screenshot taken.")

        # 2. Click Access
        print("Clicking Access...")
        page.click("text=Usar agora >> nth=0") # Changed button text in public_home.html

        # 3. Verify App Loads
        print("Verifying App...")
        page.wait_for_selector("text=HidroCalc Pro") # The app title in the nav
        page.wait_for_selector("canvas#chart-hydrograph") # Check if chart canvas exists
        page.screenshot(path="verification/hidrograma_app.png")
        print("App screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_hidrograma()
