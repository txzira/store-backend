"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma;
if (!global.__prisma) {
    global.__prisma = new client_1.PrismaClient();
}
prisma = global.__prisma;
module.exports = prisma;
