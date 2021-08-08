const http = require("http");
const path = require("path");
const util = require("util");
const EventEmitter = require("events");

const mqtt = require("mqtt");
const WebSocket = require("ws");
const express = require("express");
const config = require("config");

const app = express();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: "/ws" });

const mqttClient = mqtt.connect("mqtt://localhost:1883");
// const mqttClient = mqtt.connect({
//   servers: [config.mqtt],
// });

const emitter = new EventEmitter();

const TOPIC = "lights";

wss.on("connection", (ws) => {
  ws.on("message", (e) => {
    const f = parseFloat(e.toString());
    if (!isNaN(f)) {
      emitter.emit("event", f);
    }
  });
});

mqttClient.on("connect", () => {
  console.log("mqtt connect");

  mqttClient.subscribe(TOPIC);

  mqttClient.on("message", (topic, payload) => {
    if (topic === TOPIC) {
      wss.clients.forEach((ws) => ws.send(payload));
    }
  });

  emitter.on("event", (f) => mqttClient.publish(TOPIC, f.toFixed(2)));
});

server.on("close", () => mqttClient.end());

server.listen(config.port, config.host, () => {
  console.log(`listening at ${config.host}:${config.port}`);
});

const shutdown = () => {
  console.log("closing...");
  server.close(() => {
    console.log("closed");
  });
};

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
process.once("SIGINT", shutdown);
