# Whats going on with trump?
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
import uvicorn
import os
from datetime import datetime
from urllib.parse import unquote, urlencode
import httpx
from bs4 import BeautifulSoup
import asyncio
import json
import hashlib

app = FastAPI()
LOG_FILE = "mcp_log.txt"
serverUrl = "https://44a10e2fb1957e52bdfcaa5cf749f87c.serveo.net/"

# Directory for cache files
CACHE_DIR = "./cache"

# Ensure the cache directory exists
os.makedirs(CACHE_DIR, exist_ok=True)

def hash_key(key: str) -> str:
    """Generate a hashed version of the cache key."""
    return hashlib.sha256(key.encode()).hexdigest()

def get_cache_file_path(key: str) -> str:
    """Generate a file path for a given cache key."""
    hashed_key = hash_key(key)
    return os.path.join(CACHE_DIR, f"{hashed_key}.json")

def load_cache(key: str):
    """Load cache from disk."""
    file_path = get_cache_file_path(key)
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return None

def save_cache(key: str, data):
    """Save cache to disk."""
    file_path = get_cache_file_path(key)
    with open(file_path, "w") as f:
        json.dump(data, f)

def log_request_response(method: str, url: str, request_headers: dict, request_body: str, client_ip: str, response_status: int, response_headers: dict, response_body: str):
    try:
        request_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = (
            f"\n{'='*40}\n"
            f"Time: {request_time}\n"
            f"{method} {url}\n"
            f"Client IP: {client_ip}\n"
            f"Request Headers:\n"
            + "\n".join(f"{k}: {v}" for k, v in request_headers.items()) +
            f"\n\nRequest Body:\n{request_body}\n"
            f"Response Status: {response_status}\n"
            f"Response Headers:\n"
            + "\n".join(f"{k}: {v}" for k, v in response_headers.items()) +
            f"\n\nResponse Body:\n{response_body}\n"
            f"{'='*40}\n"
        )

        with open(LOG_FILE, "a") as f:
            f.write(log_entry)
        
        # Removed print statement to prevent logging to terminal
    except Exception as e:
        print(f"Failed to log request/response: {e}")

@app.middleware("http")
async def log_all_requests(request: Request, call_next):
    try:
        body = await request.body()
        body_str = body.decode("utf-8") if body else ""
        request_headers = dict(request.headers)
        client_ip = request.client.host

        response = await call_next(request)
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        response_body_str = response_body.decode("utf-8") if response_body else ""
        response_headers = dict(response.headers)

        log_request_response(
            request.method, str(request.url), request_headers, body_str, client_ip,
            response.status_code, response_headers, response_body_str
        )

        return Response(content=response_body, status_code=response.status_code, headers=dict(response.headers))
    except Exception as e:
        print(f"Error in middleware: {e}")
        return Response(content="Internal Server Error", status_code=500)

async def post_request_with_data(query: str):
    url = "https://talkwiththeworld.org/query"
    data = {
        "query": query,
        "messages": [{"role": "user", "content": query}],
        "conversation_id": None,
        "sources": ["NAB", "O'Reilly", "Radical Exchange", "The City"]
    }

    try:
        print(f"Sending POST request to {url} with data: {data}")
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data)
            print(f"Received response with status code: {response.status_code}")
            response.raise_for_status()
            response_json = response.json()
            print(f"Response JSON: {response_json}")

            if response.status_code == 200 and 'query_id' in response_json:
                query_id = response_json['query_id']
                return await poll_for_response(query_id)

            return response_json
    except httpx.HTTPStatusError as e:
        print(f"HTTP error occurred: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

async def poll_for_response(query_id: str):
    poll_url = f"https://talkwiththeworld.org/query/{query_id}"
    try:
        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(poll_url)
                if response.status_code == 200:
                    response_json = response.json()
                    print(f"Final response JSON: {response_json}")
                    return response_json
                elif response.status_code != 202:
                    print(f"Error or unexpected status code: {response.status_code}")
                    return {"error": "Failed to retrieve final response"}
                await asyncio.sleep(1)
    except Exception as e:
        print(f"An error occurred while polling: {e}")
        return {"error": "Polling failed"}


@app.get("/", response_class=HTMLResponse)
async def handle_request(request: Request, cache: bool = True):
    try:
        query_params = request.query_params
        q_param = query_params.get("q", "").strip()
        follow = int(query_params.get("follow", 1))
        cache = not (query_params.get("nocache", "false").lower() == "true")

        if not q_param:
            return HTMLResponse(content="<p>No query parameter provided</p>", status_code=400, headers={"Access-Control-Allow-Origin": "*"})

        decoded_q = unquote(q_param)
        query_string = urlencode({"q": decoded_q, "follow": follow})

        cache_key = f"response:{hash(query_string)}"
        response_data = None

        if cache:
            response_data = load_cache(cache_key)

        if not response_data:
            # Fire the request to post_request_with_data with the query and get the response
            response_data = await post_request_with_data(decoded_q)
            save_cache(cache_key, response_data)

        markdown_content = ""
        markdown_content += f"{response_data.get('response', 'No answer available')}\n\n"
        markdown_content += "Relevant Documents:\n"
        for doc in response_data.get('relevant_docs', []):
            markdown_content += f"- [{doc['title']}]({doc['link']})\n"

        # Log request (placeholder)
        log_request_response(
            request.method,
            str(request.url),
            dict(request.headers),
            "",
            request.client.host,
            200,
            {},
            ""
        )

        response_headers = {
            "Access-Control-Allow-Origin": "*"
        }

        return HTMLResponse(content=markdown_content, media_type="text/markdown", headers=response_headers)

    except Exception as e:
        print(f"Error in handle_request: {e}")
        return HTMLResponse(content="Internal Server Error", status_code=500)

async def fetch_page_content(url, index, results, request: Request):
    try:
        # Check cache for page content
        cache_key = f"page:{url}"
        page_text = load_cache(cache_key)
        if page_text:
            print(f"URL is cached: {cache_key} is being returned")
        else:
            print(f"Fetching URL: {url}")
            timeout_seconds = float(request.query_params.get("timeout", 3.0))
            async with httpx.AsyncClient() as client:
                page_response = await asyncio.wait_for(client.get(url), timeout=timeout_seconds)
                if page_response.status_code == 200:
                    page_soup = BeautifulSoup(page_response.text, 'lxml')
                    page_text = page_soup.get_text(strip=True)
                    # Cache the page content if the response is 200 OK
                    save_cache(cache_key, page_text)
                else:
                    page_text = ""

        results[index] = (results[index][0], url, page_text)
    except Exception as e:
        print(f"Failed to fetch or parse {url}: {e}")

@app.get("/mcp", response_class=HTMLResponse)
async def mcp_handler(request: Request):
    query_params = request.query_params
    token = query_params.get("token")
    query = query_params.get("q", "").strip()

    # Optionally validate the token
    if token != "supersecrettoken":
        return Response(content="Unauthorized", status_code=401)

    # Simulate logic (e.g., call local plugin or read file)
    # You could trigger anything here: `subprocess`, local DB, read private files, etc.
    result = f"<p><strong>Query:</strong> {query}</p><p>Response from your private data: ✅</p>"

    response_headers = {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
    }

    log_request_response(
        request.method, str(request.url), dict(request.headers), "",
        request.client.host, 200, response_headers, result
    )

    return Response(content=result, headers=response_headers)


@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt(request: Request):
    try:
        response_body = "User-agent: *\nDisallow:"
        no_cache_headers = {
            "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
            "pragma": "no-cache",
            "expires": "0"
        }
        response_headers = {
            "content-type": "text/plain; charset=utf-8",
            **no_cache_headers
        }
        log_request_response(
            request.method, str(request.url), dict(request.headers), "", request.client.host,
            200, response_headers, response_body
        )
        return Response(content=response_body, media_type="text/plain", headers=no_cache_headers)
    except Exception as e:
        print(f"Error in robots_txt: {e}")
        return Response(content="Internal Server Error", status_code=500)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8083))
    uvicorn.run("mcp:app", host="0.0.0.0", port=port, reload=True)
