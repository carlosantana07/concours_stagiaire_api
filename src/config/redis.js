import Redis  from "ioredis";

const connection = new Redis({
  host: "127.0.0.1",
  port: 6379,
});
export default connection;

connection.on("connect", () => console.log(" Redis connecté"));
connection.on("error", (err) => console.error("Redis erreur :", err));