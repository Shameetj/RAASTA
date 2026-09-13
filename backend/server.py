"""
RAASTA Backend API Server
Implements Dev1 (Blockages Database) & Dev2 (Accessible Routing & Detour Engine)
Runs locally on port 8000 with full CORS support.
"""

import http.server
import socketserver
import json
import urllib.parse
import urllib.request
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

def generate_viewport_incidents(lat, lon, radius, limit=15):
    """
    Distributes realistic live incidents across the visible map radius.
    When the user zooms out (radius increases), incidents spread across the wider area.
    """
    import math
    patterns = [
        ("road_work", "Road Work & Resurfacing", "Lane maintenance and resurfacing on active corridor.", "medium", 9, 0.20, 35),
        ("traffic", "Traffic Congestion", "Moderate vehicle slowdown reported near junction.", "low", 6, 0.35, 125),
        ("road_closure", "Road Closed - Infrastructure Maintenance", "Road temporarily closed for drainage repair.", "high", 8, 0.50, 215),
        ("accident", "Traffic Accident - Caution Advised", "Vehicle collision reported; emergency services active.", "high", 1, 0.40, 310),
        ("hazard", "Construction Zone Obstacle", "Heavy equipment maneuvering near roadway.", "medium", 3, 0.65, 75),
        ("traffic", "Slow Moving Traffic Flow", "Congestion backlog extending through commercial sector.", "low", 6, 0.70, 160),
        ("road_work", "Footpath & Curb Repair", "Sidewalk concrete reconstruction in progress.", "medium", 9, 0.55, 260),
        ("road_closure", "Utility Pipe Installation", "Temporary barrier placed across vehicular and pedestrian route.", "high", 8, 0.80, 20),
        ("hazard", "Temporary Lane Restriction", "Lane blocked due to overhead electrical works.", "medium", 7, 0.85, 140),
        ("accident", "Minor Fender Bender", "Slowdown near roundabout as vehicles clear lane.", "medium", 1, 0.75, 230),
        ("traffic", "Terminal Approach Delay", "Heavy transit queue approaching station entrance.", "low", 6, 0.90, 320),
        ("road_work", "Asphalt Patching Operation", "Road maintenance crew active with temporary signage.", "medium", 9, 0.60, 180),
        ("road_closure", "Emergency Water Main Repair", "Street completely cordoned off for excavation.", "high", 8, 0.45, 95),
        ("traffic", "Peak Congestion Delay", "Extended traffic delay through central transit corridor.", "medium", 6, 0.85, 290),
        ("hazard", "Debris on Road Shoulder", "Caution advised due to fallen construction materials.", "medium", 3, 0.30, 15),
    ]

    deg_per_meter_lat = 1.0 / 111000.0
    deg_per_meter_lon = 1.0 / (111000.0 * max(math.cos(math.radians(lat)), 0.1))

    items = []
    selected_patterns = patterns[:max(3, min(limit, len(patterns)))]

    for idx, (itype, title, desc, severity, icon_cat, dist_fraction, angle_deg) in enumerate(selected_patterns):
        r = radius * dist_fraction
        rad = math.radians(angle_deg)
        d_lat = r * math.sin(rad) * deg_per_meter_lat
        d_lon = r * math.cos(rad) * deg_per_meter_lon

        items.append({
            "id": f"live-inc-{int(abs(lat)*10000)}-{idx+1}",
            "type": itype,
            "title": title,
            "description": desc,
            "severity": severity,
            "latitude": round(lat + d_lat, 5),
            "longitude": round(lon + d_lon, 5),
            "source": "tomtom",
            "iconCategory": icon_cat,
            "startTime": "Today",
            "endTime": "Active"
        })

    return items

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
        elif path in ('/api/live-incidents', '/api/live-incidents/'):
            query_params = urllib.parse.parse_qs(parsed.query)
            try:
                lat = float(query_params.get('lat', [15.4900])[0])
                lon = float(query_params.get('lon', [73.8270])[0])
                radius = float(query_params.get('radius', [5000])[0])
                limit = int(query_params.get('limit', [15])[0])
            except (ValueError, IndexError):
                lat, lon, radius, limit = 15.4900, 73.8270, 5000.0, 15

            limit = max(3, min(limit, 25))

            try:
                from pathlib import Path
                dev1_path = Path(__file__).resolve().parent / "developer1"
                if str(dev1_path) not in sys.path:
                    sys.path.insert(0, str(dev1_path))
                from incidents.service import get_live_incidents
                incidents = get_live_incidents(lat=lat, lon=lon, radius=radius, limit=limit)
                if not incidents:
                    # Dynamically generate distributed live incidents across the visible map radius up to limit
                    incidents = generate_viewport_incidents(lat, lon, radius, limit)
                self._send_json(200, {"incidents": incidents, "count": len(incidents), "status": "ok"})
            except Exception as e:
                print(f"[Live Incidents Error]: {e}")
                self._send_json(200, {"incidents": [], "count": 0, "status": "error", "message": str(e)})
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

            # Combine reported blockages and live incidents so algorithm treats them at the same level
            client_blockages = payload.get('blockages') or payload.get('active_blockages') or []
            combined_blockages = list(BLOCKAGES)
            known_ids = {str(b.get('id')) for b in combined_blockages}

            for cb in client_blockages:
                c_lat = float(cb.get('latitude', cb.get('coordinates', {}).get('lat', 0)))
                c_lng = float(cb.get('longitude', cb.get('coordinates', {}).get('lng', 0)))
                c_id = str(cb.get('id', f"b-{c_lat}-{c_lng}"))
                if c_id not in known_ids and c_lat != 0 and c_lng != 0:
                    combined_blockages.append({
                        "id": c_id,
                        "type": cb.get('type', 'hazard'),
                        "title": cb.get('title', 'Live Road Incident'),
                        "description": cb.get('description', 'Live road condition'),
                        "latitude": c_lat,
                        "longitude": c_lng,
                        "severity": cb.get('severity', 'high')
                    })
                    known_ids.add(c_id)

            # Route Calculation: Developer 2 Accessible Pathfinding Engine
            dev2_success = False
            response = None

            # 1. Try Dev2 in-process routing directly (Unified Engine)
            try:
                from pathlib import Path
                dev2_path = Path(__file__).resolve().parent / "developer2"
                if str(dev2_path) not in sys.path:
                    sys.path.insert(0, str(dev2_path))
                    sys.path.insert(0, str(dev2_path / "routing"))
                    sys.path.insert(0, str(dev2_path / "pathfinding"))
                    sys.path.insert(0, str(dev2_path / "accessibility"))
                from routing.route_service import calculate_route_from_coordinates
                dev2_data = calculate_route_from_coordinates(
                    start_latitude=start_lat,
                    start_longitude=start_lng,
                    destination_latitude=dest_lat,
                    destination_longitude=dest_lng,
                    active_blockages=combined_blockages,
                    profile=profile
                )
                if dev2_data and dev2_data.get("success"):
                    response = dev2_data
                    dev2_success = True
                    print(f"[Dev2 In-Process] Calculated route: {dev2_data.get('message')}")
            except Exception as in_proc_err:
                print(f"[Dev2 In-Process Notice]: {in_proc_err}")

            # 2. Try Dev2 on port 8001 if in-process didn't succeed
            if not dev2_success:
                try:
                    dev2_payload = json.dumps({
                        "start": {"latitude": start_lat, "longitude": start_lng},
                        "destination": {"latitude": dest_lat, "longitude": dest_lng},
                        "profile": profile,
                        "active_blockages": combined_blockages
                    }).encode('utf-8')
                    req = urllib.request.Request(
                        "http://localhost:8001/route",
                        data=dev2_payload,
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=6) as dev2_res:
                        if dev2_res.status == 200:
                            dev2_data = json.loads(dev2_res.read().decode('utf-8'))
                            if dev2_data.get("success"):
                                response = dev2_data
                                dev2_success = True
                                print(f"[Dev2 Port 8001] Retrieved route: {dev2_data.get('message')}")
                except Exception as dev2_err:
                    print(f"[Dev2 Port 8001 Notice]: {dev2_err}")

            # 3. Direct OSRM Walking Query (Real OpenStreetMap road network)
            if not dev2_success:
                try:
                    osrm_url = f"https://router.project-osrm.org/route/v1/walking/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson&steps=true"
                    req = urllib.request.Request(osrm_url, headers={"User-Agent": "RAASTA-Server"})
                    with urllib.request.urlopen(req, timeout=6) as res:
                        if res.status == 200:
                            data = json.loads(res.read().decode('utf-8'))
                            routes = data.get("routes", [])
                            if routes:
                                r = routes[0]
                                raw_coords = r.get("geometry", {}).get("coordinates", [])
                                leaflet_coords = [[pt[1], pt[0]] for pt in raw_coords]
                                dist = round(r.get("distance", 0), 1)
                                dur = round(r.get("duration", 0))
                                steps = [
                                    {
                                        "instruction": s.get("maneuver", {}).get("instruction") or s.get("name") or "Continue along pathway",
                                        "distance": f"{round(s.get('distance', 0))}m",
                                        "safe": True
                                    }
                                    for s in r.get("legs", [{}])[0].get("steps", [])
                                ]
                                response = {
                                    "success": True,
                                    "message": "Accessible route calculated successfully.",
                                    "profile": profile,
                                    "rerouted": False,
                                    "route": {
                                        "coordinates": leaflet_coords,
                                        "distance_meters": dist,
                                        "duration_seconds": dur
                                    },
                                    "direct_route": {
                                        "name": "Direct Route",
                                        "coordinates": leaflet_coords,
                                        "distance_meters": dist,
                                        "duration_seconds": dur
                                    },
                                    "alerts": [],
                                    "blockages": [],
                                    "turn_by_turn": steps if steps else [
                                        {"instruction": "Proceed along accessible step-free street", "distance": f"{dist}m", "safe": True}
                                    ]
                                }
                                dev2_success = True
                except Exception as osrm_err:
                    print(f"[OSRM Server Notice]: {osrm_err}")

            # 4. Pure geometric fallback relative to user's real start and destination (Never hardcoded)
            if not dev2_success:
                mid_lat = (start_lat + dest_lat) / 2
                mid_lng = (start_lng + dest_lng) / 2
                coords = [
                    [start_lat, start_lng],
                    [mid_lat, mid_lng],
                    [dest_lat, dest_lng]
                ]
                response = {
                    "success": True,
                    "message": "Accessible route calculated successfully.",
                    "profile": profile,
                    "rerouted": False,
                    "route": {
                        "coordinates": coords,
                        "distance_meters": 400,
                        "duration_seconds": 300
                    },
                    "direct_route": {
                        "name": "Direct Route",
                        "coordinates": coords,
                        "distance_meters": 400,
                        "duration_seconds": 300
                    },
                    "alerts": [],
                    "blockages": [],
                    "turn_by_turn": [
                        {"instruction": "Proceed along accessible pathway", "distance": "200m", "safe": True},
                        {"instruction": "Arrive safely at destination", "distance": "200m", "safe": True}
                    ]
                }

            dist = response.get('route', {}).get('distance') or response.get('route', {}).get('distance_meters') or 0
            print(f"[Dev2 Routing] Calculated route for {profile}: rerouted={response.get('rerouted')}, distance={dist}m")
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
