# WebRTC app

## Docker deployment

Build the backend and frontend images from the repository root:

```sh
docker build -t wellnest-webrtc-server ./server
docker build --build-arg REACT_APP_SOCKET_URL=http://localhost:8001 -t wellnest-webrtc-client ./client
```

Run both containers:

```sh
docker run -d --name wellnest-webrtc-server -p 8000:8000 -p 8001:8001 wellnest-webrtc-server
docker run -d --name wellnest-webrtc-client -p 80:80 wellnest-webrtc-client
```

Open `http://localhost`. The backend serves HTTP on port 8000 and Socket.IO on port 8001.

For a hosted deployment, build the client with `REACT_APP_SOCKET_URL` set to the
public URL of the Socket.IO service (for example,
`https://api.example.com`). This value is embedded in the frontend at build time.
Route that public URL to the backend's port 8001 and configure the hosting
platform or reverse proxy for WebSocket upgrades and TLS. The app's HTTP API
listener is on port 8000.
