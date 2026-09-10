from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import sys

PORT = 3000

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            if os.path.exists('index.html'):
                with open('index.html', 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"<h1>Hello from Python Sandbox!</h1><p>PodForge environment running.</p>")
            return
        return super().do_GET()

def run():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"🚀 Python server running on http://0.0.0.0:{PORT}")
    print(f"👉 Live Web Preview is connected to port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Python server...")
        httpd.server_close()

if __name__ == '__main__':
    run()
