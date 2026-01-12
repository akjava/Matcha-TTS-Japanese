from playwright.sync_api import sync_playwright, expect

def test_g2p_logs(page):
    # Navigate to the local server serving the example file
    # We use model_simple_mini-bart-g2p.html because it is a simple example that might use transformers
    # However, text_to_arpa.js is used by other files.
    # Let's try to load one that uses text_to_arpa.js, e.g., examples/matcha_tts_speak.html
    # But that might require more setup.
    # The user mentioned model_simple_mini-bart-g2p.html in my investigation earlier.
    # Actually, model_simple_mini-bart-g2p.html imports pipeline and env directly.
    # But verify if I modified text_to_arpa.js, does it affect model_simple_mini-bart-g2p.html?
    # No, model_simple_mini-bart-g2p.html imports directly from CDN.

    # I should create a test html file that imports my modified text_to_arpa.js to verify it loads without error.

    page.goto("http://localhost:8000/examples/matcha_tts_speak.html")

    # We can't easily check console logs from here unless we capture them.
    # But we can check if the page loads and if there are errors.

    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    # Wait for a bit
    page.wait_for_timeout(5000)

    # Take a screenshot
    page.screenshot(path="verification/g2p_page.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            test_g2p_logs(page)
        except Exception as e:
            print(e)
        finally:
            browser.close()
