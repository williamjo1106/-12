import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = Number(process.env.PORT) || 3000;

  // Game State
  let participants: any[] = [];
  let winningNumbers: number[] = [];
  let bonusNumber: number | null = null;
  let isDrawing = false;
  let currentDrawIndex = -1;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send current state to new user
    socket.emit("state_update", {
      participants,
      winningNumbers,
      bonusNumber,
      isDrawing,
      currentDrawIndex
    });

    socket.on("join_game", (data) => {
      const { name, numbers } = data;
      const existing = participants.find(p => p.id === socket.id);
      if (!existing) {
        participants.push({ id: socket.id, name, numbers });
      } else {
        existing.name = name;
        existing.numbers = numbers;
      }
      io.emit("participants_update", participants);
    });

    socket.on("start_draw", () => {
      if (isDrawing) return;
      
      // Generate 7 unique numbers
      const nums = new Set<number>();
      while (nums.size < 7) {
        nums.add(Math.floor(Math.random() * 45) + 1);
      }
      const allNums = Array.from(nums);
      
      // Keep the original random order for the drawing phase
      const mainNumbersRaw = allNums.slice(0, 6);
      winningNumbers = [...mainNumbersRaw].sort((a, b) => a - b);
      bonusNumber = allNums[6];
      
      isDrawing = true;
      currentDrawIndex = -1;
      
      // We send the RAW random order for the animation
      io.emit("draw_started", { winningNumbers: mainNumbersRaw, bonusNumber });

      // Simulate drawing one by one (6 main + 1 bonus = 7 total)
      let index = 0;
      const interval = setInterval(() => {
        currentDrawIndex = index;
        const number = index < 6 ? mainNumbersRaw[index] : bonusNumber;
        io.emit("ball_drawn", { index, number });
        index++;
        if (index === 7) {
          clearInterval(interval);
          isDrawing = false;
          
          // Now that it's finished, we can tell clients to show the sorted version
          io.emit("draw_finalized", { winningNumbers, bonusNumber });

          // Calculate winners
          const results = participants.map(p => {
            const matches = p.numbers.filter((n: number) => winningNumbers.includes(n));
            const isBonusMatch = p.numbers.includes(bonusNumber!);
            
            let rank = 0;
            if (matches.length === 6) rank = 1;
            else if (matches.length === 5 && isBonusMatch) rank = 2;
            else if (matches.length === 5) rank = 3;
            else if (matches.length === 4) rank = 4;
            else if (matches.length === 3) rank = 5;

            return { ...p, matchCount: matches.length, isBonusMatch, rank };
          });
          io.emit("draw_finished", { results });
        }
      }, 3000);
    });

    socket.on("reset_game", () => {
      participants = [];
      winningNumbers = [];
      bonusNumber = null;
      isDrawing = false;
      currentDrawIndex = -1;
      io.emit("game_reset");
    });

    socket.on("update_participant", (data) => {
      const { id, name, numbers } = data;
      const p = participants.find(p => p.id === id);
      if (p) {
        p.name = name;
        p.numbers = numbers;
        io.emit("participants_update", participants);
      }
    });

    socket.on("remove_participant", (id) => {
      participants = participants.filter(p => p.id !== id);
      io.emit("participants_update", participants);
    });

    socket.on("disconnect", () => {
      participants = participants.filter(p => p.id !== socket.id);
      io.emit("participants_update", participants);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
