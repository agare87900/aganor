import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

PORT = 3000


def find_base_dir():
    """Locate base directory containing index.html.
    Searches PyInstaller temp dir (_MEIPASS), exe dir, and its parent.
    """
    meipass = getattr(sys, '_MEIPASS', None)
    exe_dir = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__))
    candidates = []
    if meipass:
        candidates.append(meipass)
    candidates.extend([exe_dir, os.path.abspath(os.path.join(exe_dir, os.pardir))])
    for path in candidates:
        if os.path.exists(os.path.join(path, "index.html")):
            return path
    return candidates[0] if candidates else exe_dir

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress server logs

    # Force-disable caching so updated assets are always fetched
    def end_headers(self):
        try:
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        except Exception:
            pass
        super().end_headers()

def start_server(base_dir):
    os.chdir(base_dir)
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving from {base_dir}")
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()

def open_browser():
    time.sleep(1)  # Wait for server to start
    webbrowser.open(f'http://localhost:{PORT}')

if __name__ == "__main__":
    base_dir = find_base_dir()

    # Start server in background thread
    server_thread = threading.Thread(target=start_server, args=(base_dir,), daemon=True)
    server_thread.start()
    
    # Open browser
    open_browser()
    
    print("\nVoxel Game is running!")
    print("Serving from:", base_dir)
    print("Close this window to stop the server.\n")
    
    # Keep program running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
