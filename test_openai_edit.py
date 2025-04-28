import os
import requests
from dotenv import load_dotenv
import base64
import time

# --- Configuration ---
# Use a simple, small, publicly accessible PNG image URL for testing
# Example: A small Wikimedia Commons PNG
TEST_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"
TEST_PROMPT = "Add a small red cartoon heart floating above the main object."
OUTPUT_FILENAME = "test_output.png"
OPENAI_API_ENDPOINT = "https://api.openai.com/v1/images/edits"
MODEL_TO_TEST = "gpt-image-1"
# --- End Configuration ---

def load_api_key():
    """Loads the OpenAI API key from .env.local"""
    print("[INFO] Loading environment variables from .env.local...")
    # Navigate up one level if script is run from workspace root
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(dotenv_path):
         # Try workspace root if not found relative to script
         dotenv_path = '.env.local'

    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path, override=True)
        print("[INFO] .env.local loaded.")
    else:
        print("[WARN] .env.local file not found in script directory or workspace root.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[ERROR] OPENAI_API_KEY not found in environment variables.")
        return None
    print(f"[INFO] OpenAI API Key loaded successfully (starts with: {api_key[:5]}...).")
    return api_key

def fetch_image(url):
    """Fetches an image from a URL"""
    print(f"[INFO] Fetching test image from: {url}")
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()  # Raise an exception for bad status codes
        print(f"[INFO] Test image fetched successfully ({(len(response.content) / 1024):.2f} KB).")
        return response.content, response.headers.get('content-type', 'image/png')
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to fetch test image: {e}")
        return None, None

def test_openai_edit(api_key, image_content, image_content_type):
    """Calls the OpenAI /v1/images/edits endpoint"""
    print(f"[INFO] Preparing request for OpenAI API: {OPENAI_API_ENDPOINT}")
    print(f"[INFO] Using model: {MODEL_TO_TEST}")
    print(f"[INFO] Using prompt: '{TEST_PROMPT}'")

    headers = {
        "Authorization": f"Bearer {api_key}",
        # 'Content-Type' is set automatically by requests when using files
    }

    files = {
        'image': ('test_image.png', image_content, image_content_type),
        'prompt': (None, TEST_PROMPT),
        'model': (None, MODEL_TO_TEST),
        'n': (None, '1'),
        'size': (None, '1024x1024'), # Required size for DALL-E 2, also supported by gpt-image-1
        # gpt-image-1 always returns b64_json, no need for response_format
    }

    start_time = time.time()
    print("[INFO] Sending request to OpenAI...")
    try:
        response = requests.post(OPENAI_API_ENDPOINT, headers=headers, files=files, timeout=120) # 120 second timeout
        end_time = time.time()
        print(f"[INFO] Received response from OpenAI in {end_time - start_time:.2f} seconds.")
        print(f"[INFO] OpenAI Response Status Code: {response.status_code}")

        if response.status_code == 200:
            print("[INFO] OpenAI API call successful (200 OK).")
            try:
                result = response.json()
                # Log first 500 chars of response for inspection
                print("[INFO] OpenAI Response JSON (partial):", str(result)[:500])

                if result.get("data") and isinstance(result["data"], list) and len(result["data"]) > 0:
                    if "b64_json" in result["data"][0]:
                        print("[INFO] Found 'b64_json' image data in response.")
                        base64_image = result["data"][0]["b64_json"]
                        try:
                            print(f"[INFO] Decoding base64 image data...")
                            image_data = base64.b64decode(base64_image)
                            print(f"[INFO] Saving decoded image to '{OUTPUT_FILENAME}'...")
                            with open(OUTPUT_FILENAME, "wb") as f:
                                f.write(image_data)
                            print(f"[SUCCESS] Image saved successfully as '{OUTPUT_FILENAME}'.")
                            return True
                        except Exception as e:
                            print(f"[ERROR] Failed to decode or save base64 image: {e}")
                            return False
                    elif "url" in result["data"][0]:
                         # Should not happen with gpt-image-1, but handle just in case
                         print("[WARN] Received URL instead of b64_json (unexpected for gpt-image-1):", result["data"][0]["url"])
                         print("[INFO] Cannot automatically save URL-based image in this script.")
                         return False
                    else:
                         print("[ERROR] Response JSON does not contain 'b64_json' or 'url' in data[0].")
                         return False
                else:
                    print("[ERROR] Response JSON does not contain expected 'data' list.")
                    print("[INFO] Full Response JSON:", result)
                    return False

            except requests.exceptions.JSONDecodeError:
                print("[ERROR] Failed to decode OpenAI response as JSON.")
                print("[INFO] Response Text:", response.text)
                return False
        else:
            print("[ERROR] OpenAI API call failed.")
            try:
                # Try to parse error details from JSON response
                error_details = response.json()
                print("[INFO] OpenAI Error Response JSON:", error_details)
            except requests.exceptions.JSONDecodeError:
                # If JSON decoding fails, just print the raw text
                print("[INFO] OpenAI Error Response Text:", response.text)
            return False

    except requests.exceptions.Timeout:
        print("[ERROR] Request to OpenAI timed out.")
        return False
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] An error occurred during the OpenAI API request: {e}")
        return False

if __name__ == "__main__":
    print("--- Starting OpenAI Edit API Test ---")
    api_key = load_api_key()
    if api_key:
        image_content, image_type = fetch_image(TEST_IMAGE_URL)
        if image_content:
            test_openai_edit(api_key, image_content, image_type)
    print("--- Test Finished ---") 