import { WebSocketServer, WebSocket } from "ws";

const ws = new WebSocketServer({ host: "0.0.0.0", port: 8080 });

interface User {
  socket: WebSocket;
  room: string;
  userId: string;
  username: string
}

let allSockets: User[] = [];
let roomCounts: { [key: string]: number } = {}; // Track number of users in each room

ws.on("connection", (socket) => {
  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message.toString());
    let userId = ""

    if (parsedMessage.type === "join") {
      const roomId = parsedMessage.payload.roomId;
      const username = parsedMessage.payload.username;
      userId = `user_${Date.now()}`

      // Add user to the list
      allSockets.push({ socket, room: roomId, userId, username});

      // Update room count
      roomCounts[roomId] = (roomCounts[roomId] || 0) + 1;

      // Send userId assigned to the user
      socket.send(JSON.stringify({ type: "userId", userId }));

      // Broadcast updated room count to all users in the room
      broadcastRoomCount(roomId);
    }

    if (parsedMessage.type === "chat") {
      const currentUser = allSockets.find((user) => user.socket === socket);
      if (currentUser) {
        broadcastMessage(currentUser.room, parsedMessage.payload.text, currentUser.userId, currentUser.username);
      }
    }
  });

  // Handle user disconnect
  socket.on("close", () => {
    const userIndex = allSockets.findIndex((user) => user.socket === socket);
    if (userIndex !== -1) {
      const userRoom = allSockets[userIndex].room;
      allSockets.splice(userIndex, 1);

      // Update room count
      if (roomCounts[userRoom]) {
        roomCounts[userRoom]--;
        if (roomCounts[userRoom] === 0) {
          delete roomCounts[userRoom]; // Remove empty rooms
        }
      }

      broadcastRoomCount(userRoom);
    }
  });
});

function broadcastMessage(roomId: string, message: string, userId: string, username: string) {
  allSockets.forEach((user) => {
    if (user.room === roomId && user.userId !== userId) {
      user.socket.send(JSON.stringify({ type: "chat", message, userId, username }));
    }
  });
}

function broadcastRoomCount(roomId: string) {
  const count = roomCounts[roomId] || 0;
  allSockets.forEach((user) => {
    if (user.room === roomId) {
      user.socket.send(JSON.stringify({ type: "roomCount", count }));
    }
  });
}

console.log("WebSocket server started on ws://localhost:8080");