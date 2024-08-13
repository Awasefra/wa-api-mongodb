const { Client, RemoteAuth } = require("whatsapp-web.js");
const express = require("express");
const qrcode = require("qrcode");
const socketIO = require("socket.io");
const http = require("http");
require("dotenv").config();
const mongoose = require("mongoose");
const { MongoStore } = require("wwebjs-mongo");

const port = process.env.PORT || 3000; // Set default port

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    const store = new MongoStore({ mongoose: mongoose });

    const client = new Client({
      puppeteer: { headless: true },
      authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 60000000, // Optional: Backup session every minute
      }),
    });

    // Initialize WhatsApp client
    client.initialize();

    client.on("ready", () => {
      console.log("Client is ready!");
    });

    client.on("authenticated", async () => {
      console.log("Client is authenticated!");

    
    });

    client.on("qr", (qr) => {
      console.log("QR RECEIVED", qr);
    //   io.emit("qr", qr);
    });

    client.on("auth_failure", () => {
      console.error("Authentication failure");
    });

    client.on("disconnected", () => {
      console.log("Client disconnected");
      client.destroy();
      client.initialize();
    });

    // Handle incoming messages
    client.on("message", (msg) => {
      if (msg.body === "!bro") {
        msg.reply("okeyyyy");
      } else if (msg.body === "skuy") {
        msg.reply("helo ma bradah");
      }

    });

    // Handle socket connections
    io.on("connection", (socket) => {
      const now = new Date().toLocaleString();
      socket.emit("message", `${now} Connected`);

      if (!client.info) {
        client.on("qr", (qr) => {
          qrcode.toDataURL(qr, (err, url) => {
            socket.emit("qr", url);
            socket.emit("message", `${now} QR Code received`);
          });
        });
      } else {
        socket.emit(
          "message",
          `${now} Already authenticated, no QR Code needed`
        );
      }

      client.on("ready", () => {
        socket.emit("message", `${now} WhatsApp is ready!`);
      });

      client.on("authenticated", () => {
        socket.emit("message", `${now} Whatsapp is authenticated!`);
      });

      client.on("auth_failure", function () {
        socket.emit("message", `${now} Auth failure, restarting...`);
      });

      client.on("disconnected", function () {
        socket.emit("message", `${now} Disconnected`);
        client.destroy();
        client.initialize();
      });
    });

    
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Index routing and middleware
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

// Start server
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
