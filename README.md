# WebRTC app

## Docker deployment

Build the backend and frontend images from the repository root:

```sh
docker build -t wellnest-webrtc-server ./server
docker build --build-arg REACT_APP_SOCKET_URL=http://localhost:8000 -t wellnest-webrtc-client ./client
```

Run both containers:

```sh
docker run -d --name wellnest-webrtc-server -p 8000:8000 wellnest-webrtc-server
docker run -d --name wellnest-webrtc-client -p 80:80 wellnest-webrtc-client
```

Open `http://localhost`. The backend serves HTTP and Socket.IO on port 8000.

For a hosted deployment, deploy the backend on a host that supports persistent
Node.js processes and WebSocket connections. Set the frontend's
`REACT_APP_SOCKET_URL` environment variable to the backend's public URL (for
example, `https://your-backend.example.com`) in the frontend hosting settings,
then redeploy the frontend. Create React App embeds this setting at build time.
The backend listens on the host-provided `PORT` or port 8000 locally.
