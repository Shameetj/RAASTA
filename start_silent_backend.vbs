Set WshShell = CreateObject("WScript.Shell")

' 1. Start Dev2 Routing Engine (Port 8001) silently in background
WshShell.Run "cmd /c cd /d ""backend\developer2"" && python -m uvicorn routing_api:app --host 0.0.0.0 --port 8001", 0, False

' 2. Start Dev1 Server (Port 8000) silently in background
WshShell.Run "cmd /c cd /d ""backend"" && python server.py", 0, False

' 3. Start Cloudflare Tunnel for Port 8000 silently in background
WshShell.Run "cmd /c cloudflared tunnel --url http://localhost:8000", 0, False

' 4. Notification to user
MsgBox "RAASTA Backend is now running silently in the background!" & vbCrLf & "No terminals needed. You can close any open command prompts.", 64, "RAASTA Background Service"
