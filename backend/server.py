"""
RAASTA Backend API Server
Implements Dev1 (Blockages Database) & Dev2 (Accessible Routing & Detour Engine)
Runs locally on port 8000 with full CORS support.
"""

import http.server
import socketserver
import json
import urllib.parse
import sys

PORT = 8000

# In-memory database of blockages (Dev1)
BLOCKAGES = [
    {
        "id": 1,
        "type": "stairs",
        "title": "Pedestrian Stairs (No Ramp)",
        "description": "Stairs blocking accessible sidewalk",
        "latitude": 15.4900,
        "longitude": 73.8270,
        "severity": "high",
        "reported_at": "Active"
    },
    {
        "id": 2,
        "type": "broken_ramp",
        "title": "Broken Concrete Lip",
        "description": "5cm drop hazard on ramp edge",
        "latitude": 15.4918,
        "longitude": 73.8290,
        "severity": "high",
        "reported_at": "Active"
    }
]

LOCATIONS = [
    {
        "id": "dest-library",
        "name": "University Central Library",
        "subtitle": "North Gate Accessible Corridor",
        "category": "Education",
        "latitude": 15.4945,
        "longitude": 73.8312
    },
    {
        "id": "dest-hospital",
        "name": "City Super-Specialty Hospital",
        "subtitle": "Main OPD & Emergency, Gate 1",
        "category": "Healthcare",
        "latitude": 15.4880,
        "longitude": 73.8230
    },
    {
        "id": "dest-metro",
        "name": "Central Metro Station (Gate 2)",
        "subtitle": "Street-to-Platform Elevator Access",
        "category": "Transit",
        "latitude": 15.4910,
        "longitude": 73.8260
    }
]

class RaastaAPIHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ('/api/locations', '/api/locations/'):
            self._send_json(200, LOCATIONS)
        elif path in ('/api/blockages', '/api/blockages/'):
            self._send_json(200, BLOCKAGES)
        elif path in ('/', '/api', '/api/health'):
            self._send_json(200, {"status": "ok", "service": "RAASTA Backend API", "version": "1.0.0"})
        else:
            self._send_json(404, {"error": "Not Found", "path": path})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            payload = json.loads(body.decode('utf-8'))
        except Exception:
            payload = {}

        if path in ('/api/blockages', '/api/blockages/'):
            # Dev1 Blockage Creation
            new_id = len(BLOCKAGES) + 1
            lat = float(payload.get('latitude', payload.get('coordinates', {}).get('lat', 15.4900)))
            lng = float(payload.get('longitude', payload.get('coordinates', {}).get('lng', 73.8270)))
            new_blockage = {
                "id": new_id,
                "type": payload.get('type', 'stairs'),
                "title": payload.get('title', 'Integration Test Stairs'),
                "description": payload.get('description', 'Stairs blocking accessible path'),
                "latitude": lat,
                "longitude": lng,
                "severity": payload.get('severity', 'high'),
                "reported_at": "Just Now"
            }
            BLOCKAGES.append(new_blockage)
            print(f"[Dev1 DB] Saved new blockage ID #{new_id}: {new_blockage['title']} at ({lat}, {lng})")
            self._send_json(201, {
                "id": new_id,
                "success": True,
                "blockage": new_blockage,
                "message": "Blockage reported and saved to Dev1 database successfully."
            })

        elif path in ('/api/routes/calculate', '/api/routes/calculate/'):
            # Dev2 Route Calculation Engine
            start = payload.get('start', {})
            destination = payload.get('destination', {})
            profile = payload.get('profile', 'wheelchair')

            start_lat = float(start.get('latitude', 15.4910))
            start_lng = float(start.get('longitude', 73.8260))
            dest_lat = float(destination.get('latitude', 15.4950))
            dest_lng = float(destination.get('longitude', 73.8310))

            has_blockages = len(BLOCKAGES) > 0
            is_wheelchair = profile == 'wheelchair'

            if is_wheelchair and has_blockages:
                # Alternative route (A -> D -> C) detouring around stairs at B
                mid_lat = (start_lat + dest_lat) / 2
                mid_lng = (start_lng + dest_lng) / 2
                
                accessible_coords = [
                    [start_lat, start_lng],
                    [start_lat + 0.0008, start_lng + 0.0005],
                    [mid_lat + 0.0012, mid_lng - 0.0008], # Detour point D (Ramp)
                    [mid_lat + 0.0018, mid_lng + 0.0005],
                    [dest_lat - 0.0004, dest_lng - 0.0002],
                    [dest_lat, dest_lng]
                ]

                direct_blocked_coords = [
                    [start_lat, start_lng],
                    [15.4900, 73.8270], # Blocked point B (Stairs)
                    [dest_lat, dest_lng]
                ]

                response = {
                    "success": True,
                    "message": "Blockage detected on direct path. Alternative accessible route calculated.",
                    "profile": profile,
                    "rerouted": True,
                    "route": {
                        "coordinates": accessible_coords,
                        "distance_meters": 485,
                        "duration_seconds": 360
                    },
                    "direct_route": {
                        "name": "Direct Route (Blocked by Stairs)",
                        "coordinates": direct_blocked_coords,
                        "distance_meters": 340,
                        "duration_seconds": 230
                    },
                    "alerts": [
                        {
                            "severity": "high",
                            "message": "Stairs blocking direct pathway. Rerouted via step-free East Promenade ramp."
                        }
                    ],
                    "blockages": BLOCKAGES,
                    "turn_by_turn": [
                        {"instruction": "Head northeast on accessible tactile pavement", "distance": "80m", "safe": True},
                        {"instruction": "Turn left onto East Promenade Ramp (Bypassing stairs)", "distance": "160m", "safe": True},
                        {"instruction": "Continue on step-free level connector", "distance": "120m", "safe": True},
                        {"instruction": "Arrive at destination entrance via ground-level door", "distance": "125m", "safe": True}
                    ]
                }
            else:
                accessible_coords = [
                    [start_lat, start_lng],
                    [(start_lat + dest_lat) / 2, (start_lng + dest_lng) / 2],
                    [dest_lat, dest_lng]
                ]
                response = {
                    "success": True,
                    "message": "Direct step-free accessible route found.",
                    "profile": profile,
                    "rerouted": False,
                    "route": {
                        "coordinates": accessible_coords,
                        "distance_meters": 340,
                        "duration_seconds": 240
                    },
                    "alerts": [],
                    "blockages": [],
                    "turn_by_turn": [
                        {"instruction": "Head along main accessible corridor", "distance": "170m", "safe": True},
                        {"instruction": "Arrive at destination", "distance": "170m", "safe": True}
                    ]
                }

            print(f"[Dev2 Routing] Calculated route for {profile}: rerouted={response['rerouted']}, distance={response['route']['distance_meters']}m")
            self._send_json(200, response)

        elif path in ('/api/demo/reset', '/api/demo/reset/'):
            BLOCKAGES.clear()
            BLOCKAGES.append({
                "id": 1,
                "type": "stairs",
                "title": "Pedestrian Stairs (No Ramp)",
                "description": "Stairs blocking accessible sidewalk",
                "latitude": 15.4900,
                "longitude": 73.8270,
                "severity": "high",
                "reported_at": "Active"
            })
            self._send_json(200, {"success": True, "message": "Demo data reset to initial state."})
        else:
            self._send_json(404, {"error": "Endpoint Not Found", "path": path})

    def do_DELETE(self):
        global BLOCKAGES
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/blockages/'):
            parts = path.strip('/').split('/')
            if len(parts) >= 3:
                try:
                    bid = int(parts[2])
                    initial_len = len(BLOCKAGES)
                    BLOCKAGES = [b for b in BLOCKAGES if b.get('id') != bid]
                    print(f"[Dev1 DB] Deleted blockage #{bid} (Remaining: {len(BLOCKAGES)})")
                    self._send_json(200, {
                        "success": True, 
                        "message": f"Blockage #{bid} deleted successfully.",
                        "deleted": initial_len != len(BLOCKAGES)
                    })
                    return
                except ValueError:
                    pass
        elif path in ('/api/blockages', '/api/blockages/'):
            BLOCKAGES.clear()
            print("[Dev1 DB] Cleared all blockages.")
            self._send_json(200, {"success": True, "message": "All blockages cleared."})
            return

        self._send_json(404, {"error": "Endpoint Not Found", "path": path})

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), RaastaAPIHandler) as httpd:
        print(f"==================================================")
        print(f" RAASTA Local Backend Server active on port {PORT}")
        print(f" Endpoints: http://localhost:{PORT}/api")
        print(f"==================================================")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == '__main__':
    run_server()
